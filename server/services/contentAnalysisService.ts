import mongoose from 'mongoose';
import AnalysisSession, { IAnalysisSession } from '../models/AnalysisSession';
import ContentAnalysis, { IContentAnalysis } from '../models/ContentAnalysis';
import Quote, { IQuote } from '../models/Quote';
import Person, { IPerson } from '../models/Person';
import { TopicGroup } from '../types';
import { mapLanguageName } from '../utils/languages';

interface QuoteGroupInput {
  groupId: number;
  statementIds: string[]; // "topicGroupId:itemIndex"
  personId?: string;
  customText?: string;
}

// Helper to find statement by ID
const findStatement = (dialogAnalysis: TopicGroup[], statementId: string) => {
  const [groupId, indexStr] = statementId.split(':');
  const index = parseInt(indexStr, 10);
  const group = dialogAnalysis.find(g => g.id === groupId);
  if (!group || !group.analysis || !group.analysis.summaryItems[index]) {
    return null;
  }
  return {
    group,
    item: group.analysis.summaryItems[index],
    index
  };
};

// Helper to guess speaker from a group of statements
const guessSpeaker = async (groups: TopicGroup[]) => {
  const speakerCounts: Record<string, number> = {};
  groups.forEach(g => {
    g.dialogLines.forEach(line => {
      speakerCounts[line.speaker] = (speakerCounts[line.speaker] || 0) + 1;
    });
  });
  
  let bestSpeaker = 'Unknown';
  let maxCount = 0;
  
  Object.entries(speakerCounts).forEach(([speaker, count]) => {
    if (count > maxCount) {
      maxCount = count;
      bestSpeaker = speaker;
    }
  });
  
  // Find or create Person
  let person = await Person.findOne({ 
    $or: [
      { name: bestSpeaker },
      { aliases: bestSpeaker }
    ]
  });
  
  if (!person) {
    person = await Person.create({ name: bestSpeaker });
  }
  
  return person;
};

export const promoteSession = async (sessionId: string, quoteGroups: QuoteGroupInput[], userId: string, overrideLanguageCode?: string) => {
  const session = await AnalysisSession.findById(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }

  // Validate Source URL
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
  if (!youtubeRegex.test(session.sourceUrl)) {
    throw new Error('Invalid source URL. Please provide a valid YouTube link.');
  }

  // 1. Create ContentAnalysis
  const contentAnalysisData = session.toObject();
  const { _id, status, ...rest } = contentAnalysisData as any;
  
  const languageCode = overrideLanguageCode || session.transcript?.languageCode || 'en';
  const languageName = mapLanguageName(languageCode);

  // Apply selections to dialogAnalysis
  if (rest.dialogAnalysis) {
    const selectionMap = new Map<string, number>();
    quoteGroups.forEach(g => {
      g.statementIds.forEach(sid => selectionMap.set(sid, g.groupId));
    });

    rest.dialogAnalysis.forEach((group: any) => {
      if (group.analysis && group.analysis.summaryItems) {
        group.analysis.summaryItems.forEach((item: any, index: number) => {
          const statementId = `${group.id}:${index}`;
          if (selectionMap.has(statementId)) {
            item.isSelected = true;
            item.groupId = selectionMap.get(statementId);
          }
        });
      }
    });
  }

  const contentAnalysis = await ContentAnalysis.create({
    ...rest,
    userId, // Ensure ownership is correct or transferred
    languageCode,
    languageName,
  });

  // 2. Create Quotes
  const createdQuotes = [];
  
  for (const group of quoteGroups) {
    const statements = group.statementIds.map(id => findStatement(session.dialogAnalysis, id)).filter(s => s !== null);
    
    if (statements.length === 0) continue;
    
    // Determine Text
    const text = group.customText || statements.map((s, idx) => {
      let timestamp = s!.item.timestamp || '00:00:00';
      if (timestamp.split(':').length === 2) {
        timestamp = `00:${timestamp}`;
      }
      return `[${timestamp}] [${idx + 1}] ${s!.item.text}`;
    }).join('\n');
    
    // Determine Person
    let personId = group.personId;
    if (!personId) {
      const topicGroups = [...new Set(statements.map(s => s!.group))];
      const person = await guessSpeaker(topicGroups);
      personId = person._id.toString();
    }

    // Generate Links
    const links = [
      { url: session.sourceUrl, title: 'Source Video', type: 'context' }
    ];

    statements.forEach((s, idx) => {
      if (s && s.item.timestamp) {
        const parts = s.item.timestamp.split(':');
        let seconds = 0;
        if (parts.length === 3) {
          seconds = parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
        } else if (parts.length === 2) {
          seconds = parseInt(parts[0]) * 60 + parseInt(parts[1]);
        }
        
        // Append timestamp to URL (assuming YouTube format ?t=X)
        const separator = session.sourceUrl.includes('?') ? '&' : '?';
        const url = `${session.sourceUrl}${separator}t=${seconds}`;
        links.push({ url, title: `[${idx + 1}]`, type: 'context' });
      }
    });
    
    // Create Quote
    const quote = await Quote.create({
      text,
      person: personId,
      sourceUrl: session.sourceUrl,
      date: session.createdAt, // Or extract from content?
      contentAnalysisId: contentAnalysis._id,
      originIds: group.statementIds,
      analyzedBy: 'AI',
      analyzedAt: new Date(),
      savedByUser: userId,
      savedAt: new Date(),
      tags: [], // Could extract tags from topic analysis
      metadata: {
        title: contentAnalysis.title || 'YouTube Video',
        languageCode: contentAnalysis.languageCode,
        languageName: contentAnalysis.languageName,
        analysisGroupId: group.groupId,
        links
      }
    });
    
    createdQuotes.push(quote);
  }

  // 3. Delete Session
  await AnalysisSession.findByIdAndDelete(sessionId);

  return { contentAnalysis, quotes: createdQuotes };
};

export const updateQuotes = async (contentAnalysisId: string, quoteGroups: QuoteGroupInput[], userId: string) => {
  const contentAnalysis = await ContentAnalysis.findById(contentAnalysisId);
  if (!contentAnalysis) {
    throw new Error('ContentAnalysis not found');
  }

  const existingQuotes = await Quote.find({ contentAnalysisId });
  const processedQuoteIds = new Set<string>();
  const newQuotes = [];

  for (const group of quoteGroups) {
    // Check if an active quote already exists for these exact originIds
    // We sort ids to ensure order doesn't matter for comparison
    const sortedOriginIds = [...group.statementIds].sort().join(',');
    
    const existingQuote = existingQuotes.find(q => {
      const qOriginIds = (q.originIds || []).sort().join(',');
      return qOriginIds === sortedOriginIds && !q.isDeprecated;
    });

    if (existingQuote) {
      processedQuoteIds.add(existingQuote._id.toString());
      // Optionally update text if customText provided and different?
      // For now, assume if it matches, it's good.
    } else {
      // Create new quote
      const statements = group.statementIds.map(id => findStatement(contentAnalysis.dialogAnalysis, id)).filter(s => s !== null);
      
      if (statements.length === 0) continue;
      
      const text = group.customText || statements.map((s, idx) => {
        let timestamp = s!.item.timestamp || '00:00:00';
        if (timestamp.split(':').length === 2) {
          timestamp = `00:${timestamp}`;
        }
        return `[${timestamp}] [${idx + 1}] ${s!.item.text}`;
      }).join('\n');
      
      let personId = group.personId;
      if (!personId) {
        const topicGroups = [...new Set(statements.map(s => s!.group))];
        const person = await guessSpeaker(topicGroups);
        personId = person._id.toString();
      }

      // Generate Links
      const links = [
        { url: contentAnalysis.sourceUrl, title: 'Source Video', type: 'context' }
      ];

      statements.forEach((s, idx) => {
        if (s && s.item.timestamp) {
          const parts = s.item.timestamp.split(':');
          let seconds = 0;
          if (parts.length === 3) {
            seconds = parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
          } else if (parts.length === 2) {
            seconds = parseInt(parts[0]) * 60 + parseInt(parts[1]);
          }
          
          // Append timestamp to URL (assuming YouTube format ?t=X)
          const separator = contentAnalysis.sourceUrl.includes('?') ? '&' : '?';
          const url = `${contentAnalysis.sourceUrl}${separator}t=${seconds}`;
          links.push({ url, title: `[${idx + 1}]`, type: 'context' });
        }
      });

      const quote = await Quote.create({
        text,
        person: personId,
        sourceUrl: contentAnalysis.sourceUrl,
        date: contentAnalysis.createdAt,
        contentAnalysisId: contentAnalysis._id,
        originIds: group.statementIds,
        analyzedBy: 'AI',
        analyzedAt: new Date(),
        savedByUser: userId,
        savedAt: new Date(),
        metadata: {
          title: contentAnalysis.title || 'YouTube Video',
          languageCode: contentAnalysis.transcript.languageCode,
          languageName: mapLanguageName(contentAnalysis.transcript.languageCode),
          links
        }
      });
      
      newQuotes.push(quote);
    }
  }

  // Mark missing quotes as deprecated
  const deprecatedQuotes = [];
  for (const quote of existingQuotes) {
    if (!processedQuoteIds.has(quote._id.toString()) && !quote.isDeprecated) {
      quote.isDeprecated = true;
      await quote.save();
      deprecatedQuotes.push(quote);
    }
  }

  return { newQuotes, deprecatedQuotes };
};

export const updateQuoteSource = async (quoteId: string, contentAnalysisId: string, statementIds: string[], userId: string) => {
  const contentAnalysis = await ContentAnalysis.findById(contentAnalysisId);
  if (!contentAnalysis) {
    throw new Error('ContentAnalysis not found');
  }

  const quote = await Quote.findById(quoteId);
  if (!quote) {
    throw new Error('Quote not found');
  }

  // Check if statementIds are different
  const currentOriginIds = (quote.originIds || []).sort().join(',');
  const newOriginIds = [...statementIds].sort().join(',');

  if (currentOriginIds === newOriginIds) {
    return quote; // No change
  }

  // Deprecate old quote
  quote.isDeprecated = true;
  await quote.save();

  // Create new quote
  const statements = statementIds.map(id => findStatement(contentAnalysis.dialogAnalysis, id)).filter(s => s !== null);
  
  if (statements.length === 0) {
     throw new Error('No valid statements found');
  }

  const text = statements.map((s, idx) => {
    let timestamp = s!.item.timestamp || '00:00:00';
    if (timestamp.split(':').length === 2) {
      timestamp = `00:${timestamp}`;
    }
    return `[${timestamp}] [${idx + 1}] ${s!.item.text}`;
  }).join('\n');

  // Keep same person as original quote
  const personId = quote.person;

  // Generate Links
  const links = [
    { url: contentAnalysis.sourceUrl, title: 'Source Video', type: 'context' }
  ];

  statements.forEach((s, idx) => {
    if (s && s.item.timestamp) {
      const parts = s.item.timestamp.split(':');
      let seconds = 0;
      if (parts.length === 3) {
        seconds = parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
      } else if (parts.length === 2) {
        seconds = parseInt(parts[0]) * 60 + parseInt(parts[1]);
      }
      
      const separator = contentAnalysis.sourceUrl.includes('?') ? '&' : '?';
      const url = `${contentAnalysis.sourceUrl}${separator}t=${seconds}`;
      links.push({ url, title: `[${idx + 1}]`, type: 'context' });
    }
  });

  const newQuote = await Quote.create({
    text,
    person: personId,
    sourceUrl: contentAnalysis.sourceUrl,
    date: contentAnalysis.createdAt,
    contentAnalysisId: contentAnalysis._id,
    originIds: statementIds,
    analyzedBy: 'AI',
    analyzedAt: new Date(),
    savedByUser: userId,
    savedAt: new Date(),
    metadata: {
      ...quote.metadata,
      links
    }
  });

  return newQuote;
};

export const getContentAnalysis = async (id: string) => {
  return ContentAnalysis.findById(id);
};



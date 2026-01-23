import { Request, Response } from 'express';
import {
  ModelResponseError,
  JsonParsingError,
  PersonInfo,
} from '../types';
import Person from '../models/Person';
import geminiService from '../llm_services/geminiService';
import chatGptService from '../llm_services/chatGptService';
import grokService from '../llm_services/grokService';
import agenticService from '../llm_services/agenticService';
import { addLogEntry, updateLogEntry, getLogs } from './logService';
import { LlmService } from '../llm_services/LlmService';
import { postProcessResponse } from './responseProcessor';
import { fetchArticle } from '../utils/articleExtractor';
import { getTranscript } from './youtubeService';
import { extractTranscriptTopics } from './dialogAnalysis/topicExtractorService';
import { identifySpeakers } from './dialogAnalysis/speakerIdentificationService';
import { analyzeDialogTopics as analyzeDialogTopicsService } from './dialogAnalysis';
import { updateSessionStep, updateSessionStatus, createSession } from './analysisSessionService';
import { getEffectiveApiKeyForUser } from './apiKeyService';

const getServiceInstance = (model: string): LlmService => {
  // Normalize legacy aliases to canonical model identifiers
  const normalizedModel = (model === 'chatgpt' || model.startsWith('gpt')) ? 'openai' : model;

  if (normalizedModel === 'gemini' || normalizedModel.startsWith('gemini')) return geminiService;
  if (normalizedModel === 'openai') return chatGptService; // canonical OpenAI provider
  if (normalizedModel === 'grok' || normalizedModel.startsWith('grok')) return grokService;

  throw new Error(`Invalid model specified: ${model}`);
};

const getProviderFromModel = (model: string): 'gemini' | 'openai' | 'grok' => {
  // Normalize legacy aliases to canonical provider names
  const normalizedModel = (model === 'chatgpt' || model.startsWith('gpt')) ? 'openai' : model;

  if (normalizedModel === 'gemini' || normalizedModel.startsWith('gemini')) return 'gemini';
  // Use canonical 'openai' only
  if (normalizedModel === 'openai') return 'openai';
  if (normalizedModel === 'grok' || normalizedModel.startsWith('grok')) return 'grok';

  throw new Error(`Unknown model provider for model: ${model}`);
};

async function getApiKey(req: Request, modelOrProvider: string): Promise<string> {
  const userId = req.session?.user?._id;
  if (!userId) {
    throw new Error('User authentication required to access AI services.');
  }
  // Map inputs like 'gpt-4' or 'gemini-1.5' if necessary, but current app uses 'gemini', 'chatgpt', 'grok' mostly.
  // agenticSearch passes 'openai' sometimes.
  let provider: 'gemini' | 'openai' | 'grok';

  if (modelOrProvider === 'openai') provider = 'openai';
  else if (modelOrProvider === 'chatgpt') provider = 'openai'; // legacy alias
  else if (modelOrProvider === 'gemini') provider = 'gemini';
  else if (modelOrProvider === 'grok') provider = 'grok';
  else {
    // fallback for specific model names if used directly as keys
    if (modelOrProvider.startsWith('gpt')) provider = 'openai';
    else if (modelOrProvider.startsWith('gemini')) provider = 'gemini';
    else if (modelOrProvider.startsWith('grok')) provider = 'grok';
    else provider = 'gemini'; // default
  }

  return getEffectiveApiKeyForUser(userId.toString(), provider);
}

export const fetchQuotes = async (req: Request, res: Response) => {
  const {
    model,
    personName,
    languages,
    maxQuotes,
    context,
    temperature,
    maxQuoteLength,
    timePeriod,
    category,
    rating,
    sortOrder,
  } = req.body;

  const logId = addLogEntry(req.session.id!, 'fetchQuotes', { personName, model, context, maxQuotes, languages, category, rating, sortOrder, maxQuoteLength, timePeriod });

  try {
    const service = getServiceInstance(model);
    const apiKey = await getApiKey(req, model);

    const quotes = await service.fetchQuotesForPerson(
      apiKey,
      personName,
      languages,
      maxQuotes,
      context,
      temperature,
      maxQuoteLength,
      timePeriod,
      category,
      rating,
      sortOrder,
      logId,
      req.session.id!,
    );
    updateLogEntry(req.session.id!, logId, quotes);
    res.json(quotes);
  } catch (error: any) {
    console.error('Error fetching quotes:', error);
    updateLogEntry(req.session.id!, logId, undefined, error);
    if (error instanceof JsonParsingError) {
      return res.status(500).json({ message: error.message, rawResponse: error.rawResponse, errorType: error.name });
    }
    if (error instanceof ModelResponseError) {
      return res.status(500).json({ message: error.message, errorType: error.name });
    }
    res.status(500).json({ message: error.message || 'Failed to fetch quotes' });
  }
};

export const agenticSearch = async (req: Request, res: Response) => {
  const {
    personName,
    timePeriod,
    languages,
    options,
    provider = 'gemini',
  } = req.body;

  const logId = addLogEntry(req.session.id!, 'agenticSearch', { personName, timePeriod, languages, options, provider });

  try {
    const apiKey = await getApiKey(req, provider);

    const result = await agenticService.search(
      provider,
      apiKey,
      personName,
      timePeriod,
      languages,
      options,
      logId,
      req.session.id!
    );

    updateLogEntry(req.session.id!, logId, result);
    res.json(result);
  } catch (error: any) {
    console.error('Error in agentic search:', error);
    updateLogEntry(req.session.id!, logId, undefined, error);
    if (error instanceof JsonParsingError) {
      return res.status(500).json({ message: error.message, rawResponse: error.rawResponse, errorType: error.name });
    }
    if (error instanceof ModelResponseError) {
      return res.status(500).json({ message: error.message, errorType: error.name });
    }
    res.status(500).json({ message: error.message || 'Failed to perform agentic search' });
  }
};

export const analyzeQuote = async (req: Request, res: Response) => {
  const { quoteText, quoteLanguageCode, quoteLanguageName, model, temperature, analysisContext, links, personName, personId, analysisType } = req.body;

  let personPayload: PersonInfo | undefined;
  if (personId) {
    try {
      const personDoc = await Person.findById(personId);
      if (!personDoc) {
        return res.status(404).json({ message: 'Person not found' });
      }
      personPayload = {
        _id: personDoc._id.toString(),
        name: personDoc.name,
        firstname: personDoc.firstname,
        surname: personDoc.surname,
        aliases: personDoc.aliases,
        description: personDoc.description,
        metadata: personDoc.metadata,
      };
    } catch (err) {
      console.error('Error fetching person by ID:', err);
      return res.status(500).json({ message: 'Failed to fetch person data' });
    }
  } else if (personName) {
    personPayload = { name: personName };
  }

  const logId = addLogEntry(req.session.id!, 'analyzeQuote', { quoteText, quoteLanguageCode, quoteLanguageName, model, person: personPayload, personName: personPayload?.name, analysisContext, links, analysisType });

  try {
    const service = getServiceInstance(model);
    const apiKey = await getApiKey(req, model);

    const auditResult = await service.analyzeQuoteText(
      apiKey,
      quoteText,
      quoteLanguageCode,
      quoteLanguageName,
      temperature,
      logId,
      req.session.id!,
      personPayload,
      analysisContext,
      links,
      analysisType || 'audit'
    );
    updateLogEntry(req.session.id!, logId, auditResult);
    res.json(auditResult);
  } catch (error: any) {
    console.error('Error analyzing quote:', error);
    updateLogEntry(req.session.id!, logId, undefined, error);
    if (error instanceof JsonParsingError) {
      return res.status(500).json({ message: error.message, rawResponse: error.rawResponse, errorType: error.name });
    }
    if (error instanceof ModelResponseError) {
      return res.status(500).json({ message: error.message, errorType: error.name });
    }
    res.status(500).json({ message: error.message || 'Failed to analyze quote' });
  }
};

export const extractQuotes = async (req: Request, res: Response) => {
  const { personName, textContent, model, temperature, source, title, date, languageCode, languageName } = req.body;
  const logId = addLogEntry(req.session.id!, 'extractQuote', { personName, textContent, model });

  try {
    const service = getServiceInstance(model);
    const apiKey = await getApiKey(req, model);

    const quotes = await service.extractQuotesFromText(apiKey, personName, textContent, temperature, logId, req.session.id!);

    const enrichedQuotes = postProcessResponse('extractQuotesFromText', quotes, {
      source,
      title,
      date,
      languageCode,
      languageName
    });

    updateLogEntry(req.session.id!, logId, enrichedQuotes);
    res.json(enrichedQuotes);
  } catch (error: any) {
    console.error('Error extracting quotes:', error);
    updateLogEntry(req.session.id!, logId, undefined, error);
    if (error instanceof JsonParsingError) {
      return res.status(500).json({ message: error.message, rawResponse: error.rawResponse, errorType: error.name });
    }
    if (error instanceof ModelResponseError) {
      return res.status(500).json({ message: error.message, errorType: error.name });
    }
    res.status(500).json({ message: error.message || 'Failed to extract quotes' });
  }
};

export const extractQuotesFromUrl = async (req: Request, res: Response) => {
  const { url, personName, model, temperature } = req.body;
  const logId = addLogEntry(req.session.id!, 'extractQuote', { personName, url, model, extractionType: 'url' });

  try {
    // Step 1: Fetch and extract article content
    const article = await fetchArticle(url);

    // Step 2: Use LLM to extract quotes from article content
    const service = getServiceInstance(model);
    const apiKey = await getApiKey(req, model);

    const quotes = await service.extractQuotesFromArticle(
      apiKey,
      personName,
      article.textContent,
      {
        url: article.url,
        title: article.title,
        byline: article.byline,
        siteName: article.siteName,
      },
      temperature,
      logId,
      req.session.id!
    );

    updateLogEntry(req.session.id!, logId, quotes);

    // Return quotes along with article metadata for the frontend
    const response: any = {
      quotes,
      articleMetadata: {
        url: article.url,
        title: article.title,
        byline: article.byline,
        siteName: article.siteName,
        excerpt: article.excerpt,
      }
    };

    // Include transcript data if it's a YouTube video
    if (article.isYoutubeVideo && article.transcriptSegments) {
      response.transcript = {
        videoId: article.videoId,
        languageCode: article.languageCode,
        isAutoGenerated: article.isAutoGenerated,
        segments: article.transcriptSegments,
      };
    }

    res.json(response);
  } catch (error: any) {
    console.error('Error extracting quotes from URL:', error);
    updateLogEntry(req.session.id!, logId, undefined, error);

    // Handle article fetch errors with user-friendly messages
    if (error.message?.includes('Access denied') ||
      error.message?.includes('not found') ||
      error.message?.includes('Server error') ||
      error.message?.includes('Could not extract article')) {
      return res.status(400).json({ message: error.message, errorType: 'ArticleExtractionError' });
    }

    if (error instanceof JsonParsingError) {
      return res.status(500).json({ message: error.message, rawResponse: error.rawResponse, errorType: error.name });
    }
    if (error instanceof ModelResponseError) {
      return res.status(500).json({ message: error.message, errorType: error.name });
    }
    res.status(500).json({ message: error.message || 'Failed to extract quotes from URL' });
  }
};

export const improveSingleQuote = async (req: Request, res: Response) => {
  const { quote, personName, model, temperature } = req.body;
  const logId = addLogEntry(req.session.id!, 'improveQuote', { quote, personName, model });

  try {
    const service = getServiceInstance(model);
    const apiKey = await getApiKey(req, model);

    const improvedQuote = await service.improveQuote(apiKey, quote, personName, temperature, logId, req.session.id!);
    updateLogEntry(req.session.id!, logId, improvedQuote);
    res.json(improvedQuote);
  } catch (error: any) {
    console.error('Error improving quote:', error);
    updateLogEntry(req.session.id!, logId, undefined, error);
    if (error instanceof JsonParsingError) {
      return res.status(500).json({ message: error.message, rawResponse: error.rawResponse, errorType: error.name });
    }
    if (error instanceof ModelResponseError) {
      return res.status(500).json({ message: error.message, errorType: error.name });
    }
    res.status(500).json({ message: error.message || 'Failed to improve quote' });
  }
};

export const getApiLogs = (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 10;

  try {
    const logsData = getLogs(req.session.id!, page, pageSize);
    res.json(logsData);
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ message: 'Failed to fetch logs' });
  }
};

export const fetchArticleContent = async (req: Request, res: Response) => {
  const { url, language } = req.body;

  try {
    const article = await fetchArticle(url, language);

    const response: any = {
      textContent: article.textContent,
      metadata: {
        url: article.url,
        title: article.title,
        byline: article.byline,
        siteName: article.siteName,
        excerpt: article.excerpt,
      }
    };

    // Include transcript data if it's a YouTube video
    if (article.isYoutubeVideo && article.transcriptSegments) {
      response.transcript = {
        videoId: article.videoId,
        languageCode: article.languageCode,
        isAutoGenerated: article.isAutoGenerated,
        segments: article.transcriptSegments,
      };
    }

    res.json(response);
  } catch (error: any) {
    console.error('Error fetching article content:', error);

    if (error.message?.includes('Access denied') ||
      error.message?.includes('not found') ||
      error.message?.includes('Server error') ||
      error.message?.includes('Could not extract article')) {
      return res.status(400).json({ message: error.message, errorType: 'ArticleExtractionError' });
    }

    res.status(500).json({ message: 'Failed to fetch article content' });
  }
};

export const fetchYoutubeTranscript = async (req: Request, res: Response) => {
  const { url, language, sessionId, save } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  let currentSessionId = sessionId;

  try {
    // If save is requested and no session exists, create one
    if (save && !currentSessionId && req.session?.user) {
      const session = await createSession(req.session.user._id as string, url, 'youtube');
      currentSessionId = session._id;
    }

    if (currentSessionId) {
      await updateSessionStatus(currentSessionId, 'extracting_transcript');
    }

    const transcript = await getTranscript(url, language);

    if (currentSessionId) {
      await updateSessionStep(currentSessionId, 'transcript', transcript, 'extracting_transcript');
    }

    // Return transcript with sessionId if available
    res.json({ ...transcript, sessionId: currentSessionId });
  } catch (error: any) {
    console.error('Error fetching transcript:', error);

    // Let's use currentSessionId if it exists
    if (currentSessionId) {
      await updateSessionStatus(currentSessionId, 'failed', error.message);
    }

    const status = error.code === 'CAPTIONS_NOT_FOUND' ? 404 :
      error.code === 'VIDEO_RESTRICTED' ? 403 :
        error.code === 'INVALID_VIDEO_ID' ? 400 : 500;
    res.status(status).json({ error: error.message, code: error.code });
  }
};

import { groupTranscriptByTime } from './dialogAnalysis/transcriptGrouper';

/**
 * Analyze YouTube transcript for topics and generate tag clouds
 * Groups transcript into 15-minute blocks and extracts topics using fast models
 */
export const analyzeTranscriptTopics = async (req: Request, res: Response) => {
  const { segments, language, model, sessionId } = req.body;

  if (!segments || !Array.isArray(segments) || segments.length === 0) {
    return res.status(400).json({ error: 'Segments array is required and must not be empty' });
  }

  try {
    // Group segments into blocks on the backend
    const blocks = groupTranscriptByTime(segments, 5);

    if (sessionId) {
      await updateSessionStatus(sessionId, 'analyzing_topics');
      // Save the blocks used for analysis
      await updateSessionStep(sessionId, 'transcriptBlocks', blocks, 'analyzing_topics');
    }

    const effectiveModel = model || 'gemini';
    console.log(`[TopicAnalysis] Analyzing ${blocks.length} transcript blocks with model: ${effectiveModel}`);

    if (!req.session?.user?._id) {
      throw new Error('User authentication required for analysis.');
    }
    const userId = req.session.user._id.toString();

    const results = await extractTranscriptTopics({
      blocks,
      language: language || 'lt',
      model: effectiveModel,
      userId,
    });

    if (sessionId) {
      await updateSessionStep(sessionId, 'topicAnalysis', results, 'analyzing_topics');
    }

    console.log(`[TopicAnalysis] Successfully analyzed ${results.length} blocks`);
    res.json(results);
  } catch (error: any) {
    console.error('Error analyzing transcript topics:', error);
    if (sessionId) {
      await updateSessionStatus(sessionId, 'failed', error.message);
    }
    res.status(500).json({
      error: error.message || 'Failed to analyze transcript topics',
    });
  }
};

/**
 * Analyze YouTube transcript blocks for speaker identification
 */
export const analyzeTranscriptSpeakers = async (req: Request, res: Response) => {
  const { blocks, language, model, sessionId } = req.body;

  if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
    return res.status(400).json({ error: 'Blocks array is required and must not be empty' });
  }

  let logId: string | undefined;

  try {
    if (sessionId) {
      await updateSessionStatus(sessionId, 'identifying_speakers');
      logId = addLogEntry(sessionId, 'identify-speakers', {
        blocksCount: blocks.length,
        language,
        model
      });
    }

    const effectiveModel = model || 'gemini';
    console.log(`[SpeakerAnalysis] Analyzing ${blocks.length} transcript blocks with model: ${effectiveModel}`);

    if (!req.session?.user?._id) {
      throw new Error('User authentication required for analysis.');
    }
    const userId = req.session.user._id.toString();

    const results = await identifySpeakers({
      blocks,
      language: language || 'lt',
      model: effectiveModel,
      userId,
      sessionId,
      logId,
    });

    if (sessionId) {
      if (logId) {
        updateLogEntry(sessionId, logId, { resultsCount: results.length });
      }
      await updateSessionStep(sessionId, 'speakerAnalysis', results, 'identifying_speakers');
    }

    console.log(`[SpeakerAnalysis] Successfully analyzed ${results.length} blocks`);
    res.json(results);
  } catch (error: any) {
    console.error('Error analyzing transcript speakers:', error);
    if (sessionId) {
      if (logId) {
        updateLogEntry(sessionId, logId, undefined, error);
      }
      await updateSessionStatus(sessionId, 'failed', error.message);
    }
    res.status(500).json({
      error: error.message || 'Failed to analyze transcript speakers',
    });
  }
};

/**
 * Analyze dialog for topic segmentation and analysis
 */
export const analyzeDialogTopics = async (req: Request, res: Response) => {
  const { dialog, language, fastModel, betterModel, sessionId } = req.body;

  if (!dialog || !Array.isArray(dialog) || dialog.length === 0) {
    return res.status(400).json({ error: 'Dialog array is required and must not be empty' });
  }

  let logId: string | undefined;
  try {
    // Create log entry for this API call
    logId = addLogEntry(req.session.id || sessionId || 'unknown', 'analyze-dialog-topics', {
      dialogBlockCount: dialog.length,
      language: language || 'lt',
      fastModel,
      betterModel,
    });

    if (sessionId) {
      await updateSessionStatus(sessionId, 'grouping_dialog');
    }

    console.log(`[DialogAnalysis] Analyzing dialog with ${dialog.length} blocks`);

    if (!req.session?.user?._id) {
      throw new Error('User authentication required for analysis.');
    }
    const userId = req.session.user._id.toString();

    const results = await analyzeDialogTopicsService({
      dialog,
      language: language || 'lt',
      fastModel,
      betterModel,
      userId,
      sessionId: req.session.id || sessionId,
      logId,
    });

    if (sessionId) {
      await updateSessionStep(sessionId, 'dialogAnalysis', results, 'completed');
    }

    console.log(`[DialogAnalysis] Successfully analyzed ${results.length} topic groups`);

    // Update log entry with response
    if (logId) {
      updateLogEntry(req.session.id || sessionId || 'unknown', logId, {
        topicGroupCount: results.length,
        totalLinesAnalyzed: results.reduce((sum, g) => sum + g.dialogLines.length, 0),
      });
    }

    res.json(results);
  } catch (error: any) {
    console.error('Error analyzing dialog topics:', error);
    if (sessionId) {
      await updateSessionStatus(sessionId, 'failed', error.message);
    }

    // Update log entry with error
    if (logId) {
      updateLogEntry(req.session.id || sessionId || 'unknown', logId, undefined, error);
    }

    res.status(500).json({
      error: error.message || 'Failed to analyze dialog topics',
    });
  }
};


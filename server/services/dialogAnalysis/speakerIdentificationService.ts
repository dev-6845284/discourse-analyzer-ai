import chatGptService from '../../llm_services/chatGptService';
import geminiService from '../../llm_services/geminiService';
import grokService from '../../llm_services/grokService';
import { buildSpeakerIdentificationPrompt } from '../../llm_services/prompts';
import { extractJson } from '../../llm_services/utils';
import { addModelInteractionLog, completeModelInteractionLog } from '../logService';
import { SegmentTiming } from './transcriptGrouper';
import { randomUUID } from 'crypto';
import { findBestMatchingPerson, PersonSimilarityMatch } from '../personService';
import { withPseudonymIfGeneric } from '../../utils/pseudonym';

export interface Speaker {
  id: string;   // Unique ID (UUID or existing Person ID)
  name: string; // Display name
  personId?: string; // Reference to existing Person record if matched
  isExistingPerson?: boolean; // True if matched to existing person
}

export interface SpeakerDialogueLine {
  id: string;       // Unique line ID
  speakerId: string; // Reference to Speaker.id
  speaker: string;  // Speaker name (for backwards compatibility and display)
  text: string;
  startTime: number; // Precise start time in seconds
  endTime: number;   // Precise end time in seconds
  timingMismatch?: boolean; // True if timing was fuzzy-matched
}

export interface SpeakerAnalysisResult {
  blockId: string;
  startTime: number;
  endTime: number;
  dialogue: SpeakerDialogueLine[];
  speakers: Speaker[]; // Array of speaker objects with IDs
  identifiedSpeakers: string[]; // List of unique speaker names (backwards compatibility)
}

export interface SpeakerAnalysisRequest {
  blocks: Array<{
    blockId: string;
    startTime: number;
    endTime: number;
    text: string;
    segmentTiming: SegmentTiming[]; // Structured timing data
  }>;
  language: string;
  model: string;
  apiKeys: Record<string, string>;
  sessionId?: string;
  logId?: string;
}

/**
 * Fuzzy match LLM dialogue output to original segment timing.
 * Returns dialogue lines with accurate timing from source segments.
 */
function matchDialogueToTiming(
  rawDialogue: Array<{ speaker: string; text: string; startTime?: number; endTime?: number }>,
  segmentTiming: SegmentTiming[],
  blockStartTime: number,
  blockEndTime: number,
  speakerMap: Map<string, string> // name -> id mapping
): SpeakerDialogueLine[] {
  if (!rawDialogue || rawDialogue.length === 0) {
    return [];
  }

  const result: SpeakerDialogueLine[] = [];
  let usedSegmentIndices = new Set<number>();

  for (const line of rawDialogue) {
    let bestMatch: SegmentTiming | null = null;
    let bestMatchIndex = -1;
    let bestScore = 0;
    let timingMismatch = false;

    // First, try to use LLM-provided timing if within bounds
    if (line.startTime !== undefined && line.endTime !== undefined) {
      const llmStart = line.startTime;
      const llmEnd = line.endTime;
      
      // Validate LLM timing is within block bounds
      if (llmStart >= blockStartTime && llmEnd <= blockEndTime + 1) {
        // Find the segment that best matches this timing
        for (let i = 0; i < segmentTiming.length; i++) {
          if (usedSegmentIndices.has(i)) continue;
          
          const seg = segmentTiming[i];
          // Check if segment overlaps with LLM timing
          const overlap = Math.min(llmEnd, seg.end) - Math.max(llmStart, seg.start);
          const segDuration = seg.end - seg.start;
          
          if (overlap > 0) {
            const score = overlap / segDuration;
            if (score > bestScore) {
              bestScore = score;
              bestMatch = seg;
              bestMatchIndex = i;
            }
          }
        }
      }
    }

    // If no good match from LLM timing, try text-based fuzzy matching
    if (!bestMatch || bestScore < 0.3) {
      const lineWords = line.text.toLowerCase().split(/\s+/).slice(0, 5); // First 5 words
      
      for (let i = 0; i < segmentTiming.length; i++) {
        if (usedSegmentIndices.has(i)) continue;
        
        const seg = segmentTiming[i];
        const segWords = seg.text.toLowerCase().split(/\s+/);
        
        // Count matching words
        let matchCount = 0;
        for (const word of lineWords) {
          if (segWords.some(sw => sw.includes(word) || word.includes(sw))) {
            matchCount++;
          }
        }
        
        const score = lineWords.length > 0 ? matchCount / lineWords.length : 0;
        if (score > bestScore) {
          bestScore = score;
          bestMatch = seg;
          bestMatchIndex = i;
          timingMismatch = true; // Mark as fuzzy-matched
        }
      }
    }

    if (bestMatch && bestMatchIndex >= 0) {
      usedSegmentIndices.add(bestMatchIndex);
      result.push({
        id: randomUUID(),
        speakerId: speakerMap.get(line.speaker) || '',
        speaker: line.speaker,
        text: line.text,
        startTime: bestMatch.start,
        endTime: bestMatch.end,
        timingMismatch: timingMismatch || bestScore < 0.5,
      });
    } else {
      // Fallback: interpolate timing
      const lineIndex = result.length;
      const duration = blockEndTime - blockStartTime;
      const timePerLine = duration / rawDialogue.length;
      
      result.push({
        id: randomUUID(),
        speakerId: speakerMap.get(line.speaker) || '',
        speaker: line.speaker,
        text: line.text,
        startTime: blockStartTime + (lineIndex * timePerLine),
        endTime: blockStartTime + ((lineIndex + 1) * timePerLine),
        timingMismatch: true, // Definitely a mismatch since we're interpolating
      });
    }
  }

  return result;
}

/**
 * Main function to identify speakers in transcript blocks
 */
export async function identifySpeakers(
  request: SpeakerAnalysisRequest
): Promise<SpeakerAnalysisResult[]> {
  const { blocks, language, model, apiKeys, sessionId, logId } = request;
  const results: SpeakerAnalysisResult[] = [];
  let previousContext: string | null = null;
  // Determine provider and model name for logging
  let provider: string;
  let modelName: string;
  if (model === 'chatgpt' && apiKeys.chatgpt) {
    provider = 'chatgpt';
    modelName = 'gpt-4o-mini';
  } else if (model === 'grok' && apiKeys.grok) {
    provider = 'grok';
    modelName = 'grok-2-latest';
  } else {
    provider = 'gemini';
    modelName = 'gemini-1.5-flash';
  }

  for (const block of blocks) {
    const prompt = buildSpeakerIdentificationPrompt(block.text, block.segmentTiming, previousContext, language);
    
    // Log the LLM request
    let interactionId: string | null = null;
    if (sessionId && logId) {
      interactionId = addModelInteractionLog(sessionId, logId, {
        provider,
        model: modelName,
        operation: 'speaker-identification',
        requestPayload: { prompt, blockId: block.blockId },
        metadata: { blockId: block.blockId, startTime: block.startTime, endTime: block.endTime },
      });
    }

    let result: any;
    try {
      let responseText: string;

      if (model === 'chatgpt' && apiKeys.chatgpt) {
        responseText = await chatGptService.generateContent(apiKeys.chatgpt, {
          model: 'gpt-4o-mini',
          prompt,
          temperature: 0,
        });
      } else if (model === 'grok' && apiKeys.grok) {
        responseText = await grokService.generateContent(apiKeys.grok, {
          model: 'grok-2-latest',
          prompt,
          temperature: 0,
        });
      } else {
        // Default to Gemini
        const apiKey = apiKeys.gemini || process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error('Gemini API key is missing');
        
        responseText = await geminiService.generateContent(apiKey, {
          model: 'gemini-1.5-flash',
          prompt,
          temperature: 0,
        });
      }

      // Log successful response
      if (sessionId && logId) {
        completeModelInteractionLog(sessionId, logId, interactionId, { responseText });
      }

      const jsonText = extractJson(responseText);
      if (!jsonText) {
        throw new Error('No valid JSON found in response');
      }
      result = JSON.parse(jsonText);

      // Create speaker objects with IDs from identified speaker names
      // Check for existing similar persons in the database first
      const speakerMap = new Map<string, string>();
      const speakers: Speaker[] = [];
      
      for (const name of (result.identifiedSpeakers || [])) {
        // Augment generic placeholder names with a deterministic pseudonym to keep them distinct
        const displayName = withPseudonymIfGeneric(name, `${sessionId || ''}:${block.blockId}:${block.startTime}`);
        // Try to find an existing similar person
        const existingPerson = await findBestMatchingPerson(displayName);
        
        if (existingPerson) {
          // Reuse existing person's ID and name
          speakerMap.set(displayName, existingPerson.personId);
          speakers.push({
            id: existingPerson.personId,
            name: existingPerson.name, // Use the canonical name from database
            personId: existingPerson.personId,
            isExistingPerson: true,
          });
          console.log(`[SpeakerIdentification] Matched "${displayName}" to existing person "${existingPerson.name}" (similarity: ${existingPerson.similarity.toFixed(2)})`);
        } else {
          // Create new speaker with random UUID
          const id = randomUUID();
          speakerMap.set(displayName, id);
          speakers.push({ id, name: displayName, isExistingPerson: false });
        }
      }

      // Match LLM dialogue output to original segment timing with fuzzy matching
      const matchedDialogue = matchDialogueToTiming(
        result.dialogue,
        block.segmentTiming,
        block.startTime,
        block.endTime,
        speakerMap
      );

      // Count timing mismatches for logging
      const mismatchCount = matchedDialogue.filter(d => d.timingMismatch).length;
      if (mismatchCount > 0) {
        console.log(`[SpeakerIdentification] Block ${block.blockId}: ${mismatchCount}/${matchedDialogue.length} lines had timing mismatches`);
      }

      const analysisResult: SpeakerAnalysisResult = {
        blockId: block.blockId,
        startTime: block.startTime,
        endTime: block.endTime,
        dialogue: matchedDialogue,
        speakers: speakers,
        identifiedSpeakers: result.identifiedSpeakers,
      };

      results.push(analysisResult);

      // Update context for next block
      // Take the last 3 lines of dialogue
      if (matchedDialogue && Array.isArray(matchedDialogue)) {
        const lastLines = matchedDialogue.slice(-3);
        previousContext = lastLines.map((l: SpeakerDialogueLine) => `${l.speaker}: ${l.text}`).join('\n');
      }

    } catch (error) {
      // Log the error
      if (sessionId && logId) {
        completeModelInteractionLog(sessionId, logId, interactionId, undefined, error);
      }
      console.error(`[SpeakerIdentification] Error analyzing block ${block.blockId}:`, error);
      
      // Create fallback speaker
      const unknownSpeakerId = randomUUID();
      const unknownName = withPseudonymIfGeneric('Unknown', `${sessionId || ''}:${block.blockId}:${block.startTime}`);
      const fallbackSpeakers: Speaker[] = [{ id: unknownSpeakerId, name: unknownName }];
      
      // Push a fallback result with timing from segments
      const fallbackDialogue: SpeakerDialogueLine[] = block.segmentTiming.length > 0
        ? block.segmentTiming.map((seg, idx) => ({
            id: randomUUID(),
            speakerId: unknownSpeakerId,
            speaker: unknownName,
            text: seg.text,
            startTime: seg.start,
            endTime: seg.end,
            timingMismatch: false,
          }))
        : [{
            id: randomUUID(),
            speakerId: unknownSpeakerId,
            speaker: unknownName,
            text: block.text,
            startTime: block.startTime,
            endTime: block.endTime,
            timingMismatch: true,
          }];

      results.push({
        blockId: block.blockId,
        startTime: block.startTime,
        endTime: block.endTime,
        dialogue: fallbackDialogue,
        speakers: fallbackSpeakers,
        identifiedSpeakers: [unknownName],
      });
      previousContext = null; // Reset context on error
    }
  }

  return results;
}

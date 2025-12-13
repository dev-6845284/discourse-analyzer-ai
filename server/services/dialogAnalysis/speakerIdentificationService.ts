import chatGptService from '../../llm_services/chatGptService';
import geminiService from '../../llm_services/geminiService';
import grokService from '../../llm_services/grokService';
import { buildSpeakerIdentificationPrompt } from '../../llm_services/prompts';
import { extractJson } from '../../llm_services/utils';
import { addModelInteractionLog, completeModelInteractionLog } from '../logService';
import { SegmentTiming } from './transcriptGrouper';
import { randomUUID } from 'crypto';
import { findBestMatchingPerson } from '../personService';
import { withPseudonymIfGeneric } from '../../utils/pseudonym';
import { calculateNameSimilarity, normalizeName } from '../../utils/nameMatching';

// ============================================================================
// Constants
// ============================================================================

/** Temperature for LLM calls - 0 for deterministic output */
const LLM_TEMPERATURE = 0;

/** Number of dialogue lines to pass as context to next block */
const CONTEXT_LINES_COUNT = 5;

/** Default similarity threshold for cross-block speaker matching */
const DEFAULT_SPEAKER_SIMILARITY_THRESHOLD = 0.85;

/** Model configurations */
const MODEL_CONFIG = {
  chatgpt: { provider: 'chatgpt', model: 'gpt-4o-mini' },
  grok: { provider: 'grok', model: 'grok-2-latest' },
  gemini: { provider: 'gemini', model: 'gemini-1.5-flash' },
} as const;

// ============================================================================
// Interfaces
// ============================================================================

export interface Speaker {
  id: string;
  name: string;
  personId?: string;
  isExistingPerson?: boolean;
}

export interface SpeakerDialogueLine {
  id: string;
  speakerId: string;
  speaker: string;
  text: string;
  startTime: number;
  endTime: number;
  timingMismatch?: boolean;
}

export interface SpeakerAnalysisResult {
  blockId: string;
  startTime: number;
  endTime: number;
  dialogue: SpeakerDialogueLine[];
  speakers: Speaker[];
  /** List of unique speaker names (derived from speakers array) */
  identifiedSpeakers: string[];
}

export interface SpeakerAnalysisRequest {
  blocks: Array<{
    blockId: string;
    startTime: number;
    endTime: number;
    text: string;
    segmentTiming: SegmentTiming[];
  }>;
  language: string;
  model: string;
  apiKeys: Record<string, string>;
  sessionId?: string;
  logId?: string;
  /** Similarity threshold for cross-block speaker matching (default: 0.85) */
  speakerSimilarityThreshold?: number;
}

/** Context passed between blocks for speaker continuity */
interface BlockContext {
  /** Last N dialogue lines for LLM context */
  lastLines: Array<{ speaker: string; text: string }>;
  /** Accumulated speakers from previous blocks */
  knownSpeakers: Speaker[];
}

/** Internal speaker registry for cross-block tracking */
interface SpeakerRegistry {
  speakers: Map<string, Speaker>; // normalized name -> Speaker
  threshold: number;
}

// ============================================================================
// Speaker Registry Functions
// ============================================================================

/**
 * Create a new speaker registry for tracking speakers across blocks
 */
function createSpeakerRegistry(threshold: number): SpeakerRegistry {
  return {
    speakers: new Map(),
    threshold,
  };
}

/**
 * Find an existing speaker in the registry using fuzzy name matching
 */
function findSpeakerInRegistry(
  registry: SpeakerRegistry,
  name: string
): Speaker | null {
  const normalizedInput = normalizeName(name);
  
  // First check for exact normalized match
  if (registry.speakers.has(normalizedInput)) {
    return registry.speakers.get(normalizedInput)!;
  }
  
  // Check fuzzy similarity against all registered speakers
  let bestMatch: Speaker | null = null;
  let bestSimilarity = 0;
  
  for (const [, speaker] of registry.speakers) {
    const similarity = calculateNameSimilarity(name, speaker.name);
    if (similarity >= registry.threshold && similarity > bestSimilarity) {
      bestSimilarity = similarity;
      bestMatch = speaker;
    }
  }
  
  return bestMatch;
}

/**
 * Register a speaker in the registry
 */
function registerSpeaker(registry: SpeakerRegistry, speaker: Speaker): void {
  const normalizedName = normalizeName(speaker.name);
  registry.speakers.set(normalizedName, speaker);
}

/**
 * Get all speakers from the registry as an array
 */
function getAllSpeakers(registry: SpeakerRegistry): Speaker[] {
  return Array.from(registry.speakers.values());
}

// ============================================================================
// Timing Matching
// ============================================================================

/**
 * Fuzzy match LLM dialogue output to original segment timing.
 * Returns dialogue lines with accurate timing from source segments.
 */
function matchDialogueToTiming(
  rawDialogue: Array<{ speaker: string; text: string; startTime?: number; endTime?: number }>,
  segmentTiming: SegmentTiming[],
  blockStartTime: number,
  blockEndTime: number,
  speakerIdMap: Map<string, string>
): SpeakerDialogueLine[] {
  if (!rawDialogue || rawDialogue.length === 0) {
    return [];
  }

  const result: SpeakerDialogueLine[] = [];
  const usedSegmentIndices = new Set<number>();
  const segmentCount = segmentTiming.length;
  const dialogueCount = rawDialogue.length;
  const blockDuration = blockEndTime - blockStartTime;
  const timePerLine = blockDuration / dialogueCount;

  for (let lineIndex = 0; lineIndex < dialogueCount; lineIndex++) {
    const line = rawDialogue[lineIndex];
    let bestMatch: SegmentTiming | null = null;
    let bestMatchIndex = -1;
    let bestScore = 0;
    let timingMismatch = false;

    // Try to use LLM-provided timing if within bounds
    if (line.startTime !== undefined && line.endTime !== undefined) {
      const llmStart = line.startTime;
      const llmEnd = line.endTime;
      
      if (llmStart >= blockStartTime && llmEnd <= blockEndTime + 1) {
        for (let i = 0; i < segmentCount; i++) {
          if (usedSegmentIndices.has(i)) continue;
          
          const seg = segmentTiming[i];
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

    // Fallback to text-based fuzzy matching if LLM timing is poor
    if (!bestMatch || bestScore < 0.3) {
      const lineWords = line.text.toLowerCase().split(/\s+/).slice(0, 5);
      const lineWordCount = lineWords.length;
      
      for (let i = 0; i < segmentCount; i++) {
        if (usedSegmentIndices.has(i)) continue;
        
        const seg = segmentTiming[i];
        const segWords = seg.text.toLowerCase().split(/\s+/);
        
        let matchCount = 0;
        for (const word of lineWords) {
          if (segWords.some(sw => sw.includes(word) || word.includes(sw))) {
            matchCount++;
          }
        }
        
        const score = lineWordCount > 0 ? matchCount / lineWordCount : 0;
        if (score > bestScore) {
          bestScore = score;
          bestMatch = seg;
          bestMatchIndex = i;
          timingMismatch = true;
        }
      }
    }

    const speakerId = speakerIdMap.get(line.speaker) || '';

    if (bestMatch && bestMatchIndex >= 0) {
      usedSegmentIndices.add(bestMatchIndex);
      result.push({
        id: randomUUID(),
        speakerId,
        speaker: line.speaker,
        text: line.text,
        startTime: bestMatch.start,
        endTime: bestMatch.end,
        timingMismatch: timingMismatch || bestScore < 0.5,
      });
    } else {
      // Fallback: interpolate timing
      result.push({
        id: randomUUID(),
        speakerId,
        speaker: line.speaker,
        text: line.text,
        startTime: blockStartTime + (lineIndex * timePerLine),
        endTime: blockStartTime + ((lineIndex + 1) * timePerLine),
        timingMismatch: true,
      });
    }
  }

  return result;
}

// ============================================================================
// Context Building
// ============================================================================

/**
 * Build context string for LLM prompt including known speakers
 */
function buildContextForPrompt(context: BlockContext | null): string | null {
  if (!context) return null;
  
  const parts: string[] = [];
  
  // Add known speakers list
  if (context.knownSpeakers.length > 0) {
    const speakerNames = context.knownSpeakers.map(s => s.name).join(', ');
    parts.push(`IDENTIFIED SPEAKERS SO FAR: ${speakerNames}`);
  }
  
  // Add last dialogue lines
  if (context.lastLines.length > 0) {
    parts.push('LAST LINES FROM PREVIOUS SEGMENT:');
    for (const line of context.lastLines) {
      parts.push(`${line.speaker}: ${line.text}`);
    }
  }
  
  return parts.length > 0 ? parts.join('\n') : null;
}

/**
 * Extract context from processed dialogue for next block
 */
function extractContextFromDialogue(
  dialogue: SpeakerDialogueLine[],
  allSpeakers: Speaker[]
): BlockContext {
  const lastLines = dialogue.slice(-CONTEXT_LINES_COUNT).map(d => ({
    speaker: d.speaker,
    text: d.text,
  }));
  
  return {
    lastLines,
    knownSpeakers: allSpeakers,
  };
}

// ============================================================================
// LLM Service Selection
// ============================================================================

/**
 * Get LLM configuration based on model and available API keys
 */
function getLlmConfig(
  model: string,
  apiKeys: Record<string, string>
): { provider: string; modelName: string; apiKey: string } {
  if (model === 'chatgpt' && apiKeys.chatgpt) {
    return {
      provider: MODEL_CONFIG.chatgpt.provider,
      modelName: MODEL_CONFIG.chatgpt.model,
      apiKey: apiKeys.chatgpt,
    };
  }
  
  if (model === 'grok' && apiKeys.grok) {
    return {
      provider: MODEL_CONFIG.grok.provider,
      modelName: MODEL_CONFIG.grok.model,
      apiKey: apiKeys.grok,
    };
  }
  
  const geminiKey = apiKeys.gemini || process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    throw new Error('Gemini API key is missing');
  }
  
  return {
    provider: MODEL_CONFIG.gemini.provider,
    modelName: MODEL_CONFIG.gemini.model,
    apiKey: geminiKey,
  };
}

/**
 * Call the appropriate LLM service
 */
async function callLlmService(
  provider: string,
  apiKey: string,
  modelName: string,
  prompt: string
): Promise<string> {
  const options = { model: modelName, prompt, temperature: LLM_TEMPERATURE };
  
  switch (provider) {
    case 'chatgpt':
      return chatGptService.generateContent(apiKey, options);
    case 'grok':
      return grokService.generateContent(apiKey, options);
    case 'gemini':
    default:
      return geminiService.generateContent(apiKey, options);
  }
}

// ============================================================================
// Speaker Processing
// ============================================================================

/**
 * Process identified speakers from LLM response, matching against registry
 */
async function processIdentifiedSpeakers(
  identifiedNames: string[],
  registry: SpeakerRegistry,
  sessionId: string | undefined,
  blockId: string,
  blockStartTime: number
): Promise<{ speakers: Speaker[]; speakerIdMap: Map<string, string> }> {
  const speakers: Speaker[] = [];
  const speakerIdMap = new Map<string, string>();
  const processedNames = new Set<string>();
  
  for (const rawName of identifiedNames) {
    // Apply pseudonym to generic names
    const displayName = withPseudonymIfGeneric(
      rawName,
      `${sessionId || ''}:${blockId}:${blockStartTime}`
    );
    
    // Skip if already processed in this block (handles duplicates from LLM)
    if (processedNames.has(displayName)) continue;
    processedNames.add(displayName);
    
    // Check registry for existing speaker (cross-block continuity)
    const existingInRegistry = findSpeakerInRegistry(registry, displayName);
    if (existingInRegistry) {
      speakers.push(existingInRegistry);
      speakerIdMap.set(displayName, existingInRegistry.id);
      console.log(`[SpeakerIdentification] Reusing speaker "${existingInRegistry.name}" for "${displayName}" (cross-block match)`);
      continue;
    }
    
    // Check database for existing person
    const existingPerson = await findBestMatchingPerson(displayName);
    
    if (existingPerson) {
      const speaker: Speaker = {
        id: existingPerson.personId,
        name: existingPerson.name,
        personId: existingPerson.personId,
        isExistingPerson: true,
      };
      speakers.push(speaker);
      speakerIdMap.set(displayName, speaker.id);
      registerSpeaker(registry, speaker);
      console.log(`[SpeakerIdentification] Matched "${displayName}" to existing person "${existingPerson.name}" (similarity: ${existingPerson.similarity.toFixed(2)})`);
    } else {
      // Create new speaker
      const speaker: Speaker = {
        id: randomUUID(),
        name: displayName,
        isExistingPerson: false,
      };
      speakers.push(speaker);
      speakerIdMap.set(displayName, speaker.id);
      registerSpeaker(registry, speaker);
    }
  }
  
  return { speakers, speakerIdMap };
}

// ============================================================================
// Main Export
// ============================================================================

/**
 * Main function to identify speakers in transcript blocks.
 * Processes blocks sequentially, maintaining speaker continuity across blocks.
 */
export async function identifySpeakers(
  request: SpeakerAnalysisRequest
): Promise<SpeakerAnalysisResult[]> {
  const {
    blocks,
    language,
    model,
    apiKeys,
    sessionId,
    logId,
    speakerSimilarityThreshold = DEFAULT_SPEAKER_SIMILARITY_THRESHOLD,
  } = request;
  
  // Initialize results and tracking structures
  const results: SpeakerAnalysisResult[] = [];
  const registry = createSpeakerRegistry(speakerSimilarityThreshold);
  let blockContext: BlockContext | null = null;
  
  // Get LLM configuration once before the loop
  const llmConfig = getLlmConfig(model, apiKeys);
  const { provider, modelName, apiKey } = llmConfig;
  
  for (const block of blocks) {
    const contextString = buildContextForPrompt(blockContext);
    const prompt = buildSpeakerIdentificationPrompt(
      block.text,
      block.segmentTiming,
      contextString,
      language
    );
    
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

    try {
      const responseText = await callLlmService(provider, apiKey, modelName, prompt);
      
      // Log successful response
      if (sessionId && logId && interactionId) {
        completeModelInteractionLog(sessionId, logId, interactionId, { responseText });
      }

      const jsonText = extractJson(responseText);
      if (!jsonText) {
        throw new Error('No valid JSON found in response');
      }
      
      const llmResult = JSON.parse(jsonText);
      const identifiedNames: string[] = llmResult.identifiedSpeakers || [];
      
      // Process speakers with registry for cross-block continuity
      const { speakers, speakerIdMap } = await processIdentifiedSpeakers(
        identifiedNames,
        registry,
        sessionId,
        block.blockId,
        block.startTime
      );

      // Match dialogue to timing
      const matchedDialogue = matchDialogueToTiming(
        llmResult.dialogue || [],
        block.segmentTiming,
        block.startTime,
        block.endTime,
        speakerIdMap
      );

      // Log timing mismatches
      const mismatchCount = matchedDialogue.filter(d => d.timingMismatch).length;
      if (mismatchCount > 0) {
        console.log(`[SpeakerIdentification] Block ${block.blockId}: ${mismatchCount}/${matchedDialogue.length} lines had timing mismatches`);
      }

      // Build result for this block
      const analysisResult: SpeakerAnalysisResult = {
        blockId: block.blockId,
        startTime: block.startTime,
        endTime: block.endTime,
        dialogue: matchedDialogue,
        speakers,
        identifiedSpeakers: speakers.map(s => s.name),
      };

      results.push(analysisResult);

      // Update context for next block (includes all known speakers)
      blockContext = extractContextFromDialogue(matchedDialogue, getAllSpeakers(registry));

    } catch (error) {
      // Log the error
      if (sessionId && logId && interactionId) {
        completeModelInteractionLog(sessionId, logId, interactionId, undefined, error);
      }
      console.error(`[SpeakerIdentification] Error analyzing block ${block.blockId}:`, error);
      
      // Create fallback speaker
      const unknownName = withPseudonymIfGeneric(
        'Unknown',
        `${sessionId || ''}:${block.blockId}:${block.startTime}`
      );
      const unknownSpeakerId = randomUUID();
      const fallbackSpeaker: Speaker = { id: unknownSpeakerId, name: unknownName };
      
      // Register fallback speaker for continuity
      registerSpeaker(registry, fallbackSpeaker);
      
      // Build fallback dialogue
      const fallbackDialogue: SpeakerDialogueLine[] = block.segmentTiming.length > 0
        ? block.segmentTiming.map(seg => ({
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
        speakers: [fallbackSpeaker],
        identifiedSpeakers: [unknownName],
      });
      
      // Update context even on error for continuity
      blockContext = extractContextFromDialogue(fallbackDialogue, getAllSpeakers(registry));
    }
  }

  return results;
}

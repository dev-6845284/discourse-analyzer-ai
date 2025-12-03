
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

export interface SpeakerAnalysisResult {
  blockId: string;
  startTime: number;
  endTime: number;
  dialogue: Array<{
    speaker: string;
    text: string;
  }>;
  identifiedSpeakers: string[]; // List of unique speakers found in this block
}

export interface SpeakerAnalysisRequest {
  blocks: Array<{
    blockId: string;
    startTime: number;
    endTime: number;
    text: string;
  }>;
  language: string;
  model: string;
  apiKeys: Record<string, string>;
}

/**
 * Creates a prompt for speaker identification
 */
function createSpeakerIdentificationPrompt(
  blockText: string,
  previousContext: string | null,
  language: string
): string {
  let prompt = `Analyze the following transcript segment and identify the speakers.
Transform the text into a dialogue format, attributing each line to a speaker.
Identify the Host and any Guests/Speakers. If names are mentioned, use them. Otherwise use "Host", "Speaker 1", etc.

Language of the transcript: ${language}

`;

  if (previousContext) {
    prompt += `CONTEXT FROM PREVIOUS SEGMENT (Use this to maintain speaker continuity):
${previousContext}

`;
  }

  prompt += `TRANSCRIPT SEGMENT TO ANALYZE:
${blockText}

OUTPUT FORMAT:
Return ONLY a valid JSON object with the following structure:
{
  "dialogue": [
    { "speaker": "Name or Role", "text": "Spoken text" },
    { "speaker": "Name or Role", "text": "Spoken text" }
  ],
  "identifiedSpeakers": ["List", "of", "unique", "speakers"]
}

IMPORTANT:
- Preserve the original meaning and content.
- Do not summarize, keep the dialogue as close to original as possible but cleaned up.
- Return ONLY JSON.
`;

  return prompt;
}

/**
 * Extracts JSON from response
 */
function extractJsonFromResponse(text: string): any {
  try {
    return JSON.parse(text);
  } catch (e) {
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1].trim());
      } catch (innerError) {
        // Continue to next check
      }
    }
    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]);
      } catch (innerError) {
        // Continue
      }
    }
    throw new Error('No valid JSON found in response');
  }
}

/**
 * Identifies speakers using Gemini
 */
async function identifySpeakersWithGemini(
  prompt: string,
  apiKey: string
): Promise<any> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();
  
  return extractJsonFromResponse(text);
}

/**
 * Identifies speakers using OpenAI
 */
async function identifySpeakersWithOpenAI(
  prompt: string,
  apiKey: string
): Promise<any> {
  const openai = new OpenAI({ apiKey });
  
  const completion = await openai.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
  });

  const content = completion.choices[0].message.content;
  if (!content) throw new Error('Empty response from OpenAI');
  
  return JSON.parse(content);
}

/**
 * Main function to identify speakers in transcript blocks
 */
export async function identifySpeakers(
  request: SpeakerAnalysisRequest
): Promise<SpeakerAnalysisResult[]> {
  const { blocks, language, model, apiKeys } = request;
  const results: SpeakerAnalysisResult[] = [];
  let previousContext: string | null = null;

  for (const block of blocks) {
    const prompt = createSpeakerIdentificationPrompt(block.text, previousContext, language);
    
    let result: any;
    try {
      if (model === 'chatgpt' && apiKeys.chatgpt) {
        result = await identifySpeakersWithOpenAI(prompt, apiKeys.chatgpt);
      } else {
        // Default to Gemini
        const apiKey = apiKeys.gemini || process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error('Gemini API key is missing');
        result = await identifySpeakersWithGemini(prompt, apiKey);
      }

      const analysisResult: SpeakerAnalysisResult = {
        blockId: block.blockId,
        startTime: block.startTime,
        endTime: block.endTime,
        dialogue: result.dialogue,
        identifiedSpeakers: result.identifiedSpeakers,
      };

      results.push(analysisResult);

      // Update context for next block
      // Take the last 3 lines of dialogue
      const lastLines = result.dialogue.slice(-3);
      previousContext = lastLines.map((l: any) => `${l.speaker}: ${l.text}`).join('\n');

    } catch (error) {
      console.error(`Error analyzing block ${block.blockId}:`, error);
      // Push error result or continue?
      // Let's push a fallback result
      results.push({
        blockId: block.blockId,
        startTime: block.startTime,
        endTime: block.endTime,
        dialogue: [{ speaker: 'Unknown', text: block.text }],
        identifiedSpeakers: ['Unknown'],
      });
      previousContext = null; // Reset context on error
    }
  }

  return results;
}

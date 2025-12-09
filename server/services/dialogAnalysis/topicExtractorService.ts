/**
 * Backend service for extracting topics and generating tag clouds from transcript chunks
 * Uses fast models (Gemini Flash or Grok) for speed with direct API calls
 */

import { createTopicExtractionPrompt } from '../../llm_services/prompts';

export interface WeightedTag {
  tag: string;
  relevance: number; // 0-1, how relevant to main topics
  importance: number; // 0-1, how important/prominent
  frequency: number; // How many times mentioned (raw count)
}

export interface TopicAnalysisResult {
  blockId: string;
  startTime: number;
  endTime: number;
  text: string;
  mainTopics: string[]; // Top 3-5 main topics
  tags: WeightedTag[]; // All extracted tags with weights
  summary: string; // Brief 1-2 sentence summary of block content
}

export interface TranscriptAnalysisRequest {
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
 * Extracts JSON from potentially markdown-wrapped response
 */
function extractJsonFromResponse(text: string): any {
  // Try to parse as raw JSON first
  try {
    return JSON.parse(text);
  } catch (e) {
    // If that fails, try to extract JSON from markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1].trim());
      } catch (innerError) {
        throw new Error('Failed to parse JSON from markdown block');
      }
    }
    // Try to find JSON object pattern
    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]);
      } catch (innerError) {
        throw new Error('Failed to parse JSON object from response');
      }
    }
    throw new Error('No valid JSON found in response');
  }
}

/**
 * Calls Gemini API directly for topic extraction
 */
async function extractTopicsWithGemini(
  apiKey: string,
  blockText: string,
  language: string
): Promise<any> {
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: createTopicExtractionPrompt(blockText, language),
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 500,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.statusText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('No response text from Gemini API');
  }

  return extractJsonFromResponse(text);
}

/**
 * Calls Grok API directly for topic extraction
 */
async function extractTopicsWithGrok(
  apiKey: string,
  blockText: string,
  language: string
): Promise<any> {
  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'grok-4-fast',
      messages: [
        {
          role: 'user',
          content: createTopicExtractionPrompt(blockText, language),
        },
      ],
      temperature: 0.3,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    throw new Error(`Grok API error: ${response.statusText}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error('No response text from Grok API');
  }

  return extractJsonFromResponse(text);
}

/**
 * Calls ChatGPT API directly for topic extraction (fallback)
 */
async function extractTopicsWithChatGPT(
  apiKey: string,
  blockText: string,
  language: string
): Promise<any> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: createTopicExtractionPrompt(blockText, language),
        },
      ],
      temperature: 0.3,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    throw new Error(`ChatGPT API error: ${response.statusText}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error('No response text from ChatGPT API');
  }

  return extractJsonFromResponse(text);
}

/**
 * Extracts topics from a single transcript block using the specified fast model
 */
export async function extractBlockTopics(
  blockId: string,
  startTime: number,
  endTime: number,
  text: string,
  model: string,
  apiKeys: Record<string, string>,
  language: string
): Promise<TopicAnalysisResult> {
  try {
    let result: any;

    if (model === 'gemini' || model === 'gemini-flash') {
      const apiKey = apiKeys['gemini'];
      if (!apiKey) {
        throw new Error('Gemini API key not found');
      }
      result = await extractTopicsWithGemini(apiKey, text, language);
    } else if (model === 'grok' || model === 'grok-fast') {
      const apiKey = apiKeys['grok'];
      if (!apiKey) {
        throw new Error('Grok API key not found');
      }
      result = await extractTopicsWithGrok(apiKey, text, language);
    } else if (model === 'chatgpt') {
      const apiKey = apiKeys['chatgpt'] || apiKeys['openai'];
      if (!apiKey) {
        throw new Error('ChatGPT API key not found');
      }
      result = await extractTopicsWithChatGPT(apiKey, text, language);
    } else {
      // Default to Gemini
      const apiKey = apiKeys['gemini'];
      if (!apiKey) {
        throw new Error('No API key found for topic extraction');
      }
      result = await extractTopicsWithGemini(apiKey, text, language);
    }

    return {
      blockId,
      startTime,
      endTime,
      text,
      mainTopics: result.mainTopics || [],
      tags: result.tags || [],
      summary: result.summary || '',
    };
  } catch (error: any) {
    console.error(`Error extracting topics for block ${blockId}:`, error);
    // Return minimal result on error
    return {
      blockId,
      startTime,
      endTime,
      text,
      mainTopics: [],
      tags: [],
      summary: 'Error analyzing block',
    };
  }
}

/**
 * Batch process multiple transcript blocks for topic extraction
 * Processes sequentially to avoid rate limiting
 */
export async function extractTranscriptTopics(
  request: TranscriptAnalysisRequest
): Promise<TopicAnalysisResult[]> {
  const results: TopicAnalysisResult[] = [];

  for (const block of request.blocks) {
    const result = await extractBlockTopics(
      block.blockId,
      block.startTime,
      block.endTime,
      block.text,
      request.model,
      request.apiKeys,
      request.language
    );
    results.push(result);

    // Add small delay between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return results;
}

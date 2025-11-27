import * as crypto from 'crypto';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import {
  Quote,
  AgenticSearchOptions,
  AgenticSearchResult,
  ArticleRecommendation,
  JsonParsingError,
} from '../types';
import { appendLogRequestPayload, addModelInteractionLog, completeModelInteractionLog } from '../services/logService';
import { extractJson } from './utils';
import { getValidatedResponseText } from './geniniService';
import { buildPlanningPrompt, buildSynthesisPrompt } from './prompts/agentic';
import { callChatGptAPI, CHATGPT_MODEL, CHATGPT_FORMATTER_MODEL, CHAT_GPT_MINI } from './chatGptService';

interface AgenticProvider {
  plan(
    sessionId: string,
    logId: string,
    personName: string,
    timePeriodDescription: string,
    options: AgenticSearchOptions
  ): Promise<string[]>;

  execute(
    sessionId: string,
    logId: string,
    queries: string[]
  ): Promise<string[]>;

  synthesize(
    sessionId: string,
    logId: string,
    personName: string,
    mode: 'quotes' | 'articles',
    searchResults: string[],
    timePeriodDescription: string,
    languages: string[]
  ): Promise<AgenticSearchResult>;
}

class GeminiAgenticProvider implements AgenticProvider {
  private ai: GoogleGenAI;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async plan(
    sessionId: string,
    logId: string,
    personName: string,
    timePeriodDescription: string,
    options: AgenticSearchOptions
  ): Promise<string[]> {
    const planningPrompt = buildPlanningPrompt(
      personName,
      timePeriodDescription,
      options.topics,
      options.keywords
    );

    appendLogRequestPayload(sessionId, logId, { step: 'planning', provider: 'gemini', prompt: planningPrompt });

    try {
      const planResponse = await this.executePrompt(
        'gemini-2.5-flash',
        planningPrompt,
        sessionId,
        logId,
        'planning',
        false
      );
      
      const jsonPlan = extractJson(planResponse);
      if (jsonPlan) {
        return JSON.parse(jsonPlan);
      } else {
        console.warn("Failed to parse planning response, falling back to default query.");
        return [`${personName} quotes ${timePeriodDescription}`];
      }
    } catch (e) {
      console.error("Planning failed:", e);
      return [`${personName} quotes ${timePeriodDescription}`];
    }
  }

  async execute(
    sessionId: string,
    logId: string,
    queries: string[]
  ): Promise<string[]> {
    const searchResults: string[] = [];
    const activeQueries = queries.slice(0, 4);
    
    await Promise.all(activeQueries.map(async (query, index) => {
      const searchPrompt = `Search for "${query}". Provide a detailed summary of the findings, focusing on quotes, dates, and sources.`;
      try {
        const result = await this.executePrompt(
          'gemini-2.5-flash-lite',
          searchPrompt,
          sessionId,
          logId,
          `search-${index}`,
          true
        );
        searchResults.push(`Query: ${query}\nResult:\n${result}\n---\n`);
      } catch (e) {
        console.error(`Search failed for query "${query}":`, e);
      }
    }));

    if (searchResults.length === 0) {
      throw new Error("All search attempts failed.");
    }
    return searchResults;
  }

  async synthesize(
    sessionId: string,
    logId: string,
    personName: string,
    mode: 'quotes' | 'articles',
    searchResults: string[],
    timePeriodDescription: string,
    languages: string[]
  ): Promise<AgenticSearchResult> {
    const synthesisPrompt = buildSynthesisPrompt(
      personName,
      mode,
      searchResults.join('\n'),
      timePeriodDescription,
      languages
    );

    appendLogRequestPayload(sessionId, logId, { step: 'synthesis', provider: 'gemini', prompt: synthesisPrompt });

    const finalResponse = await this.executePrompt(
      'gemini-2.5-flash',
      synthesisPrompt,
      sessionId,
      logId,
      'synthesis',
      false
    );

    const jsonFinal = extractJson(finalResponse);
    if (!jsonFinal) {
      throw new Error("Failed to parse synthesis response.");
    }

    try {
      const parsed = JSON.parse(jsonFinal);
      if (mode === 'quotes') {
        const quotes = parsed.quotes || [];
        const quotesWithIds = quotes.map((q: any) => ({
          ...q,
          id: q.id || crypto.randomUUID(),
        }));
        return { type: 'quotes', data: quotesWithIds };
      } else {
        return { type: 'articles', data: parsed.articles || [] };
      }
    } catch (e) {
      throw new JsonParsingError("Failed to parse final JSON.", jsonFinal);
    }
  }

  private async executePrompt(
    model: string,
    prompt: string,
    sessionId: string,
    logId: string,
    taskName: string,
    useSearch: boolean
  ): Promise<string> {
    const requestDetails = {
      model,
      contents: prompt,
      config: {
        temperature: 0.5,
        tools: useSearch ? [{ googleSearch: {} }] : undefined,
      },
    };

    const interactionId = addModelInteractionLog(sessionId, logId, {
      provider: 'Google',
      model: requestDetails.model,
      operation: 'generateContent',
      requestPayload: requestDetails,
      metadata: { task: taskName },
    });

    let response: GenerateContentResponse;
    let responseSnapshot: any;
    let capturedError: any;

    try {
      response = await this.ai.models.generateContent(requestDetails);
      responseSnapshot = response;
      return getValidatedResponseText(response, taskName);
    } catch (error) {
      capturedError = error;
      throw error;
    } finally {
      completeModelInteractionLog(sessionId, logId, interactionId, responseSnapshot, capturedError);
    }
  }
}

class OpenAIAgenticProvider implements AgenticProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async plan(
    sessionId: string,
    logId: string,
    personName: string,
    timePeriodDescription: string,
    options: AgenticSearchOptions
  ): Promise<string[]> {
    const planningPrompt = buildPlanningPrompt(
      personName,
      timePeriodDescription,
      options.topics,
      options.keywords
    );

    appendLogRequestPayload(sessionId, logId, { step: 'planning', provider: 'openai', prompt: planningPrompt });

    try {
      const planResponse = await callChatGptAPI(
        this.apiKey,
        [{ role: 'user', content: planningPrompt }],
        logId,
        sessionId,
        {
          model: CHAT_GPT_MINI,
          enforceJson: true,
          metadata: { task: 'planning' }
        }
      );
      
      const jsonPlan = extractJson(planResponse);
      if (jsonPlan) {
        return JSON.parse(jsonPlan);
      } else {
        console.warn("Failed to parse planning response, falling back to default query.");
        return [`${personName} quotes ${timePeriodDescription}`];
      }
    } catch (e) {
      console.error("Planning failed:", e);
      return [`${personName} quotes ${timePeriodDescription}`];
    }
  }

  async execute(
    sessionId: string,
    logId: string,
    queries: string[]
  ): Promise<string[]> {
    const searchResults: string[] = [];
    const activeQueries = queries.slice(0, 4);
    
    await Promise.all(activeQueries.map(async (query, index) => {
      const searchPrompt = `Search for "${query}". Provide a detailed summary of the findings, focusing on quotes, dates, and sources.`;
      try {
        const result = await callChatGptAPI(
          this.apiKey,
          [{ role: 'user', content: searchPrompt }],
          logId,
          sessionId,
          {
            model: CHATGPT_MODEL,
            useSearch: true,
            enforceJson: false,
            metadata: { task: `search-${index}` }
          }
        );
        searchResults.push(`Query: ${query}\nResult:\n${result}\n---\n`);
      } catch (e) {
        console.error(`Search failed for query "${query}":`, e);
      }
    }));

    if (searchResults.length === 0) {
      throw new Error("All search attempts failed.");
    }
    return searchResults;
  }

  async synthesize(
    sessionId: string,
    logId: string,
    personName: string,
    mode: 'quotes' | 'articles',
    searchResults: string[],
    timePeriodDescription: string,
    languages: string[]
  ): Promise<AgenticSearchResult> {
    const synthesisPrompt = buildSynthesisPrompt(
      personName,
      mode,
      searchResults.join('\n'),
      timePeriodDescription,
      languages
    );

    appendLogRequestPayload(sessionId, logId, { step: 'synthesis', provider: 'openai', prompt: synthesisPrompt });

    const finalResponse = await callChatGptAPI(
      this.apiKey,
      [{ role: 'user', content: synthesisPrompt }],
      logId,
      sessionId,
      {
        model: CHATGPT_FORMATTER_MODEL,
        enforceJson: true,
        metadata: { task: 'synthesis' }
      }
    );

    const jsonFinal = extractJson(finalResponse);
    if (!jsonFinal) {
      throw new Error("Failed to parse synthesis response.");
    }

    try {
      const parsed = JSON.parse(jsonFinal);
      if (mode === 'quotes') {
        const quotes = parsed.quotes || [];
        const quotesWithIds = quotes.map((q: any) => ({
          ...q,
          id: q.id || crypto.randomUUID(),
        }));
        return { type: 'quotes', data: quotesWithIds };
      } else {
        return { type: 'articles', data: parsed.articles || [] };
      }
    } catch (e) {
      throw new JsonParsingError("Failed to parse final JSON.", jsonFinal);
    }
  }
}

class AgenticService {
  public async search(
    providerName: 'gemini' | 'openai',
    apiKey: string,
    personName: string,
    timePeriod: { description: string; startDate?: string; endDate?: string },
    languages: string[],
    options: AgenticSearchOptions,
    logId: string,
    sessionId: string
  ): Promise<AgenticSearchResult> {
    if (!apiKey) throw new Error(`${providerName} API key is missing.`);

    let provider: AgenticProvider;
    if (providerName === 'gemini') {
      provider = new GeminiAgenticProvider(apiKey);
    } else {
      provider = new OpenAIAgenticProvider(apiKey);
    }

    // --- Step 1: Planning ---
    const queries = await provider.plan(sessionId, logId, personName, timePeriod.description, options);

    // --- Step 2: Execution (Parallel Search) ---
    const searchResults = await provider.execute(sessionId, logId, queries);

    // --- Step 3: Synthesis ---
    return await provider.synthesize(sessionId, logId, personName, options.mode, searchResults, timePeriod.description, languages);
  }
}

export default new AgenticService();

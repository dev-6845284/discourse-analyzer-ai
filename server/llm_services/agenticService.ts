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

class AgenticService {
  public async search(
    apiKey: string,
    personName: string,
    timePeriod: { description: string; startDate?: string; endDate?: string },
    languages: string[],
    options: AgenticSearchOptions,
    logId: string,
    sessionId: string
  ): Promise<AgenticSearchResult> {
    if (!apiKey) throw new Error("Gemini API key is missing.");
    const ai = new GoogleGenAI({ apiKey });

    // --- Step 1: Planning ---
    const planningPrompt = buildPlanningPrompt(
      personName,
      timePeriod.description,
      options.topics,
      options.keywords
    );

    appendLogRequestPayload(sessionId, logId, { step: 'planning', prompt: planningPrompt });

    let queries: string[] = [];
    try {
      const planResponse = await this.executePrompt(
        ai, 
        'gemini-2.5-flash',
        planningPrompt, 
        sessionId, 
        logId, 
        'planning', 
        false // No search tool needed for planning
      );
      
      const jsonPlan = extractJson(planResponse);
      if (jsonPlan) {
        queries = JSON.parse(jsonPlan);
      } else {
        console.warn("Failed to parse planning response, falling back to default query.");
        queries = [`${personName} quotes ${timePeriod.description}`];
      }
    } catch (e) {
      console.error("Planning failed:", e);
      queries = [`${personName} quotes ${timePeriod.description}`];
    }

    // --- Step 2: Execution (Parallel Search) ---
    const searchResults: string[] = [];
    
    // Limit to 4 queries to avoid rate limits and excessive time
    const activeQueries = queries.slice(0, 4);
    
    await Promise.all(activeQueries.map(async (query, index) => {
      const searchPrompt = `Search for "${query}". Provide a detailed summary of the findings, focusing on quotes, dates, and sources.`;
      try {
        const result = await this.executePrompt(
          ai,
          'gemini-2.5-flash-lite',
          searchPrompt,
          sessionId,
          logId,
          `search-${index}`,
          true // Enable Google Search
        );
        searchResults.push(`Query: ${query}\nResult:\n${result}\n---\n`);
      } catch (e) {
        console.error(`Search failed for query "${query}":`, e);
      }
    }));

    if (searchResults.length === 0) {
      throw new Error("All search attempts failed.");
    }

    // --- Step 3: Synthesis ---
    const synthesisPrompt = buildSynthesisPrompt(
      personName,
      options.mode,
      searchResults.join('\n'),
      timePeriod.description,
      languages
    );

    appendLogRequestPayload(sessionId, logId, { step: 'synthesis', prompt: synthesisPrompt });

    const finalResponse = await this.executePrompt(
      ai,
      'gemini-2.5-flash',
      synthesisPrompt,
      sessionId,
      logId,
      'synthesis',
      false // No search tool needed for synthesis, just processing
    );

    const jsonFinal = extractJson(finalResponse);
    if (!jsonFinal) {
      throw new Error("Failed to parse synthesis response.");
    }

    try {
      const parsed = JSON.parse(jsonFinal);
      if (options.mode === 'quotes') {
        const quotes = parsed.quotes || [];
        // Assign unique IDs to quotes to prevent frontend state issues (e.g. updating all quotes when one is analyzed)
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
    ai: GoogleGenAI,
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
      response = await ai.models.generateContent(requestDetails);
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

export default new AgenticService();

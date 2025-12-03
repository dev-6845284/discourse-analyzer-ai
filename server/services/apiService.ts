import { Request, Response } from 'express';
import {
  Quote,
  AnalysisResult,
  ModelResponseError,
  JsonParsingError,
} from '../types';
import geminiService from '../llm_services/geniniService';
import chatGptService from '../llm_services/chatGptService';
import grokService from '../llm_services/grokService';
import agenticService from '../llm_services/agenticService';
import { addLogEntry, updateLogEntry, getLogs } from './logService';
import { LlmService } from '../llm_services/LlmService';
import { postProcessResponse } from './responseProcessor';
import { fetchArticle } from '../utils/articleExtractor';
import { getTranscript } from './youtubeService';
import { extractTranscriptTopics } from './topicExtractorService';
import { identifySpeakers } from './speakerIdentificationService';
import { analyzeDialogTopics as analyzeDialogTopicsService } from './dialogAnalysisService';

const getService = (model: string, apiKeys?: Record<string, string>): { service: LlmService; apiKey: string } => {
  switch (model) {
    case 'gemini':
      return { service: geminiService, apiKey: apiKeys?.gemini || process.env.GEMINI_API_KEY! };
    case 'chatgpt':
      return { service: chatGptService, apiKey: apiKeys?.chatgpt || process.env.CHATGPT_API_KEY! };
    case 'grok':
      return { service: grokService, apiKey: apiKeys?.grok || process.env.GROK_API_KEY! };
    default:
      throw new Error('Invalid model specified');
  }
};

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
    apiKeys,
  } = req.body;

  const logId = addLogEntry(req.session.id!, 'fetchQuotes', { personName, model, context, maxQuotes, languages, category, rating, sortOrder, maxQuoteLength, timePeriod });

  try {
    const { service, apiKey } = getService(model, apiKeys);
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
    res.status(500).json({ message: 'Failed to fetch quotes' });
  }
};

export const agenticSearch = async (req: Request, res: Response) => {
  const {
    personName,
    timePeriod,
    languages,
    options,
    apiKeys,
    provider = 'gemini',
  } = req.body;

  const logId = addLogEntry(req.session.id!, 'agenticSearch', { personName, timePeriod, languages, options, provider });

  try {
    let apiKey: string;
    if (provider === 'openai') {
      apiKey = apiKeys?.openai || process.env.OPENAI_API_KEY!;
    } else {
      apiKey = apiKeys?.gemini || process.env.GEMINI_API_KEY!;
    }
    
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
  const { quoteText, quoteLanguageCode, quoteLanguageName, model, temperature, apiKeys, analysisContext, links } = req.body;
  const logId = addLogEntry(req.session.id!, 'analyzeQuote', { quoteText, quoteLanguageCode, quoteLanguageName, model, analysisContext, links });

  try {
    const { service, apiKey } = getService(model, apiKeys);
    const analysis = await service.analyzeQuoteText(apiKey, quoteText, quoteLanguageCode, quoteLanguageName, temperature, logId, req.session.id!, analysisContext, links);
    updateLogEntry(req.session.id!, logId, analysis);
    res.json(analysis);
  } catch (error: any) {
    console.error('Error analyzing quote:', error);
    updateLogEntry(req.session.id!, logId, undefined, error);
    if (error instanceof JsonParsingError) {
      return res.status(500).json({ message: error.message, rawResponse: error.rawResponse, errorType: error.name });
    }
     if (error instanceof ModelResponseError) {
      return res.status(500).json({ message: error.message, errorType: error.name });
    }
    res.status(500).json({ message: 'Failed to analyze quote' });
  }
};

export const extractQuotes = async (req: Request, res: Response) => {
  const { personName, textContent, model, temperature, apiKeys, source, title, date, languageCode, languageName } = req.body;
  const logId = addLogEntry(req.session.id!, 'extractQuote', { personName, textContent, model });

  try {
    const { service, apiKey } = getService(model, apiKeys);
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
    res.status(500).json({ message: 'Failed to extract quotes' });
  }
};

export const extractQuotesFromUrl = async (req: Request, res: Response) => {
  const { url, personName, model, temperature, apiKeys } = req.body;
  const logId = addLogEntry(req.session.id!, 'extractQuote', { personName, url, model, extractionType: 'url' });

  try {
    // Step 1: Fetch and extract article content
    const article = await fetchArticle(url);

    // Step 2: Use LLM to extract quotes from article content
    const { service, apiKey } = getService(model, apiKeys);
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
    res.status(500).json({ message: 'Failed to extract quotes from URL' });
  }
};

export const improveSingleQuote = async (req: Request, res: Response) => {
  const { quote, personName, model, temperature, apiKeys } = req.body;
  const logId = addLogEntry(req.session.id!, 'improveQuote', { quote, personName, model });

  try {
    const { service, apiKey } = getService(model, apiKeys);
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
    res.status(500).json({ message: 'Failed to improve quote' });
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
  const { url, language } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const transcript = await getTranscript(url, language);
    res.json(transcript);
  } catch (error: any) {
    console.error('Error fetching transcript:', error);
    const status = error.code === 'CAPTIONS_NOT_FOUND' ? 404 : 
                   error.code === 'VIDEO_RESTRICTED' ? 403 :
                   error.code === 'INVALID_VIDEO_ID' ? 400 : 500;
    res.status(status).json({ error: error.message, code: error.code });
  }
};

/**
 * Analyze YouTube transcript for topics and generate tag clouds
 * Groups transcript into 15-minute blocks and extracts topics using fast models
 */
export const analyzeTranscriptTopics = async (req: Request, res: Response) => {
  const { blocks, language, model, apiKeys } = req.body;

  if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
    return res.status(400).json({ error: 'Blocks array is required and must not be empty' });
  }

  if (!apiKeys || typeof apiKeys !== 'object') {
    return res.status(400).json({ error: 'API keys are required' });
  }

  try {
    console.log(`[TopicAnalysis] Analyzing ${blocks.length} transcript blocks with model: ${model || 'gemini'}`);
    
    const results = await extractTranscriptTopics({
      blocks,
      language: language || 'en',
      model: model || 'gemini',
      apiKeys,
    });

    console.log(`[TopicAnalysis] Successfully analyzed ${results.length} blocks`);
    res.json(results);
  } catch (error: any) {
    console.error('Error analyzing transcript topics:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to analyze transcript topics',
      details: error.stack 
    });
  }
};

/**
 * Analyze YouTube transcript blocks for speaker identification
 */
export const analyzeTranscriptSpeakers = async (req: Request, res: Response) => {
  const { blocks, language, model, apiKeys } = req.body;

  if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
    return res.status(400).json({ error: 'Blocks array is required and must not be empty' });
  }

  if (!apiKeys || typeof apiKeys !== 'object') {
    return res.status(400).json({ error: 'API keys are required' });
  }

  try {
    console.log(`[SpeakerAnalysis] Analyzing ${blocks.length} transcript blocks with model: ${model || 'gemini'}`);
    
    const results = await identifySpeakers({
      blocks,
      language: language || 'en',
      model: model || 'gemini',
      apiKeys,
    });

    console.log(`[SpeakerAnalysis] Successfully analyzed ${results.length} blocks`);
    res.json(results);
  } catch (error: any) {
    console.error('Error analyzing transcript speakers:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to analyze transcript speakers',
      details: error.stack 
    });
  }
};

/**
 * Analyze dialog for topic segmentation and analysis
 */
export const analyzeDialogTopics = async (req: Request, res: Response) => {
  const { dialog, language, fastModel, betterModel, apiKeys } = req.body;

  if (!dialog || !Array.isArray(dialog) || dialog.length === 0) {
    return res.status(400).json({ error: 'Dialog array is required and must not be empty' });
  }

  if (!apiKeys || typeof apiKeys !== 'object') {
    return res.status(400).json({ error: 'API keys are required' });
  }

  try {
    console.log(`[DialogAnalysis] Analyzing dialog with ${dialog.length} blocks`);
    
    const results = await analyzeDialogTopicsService({
      dialog,
      language: language || 'en',
      fastModel,
      betterModel,
      apiKeys,
    });

    console.log(`[DialogAnalysis] Successfully analyzed ${results.length} topic groups`);
    res.json(results);
  } catch (error: any) {
    console.error('Error analyzing dialog topics:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to analyze dialog topics',
      details: error.stack 
    });
  }
};


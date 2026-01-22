import chatGptService from '../../llm_services/chatGptService';
import grokService from '../../llm_services/grokService';
import geminiService from '../../llm_services/geminiService';

import { getProviderFromModel } from './utils';

export async function generateContent(
  model: string,
  apiKey: string,
  options: any
): Promise<string> {
  const provider = getProviderFromModel(model);

  if (!apiKey) {
    throw new Error(`API key for ${provider} (model: ${model}) is missing`);
  }

  switch (provider) {
    case 'openai':
      return chatGptService.generateContent(apiKey, { ...options, model });
    case 'grok':
      return grokService.generateContent(apiKey, { ...options, model });
    case 'gemini':
    default:
      return geminiService.generateContent(apiKey, { ...options, model });
  }
}

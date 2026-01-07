import chatGptService from '../../llm_services/chatGptService';
import grokService from '../../llm_services/grokService';
import geminiService from '../../llm_services/geminiService';

export async function generateContent(
  model: string,
  apiKeys: Record<string, string>,
  options: any
): Promise<string> {
  let provider = 'gemini';
  let apiKey = apiKeys['gemini'];

  const normalizedModel = (model === 'chatgpt' || model.startsWith('gpt')) ? 'openai' : model;

  if (normalizedModel === 'openai') {
    provider = 'openai';
    apiKey = apiKeys['openai'];
  } else if (normalizedModel === 'grok' || normalizedModel.startsWith('grok')) {
    provider = 'grok';
    apiKey = apiKeys['grok'];
  } else if (normalizedModel === 'gemini' || normalizedModel.startsWith('gemini')) {
    provider = 'gemini';
    apiKey = apiKeys['gemini'];
  }

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

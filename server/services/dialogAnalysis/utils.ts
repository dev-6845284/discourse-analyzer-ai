
export function extractJsonFromResponse(text: string): any {
  try {
    // Remove markdown code blocks if present
    const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleanText);
  } catch (e) {
    // Fallback: try to find JSON object in text
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (e2) {
        throw new Error('Failed to parse JSON from response');
      }
    }
    throw new Error('Failed to parse JSON from response');
  }
}

export function getProviderFromModel(model: string = ''): 'gemini' | 'openai' | 'grok' {
  const m = model.toLowerCase();
  if (m.includes('grok')) return 'grok';
  if (m.includes('openai') || m.includes('gpt') || m.includes('o1-') || m.includes('o3-')) return 'openai';
  return 'gemini'; // Default to Gemini
}

import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Quote, AnalysisResult, GroundingChunk } from "../types";

// The AI client will be initialized on-demand within each function.

/**
 * A more robust way to extract a JSON object from a string that might be
 * surrounded by other text or markdown code fences.
 * @param text The raw text from the AI response.
 * @returns The cleaned JSON string.
 */
const extractJson = (text: string): string | null => {
  // Use a regex to find the JSON block, which is more robust
  // than string slicing. It looks for the first '{' to the last '}'.
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch && jsonMatch[0]) {
    return jsonMatch[0];
  }
  return null;
};


export const fetchQuotesForPerson = async (apiKey: string, personName: string, languages: string[], resultCount: number, existingQuotesText: string[]): Promise<Quote[]> => {
  if (!apiKey) throw new Error("Gemini API key is missing.");
  const ai = new GoogleGenAI({ apiKey });

  try {
    const languageInstruction = languages.length > 0
        ? `Search for texts in the following languages: ${languages.join(', ')}.`
        : 'Search for texts primarily in English.';

    let exclusionInstruction = '';
    if (existingQuotesText && existingQuotesText.length > 0) {
        const quotesToExclude = existingQuotesText.map(q => `- "${q.slice(0, 150)}..."`).join('\n');
        exclusionInstruction = `
You MUST find new quotes that are NOT in the following list. Do not repeat any of the quotes below.
Here are the quotes that have already been found:
${quotesToExclude}
`;
    }

    // FIX: The prompt is updated to explicitly request the source URL and title for each quote.
    // It also now uses the user-defined result count.
    const prompt = `Find and list up to ${resultCount} distinct and significant public quotes by ${personName}. ${languageInstruction} ${exclusionInstruction} Focus on controversial or impactful statements.
For each quote, you MUST provide the source URL and a title for the source.
Return the response as a single, valid JSON object with a key "quotes". The value of "quotes" should be an array of objects.
Each object in the array must have three string properties: "text" (the quote itself), "source" (the direct URL to the source), and "title" (the title of the source page).
If you cannot find a specific source for a quote, use a general, high-quality source about the person's public statements.
Example format: { "quotes": [{"text": "This is the quote.", "source": "https://example.com/article", "title": "Article Title"}] }
Do not include any other text or markdown formatting outside of the JSON object.`;
    
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const rawText = response.text;

    // FIX: Check if the response text is undefined or empty to prevent crash.
    if (!rawText) {
      throw new Error("The model returned no content. This might happen if there's no information available for the specified person, or if the request was blocked by safety settings.");
    }
    
    // FIX: Use a robust regex-based method to extract the JSON object.
    const jsonText = extractJson(rawText);
    if (!jsonText) {
        console.error("No valid JSON object found in the AI response:", rawText);
        throw new Error("Could not find a valid JSON object in the AI's response.");
    }
    
    let parsedResponse: { quotes: { text: string; source: string; title: string; }[] };
    try {
        parsedResponse = JSON.parse(jsonText);
    } catch (e) {
        console.error("Failed to parse JSON response:", jsonText);
        throw new Error("Could not parse the AI's response. The format was unexpected.");
    }

    const quotesData = parsedResponse.quotes;

    if (!quotesData || !Array.isArray(quotesData) || quotesData.length === 0) {
        return []; // Return an empty array instead of throwing an error if no new quotes are found.
    }
    
    // FIX: Map the new JSON structure to the app's Quote type.
    const quotes: Quote[] = quotesData.map((q, index) => {
        // Add a check for malformed quote objects from the AI
        if (!q.text || !q.source || !q.title) {
            console.warn(`Skipping malformed quote object at index ${index}:`, q);
            return null;
        }
        return {
            id: `quote-${Date.now()}-${index}`,
            text: q.text.trim(),
            source: q.source,
            title: q.title,
        };
    }).filter((q): q is Quote => q !== null); // Filter out any nulls from malformed objects

    if (quotes.length === 0) {
        // This can happen if the AI returns malformed data.
        // It's not an error if it simply found no *new* quotes.
        console.warn("The AI response contained malformed quote data, but no valid quotes could be extracted.");
    }

    return quotes;

  } catch (error) {
    console.error("Error fetching quotes:", error);
    // FIX: Re-throw the original error to provide more specific feedback to the user.
    if (error instanceof Error) {
        throw error;
    }
    throw new Error("An unknown error occurred while fetching quotes.");
  }
};


export const analyzeQuoteText = async (apiKey: string, quoteText: string, languages: string[]): Promise<AnalysisResult> => {
    if (!apiKey) throw new Error("Gemini API key is missing.");
    const ai = new GoogleGenAI({ apiKey });
    
    try {
        const languageContext = languages.length > 0
            ? ` The original text is expected to be in one of the following languages: ${languages.join(', ')}.`
            : '';
        // FIX: The prompt is updated to include the schema description directly,
        // as responseSchema cannot be used with the googleSearch tool.
        const prompt = `Perform a detailed analysis of the following text.${languageContext} Fact-check all claims using online search. Provide a structured analysis as a single, valid JSON object (do not wrap it in markdown).
The JSON object must have keys: "Populism", "Fact Twisting", "Lies & False Claims", and "Inflammatory Language".
Each key must have a value that is an object with two properties:
1. "rating": A string with one of these values: "None", "Low", "Medium", "High", "Severe".
2. "justification": A string explaining the rating.

Analyze this text: "${quoteText}"`;

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                // FIX: Per @google/genai guidelines, responseMimeType and responseSchema are not allowed when using the googleSearch tool.
                tools: [{ googleSearch: {} }],
            }
        });
        
        const rawText = response.text;
        if (!rawText) {
            throw new Error("The model returned no content for analysis.");
        }

        // FIX: Use a robust regex-based method to extract the JSON object.
        const jsonText = extractJson(rawText);
        if (!jsonText) {
            console.error("No valid JSON object found in the AI analysis response:", rawText);
            throw new Error("Could not find a valid JSON object in the AI's analysis response.");
        }
        
        return JSON.parse(jsonText);

    } catch (error) {
        console.error("Error analyzing quote:", error);
        throw new Error("Failed to analyze the quote. The API may be unavailable or the response was invalid.");
    }
};

export const extractQuotesFromText = async (apiKey: string, personName: string, textContent: string): Promise<Quote[]> => {
  if (!apiKey) throw new Error("Gemini API key is missing.");
  const ai = new GoogleGenAI({ apiKey });

  try {
    // FIX: The prompt is updated to handle cases where the input is a single quote, not just a block of text.
    // It instructs the AI to check if the text itself is a quote by the person and return it if so.
    const prompt = `Analyze the following text to extract quotes by "${personName}".

The provided text can be one of two things:
1. A block of text (like an article) containing one or more statements explicitly attributed to "${personName}".
2. A single, direct quote by "${personName}" itself, without any other context or attribution.

Your task is to identify which case it is and act accordingly.
- If the text is a block of text (case 1), extract all statements explicitly attributed to "${personName}".
- If the text appears to be a direct quote by "${personName}" (case 2), return the text itself as the single quote.

Return the response as a single, valid JSON object with a key "quotes". The value of "quotes" should be an array of strings, where each string is a full quote.
If you find no quotes by "${personName}" in the text, return an empty array.
Do not include any other text or markdown formatting outside of the JSON object.

Here is the text to analyze:
---
${textContent}
---`;
    
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const rawText = response.text;

    if (!rawText) {
      throw new Error("The model returned no content. It might have been unable to process the provided text.");
    }

    // FIX: Use a robust regex-based method to extract the JSON object.
    const jsonText = extractJson(rawText);
    if (!jsonText) {
        console.error("No valid JSON object found in the AI response for text extraction:", rawText);
        throw new Error("Could not find a valid JSON object in the AI's response for text extraction.");
    }
    
    let parsedResponse: { quotes: string[] };
    try {
        parsedResponse = JSON.parse(jsonText);
    } catch (e) {
        console.error("Failed to parse JSON response for text extraction:", jsonText);
        throw new Error("Could not parse the AI's response. The format was unexpected.");
    }

    const quotesText = parsedResponse.quotes;

    if (!quotesText || !Array.isArray(quotesText)) {
      console.warn("The AI response did not contain a 'quotes' array.");
      return [];
    }
    
    const quotes: Quote[] = quotesText.map((q, index) => {
        return {
            id: `quote-text-${Date.now()}-${index}`,
            text: q.trim(),
            source: "User-Provided Text",
            title: `Extracted from manual input`,
        };
    });

    return quotes;

  } catch (error) {
    console.error("Error extracting quotes from text:", error);
    if (error instanceof Error) {
        throw error;
    }
    throw new Error("An unknown error occurred while extracting quotes from the text.");
  }
};
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
        : 'Search for texts primarily in English, but identify the language of each quote if it is not English.';

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
For each quote, you MUST provide the source URL, a title for the source, the date, and the language of the quote.
Return the response as a single, valid JSON object with a key "quotes". The value of "quotes" should be an array of objects.
Each object in the array must have six string properties: "text" (the quote), "source" (URL), "title", "date" (YYYY-MM-DD), "languageCode" (e.g., "en", "ru"), and "languageName" (e.g., "English", "Russian").
If you cannot find a specific date, provide the publication date of the source. If that is also unavailable, provide an estimated date or the year.
Example format: { "quotes": [{"text": "This is the quote.", "source": "https://example.com/article", "title": "Article Title", "date": "2023-10-27", "languageCode": "en", "languageName": "English"}] }
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
    
    let parsedResponse: { quotes: { text: string; source: string; title: string; date: string; languageCode: string; languageName: string; }[] };
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
        if (!q.text || !q.source || !q.title || !q.date || !q.languageCode || !q.languageName) {
            console.warn(`Skipping malformed quote object at index ${index}:`, q);
            return null;
        }
        return {
            id: `quote-${Date.now()}-${index}`,
            text: q.text.trim(),
            source: q.source,
            title: q.title,
            date: q.date,
            languageCode: q.languageCode,
            languageName: q.languageName,
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


export const analyzeQuoteText = async (apiKey: string, quoteText: string, quoteLanguageCode: string, quoteLanguageName: string): Promise<AnalysisResult> => {
    if (!apiKey) throw new Error("Gemini API key is missing.");
    const ai = new GoogleGenAI({ apiKey });
    
    try {
        const prompt = `Perform a detailed analysis of the following text, which is in ${quoteLanguageName}.
Follow these steps carefully:
1.  **Analyze the original text directly in ${quoteLanguageName}** to understand its full meaning and nuance. Fact-check all claims using online search.
2.  **Think step-by-step in English** to determine the rating and justification for each category.
3.  **Translate your English justification** into high-quality, natural-sounding ${quoteLanguageName}.
4.  **Construct the final JSON object**. Ensure the 'justification' fields contain the translated text from step 3. The entire response must be a single, valid JSON object (do not wrap it in markdown).

The JSON object must have keys: "Populism", "Fact Twisting", "Lies & False Claims", and "Inflammatory Language".
Each key must have a value that is an object with two properties:
1. "rating": A string with one of these values: "None", "Low", "Medium", "High", "Severe".
2. "justification": A string in ${quoteLanguageName} explaining the rating.

Analyze this text: "${quoteText}"`;

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
            }
        });
        
        const rawText = response.text;
        if (!rawText) {
            throw new Error("The model returned no content for analysis.");
        }

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
    const prompt = `Analyze the following text to extract quotes by "${personName}" and identify the language of each quote.

The provided text can be one of two things:
1. A block of text (like an article) containing one or more statements explicitly attributed to "${personName}".
2. A single, direct quote by "${personName}" itself, without any other context or attribution.

Your task is to identify which case it is and act accordingly.
- If the text is a block of text, extract all statements explicitly attributed to "${personName}".
- If the text appears to be a direct quote by "${personName}", return the text itself as the single quote.

Return the response as a single, valid JSON object with a key "quotes". The value of "quotes" should be an array of objects.
Each object must have three properties: "text" (the full quote), "languageCode" (e.g., "en", "lt"), and "languageName" (e.g., "English", "Lithuanian").
If you find no quotes, return an empty array.
Do not include any other text or markdown formatting outside of the JSON object.

Example: { "quotes": [ { "text": "...", "languageCode": "fr", "languageName": "French" } ] }

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

    const jsonText = extractJson(rawText);
    if (!jsonText) {
        console.error("No valid JSON object found in the AI response for text extraction:", rawText);
        throw new Error("Could not find a valid JSON object in the AI's response for text extraction.");
    }
    
    let parsedResponse: { quotes: { text: string; languageCode: string; languageName: string; }[] };
    try {
        parsedResponse = JSON.parse(jsonText);
    } catch (e) {
        console.error("Failed to parse JSON response for text extraction:", jsonText);
        throw new Error("Could not parse the AI's response. The format was unexpected.");
    }

    const quotesData = parsedResponse.quotes;

    if (!quotesData || !Array.isArray(quotesData)) {
      console.warn("The AI response did not contain a 'quotes' array.");
      return [];
    }
    
    const quotes: Quote[] = quotesData.map((q, index) => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');

        if (!q.text || !q.languageCode || !q.languageName) {
            console.warn(`Skipping malformed extracted quote at index ${index}:`, q);
            return null;
        }

        return {
            id: `quote-text-${Date.now()}-${index}`,
            text: q.text.trim(),
            source: "User-Provided Text",
            title: `Extracted from manual input`,
            date: `${year}-${month}-${day}`,
            languageCode: q.languageCode,
            languageName: q.languageName,
        };
    }).filter((q): q is Quote => q !== null);

    return quotes;

  } catch (error) {
    console.error("Error extracting quotes from text:", error);
    if (error instanceof Error) {
        throw error;
    }
    throw new Error("An unknown error occurred while extracting quotes from the text.");
  }
};
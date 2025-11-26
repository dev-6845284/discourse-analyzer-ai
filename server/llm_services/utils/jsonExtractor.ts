/**
 * A more robust way to extract a JSON object from a string that might be
 * surrounded by other text or markdown code fences.
 * @param text The raw text from the AI response.
 * @returns The cleaned JSON string or null if not found.
 */
export function extractJson(text: string): string | null {
  // Use a regex to find the JSON block, which is more robust
  // than string slicing. It looks for the first '{' to the last '}'.
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch && jsonMatch[0]) {
    return jsonMatch[0];
  }
  return null;
}

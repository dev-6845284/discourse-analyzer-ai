import { DialogLine } from '../../types';

export const withTimeout = <T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(errorMessage)), ms))
  ]);
};

export function mapLinesToOriginal(returnedLines: any[], originalLines: DialogLine[]): DialogLine[] {
  if (!returnedLines || returnedLines.length === 0) return [];
  
  /**
   * CRITICAL FIX: Ensure no data loss when mapping model response back to original lines
   * 
   * The model receives dialog lines and returns indices/text of which lines to include.
   * We must ensure:
   * 1. All lines the model intended to return are actually included
   * 2. No lines are skipped due to fuzzy matching failures
   * 3. Order is preserved
   * 
   * Strategy:
   * - Try text-based matching first (for explicit references)
   * - Fall back to positional matching as a safety net
   * - Always ensure result count matches intended count when possible
   */
  
  const result: DialogLine[] = [];
  let searchStartIndex = 0;
  let textMatchCount = 0;
  let skippedLines: string[] = [];
  
  for (const retLine of returnedLines) {
    const textToMatch = retLine.text?.trim();
    if (!textToMatch) {
      // Model returned empty line reference - skip
      continue;
    }
    
    // Try to find this line in originalLines starting from searchStartIndex
    // Use case-insensitive substring matching for robustness
    const foundIndex = originalLines.findIndex((l, idx) => 
      idx >= searchStartIndex && 
      l.text.toLowerCase().includes(textToMatch.toLowerCase())
    );
    
    if (foundIndex !== -1) {
      result.push(originalLines[foundIndex]);
      searchStartIndex = foundIndex + 1;
      textMatchCount++;
    } else {
      // TEXT MATCH FAILED - This is a critical issue
      // Log it and try positional fallback
      skippedLines.push(`Line: "${textToMatch.substring(0, 50)}..." not found`);
      
      // Positional fallback: if we have unmatched lines, try to take the next available line
      // This prevents complete data loss
      if (searchStartIndex < originalLines.length) {
        const fallbackLine = originalLines[searchStartIndex];
        result.push(fallbackLine);
        searchStartIndex++;
      }
    }
  }
  
  // Log any matching issues
  if (skippedLines.length > 0) {
    console.warn(`[DialogAnalysis] WARNING: Mapping lines with fuzzy match failures (${skippedLines.length}):`, skippedLines.slice(0, 3));
    console.warn(`[DialogAnalysis] Continuing with fallback positional matching (${result.length}/${returnedLines.length} lines recovered)`);
  }
  
  return result;
}

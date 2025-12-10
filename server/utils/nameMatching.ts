/**
 * Name matching utilities for finding similar person names.
 * Uses normalization and Jaro-Winkler similarity algorithm.
 */

/**
 * Default similarity threshold for matching names.
 * 0.85 provides a good balance between catching variations and avoiding false positives.
 */
export const DEFAULT_SIMILARITY_THRESHOLD = 0.85;

/**
 * Mapping of common diacritics to their ASCII equivalents.
 * Covers Lithuanian, Polish, Czech, and other European characters.
 */
const DIACRITIC_MAP: Record<string, string> = {
  // Polish
  'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n', 'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z',
  // German
  'ä': 'a', 'ö': 'o', 'ü': 'u', 'ß': 'ss',
  // Spanish/Portuguese accents
  'á': 'a', 'é': 'e', 'í': 'i', 'ú': 'u', 'ý': 'y',
  'à': 'a', 'è': 'e', 'ì': 'i', 'ò': 'o', 'ù': 'u',
  'â': 'a', 'ê': 'e', 'î': 'i', 'ô': 'o', 'û': 'u',
  'ã': 'a', 'õ': 'o', 'ñ': 'n',
  // Czech
  'č': 'c', 'š': 's', 'ž': 'z', 'ř': 'r', 'ď': 'd', 'ť': 't', 'ň': 'n', 'ě': 'e', 'ů': 'u',
  // Lithuanian (unique chars not in above)
  'ė': 'e', 'į': 'i', 'ų': 'u', 'ū': 'u',
};

/**
 * Common titles and prefixes to remove from names.
 */
const TITLE_PATTERNS = [
  /^(dr|prof|mr|mrs|ms|miss|sir|lord|lady|rev|hon|phd|md|dvm|esq)\.?\s+/i,
  /\s+(jr|sr|ii|iii|iv|phd|md|dvm|esq)\.?$/i,
];

/**
 * Remove diacritics from a string, replacing them with ASCII equivalents.
 * Uses both a custom mapping and Unicode normalization for comprehensive coverage.
 */
export function removeDiacritics(str: string): string {
  // First, use the custom mapping for common cases
  let result = str.toLowerCase();
  for (const [diacritic, replacement] of Object.entries(DIACRITIC_MAP)) {
    result = result.replace(new RegExp(diacritic, 'g'), replacement);
  }
  
  // Then use Unicode normalization for any remaining diacritics
  // NFD decomposes characters, then we remove combining marks
  result = result.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  return result;
}

/**
 * Normalize a name for comparison:
 * - Remove titles (Dr., Prof., Mr., etc.)
 * - Convert to lowercase
 * - Remove diacritics
 * - Trim and collapse whitespace
 * - Remove punctuation
 */
export function normalizeName(name: string): string {
  if (!name) return '';
  
  let normalized = name.trim();
  
  // Remove titles and suffixes
  for (const pattern of TITLE_PATTERNS) {
    normalized = normalized.replace(pattern, ' ');
  }
  
  // Remove punctuation except spaces
  normalized = normalized.replace(/[.,'"()[\]{}!?;:]/g, '');
  
  // Collapse multiple spaces and trim
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  // Remove diacritics and convert to lowercase
  normalized = removeDiacritics(normalized);
  
  return normalized;
}

/**
 * Calculate the Jaro similarity between two strings.
 * Returns a value between 0 and 1, where 1 is an exact match.
 */
function jaroSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  const matchDistance = Math.max(Math.floor(Math.max(s1.length, s2.length) / 2) - 1, 0);
  
  const s1Matches = new Array(s1.length).fill(false);
  const s2Matches = new Array(s2.length).fill(false);
  
  let matches = 0;
  let transpositions = 0;

  // Find matching characters
  for (let i = 0; i < s1.length; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, s2.length);

    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  // Count transpositions
  let k = 0;
  for (let i = 0; i < s1.length; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  return (
    (matches / s1.length +
      matches / s2.length +
      (matches - transpositions / 2) / matches) /
    3
  );
}

/**
 * Calculate the Jaro-Winkler similarity between two strings.
 * This is an extension of Jaro similarity that gives more weight to common prefixes.
 * Returns a value between 0 and 1, where 1 is an exact match.
 * 
 * @param s1 First string
 * @param s2 Second string
 * @param prefixScale Scaling factor for common prefix bonus (default 0.1, max 0.25)
 */
export function jaroWinklerSimilarity(s1: string, s2: string, prefixScale = 0.1): number {
  const jaroSim = jaroSimilarity(s1, s2);
  
  // Find the common prefix (up to 4 characters)
  let prefixLength = 0;
  const maxPrefix = Math.min(4, Math.min(s1.length, s2.length));
  
  for (let i = 0; i < maxPrefix; i++) {
    if (s1[i] === s2[i]) {
      prefixLength++;
    } else {
      break;
    }
  }
  
  // Calculate Jaro-Winkler similarity
  return jaroSim + prefixLength * prefixScale * (1 - jaroSim);
}

/**
 * Calculate similarity between two names after normalization.
 * Returns a value between 0 and 1, where 1 is an exact match.
 * 
 * @param name1 First name
 * @param name2 Second name
 * @returns Similarity score between 0 and 1
 */
export function calculateNameSimilarity(name1: string, name2: string): number {
  const normalized1 = normalizeName(name1);
  const normalized2 = normalizeName(name2);
  
  // Exact match after normalization
  if (normalized1 === normalized2) return 1;
  
  // Calculate Jaro-Winkler similarity
  const directSimilarity = jaroWinklerSimilarity(normalized1, normalized2);
  
  // Also check if one name is contained in the other (e.g., "Jonas" vs "Jonas Jonaitis")
  const words1 = normalized1.split(' ');
  const words2 = normalized2.split(' ');
  
  // If the longer name contains all words from the shorter name, boost similarity
  const shorterWords = words1.length <= words2.length ? words1 : words2;
  const longerWords = words1.length > words2.length ? words1 : words2;
  
  const containedWords = shorterWords.filter(w1 => 
    longerWords.some(w2 => jaroWinklerSimilarity(w1, w2) > 0.9)
  );
  
  if (containedWords.length === shorterWords.length && shorterWords.length > 0) {
    // All shorter name words are contained in longer name
    const containmentBonus = 0.1 * (shorterWords.length / longerWords.length);
    return Math.min(1, directSimilarity + containmentBonus);
  }
  
  return directSimilarity;
}

/**
 * Check if two names are similar enough to be considered the same person.
 * 
 * @param name1 First name
 * @param name2 Second name
 * @param threshold Similarity threshold (default 0.85)
 * @returns True if names are similar enough
 */
export function areNamesSimilar(
  name1: string, 
  name2: string, 
  threshold = DEFAULT_SIMILARITY_THRESHOLD
): boolean {
  return calculateNameSimilarity(name1, name2) >= threshold;
}

export interface SimilarityMatch {
  name: string;
  similarity: number;
  isExact: boolean;
}

/**
 * Find the best match for a name from a list of candidates.
 * 
 * @param targetName The name to match
 * @param candidates List of candidate names to compare against
 * @param threshold Minimum similarity threshold (default 0.85)
 * @returns Array of matches sorted by similarity (highest first)
 */
export function findBestMatches(
  targetName: string,
  candidates: string[],
  threshold = DEFAULT_SIMILARITY_THRESHOLD
): SimilarityMatch[] {
  const normalizedTarget = normalizeName(targetName);
  
  const matches: SimilarityMatch[] = [];
  
  for (const candidate of candidates) {
    const normalizedCandidate = normalizeName(candidate);
    const similarity = calculateNameSimilarity(targetName, candidate);
    const isExact = normalizedTarget === normalizedCandidate;
    
    if (similarity >= threshold || isExact) {
      matches.push({
        name: candidate,
        similarity,
        isExact,
      });
    }
  }
  
  // Sort by similarity (highest first), with exact matches at the top
  return matches.sort((a, b) => {
    if (a.isExact && !b.isExact) return -1;
    if (!a.isExact && b.isExact) return 1;
    return b.similarity - a.similarity;
  });
}

export const getLanguageName = (code: string): string => {
  const languages: Record<string, string> = {
    'en': 'English',
    'lt': 'Lithuanian',
    'ru': 'Russian',
    'de': 'German',
    'fr': 'French',
    'es': 'Spanish',
    'it': 'Italian',
    'pl': 'Polish',
    'uk': 'Ukrainian',
    'ja': 'Japanese',
    'zh': 'Chinese',
    'ko': 'Korean',
    // Add more as needed
  };
  
  return languages[code] || code.toUpperCase();
};

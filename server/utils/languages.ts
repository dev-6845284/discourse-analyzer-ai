export const mapLanguageName = (language: string | undefined | null): string => {
	if (!language) return 'Unknown';

	const normalized = language.trim().toLowerCase();

	const map: Record<string, string> = {
		'en': 'English',
		'english': 'English',
		'lt': 'Lithuanian',
		'lithuanian': 'Lithuanian',
		'fr': 'French',
		'french': 'French',
		'es': 'Spanish',
		'spanish': 'Spanish',
		'de': 'German',
		'german': 'German',
		'pt': 'Portuguese',
		'pt-br': 'Portuguese (Brazil)',
		'ru': 'Russian',
		'russian': 'Russian',
		'it': 'Italian',
		'italian': 'Italian',
		'nl': 'Dutch',
		'dutch': 'Dutch',
		'pl': 'Polish',
		'polish': 'Polish',
		'ja': 'Japanese',
		'japanese': 'Japanese',
		'zh': 'Chinese',
		'zh-cn': 'Chinese (Simplified)',
		'zh-tw': 'Chinese (Traditional)',
	};

	if (map[normalized]) return map[normalized];

	// Try base code like "en-US"
	const baseCode = normalized.split(/[-_]/)[0];
	if (map[baseCode]) return map[baseCode];

	// If someone passed a name, return it capitalized
	return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

export default mapLanguageName;

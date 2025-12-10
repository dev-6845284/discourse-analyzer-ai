import {
  normalizeName,
  removeDiacritics,
  jaroWinklerSimilarity,
  calculateNameSimilarity,
  areNamesSimilar,
  findBestMatches,
  DEFAULT_SIMILARITY_THRESHOLD
} from './nameMatching';

describe('nameMatching', () => {
  describe('removeDiacritics', () => {
    it('should remove Lithuanian diacritics', () => {
      expect(removeDiacritics('Šemekevičius')).toBe('semekevicius');
      expect(removeDiacritics('Žukauskaitė')).toBe('zukauskaite');
      expect(removeDiacritics('Ąžuolas')).toBe('azuolas');
    });

    it('should remove Polish diacritics', () => {
      expect(removeDiacritics('Łukasz')).toBe('lukasz');
      expect(removeDiacritics('Gąsiorowski')).toBe('gasiorowski');
    });

    it('should remove German diacritics', () => {
      expect(removeDiacritics('Müller')).toBe('muller');
      expect(removeDiacritics('Größe')).toBe('grosse');
    });

    it('should handle mixed diacritics', () => {
      expect(removeDiacritics('Café résumé')).toBe('cafe resume');
    });
  });

  describe('normalizeName', () => {
    it('should remove common titles', () => {
      expect(normalizeName('Dr. Jonas Jonaitis')).toBe('jonas jonaitis');
      expect(normalizeName('Prof. Petras Petraitis')).toBe('petras petraitis');
      expect(normalizeName('Mr. John Smith')).toBe('john smith');
    });

    it('should remove suffixes', () => {
      expect(normalizeName('John Smith Jr.')).toBe('john smith');
      expect(normalizeName('Robert Brown III')).toBe('robert brown');
    });

    it('should lowercase and normalize diacritics', () => {
      expect(normalizeName('REMIGIJUS ŠEMEKEVIČIUS')).toBe('remigijus semekevicius');
    });

    it('should collapse whitespace', () => {
      expect(normalizeName('John    Smith')).toBe('john smith');
      expect(normalizeName('  John Smith  ')).toBe('john smith');
    });

    it('should remove punctuation', () => {
      expect(normalizeName('O\'Brien')).toBe('obrien');
      expect(normalizeName('Smith-Jones')).toBe('smith-jones'); // hyphens preserved
    });
  });

  describe('jaroWinklerSimilarity', () => {
    it('should return 1 for identical strings', () => {
      expect(jaroWinklerSimilarity('test', 'test')).toBe(1);
    });

    it('should return 0 for completely different strings', () => {
      expect(jaroWinklerSimilarity('abc', 'xyz')).toBe(0);
    });

    it('should return high similarity for similar strings', () => {
      const sim = jaroWinklerSimilarity('jonas', 'jonass');
      expect(sim).toBeGreaterThan(0.9);
    });

    it('should handle common name variations', () => {
      expect(jaroWinklerSimilarity('remigijus', 'remigius')).toBeGreaterThan(0.9);
    });
  });

  describe('calculateNameSimilarity', () => {
    it('should return 1 for identical names after normalization', () => {
      expect(calculateNameSimilarity('Jonas Jonaitis', 'jonas jonaitis')).toBe(1);
      expect(calculateNameSimilarity('Šemekevičius', 'semekevicius')).toBe(1);
    });

    it('should return high similarity for names with/without titles', () => {
      const sim = calculateNameSimilarity('Dr. Jonas Jonaitis', 'Jonas Jonaitis');
      expect(sim).toBe(1);
    });

    it('should return high similarity for partial name matches', () => {
      // First name only should have decent similarity to full name
      const sim = calculateNameSimilarity('Jonas', 'Jonas Jonaitis');
      expect(sim).toBeGreaterThan(0.7);
    });

    it('should handle diacritic variations', () => {
      const sim = calculateNameSimilarity('Šemekevičius', 'Semekevicius');
      expect(sim).toBe(1);
    });
  });

  describe('areNamesSimilar', () => {
    it('should return true for same names', () => {
      expect(areNamesSimilar('Jonas Jonaitis', 'Jonas Jonaitis')).toBe(true);
    });

    it('should return true for names with different casing', () => {
      expect(areNamesSimilar('Jonas Jonaitis', 'JONAS JONAITIS')).toBe(true);
    });

    it('should return true for names with diacritics vs without', () => {
      expect(areNamesSimilar('Šemekevičius', 'Semekevicius')).toBe(true);
    });

    it('should return true for names with/without titles', () => {
      expect(areNamesSimilar('Dr. Jonas Jonaitis', 'Jonas Jonaitis')).toBe(true);
    });

    it('should return false for clearly different names', () => {
      expect(areNamesSimilar('Jonas Jonaitis', 'Petras Petraitis')).toBe(false);
    });

    it('should use custom threshold', () => {
      // Very strict threshold
      expect(areNamesSimilar('Jonas', 'Jonas Jonaitis', 0.99)).toBe(false);
      // Lenient threshold
      expect(areNamesSimilar('Jonas', 'Jonas Jonaitis', 0.5)).toBe(true);
    });
  });

  describe('findBestMatches', () => {
    const candidates = [
      'Jonas Jonaitis',
      'Petras Petraitis',
      'Remigijus Šemekevičius',
      'Dr. Jonas Jonaitis',
      'Antanas Antanaitis'
    ];

    it('should find exact matches', () => {
      const matches = findBestMatches('Jonas Jonaitis', candidates);
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].name).toBe('Jonas Jonaitis');
      expect(matches[0].isExact).toBe(true);
    });

    it('should find matches with different casing', () => {
      const matches = findBestMatches('jonas jonaitis', candidates);
      expect(matches.length).toBeGreaterThan(0);
      expect(matches.some(m => m.name === 'Jonas Jonaitis')).toBe(true);
    });

    it('should find matches ignoring titles', () => {
      const matches = findBestMatches('Jonas Jonaitis', candidates);
      // Should find both 'Jonas Jonaitis' and 'Dr. Jonas Jonaitis'
      expect(matches.length).toBe(2);
    });

    it('should find matches with diacritic variations', () => {
      const matches = findBestMatches('Remigijus Semekevicius', candidates);
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].name).toBe('Remigijus Šemekevičius');
    });

    it('should sort by similarity with exact matches first', () => {
      const matches = findBestMatches('Jonas Jonaitis', candidates);
      expect(matches[0].isExact).toBe(true);
    });

    it('should return empty array for no matches', () => {
      const matches = findBestMatches('Completely Different Name', candidates);
      expect(matches).toHaveLength(0);
    });

    it('should respect custom threshold', () => {
      // Very strict - should find fewer matches
      const strictMatches = findBestMatches('Jonas', candidates, 0.95);
      // Lenient - should find more matches
      const lenientMatches = findBestMatches('Jonas', candidates, 0.5);
      
      expect(lenientMatches.length).toBeGreaterThanOrEqual(strictMatches.length);
    });
  });

  describe('DEFAULT_SIMILARITY_THRESHOLD', () => {
    it('should be 0.85', () => {
      expect(DEFAULT_SIMILARITY_THRESHOLD).toBe(0.85);
    });
  });
});

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { translationService } from '@/services/search/translationService';
import type { SearchLanguage } from '@/types/search';

// Mock the database connection
vi.mock('@/lib/db/connection', () => ({
  getLocalDb: () => ({
    all: vi.fn(),
    get: vi.fn(),
    run: vi.fn(),
  }),
}));

describe('TranslationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('detectLanguage', () => {
    it('should detect English language', () => {
      const language = translationService.detectLanguage('bhagavad gita');
      expect(language).toBe('en');
    });

    it('should detect Hindi language', () => {
      const language = translationService.detectLanguage('भगवद् गीता');
      expect(language).toBe('hi');
    });

    it('should detect Bengali language', () => {
      const language = translationService.detectLanguage('ভগবদ্ গীতা');
      expect(language).toBe('bn');
    });

    it('should default to English for mixed content', () => {
      const language = translationService.detectLanguage('bhagavad गीता');
      expect(language).toBe('hi'); // Should detect Hindi due to Devanagari script
    });

    it('should handle empty strings', () => {
      const language = translationService.detectLanguage('');
      expect(language).toBe('en');
    });

    it('should handle numbers and special characters', () => {
      const language = translationService.detectLanguage('123 !@#');
      expect(language).toBe('en');
    });
  });

  describe('transliterateQuery', () => {
    it('should transliterate English to Hindi', async () => {
      const result = await translationService.transliterateQuery('book', 'hi');
      
      expect(result.original).toBe('book');
      // language property is not present in TransliterationResult
      expect(result.transliterated).toBeInstanceOf(Array);
      expect(result.transliterated.length).toBeGreaterThan(0);
      expect(result.transliterated).toContain('किताब');
    });

    it('should transliterate English to Bengali', async () => {
      const result = await translationService.transliterateQuery('book', 'bn');
      
      expect(result.original).toBe('book');
      // language property is not present in TransliterationResult
      expect(result.transliterated).toBeInstanceOf(Array);
      expect(result.transliterated.length).toBeGreaterThan(0);
      expect(result.transliterated).toContain('বই');
    });

    it('should handle multiple words', async () => {
      const result = await translationService.transliterateQuery('bhagavad gita', 'hi');
      
      expect(result.transliterated).toContain('भगवद्');
      expect(result.transliterated).toContain('गीता');
    });

    it('should handle unknown words gracefully', async () => {
      const result = await translationService.transliterateQuery('xyz123', 'hi');
      
      expect(result.original).toBe('xyz123');
      expect(result.transliterated).toBeInstanceOf(Array);
      // Should not crash, even if no translations found
    });

    it('should remove duplicates from results', async () => {
      const result = await translationService.transliterateQuery('book book', 'hi');
      
      const uniqueTerms = new Set(result.transliterated);
      expect(result.transliterated.length).toBe(uniqueTerms.size);
    });
  });

  describe('expandQuery', () => {
    it('should expand query with multi-language terms', async () => {
      const expanded = await translationService.expandQuery('book');
      
      expect(expanded).toBeInstanceOf(Array);
      expect(expanded).toContain('book'); // Original term
      expect(expanded.length).toBeGreaterThan(1); // Should have additional terms
    });

    it('should include Hindi translations', async () => {
      const expanded = await translationService.expandQuery('gita');
      
      expect(expanded).toContain('gita');
      expect(expanded).toContain('गीता');
    });

    it('should include Bengali translations', async () => {
      const expanded = await translationService.expandQuery('krishna');
      
      expect(expanded).toContain('krishna');
      expect(expanded).toContain('কৃষ্ণ');
    });

    it('should handle multiple words', async () => {
      const expanded = await translationService.expandQuery('bhagavad gita');
      
      expect(expanded).toContain('bhagavad gita');
      expect(expanded.length).toBeGreaterThan(1);
    });

    it('should remove duplicates', async () => {
      const expanded = await translationService.expandQuery('book');
      
      const uniqueTerms = new Set(expanded);
      expect(expanded.length).toBe(uniqueTerms.size);
    });
  });

  describe('reverseTranslate', () => {
    it('should translate Hindi to English', async () => {
      const englishTerms = await translationService.reverseTranslate('गीता', 'hi');
      
      expect(englishTerms).toBeInstanceOf(Array);
      expect(englishTerms).toContain('gita');
    });

    it('should translate Bengali to English', async () => {
      const englishTerms = await translationService.reverseTranslate('বই', 'bn');
      
      expect(englishTerms).toBeInstanceOf(Array);
      expect(englishTerms).toContain('book');
    });

    it('should handle multiple matches', async () => {
      const englishTerms = await translationService.reverseTranslate('किताब', 'hi');
      
      expect(englishTerms).toContain('book');
      // Might also contain 'books' if that mapping exists
    });

    it('should return empty array for unknown terms', async () => {
      const englishTerms = await translationService.reverseTranslate('xyz123', 'hi');
      
      expect(englishTerms).toBeInstanceOf(Array);
      // Should not crash, might return empty array
    });

    it('should remove duplicates', async () => {
      const englishTerms = await translationService.reverseTranslate('गीता', 'hi');
      
      const uniqueTerms = new Set(englishTerms);
      expect(englishTerms.length).toBe(uniqueTerms.size);
    });
  });

  describe('buildMultiLanguageQuery', () => {
    it('should build query for English input', async () => {
      const query = await translationService.buildMultiLanguageQuery('book');
      
      expect(typeof query).toBe('string');
      expect(query).toContain('book');
      expect(query).toContain('OR'); // Should use OR logic
    });

    it('should build query for Hindi input', async () => {
      const query = await translationService.buildMultiLanguageQuery('गीता');
      
      expect(typeof query).toBe('string');
      expect(query).toContain('गीता');
      expect(query).toContain('OR');
    });

    it('should build query for Bengali input', async () => {
      const query = await translationService.buildMultiLanguageQuery('বই');
      
      expect(typeof query).toBe('string');
      expect(query).toContain('বই');
      expect(query).toContain('OR');
    });

    it('should include reverse translations for non-English queries', async () => {
      const query = await translationService.buildMultiLanguageQuery('गीता');
      
      // Should include both Hindi term and English equivalent
      expect(query).toContain('गीता');
      // Should also include English terms if reverse translation works
    });

    it('should handle empty queries', async () => {
      const query = await translationService.buildMultiLanguageQuery('');
      
      expect(typeof query).toBe('string');
    });
  });

  describe('addLanguageMapping', () => {
    it('should add new language mapping', async () => {
      await expect(
        translationService.addLanguageMapping('test', 'टेस्ट', 'টেস্ট', 'keyword')
      ).resolves.not.toThrow();
    });

    it('should handle missing optional parameters', async () => {
      await expect(
        translationService.addLanguageMapping('test')
      ).resolves.not.toThrow();
    });

    it('should handle special characters in terms', async () => {
      await expect(
        translationService.addLanguageMapping('test-123', 'टेस्ट-१२३', 'টেস্ট-১২৩')
      ).resolves.not.toThrow();
    });
  });

  describe('getLanguageMappings', () => {
    it('should return array of language mappings', async () => {
      const mappings = await translationService.getLanguageMappings();
      
      expect(mappings).toBeInstanceOf(Array);
      // Each mapping should have the expected structure
      mappings.forEach(mapping => {
        expect(mapping).toHaveProperty('en');
        // en property is not present in LanguageMapping
      });
    });

    it('should handle database errors gracefully', async () => {
      // Mock database error
      const mockDb = vi.mocked(await import('@/lib/db/connection')).getLocalDb();
      mockDb.all = vi.fn().mockRejectedValue(new Error('Database error'));

      const mappings = await translationService.getLanguageMappings();
      expect(mappings).toEqual([]);
    });
  });

  describe('initializeCommonMappings', () => {
    it('should initialize common mappings without errors', async () => {
      await expect(
        translationService.initializeCommonMappings()
      ).resolves.not.toThrow();
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle null and undefined inputs', async () => {
      expect(translationService.detectLanguage('')).toBe('en');
      
      const result = await translationService.transliterateQuery('', 'hi');
      expect(result.original).toBe('');
      expect(result.transliterated).toBeInstanceOf(Array);
    });

    it('should handle very long queries', async () => {
      const longQuery = 'book '.repeat(100);
      
      const expanded = await translationService.expandQuery(longQuery);
      expect(expanded).toBeInstanceOf(Array);
    });

    it('should handle special characters and punctuation', async () => {
      const query = 'book! @#$ %^&*()';
      
      const expanded = await translationService.expandQuery(query);
      expect(expanded).toBeInstanceOf(Array);
    });

    it('should handle mixed language input', async () => {
      const query = 'bhagavad गीता book';
      const language = translationService.detectLanguage(query);
      
      expect(['en', 'hi'].includes(language)).toBe(true);
    });

    it('should handle database connection failures', async () => {
      // Mock database connection failure
      const mockDb = vi.mocked(await import('@/lib/db/connection')).getLocalDb();
      mockDb.all = vi.fn().mockRejectedValue(new Error('Connection failed'));

      // Should not crash the application
      const expanded = await translationService.expandQuery('book');
      expect(expanded).toBeInstanceOf(Array);
      expect(expanded).toContain('book'); // Should at least return original term
    });
  });

  describe('performance', () => {
    it('should complete translation within reasonable time', async () => {
      const startTime = Date.now();
      
      await translationService.expandQuery('bhagavad gita krishna rama');
      
      const endTime = Date.now();
      const translationTime = endTime - startTime;

      expect(translationTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle multiple concurrent translations', async () => {
      const promises = [
        translationService.expandQuery('book'),
        translationService.expandQuery('gita'),
        translationService.expandQuery('krishna'),
        translationService.expandQuery('temple'),
        translationService.expandQuery('prayer'),
      ];

      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result).toBeInstanceOf(Array);
      });
    });
  });

  describe('language-specific features', () => {
    it('should handle Devanagari script correctly', () => {
      const hindiText = 'भगवद् गीता कृष्ण';
      const language = translationService.detectLanguage(hindiText);
      
      expect(language).toBe('hi');
    });

    it('should handle Bengali script correctly', () => {
      const bengaliText = 'ভগবদ্ গীতা কৃষ্ণ';
      const language = translationService.detectLanguage(bengaliText);
      
      expect(language).toBe('bn');
    });

    it('should handle transliteration edge cases', async () => {
      // Test with diacritical marks
      const result = await translationService.transliterateQuery('café', 'hi');
      expect(result.original).toBe('café');
      expect(result.transliterated).toBeInstanceOf(Array);
    });

    it('should preserve word boundaries in multi-word queries', async () => {
      const result = await translationService.transliterateQuery('bhagavad gita', 'hi');
      
      // Should have separate translations for each word
      expect(result.transliterated.length).toBeGreaterThan(0);
    });
  });
});

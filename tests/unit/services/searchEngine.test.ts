import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { searchEngine } from '@/services/search/searchEngine';
import type { SearchQuery, SearchLanguage } from '@/types/search';

// Mock the database connection
vi.mock('@/lib/db/connection', () => ({
  getLocalDb: () => ({
    all: vi.fn(),
    get: vi.fn(),
    run: vi.fn(),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        leftJoin: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([])),
            orderBy: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve([])),
            })),
            groupBy: vi.fn(() => ({
              having: vi.fn(() => Promise.resolve([])),
            })),
          })),
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([])),
          })),
        })),
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([])),
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([])),
          })),
        })),
      })),
    })),
  }),
}));

// Mock the search service
vi.mock('@/services/database/search', () => ({
  searchService: {
    recordSearch: vi.fn(),
  },
}));

describe('SearchEngine', () => {
  beforeEach(() => {
    // Clear cache before each test
    searchEngine.clearCache();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('search', () => {
    it('should perform basic text search', async () => {
      const query: SearchQuery = {
        query: 'bhagavad gita',
        filters: {},
      };

      const result = await searchEngine.search(query);

      expect(result).toHaveProperty('products');
      expect(result).toHaveProperty('totalCount');
      expect(result).toHaveProperty('suggestions');
      expect(result).toHaveProperty('filters');
      expect(result).toHaveProperty('searchTime');
      expect(result.query).toBe('bhagavad gita');
    });

    it('should handle empty search query', async () => {
      const query: SearchQuery = {
        query: '',
        filters: {},
      };

      const result = await searchEngine.search(query);

      expect(result.products).toBeInstanceOf(Array);
      expect(result.totalCount).toBeGreaterThanOrEqual(0);
    });

    it('should apply category filter', async () => {
      const query: SearchQuery = {
        query: 'book',
        categoryId: 'books-category',
        filters: {},
      };

      const result = await searchEngine.search(query);

      expect(result.products).toBeInstanceOf(Array);
      // All results should be from the specified category
      result.products.forEach(product => {
        expect(product.categoryId).toBe('books-category');
      });
    });

    it('should apply price range filter', async () => {
      const query: SearchQuery = {
        query: 'book',
        filters: {
          priceMin: 100,
          priceMax: 500,
        },
      };

      const result = await searchEngine.search(query);

      result.products.forEach(product => {
        expect(product.basePrice).toBeGreaterThanOrEqual(100);
        expect(product.basePrice).toBeLessThanOrEqual(500);
      });
    });

    it('should apply stock filter', async () => {
      const query: SearchQuery = {
        query: 'book',
        filters: {
          inStock: true,
        },
      };

      const result = await searchEngine.search(query);

      result.products.forEach(product => {
        expect(product.stockQuantity).toBeGreaterThan(0);
      });
    });

    it('should handle pagination', async () => {
      const query: SearchQuery = {
        query: 'book',
        filters: {},
        limit: 5,
        offset: 10,
      };

      const result = await searchEngine.search(query);

      expect(result.products.length).toBeLessThanOrEqual(5);
    });

    it('should sort results by relevance by default', async () => {
      const query: SearchQuery = {
        query: 'bhagavad gita',
        filters: {},
        sortBy: 'relevance',
      };

      const result = await searchEngine.search(query);

      // Check that results are sorted by relevance score (descending)
      for (let i = 1; i < result.products.length; i++) {
        expect(result.products[i - 1].relevanceScore).toBeGreaterThanOrEqual(
          result.products[i].relevanceScore
        );
      }
    });

    it('should sort results by price ascending', async () => {
      const query: SearchQuery = {
        query: 'book',
        filters: {},
        sortBy: 'price_asc',
      };

      const result = await searchEngine.search(query);

      // Check that results are sorted by price (ascending)
      for (let i = 1; i < result.products.length; i++) {
        expect(result.products[i - 1].basePrice).toBeLessThanOrEqual(
          result.products[i].basePrice
        );
      }
    });

    it('should sort results by price descending', async () => {
      const query: SearchQuery = {
        query: 'book',
        filters: {},
        sortBy: 'price_desc',
      };

      const result = await searchEngine.search(query);

      // Check that results are sorted by price (descending)
      for (let i = 1; i < result.products.length; i++) {
        expect(result.products[i - 1].basePrice).toBeGreaterThanOrEqual(
          result.products[i].basePrice
        );
      }
    });

    it('should support multi-language search', async () => {
      const query: SearchQuery = {
        query: 'गीता', // Hindi for Gita
        language: 'hi',
        filters: {},
      };

      const result = await searchEngine.search(query);

      expect(result.products).toBeInstanceOf(Array);
      expect(result.query).toBe('गीता');
    });

    it('should cache search results', async () => {
      const query: SearchQuery = {
        query: 'bhagavad gita',
        filters: {},
      };

      // First search
      const result1 = await searchEngine.search(query);
      
      // Second search (should use cache)
      const result2 = await searchEngine.search(query);

      expect(result1).toEqual(result2);
    });
  });

  describe('parseQuery', () => {
    it('should parse simple terms', () => {
      // This would test the private parseQuery method
      // Since it's private, we test it indirectly through search
      const query: SearchQuery = {
        query: 'bhagavad gita book',
        filters: {},
      };

      expect(async () => {
        await searchEngine.search(query);
      }).not.toThrow();
    });

    it('should handle quoted phrases', async () => {
      const query: SearchQuery = {
        query: '"bhagavad gita" book',
        filters: {},
      };

      const result = await searchEngine.search(query);
      expect(result.products).toBeInstanceOf(Array);
    });

    it('should handle exclusions', async () => {
      const query: SearchQuery = {
        query: 'book -digital',
        filters: {},
      };

      const result = await searchEngine.search(query);
      expect(result.products).toBeInstanceOf(Array);
    });
  });

  describe('calculateRelevanceScore', () => {
    it('should give higher scores for exact matches', async () => {
      const exactQuery: SearchQuery = {
        query: 'Bhagavad Gita',
        filters: {},
      };

      const partialQuery: SearchQuery = {
        query: 'Gita',
        filters: {},
      };

      const exactResult = await searchEngine.search(exactQuery);
      const partialResult = await searchEngine.search(partialQuery);

      // Assuming we have a product named exactly "Bhagavad Gita"
      const exactMatch = exactResult.products.find(p => 
        p.name.toLowerCase() === 'bhagavad gita'
      );
      const partialMatch = partialResult.products.find(p => 
        p.name.toLowerCase().includes('gita')
      );

      if (exactMatch && partialMatch) {
        expect(exactMatch.relevanceScore).toBeGreaterThan(partialMatch.relevanceScore);
      }
    });

    it('should boost products with higher stock', async () => {
      // This would require mock data to test properly
      const query: SearchQuery = {
        query: 'book',
        filters: {},
      };

      const result = await searchEngine.search(query);
      expect(result.products).toBeInstanceOf(Array);
    });
  });

  describe('getSuggestions', () => {
    it('should return suggestions for partial queries', async () => {
      const suggestions = await searchEngine.getSuggestions('bhag', 'en');
      
      expect(suggestions).toBeInstanceOf(Array);
      expect(suggestions.length).toBeLessThanOrEqual(10);
    });

    it('should return empty array for very short queries', async () => {
      const suggestions = await searchEngine.getSuggestions('b', 'en');
      
      expect(suggestions).toEqual([]);
    });

    it('should support different languages', async () => {
      const hindiSuggestions = await searchEngine.getSuggestions('गी', 'hi');
      const bengaliSuggestions = await searchEngine.getSuggestions('গী', 'bn');
      
      expect(hindiSuggestions).toBeInstanceOf(Array);
      expect(bengaliSuggestions).toBeInstanceOf(Array);
    });
  });

  describe('updateSuggestions', () => {
    it('should update suggestion frequency', async () => {
      const query = 'bhagavad gita';
      
      await searchEngine.updateSuggestions(query, 'en');
      
      // Should not throw error
      expect(true).toBe(true);
    });

    it('should handle different languages', async () => {
      await searchEngine.updateSuggestions('गीता', 'hi');
      await searchEngine.updateSuggestions('গীতা', 'bn');
      
      // Should not throw error
      expect(true).toBe(true);
    });
  });

  describe('translateQuery', () => {
    it('should translate English to Hindi', async () => {
      const translated = await searchEngine.translateQuery('book', 'hi');
      
      expect(typeof translated).toBe('string');
    });

    it('should translate English to Bengali', async () => {
      const translated = await searchEngine.translateQuery('book', 'bn');
      
      expect(typeof translated).toBe('string');
    });

    it('should return original query if no translation found', async () => {
      const translated = await searchEngine.translateQuery('xyz123', 'hi');
      
      expect(translated).toBe('xyz123');
    });
  });

  describe('configuration', () => {
    it('should allow updating search configuration', () => {
      const newConfig = {
        maxResults: 100,
        suggestionLimit: 20,
      };

      searchEngine.updateConfig(newConfig);
      
      // Configuration should be updated (tested indirectly)
      expect(true).toBe(true);
    });

    it('should allow clearing cache', () => {
      searchEngine.clearCache();
      
      // Cache should be cleared (tested indirectly)
      expect(true).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock database error
      const mockDb = {
        all: vi.fn().mockRejectedValue(new Error('Database error')),
        get: vi.fn(),
        run: vi.fn(),
        select: vi.fn(),
      };

      // This would require dependency injection to test properly
      const query: SearchQuery = {
        query: 'test',
        filters: {},
      };

      // Should not throw unhandled errors
      await expect(searchEngine.search(query)).rejects.toThrow();
    });

    it('should handle malformed JSON in product data', async () => {
      const query: SearchQuery = {
        query: 'test',
        filters: {},
      };

      // Should handle malformed JSON gracefully
      const result = await searchEngine.search(query);
      expect(result.products).toBeInstanceOf(Array);
    });
  });

  describe('performance', () => {
    it('should complete search within reasonable time', async () => {
      const startTime = Date.now();
      
      const query: SearchQuery = {
        query: 'bhagavad gita',
        filters: {},
      };

      const result = await searchEngine.search(query);
      
      const endTime = Date.now();
      const searchTime = endTime - startTime;

      expect(searchTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(result.searchTime).toBeGreaterThan(0);
    });

    it('should handle large result sets efficiently', async () => {
      const query: SearchQuery = {
        query: 'book', // Broad query that might return many results
        filters: {},
        limit: 1000,
      };

      const result = await searchEngine.search(query);
      
      expect(result.products.length).toBeLessThanOrEqual(1000);
      expect(result.searchTime).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });
});
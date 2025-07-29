import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { testDb, getTestDb, cleanupTestDb } from '../utils/test-db';

describe('Search API Integration Tests', () => {
  beforeAll(async () => {
    await getTestDb();
  });

  afterAll(async () => {
    await cleanupTestDb();
  });

  beforeEach(async () => {
    // Clean and seed test data before each test
    await testDb.run('DELETE FROM products');
    await testDb.run('DELETE FROM categories');
    await testDb.run('DELETE FROM product_variants');
    await testDb.run('DELETE FROM search_analytics');
    await testDb.run('DELETE FROM search_suggestions');
    await testDb.run('DELETE FROM language_mappings');

    // Insert test categories
    await testDb.run(`
      INSERT INTO categories (id, name, description, keywords, is_active) VALUES
      ('cat-books', 'Books', 'Religious and spiritual books', '["books", "literature", "reading"]', 1),
      ('cat-accessories', 'Accessories', 'Religious accessories and items', '["accessories", "items", "religious"]', 1),
      ('cat-music', 'Music', 'Devotional music and CDs', '["music", "audio", "devotional"]', 1)
    `);

    // Insert test products
    await testDb.run(`
      INSERT INTO products (id, name, description, base_price, category_id, keywords, metadata, is_active) VALUES
      ('prod-gita', 'Bhagavad Gita', 'The sacred text of Hindu philosophy', 250.00, 'cat-books', 
       '["gita", "bhagavad", "krishna", "philosophy", "hindu", "sacred"]', 
       '{"author": "Vyasa", "publisher": "ISKCON", "language": "English", "pages": 800}', 1),
      ('prod-mala', 'Tulsi Mala', 'Sacred prayer beads made from Tulsi wood', 150.00, 'cat-accessories',
       '["mala", "tulsi", "beads", "prayer", "meditation", "sacred"]',
       '{"material": "Tulsi wood", "beads": 108, "color": "brown"}', 1),
      ('prod-ramayana', 'Ramayana', 'Epic tale of Lord Rama', 300.00, 'cat-books',
       '["ramayana", "rama", "epic", "story", "hindu", "mythology"]',
       '{"author": "Valmiki", "publisher": "ISKCON", "language": "English", "pages": 1200}', 1),
      ('prod-cd', 'Hare Krishna Chants', 'Devotional music CD', 200.00, 'cat-music',
       '["music", "chants", "hare", "krishna", "devotional", "cd"]',
       '{"artist": "ISKCON Devotees", "duration": "60 minutes", "tracks": 12}', 1)
    `);

    // Insert test variants
    await testDb.run(`
      INSERT INTO product_variants (id, product_id, name, price, stock_quantity, attributes, keywords) VALUES
      ('var-gita-en', 'prod-gita', 'English Edition', 250.00, 50, '{"language": "English", "binding": "hardcover"}', '["english", "hardcover"]'),
      ('var-gita-hi', 'prod-gita', 'Hindi Edition', 200.00, 30, '{"language": "Hindi", "binding": "paperback"}', '["hindi", "paperback"]'),
      ('var-mala-small', 'prod-mala', 'Small Mala', 150.00, 25, '{"size": "small", "beads": 54}', '["small", "54"]'),
      ('var-mala-large', 'prod-mala', 'Large Mala', 200.00, 15, '{"size": "large", "beads": 108}', '["large", "108"]')
    `);

    // Insert language mappings
    await testDb.run(`
      INSERT INTO language_mappings (id, english_term, hindi_term, bengali_term, type) VALUES
      ('map-book', 'book', 'किताब', 'বই', 'category'),
      ('map-gita', 'gita', 'गीता', 'গীতা', 'product'),
      ('map-krishna', 'krishna', 'कृष्ण', 'কৃষ্ণ', 'deity'),
      ('map-prayer', 'prayer', 'प्रार्थना', 'প্রার্থনা', 'concept')
    `);

    // Rebuild FTS index
    await testDb.run('DELETE FROM product_search_fts');
    await testDb.run(`
      INSERT INTO product_search_fts (product_id, name, description, keywords, category_name, variant_names, metadata_text, language, boost)
      SELECT 
        p.id,
        p.name,
        COALESCE(p.description, ''),
        COALESCE(p.keywords, '[]'),
        COALESCE(c.name, ''),
        COALESCE(
          (SELECT GROUP_CONCAT(pv.name, ' ') 
           FROM product_variants pv 
           WHERE pv.product_id = p.id), 
          ''
        ),
        COALESCE(p.metadata, '{}'),
        'en',
        1.0
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.is_active = 1
    `);
  });

  describe('GET /api/search', () => {
    it('should return search results for basic query', async () => {
      const response = await fetch('http://localhost:3000/api/search?q=gita');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('products');
      expect(data).toHaveProperty('totalCount');
      expect(data).toHaveProperty('suggestions');
      expect(data).toHaveProperty('filters');
      expect(data).toHaveProperty('searchTime');
      expect(data.query).toBe('gita');
      
      expect(data.products.length).toBeGreaterThan(0);
      expect(data.products[0]).toHaveProperty('id');
      expect(data.products[0]).toHaveProperty('name');
      expect(data.products[0]).toHaveProperty('relevanceScore');
    });

    it('should filter by category', async () => {
      const response = await fetch('http://localhost:3000/api/search?q=&category=cat-books');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.products.length).toBeGreaterThan(0);
      
      data.products.forEach((product: any) => {
        expect(product.categoryId).toBe('cat-books');
      });
    });

    it('should filter by price range', async () => {
      const response = await fetch('http://localhost:3000/api/search?q=&priceMin=200&priceMax=300');
      const data = await response.json();

      expect(response.status).toBe(200);
      
      data.products.forEach((product: any) => {
        expect(product.basePrice).toBeGreaterThanOrEqual(200);
        expect(product.basePrice).toBeLessThanOrEqual(300);
      });
    });

    it('should filter by stock availability', async () => {
      const response = await fetch('http://localhost:3000/api/search?q=&inStock=true');
      const data = await response.json();

      expect(response.status).toBe(200);
      
      data.products.forEach((product: any) => {
        expect(product.stockQuantity).toBeGreaterThan(0);
      });
    });

    it('should sort by price ascending', async () => {
      const response = await fetch('http://localhost:3000/api/search?q=&sort=price_asc');
      const data = await response.json();

      expect(response.status).toBe(200);
      
      for (let i = 1; i < data.products.length; i++) {
        expect(data.products[i - 1].basePrice).toBeLessThanOrEqual(data.products[i].basePrice);
      }
    });

    it('should sort by price descending', async () => {
      const response = await fetch('http://localhost:3000/api/search?q=&sort=price_desc');
      const data = await response.json();

      expect(response.status).toBe(200);
      
      for (let i = 1; i < data.products.length; i++) {
        expect(data.products[i - 1].basePrice).toBeGreaterThanOrEqual(data.products[i].basePrice);
      }
    });

    it('should handle pagination', async () => {
      const response = await fetch('http://localhost:3000/api/search?q=&limit=2&offset=1');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.products.length).toBeLessThanOrEqual(2);
    });

    it('should support multi-language search', async () => {
      const response = await fetch('http://localhost:3000/api/search?q=गीता&lang=hi');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.products.length).toBeGreaterThan(0);
    });

    it('should return empty results for non-existent terms', async () => {
      const response = await fetch('http://localhost:3000/api/search?q=nonexistentterm123');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.products.length).toBe(0);
      expect(data.totalCount).toBe(0);
    });

    it('should handle complex attribute filters', async () => {
      const attributes = JSON.stringify({ language: ['English'] });
      const response = await fetch(`http://localhost:3000/api/search?q=&attributes=${encodeURIComponent(attributes)}`);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Results should be filtered by language attribute
    });

    it('should return available filters', async () => {
      const response = await fetch('http://localhost:3000/api/search?q=book');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.filters).toHaveProperty('categories');
      expect(data.filters).toHaveProperty('priceRanges');
      expect(data.filters).toHaveProperty('attributes');
      expect(data.filters).toHaveProperty('languages');
      
      expect(data.filters.categories).toBeInstanceOf(Array);
      expect(data.filters.priceRanges).toBeInstanceOf(Array);
    });
  });

  describe('POST /api/search', () => {
    it('should handle POST requests with complex search queries', async () => {
      const searchQuery = {
        query: 'bhagavad gita',
        categoryId: 'cat-books',
        language: 'en',
        sortBy: 'relevance',
        limit: 10,
        offset: 0,
        filters: {
          priceMin: 100,
          priceMax: 500,
          inStock: true,
          attributes: {
            language: ['English']
          }
        }
      };

      const response = await fetch('http://localhost:3000/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchQuery),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('products');
      expect(data).toHaveProperty('totalCount');
      expect(data.query).toBe('bhagavad gita');
    });

    it('should validate required fields', async () => {
      const response = await fetch('http://localhost:3000/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });
  });

  describe('GET /api/search/suggestions', () => {
    beforeEach(async () => {
      // Insert test suggestions
      await testDb.run(`
        INSERT INTO search_suggestions (id, text, type, frequency, language) VALUES
        ('sug-1', 'bhagavad', 'product', 10, 'en'),
        ('sug-2', 'bhagavad gita', 'product', 15, 'en'),
        ('sug-3', 'book', 'category', 8, 'en'),
        ('sug-4', 'गीता', 'product', 5, 'hi'),
        ('sug-5', 'বই', 'category', 3, 'bn')
      `);
    });

    it('should return suggestions for partial queries', async () => {
      const response = await fetch('http://localhost:3000/api/search/suggestions?q=bhag');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('suggestions');
      expect(data).toHaveProperty('query');
      expect(data.query).toBe('bhag');
      expect(data.suggestions).toBeInstanceOf(Array);
      expect(data.suggestions.length).toBeGreaterThan(0);
    });

    it('should limit number of suggestions', async () => {
      const response = await fetch('http://localhost:3000/api/search/suggestions?q=b&limit=3');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.suggestions.length).toBeLessThanOrEqual(3);
    });

    it('should support different languages', async () => {
      const response = await fetch('http://localhost:3000/api/search/suggestions?q=गी&lang=hi');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.suggestions).toBeInstanceOf(Array);
    });

    it('should return empty array for very short queries', async () => {
      const response = await fetch('http://localhost:3000/api/search/suggestions?q=a');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.suggestions).toEqual([]);
    });
  });

  describe('POST /api/search/suggestions', () => {
    it('should update suggestion frequency', async () => {
      const response = await fetch('http://localhost:3000/api/search/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: 'new suggestion',
          language: 'en'
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should validate query length', async () => {
      const response = await fetch('http://localhost:3000/api/search/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: 'a',
          language: 'en'
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });
  });

  describe('Search Analytics API', () => {
    describe('POST /api/search/analytics', () => {
      it('should record search analytics', async () => {
        const response = await fetch('http://localhost:3000/api/search/analytics', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: 'bhagavad gita',
            resultCount: 5,
            userId: 'user-123'
          }),
        });

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
      });

      it('should record product clicks', async () => {
        const response = await fetch('http://localhost:3000/api/search/analytics', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: 'bhagavad gita',
            resultCount: 5,
            clickedProductId: 'prod-gita',
            userId: 'user-123'
          }),
        });

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
      });

      it('should validate required fields', async () => {
        const response = await fetch('http://localhost:3000/api/search/analytics', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            resultCount: 5
          }),
        });

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data).toHaveProperty('error');
      });
    });

    describe('GET /api/search/analytics', () => {
      beforeEach(async () => {
        // Insert test analytics data
        const now = Math.floor(Date.now() / 1000);
        await testDb.run(`
          INSERT INTO search_analytics (id, query, result_count, clicked_product_id, user_id, timestamp) VALUES
          ('ana-1', 'bhagavad gita', 5, 'prod-gita', 'user-1', ${now}),
          ('ana-2', 'tulsi mala', 3, 'prod-mala', 'user-1', ${now}),
          ('ana-3', 'krishna', 8, NULL, 'user-2', ${now}),
          ('ana-4', 'nonexistent', 0, NULL, 'user-1', ${now}),
          ('ana-5', 'bhagavad gita', 5, 'prod-gita', 'user-2', ${now})
        `);
      });

      it('should return popular searches', async () => {
        const response = await fetch('http://localhost:3000/api/search/analytics?type=popular');
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toHaveProperty('data');
        expect(data).toHaveProperty('type');
        expect(data.type).toBe('popular');
        expect(data.data).toBeInstanceOf(Array);
      });

      it('should return searches with no results', async () => {
        const response = await fetch('http://localhost:3000/api/search/analytics?type=no-results');
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.type).toBe('no-results');
        expect(data.data).toBeInstanceOf(Array);
      });

      it('should return search trends', async () => {
        const response = await fetch('http://localhost:3000/api/search/analytics?type=trends&days=7');
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.type).toBe('trends');
        expect(data.data).toBeInstanceOf(Array);
      });

      it('should return click-through rates', async () => {
        const response = await fetch('http://localhost:3000/api/search/analytics?type=click-through');
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.type).toBe('click-through');
        expect(data.data).toBeInstanceOf(Array);
      });

      it('should validate analytics type', async () => {
        const response = await fetch('http://localhost:3000/api/search/analytics?type=invalid');

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data).toHaveProperty('error');
      });

      it('should handle limit and days parameters', async () => {
        const response = await fetch('http://localhost:3000/api/search/analytics?type=popular&limit=5&days=30');
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.data.length).toBeLessThanOrEqual(5);
      });
    });
  });

  describe('Error handling', () => {
    it('should handle malformed JSON in POST requests', async () => {
      const response = await fetch('http://localhost:3000/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid json',
      });

      expect(response.status).toBe(400);
    });

    it('should handle database connection errors gracefully', async () => {
      // This would require mocking database failures
      // For now, just ensure the API doesn't crash
      const response = await fetch('http://localhost:3000/api/search?q=test');
      expect([200, 500].includes(response.status)).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should respond within reasonable time for simple queries', async () => {
      const startTime = Date.now();
      const response = await fetch('http://localhost:3000/api/search?q=gita');
      const endTime = Date.now();

      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(5000); // Should respond within 5 seconds
    });

    it('should handle concurrent requests', async () => {
      const promises = [
        fetch('http://localhost:3000/api/search?q=gita'),
        fetch('http://localhost:3000/api/search?q=mala'),
        fetch('http://localhost:3000/api/search?q=krishna'),
        fetch('http://localhost:3000/api/search?q=book'),
        fetch('http://localhost:3000/api/search?q=music'),
      ];

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });
});
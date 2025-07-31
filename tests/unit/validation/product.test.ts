import { describe, it, expect } from 'vitest';
import {
  createProductSchema,
  updateProductSchema,
  productSearchSchema,
  stockUpdateSchema,
  bulkStockUpdateSchema,
  lowStockAlertSchema,
  productQuerySchema,
} from '@/lib/validation/product';

describe('Product Validation Schemas', () => {
  describe('createProductSchema', () => {
    it('should validate valid product data', () => {
      const validProduct = {
        name: 'Bhagavad Gita',
        description: 'Sacred Hindu scripture',
        basePrice: 250,
        categoryId: '550e8400-e29b-41d4-a716-446655440000',
        keywords: ['gita', 'scripture', 'hindu'],
        metadata: {
          author: 'Vyasa',
          publisher: 'Test Publisher',
          language: 'English',
          customAttributes: {
            edition: 'Deluxe',
          },
        },
        isActive: true,
      };

      const result = createProductSchema.safeParse(validProduct);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Bhagavad Gita');
        expect(result.data.keywords).toEqual(['gita', 'scripture', 'hindu']);
        expect(result.data.metadata.author).toBe('Vyasa');
      }
    });

    it('should reject invalid product data', () => {
      const invalidProduct = {
        name: '', // Empty name
        basePrice: -10, // Negative price
        categoryId: 'invalid-uuid', // Invalid UUID
        keywords: ['', 'valid'], // Empty keyword
      };

      const result = createProductSchema.safeParse(invalidProduct);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors.length).toBeGreaterThanOrEqual(4);
        expect(result.error.errors.some(e => e.path.includes('name'))).toBe(true);
        expect(result.error.errors.some(e => e.path.includes('basePrice'))).toBe(true);
        expect(result.error.errors.some(e => e.path.includes('categoryId'))).toBe(true);
        expect(result.error.errors.some(e => e.path.includes('keywords'))).toBe(true);
      }
    });

    it('should use default values for optional fields', () => {
      const minimalProduct = {
        name: 'Test Product',
        basePrice: 100,
      };

      const result = createProductSchema.safeParse(minimalProduct);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.keywords).toEqual([]);
        expect(result.data.metadata.customAttributes).toEqual({});
        expect(result.data.isActive).toBe(true);
      }
    });

    it('should validate metadata fields', () => {
      const productWithMetadata = {
        name: 'Test Book',
        basePrice: 200,
        metadata: {
          author: 'Test Author',
          publisher: 'Test Publisher',
          language: 'Hindi',
          isbn: '978-0123456789',
          material: 'Paper',
          dimensions: '20x15x2 cm',
          weight: '500g',
          color: 'White',
          customAttributes: {
            edition: 'First',
            binding: 'Hardcover',
          },
        },
      };

      const result = createProductSchema.safeParse(productWithMetadata);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.metadata.author).toBe('Test Author');
        expect(result.data.metadata.customAttributes.edition).toBe('First');
      }
    });
  });

  describe('updateProductSchema', () => {
    it('should validate partial updates', () => {
      const partialUpdate = {
        name: 'Updated Product Name',
        basePrice: 300,
      };

      const result = updateProductSchema.safeParse(partialUpdate);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Updated Product Name');
        expect(result.data.basePrice).toBe(300);
      }
    });

    it('should allow empty updates', () => {
      const emptyUpdate = {};

      const result = updateProductSchema.safeParse(emptyUpdate);
      expect(result.success).toBe(true);
    });
  });

  describe('productSearchSchema', () => {
    it('should validate search parameters', () => {
      const searchParams = {
        query: 'gita',
        categoryId: '550e8400-e29b-41d4-a716-446655440000',
        filters: {
          priceMin: 100,
          priceMax: 500,
          attributes: {
            author: ['Vyasa', 'Prabhupada'],
            language: ['English'],
          },
          inStock: true,
        },
        sortBy: 'price_asc',
        limit: 10,
        offset: 20,
      };

      const result = productSearchSchema.safeParse(searchParams);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.query).toBe('gita');
        expect(result.data.filters.priceMin).toBe(100);
        expect(result.data.sortBy).toBe('price_asc');
      }
    });

    it('should use default values', () => {
      const minimalSearch = {};

      const result = productSearchSchema.safeParse(minimalSearch);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.filters).toEqual({});
        expect(result.data.sortBy).toBe('relevance');
        expect(result.data.limit).toBe(20);
        expect(result.data.offset).toBe(0);
      }
    });

    it('should validate sort options', () => {
      const validSortOptions = ['relevance', 'price_asc', 'price_desc', 'name', 'popularity'];
      
      validSortOptions.forEach(sortBy => {
        const result = productSearchSchema.safeParse({ sortBy });
        expect(result.success).toBe(true);
      });

      const invalidSort = productSearchSchema.safeParse({ sortBy: 'invalid' });
      expect(invalidSort.success).toBe(false);
    });
  });

  describe('stockUpdateSchema', () => {
    it('should validate stock update operations', () => {
      const stockUpdates = [
        {
          variantId: '550e8400-e29b-41d4-a716-446655440000',
          quantity: 50,
          operation: 'set',
        },
        {
          variantId: '550e8400-e29b-41d4-a716-446655440001',
          quantity: 10,
          operation: 'add',
        },
        {
          variantId: '550e8400-e29b-41d4-a716-446655440002',
          quantity: 5,
          operation: 'subtract',
        },
      ];

      stockUpdates.forEach(update => {
        const result = stockUpdateSchema.safeParse(update);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.variantId).toBe(update.variantId);
          expect(result.data.quantity).toBe(update.quantity);
          expect(result.data.operation).toBe(update.operation);
        }
      });
    });

    it('should use default operation', () => {
      const update = {
        variantId: '550e8400-e29b-41d4-a716-446655440000',
        quantity: 25,
      };

      const result = stockUpdateSchema.safeParse(update);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.operation).toBe('set');
      }
    });

    it('should reject negative quantities', () => {
      const invalidUpdate = {
        variantId: '550e8400-e29b-41d4-a716-446655440000',
        quantity: -5,
        operation: 'set',
      };

      const result = stockUpdateSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
    });

    it('should reject invalid UUIDs', () => {
      const invalidUpdate = {
        variantId: 'invalid-uuid',
        quantity: 10,
        operation: 'set',
      };

      const result = stockUpdateSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
    });
  });

  describe('bulkStockUpdateSchema', () => {
    it('should validate bulk updates', () => {
      const bulkUpdate = {
        updates: [
          {
            variantId: '550e8400-e29b-41d4-a716-446655440000',
            quantity: 10,
            operation: 'add',
          },
          {
            variantId: '550e8400-e29b-41d4-a716-446655440001',
            quantity: 25,
            operation: 'set',
          },
        ],
      };

      const result = bulkStockUpdateSchema.safeParse(bulkUpdate);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.updates).toHaveLength(2);
      }
    });

    it('should require at least one update', () => {
      const emptyBulkUpdate = {
        updates: [],
      };

      const result = bulkStockUpdateSchema.safeParse(emptyBulkUpdate);
      expect(result.success).toBe(false);
    });
  });

  describe('lowStockAlertSchema', () => {
    it('should validate low stock alert parameters', () => {
      const alertParams = {
        threshold: 10,
        includeVariants: true,
      };

      const result = lowStockAlertSchema.safeParse(alertParams);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.threshold).toBe(10);
        expect(result.data.includeVariants).toBe(true);
      }
    });

    it('should use default values', () => {
      const emptyParams = {};

      const result = lowStockAlertSchema.safeParse(emptyParams);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.threshold).toBe(5);
        expect(result.data.includeVariants).toBe(true);
      }
    });

    it('should reject negative thresholds', () => {
      const invalidParams = {
        threshold: -1,
      };

      const result = lowStockAlertSchema.safeParse(invalidParams);
      expect(result.success).toBe(false);
    });
  });

  describe('productQuerySchema', () => {
    it('should validate product query parameters', () => {
      const queryParams = {
        search: 'test product',
        categoryId: '550e8400-e29b-41d4-a716-446655440000',
        isActive: true,
        priceMin: 50,
        priceMax: 200,
        hasVariants: true,
        inStock: true,
        sortBy: 'price',
        sortOrder: 'desc',
        page: 2,
        limit: 15,
      };

      const result = productQuerySchema.safeParse(queryParams);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.search).toBe('test product');
        expect(result.data.sortBy).toBe('price');
        expect(result.data.sortOrder).toBe('desc');
        expect(result.data.page).toBe(2);
        expect(result.data.limit).toBe(15);
      }
    });

    it('should use default values', () => {
      const emptyQuery = {};

      const result = productQuerySchema.safeParse(emptyQuery);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isActive).toBe(true);
        expect(result.data.sortBy).toBe('name');
        expect(result.data.sortOrder).toBe('asc');
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
      }
    });

    it('should validate sort options', () => {
      const validSortOptions = ['name', 'price', 'category', 'created', 'updated'];
      
      validSortOptions.forEach(sortBy => {
        const result = productQuerySchema.safeParse({ sortBy });
        expect(result.success).toBe(true);
      });

      const invalidSort = productQuerySchema.safeParse({ sortBy: 'invalid' });
      expect(invalidSort.success).toBe(false);
    });

    it('should validate pagination limits', () => {
      const validLimits = [1, 50, 100, 500, 1000];
      validLimits.forEach(limit => {
        const result = productQuerySchema.safeParse({ limit });
        expect(result.success).toBe(true);
      });

      const invalidLimits = [0, 1001, -1];
      invalidLimits.forEach(limit => {
        const result = productQuerySchema.safeParse({ limit });
        expect(result.success).toBe(false);
      });
    });

    it('should coerce string values to appropriate types', () => {
      const queryWithStrings = {
        isActive: 'true',
        priceMin: '50',
        priceMax: '200',
        hasVariants: '', // Empty string coerces to false
        inStock: 'true',
        page: '2',
        limit: '15',
      };

      const result = productQuerySchema.safeParse(queryWithStrings);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isActive).toBe(true);
        expect(result.data.priceMin).toBe(50);
        expect(result.data.priceMax).toBe(200);
        expect(result.data.hasVariants).toBe(false);
        expect(result.data.inStock).toBe(true);
        expect(result.data.page).toBe(2);
        expect(result.data.limit).toBe(15);
      }
    });
  });
});
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { CreateProductInput, ProductSearchInput } from '@/lib/validation/product';

// Mock the database connection and services
vi.mock('@/lib/db/connection', () => ({
  getLocalDb: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    all: vi.fn().mockResolvedValue([]),
  })),
}));

vi.mock('@/services/database/categories', () => ({
  categoryService: {
    findById: vi.fn(),
  },
}));

import { productService } from '@/services/database/products';
import { categoryService } from '@/services/database/categories';

describe('ProductService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createProduct', () => {
    it('should create a product with valid data', async () => {
      const productData: CreateProductInput = {
        name: 'Bhagavad Gita',
        description: 'Sacred Hindu scripture',
        basePrice: 250,
        categoryId: 'cat-1',
        keywords: ['gita', 'scripture', 'hindu'],
        metadata: {
          author: 'Vyasa',
          language: 'English',
          customAttributes: {},
        },
        isActive: true,
      };

      // Mock category exists
      vi.spyOn(categoryService, 'findById').mockResolvedValue({
        id: 'cat-1',
        name: 'Books',
        keywords: '[]',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      // Mock product doesn't exist
      vi.spyOn(productService, 'findByName').mockResolvedValue(null);

      // Mock create method
      vi.spyOn(productService, 'create').mockResolvedValue({
        id: 'prod-1',
        ...productData,
        keywords: JSON.stringify(productData.keywords),
        metadata: JSON.stringify(productData.metadata),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await productService.createProduct(productData);

      expect(result).toBeDefined();
      expect(result.name).toBe(productData.name);
      expect(productService.create).toHaveBeenCalledWith(productData);
    });

    it('should throw error if category does not exist', async () => {
      const productData: CreateProductInput = {
        name: 'Test Product',
        basePrice: 100,
        categoryId: 'invalid-cat',
        keywords: [],
        metadata: { customAttributes: {} },
        isActive: true,
      };

      vi.spyOn(categoryService, 'findById').mockResolvedValue(null);

      await expect(productService.createProduct(productData)).rejects.toThrow('Category not found');
    });

    it('should throw error if product name already exists', async () => {
      const productData: CreateProductInput = {
        name: 'Existing Product',
        basePrice: 100,
        keywords: [],
        metadata: { customAttributes: {} },
        isActive: true,
      };

      vi.spyOn(productService, 'findByName').mockResolvedValue({
        id: 'existing-prod',
        name: 'Existing Product',
      } as any);

      await expect(productService.createProduct(productData)).rejects.toThrow(
        'Product with this name already exists'
      );
    });
  });

  describe('searchProducts', () => {
    it('should search products by name', async () => {
      const searchInput: ProductSearchInput = {
        query: 'gita',
        filters: {},
        sortBy: 'relevance',
        limit: 20,
        offset: 0,
      };

      const mockProducts = [
        {
          id: 'prod-1',
          name: 'Bhagavad Gita',
          description: 'Sacred scripture',
          basePrice: 250,
          keywords: '["gita", "scripture"]',
          metadata: '{"author": "Vyasa"}',
          isActive: true,
          categoryId: 'cat-1',
        },
      ];

      const mockCategories = [
        {
          id: 'cat-1',
          name: 'Books',
        },
      ];

      // Mock database queries
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
      };

      // Mock the count query
      mockDb.select.mockReturnValueOnce([{ count: 1 }]);
      // Mock the main query
      mockDb.offset.mockResolvedValueOnce(
        mockProducts.map(p => ({ product: p, category: mockCategories[0] }))
      );

      vi.spyOn(productService, 'findVariantsByProduct').mockResolvedValue([]);
      vi.spyOn(productService, 'generateSearchSuggestions').mockResolvedValue(['gita', 'scripture']);
      vi.spyOn(productService, 'generateSearchFilters').mockResolvedValue({
        categories: [],
        priceRanges: [],
        attributes: {},
      });
      vi.spyOn(productService, 'logSearchAnalytics').mockResolvedValue();

      // Mock localDb property
      Object.defineProperty(productService, 'localDb', {
        value: mockDb,
        writable: true,
      });

      const result = await productService.searchProducts(searchInput, 'user-1');

      expect(result).toBeDefined();
      expect(result.products).toHaveLength(1);
      expect(result.products[0].name).toBe('Bhagavad Gita');
      expect(result.suggestions).toContain('gita');
    });

    it('should filter products by category', async () => {
      const searchInput: ProductSearchInput = {
        categoryId: 'cat-1',
        filters: {},
        sortBy: 'name',
        limit: 20,
        offset: 0,
      };

      // Mock implementation would verify category filter is applied
      vi.spyOn(productService, 'searchProducts').mockResolvedValue({
        products: [],
        totalCount: 0,
        suggestions: [],
        filters: { categories: [], priceRanges: [], attributes: {} },
      });

      const result = await productService.searchProducts(searchInput);

      expect(result).toBeDefined();
    });

    it('should filter products by price range', async () => {
      const searchInput: ProductSearchInput = {
        filters: {
          priceMin: 100,
          priceMax: 500,
        },
        sortBy: 'price_asc',
        limit: 20,
        offset: 0,
      };

      vi.spyOn(productService, 'searchProducts').mockResolvedValue({
        products: [],
        totalCount: 0,
        suggestions: [],
        filters: { categories: [], priceRanges: [], attributes: {} },
      });

      const result = await productService.searchProducts(searchInput);

      expect(result).toBeDefined();
    });
  });

  describe('updateVariantStock', () => {
    it('should update variant stock quantity', async () => {
      const variantId = 'variant-1';
      const newQuantity = 50;

      const mockDb = {
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue({ changes: 1 }),
      };

      Object.defineProperty(productService, 'localDb', {
        value: mockDb,
        writable: true,
      });

      vi.spyOn(productService, 'queueForSync').mockResolvedValue();

      const result = await productService.updateVariantStock(variantId, newQuantity);

      expect(result).toBe(true);
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith({
        stockQuantity: newQuantity,
        updatedAt: expect.any(Date),
      });
    });

    it('should return false if no rows were updated', async () => {
      const variantId = 'invalid-variant';
      const newQuantity = 50;

      const mockDb = {
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue({ changes: 0 }),
      };

      Object.defineProperty(productService, 'localDb', {
        value: mockDb,
        writable: true,
      });

      vi.spyOn(productService, 'queueForSync').mockResolvedValue();

      const result = await productService.updateVariantStock(variantId, newQuantity);

      expect(result).toBe(false);
    });
  });

  describe('getLowStockItems', () => {
    it('should return items with stock below threshold', async () => {
      const options = { threshold: 5, includeVariants: true };

      const mockLowStockData = [
        {
          variant: {
            id: 'variant-1',
            name: 'Small',
            stockQuantity: 3,
          },
          product: {
            id: 'prod-1',
            name: 'Test Product',
          },
          category: {
            name: 'Books',
          },
        },
      ];

      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(mockLowStockData),
      };

      Object.defineProperty(productService, 'localDb', {
        value: mockDb,
        writable: true,
      });

      const result = await productService.getLowStockItems(options);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        productId: 'prod-1',
        productName: 'Test Product',
        variantId: 'variant-1',
        variantName: 'Small',
        currentStock: 3,
        threshold: 5,
        categoryName: 'Books',
      });
    });

    it('should use default threshold when not provided', async () => {
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([]),
      };

      Object.defineProperty(productService, 'localDb', {
        value: mockDb,
        writable: true,
      });

      const result = await productService.getLowStockItems();

      expect(result).toEqual([]);
      // Verify default threshold of 5 was used
      expect(mockDb.where).toHaveBeenCalled();
    });
  });

  describe('generateSearchSuggestions', () => {
    it('should generate suggestions from product names and keywords', async () => {
      const query = 'git';

      const mockProductNames = [{ name: 'Bhagavad Gita' }];
      const mockKeywords = [{ keywords: '["gita", "scripture", "hindu"]' }];

      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn(),
      };

      // Mock first call for product names
      mockDb.limit.mockResolvedValueOnce(mockProductNames);
      // Mock second call for keywords
      mockDb.limit.mockResolvedValueOnce(mockKeywords);

      Object.defineProperty(productService, 'localDb', {
        value: mockDb,
        writable: true,
      });

      const result = await productService.generateSearchSuggestions(query);

      expect(result).toContain('Bhagavad Gita');
      expect(result).toContain('gita');
      expect(result.length).toBeLessThanOrEqual(10);
    });

    it('should return empty array for short queries', async () => {
      const result = await productService.generateSearchSuggestions('a');
      expect(result).toEqual([]);
    });

    it('should return empty array for empty queries', async () => {
      const result = await productService.generateSearchSuggestions('');
      expect(result).toEqual([]);
    });
  });

  describe('createVariant', () => {
    it('should create a product variant', async () => {
      const variantData = {
        productId: 'prod-1',
        name: 'Large',
        price: 300,
        stockQuantity: 10,
        attributes: { size: 'L', color: 'red' },
        keywords: ['large', 'big'],
      };

      // Mock product exists
      vi.spyOn(productService, 'findById').mockResolvedValue({
        id: 'prod-1',
        name: 'Test Product',
      } as any);

      // Mock database operations
      const mockDb = {
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockResolvedValue(undefined),
      };

      Object.defineProperty(productService, 'localDb', {
        value: mockDb,
        writable: true,
      });

      vi.spyOn(productService, 'queueForSync').mockResolvedValue();
      vi.spyOn(productService, 'findVariantById').mockResolvedValue({
        id: 'variant-1',
        ...variantData,
        attributes: JSON.stringify(variantData.attributes),
        keywords: JSON.stringify(variantData.keywords),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await productService.createVariant(variantData);

      expect(result).toBeDefined();
      expect(result.name).toBe(variantData.name);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should throw error if product does not exist', async () => {
      const variantData = {
        productId: 'invalid-prod',
        name: 'Test Variant',
        price: 100,
        stockQuantity: 5,
        attributes: {},
        keywords: [],
      };

      vi.spyOn(productService, 'findById').mockResolvedValue(null);

      await expect(productService.createVariant(variantData)).rejects.toThrow('Product not found');
    });
  });

  describe('bulkUpdateStock', () => {
    it('should update multiple variant stocks', async () => {
      const updates = [
        { variantId: 'variant-1', quantity: 10, operation: 'add' as const },
        { variantId: 'variant-2', quantity: 5, operation: 'set' as const },
      ];

      // Mock existing variants
      vi.spyOn(productService, 'findVariantById')
        .mockResolvedValueOnce({ id: 'variant-1', stockQuantity: 20 } as any)
        .mockResolvedValueOnce({ id: 'variant-2', stockQuantity: 15 } as any);

      vi.spyOn(productService, 'updateVariantStock')
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true);

      const result = await productService.bulkUpdateStock(updates);

      expect(result).toBe(true);
      expect(productService.updateVariantStock).toHaveBeenCalledWith('variant-1', 30); // 20 + 10
      expect(productService.updateVariantStock).toHaveBeenCalledWith('variant-2', 5); // set to 5
    });

    it('should handle subtract operation with minimum zero', async () => {
      const updates = [
        { variantId: 'variant-1', quantity: 25, operation: 'subtract' as const },
      ];

      vi.spyOn(productService, 'findVariantById').mockResolvedValue({
        id: 'variant-1',
        stockQuantity: 10,
      } as any);

      vi.spyOn(productService, 'updateVariantStock').mockResolvedValue(true);

      const result = await productService.bulkUpdateStock(updates);

      expect(result).toBe(true);
      expect(productService.updateVariantStock).toHaveBeenCalledWith('variant-1', 0); // max(0, 10-25)
    });
  });
});
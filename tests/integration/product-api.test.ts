import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getProducts, POST as createProduct } from '@/app/api/products/route';
import { GET as getProduct, PUT as updateProduct, DELETE as deleteProduct } from '@/app/api/products/[id]/route';
import { GET as searchProducts } from '@/app/api/products/search/route';
import { PUT as updateStock, GET as getStock } from '@/app/api/products/stock/route';

// Mock the product service
vi.mock('@/services/database/products', () => ({
  productService: {
    getProductsByQuery: vi.fn(),
    createProduct: vi.fn(),
    findProductsWithVariants: vi.fn(),
    updateProduct: vi.fn(),
    deactivateProduct: vi.fn(),
    searchProducts: vi.fn(),
    updateVariantStock: vi.fn(),
    bulkUpdateStock: vi.fn(),
    getLowStockItems: vi.fn(),
    findVariantById: vi.fn(),
  },
}));

import { productService } from '@/services/database/products';

describe('Product API Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/products', () => {
    it('should return paginated products with default parameters', async () => {
      const mockProducts = {
        products: [
          {
            id: 'prod-1',
            name: 'Test Product',
            basePrice: 100,
            isActive: true,
            variants: [],
            keywords: [],
            metadata: {},
          },
        ],
        totalCount: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      vi.mocked(productService.getProductsByQuery).mockResolvedValue(mockProducts);

      const request = new NextRequest('http://localhost:3000/api/products');
      const response = await getProducts(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.products).toHaveLength(1);
      expect(data.data.products[0].name).toBe('Test Product');
    });

    it('should handle query parameters correctly', async () => {
      const mockProducts = {
        products: [],
        totalCount: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      };

      vi.mocked(productService.getProductsByQuery).mockResolvedValue(mockProducts);

      const request = new NextRequest(
        'http://localhost:3000/api/products?search=test&categoryId=cat-1&page=1&limit=10'
      );
      const response = await getProducts(request);

      expect(productService.getProductsByQuery).toHaveBeenCalledWith({
        search: 'test',
        categoryId: 'cat-1',
        isActive: true,
        sortBy: 'name',
        sortOrder: 'asc',
        page: 1,
        limit: 10,
      });
    });

    it('should return 400 for invalid query parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/products?page=invalid');
      const response = await getProducts(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid query parameters');
    });

    it('should return 500 for service errors', async () => {
      vi.mocked(productService.getProductsByQuery).mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/products');
      const response = await getProducts(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to fetch products');
    });
  });

  describe('POST /api/products', () => {
    it('should create a product with valid data', async () => {
      const productData = {
        name: 'New Product',
        description: 'Product description',
        basePrice: 150,
        categoryId: 'cat-1',
        keywords: ['test', 'product'],
        metadata: {
          author: 'Test Author',
          customAttributes: {},
        },
      };

      const createdProduct = {
        id: 'prod-1',
        ...productData,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(productService.createProduct).mockResolvedValue(createdProduct as any);

      const request = new NextRequest('http://localhost:3000/api/products', {
        method: 'POST',
        body: JSON.stringify(productData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await createProduct(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe(productData.name);
      expect(data.message).toBe('Product created successfully');
    });

    it('should return 400 for invalid product data', async () => {
      const invalidData = {
        name: '', // Invalid: empty name
        basePrice: -10, // Invalid: negative price
      };

      const request = new NextRequest('http://localhost:3000/api/products', {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await createProduct(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid product data');
      expect(data.details).toBeDefined();
    });

    it('should return 400 for service validation errors', async () => {
      const productData = {
        name: 'Duplicate Product',
        basePrice: 100,
        keywords: [],
        metadata: { customAttributes: {} },
      };

      vi.mocked(productService.createProduct).mockRejectedValue(
        new Error('Product with this name already exists')
      );

      const request = new NextRequest('http://localhost:3000/api/products', {
        method: 'POST',
        body: JSON.stringify(productData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await createProduct(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Product with this name already exists');
    });
  });

  describe('GET /api/products/[id]', () => {
    it('should return product with variants', async () => {
      const mockProduct = {
        id: 'prod-1',
        name: 'Test Product',
        basePrice: 100,
        keywords: '["test", "product"]',
        metadata: '{"author": "Test Author"}',
        variants: [
          {
            id: 'var-1',
            name: 'Small',
            price: 90,
            stockQuantity: 10,
            attributes: '{"size": "S"}',
            keywords: '["small"]',
          },
        ],
        category: { id: 'cat-1', name: 'Test Category' },
      };

      vi.mocked(productService.findProductsWithVariants).mockResolvedValue([mockProduct as any]);

      const response = await getProduct(
        new NextRequest('http://localhost:3000/api/products/prod-1'),
        { params: { id: 'prod-1' } }
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('Test Product');
      expect(data.data.keywords).toEqual(['test', 'product']);
      expect(data.data.metadata.author).toBe('Test Author');
      expect(data.data.variants[0].attributes.size).toBe('S');
    });

    it('should return 400 for invalid product ID format', async () => {
      const response = await getProduct(
        new NextRequest('http://localhost:3000/api/products/invalid-id'),
        { params: { id: 'invalid-id' } }
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid product ID format');
    });

    it('should return 404 for non-existent product', async () => {
      vi.mocked(productService.findProductsWithVariants).mockResolvedValue([]);

      const response = await getProduct(
        new NextRequest('http://localhost:3000/api/products/550e8400-e29b-41d4-a716-446655440000'),
        { params: { id: '550e8400-e29b-41d4-a716-446655440000' } }
      );
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Product not found');
    });
  });

  describe('PUT /api/products/[id]', () => {
    it('should update product with valid data', async () => {
      const updateData = {
        name: 'Updated Product',
        basePrice: 200,
      };

      const updatedProduct = {
        id: 'prod-1',
        ...updateData,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(productService.updateProduct).mockResolvedValue(updatedProduct as any);

      const response = await updateProduct(
        new NextRequest('http://localhost:3000/api/products/prod-1', {
          method: 'PUT',
          body: JSON.stringify(updateData),
          headers: { 'Content-Type': 'application/json' },
        }),
        { params: { id: 'prod-1' } }
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('Updated Product');
      expect(data.message).toBe('Product updated successfully');
    });

    it('should return 404 for non-existent product', async () => {
      vi.mocked(productService.updateProduct).mockResolvedValue(null);

      const response = await updateProduct(
        new NextRequest('http://localhost:3000/api/products/550e8400-e29b-41d4-a716-446655440000', {
          method: 'PUT',
          body: JSON.stringify({ name: 'Updated' }),
          headers: { 'Content-Type': 'application/json' },
        }),
        { params: { id: '550e8400-e29b-41d4-a716-446655440000' } }
      );
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Product not found');
    });
  });

  describe('DELETE /api/products/[id]', () => {
    it('should deactivate product successfully', async () => {
      vi.mocked(productService.deactivateProduct).mockResolvedValue(true);

      const response = await deleteProduct(
        new NextRequest('http://localhost:3000/api/products/prod-1', { method: 'DELETE' }),
        { params: { id: 'prod-1' } }
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Product deactivated successfully');
    });

    it('should return 404 for non-existent product', async () => {
      vi.mocked(productService.deactivateProduct).mockResolvedValue(false);

      const response = await deleteProduct(
        new NextRequest('http://localhost:3000/api/products/550e8400-e29b-41d4-a716-446655440000', {
          method: 'DELETE',
        }),
        { params: { id: '550e8400-e29b-41d4-a716-446655440000' } }
      );
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Product not found');
    });
  });

  describe('GET /api/products/search', () => {
    it('should search products with query parameters', async () => {
      const mockSearchResult = {
        products: [
          {
            id: 'prod-1',
            name: 'Bhagavad Gita',
            basePrice: 250,
            keywords: ['gita', 'scripture'],
            metadata: { author: 'Vyasa' },
            variants: [],
          },
        ],
        totalCount: 1,
        suggestions: ['gita', 'scripture'],
        filters: {
          categories: [],
          priceRanges: [],
          attributes: {},
        },
      };

      vi.mocked(productService.searchProducts).mockResolvedValue(mockSearchResult as any);

      const request = new NextRequest(
        'http://localhost:3000/api/products/search?query=gita&limit=10'
      );
      const response = await searchProducts(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.products).toHaveLength(1);
      expect(data.data.products[0].name).toBe('Bhagavad Gita');
      expect(data.data.suggestions).toContain('gita');
    });

    it('should handle complex filters', async () => {
      const filters = {
        priceMin: 100,
        priceMax: 500,
        attributes: { author: ['Vyasa'] },
        inStock: true,
      };

      vi.mocked(productService.searchProducts).mockResolvedValue({
        products: [],
        totalCount: 0,
        suggestions: [],
        filters: { categories: [], priceRanges: [], attributes: {} },
      } as any);

      const request = new NextRequest(
        `http://localhost:3000/api/products/search?filters=${encodeURIComponent(JSON.stringify(filters))}`
      );
      const response = await searchProducts(request);

      expect(productService.searchProducts).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: filters,
        }),
        undefined
      );
    });
  });

  describe('PUT /api/products/stock', () => {
    it('should update single variant stock', async () => {
      const stockUpdate = {
        variantId: '550e8400-e29b-41d4-a716-446655440000',
        quantity: 50,
        operation: 'set',
      };

      vi.mocked(productService.updateVariantStock).mockResolvedValue(true);

      const request = new NextRequest('http://localhost:3000/api/products/stock', {
        method: 'PUT',
        body: JSON.stringify(stockUpdate),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await updateStock(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Stock updated successfully');
      expect(productService.updateVariantStock).toHaveBeenCalledWith(
        stockUpdate.variantId,
        stockUpdate.quantity
      );
    });

    it('should handle bulk stock updates', async () => {
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

      vi.mocked(productService.bulkUpdateStock).mockResolvedValue(true);

      const request = new NextRequest('http://localhost:3000/api/products/stock', {
        method: 'PUT',
        body: JSON.stringify(bulkUpdate),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await updateStock(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(productService.bulkUpdateStock).toHaveBeenCalledWith(bulkUpdate.updates);
    });

    it('should handle add and subtract operations', async () => {
      const addUpdate = {
        variantId: '550e8400-e29b-41d4-a716-446655440000',
        quantity: 10,
        operation: 'add',
      };

      const mockVariant = {
        id: addUpdate.variantId,
        stockQuantity: 20,
      };

      vi.mocked(productService.findVariantById).mockResolvedValue(mockVariant as any);
      vi.mocked(productService.updateVariantStock).mockResolvedValue(true);

      const request = new NextRequest('http://localhost:3000/api/products/stock', {
        method: 'PUT',
        body: JSON.stringify(addUpdate),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await updateStock(request);

      expect(productService.updateVariantStock).toHaveBeenCalledWith(addUpdate.variantId, 30); // 20 + 10
    });

    it('should return 404 for non-existent variant', async () => {
      const stockUpdate = {
        variantId: '550e8400-e29b-41d4-a716-446655440000',
        quantity: 10,
        operation: 'add',
      };

      vi.mocked(productService.findVariantById).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/products/stock', {
        method: 'PUT',
        body: JSON.stringify(stockUpdate),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await updateStock(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Product variant not found');
    });
  });

  describe('GET /api/products/stock?action=low-stock', () => {
    it('should return low stock items', async () => {
      const mockLowStockItems = [
        {
          productId: 'prod-1',
          productName: 'Test Product',
          variantId: 'var-1',
          variantName: 'Small',
          currentStock: 3,
          threshold: 5,
          categoryName: 'Books',
        },
      ];

      vi.mocked(productService.getLowStockItems).mockResolvedValue(mockLowStockItems);

      const request = new NextRequest(
        'http://localhost:3000/api/products/stock?action=low-stock&threshold=5'
      );
      const response = await getStock(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].currentStock).toBe(3);
      expect(data.data[0].threshold).toBe(5);
    });

    it('should return 400 for invalid action', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/products/stock?action=invalid'
      );
      const response = await getStock(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid action parameter');
    });
  });
});
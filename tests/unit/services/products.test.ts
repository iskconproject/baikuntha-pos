import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ProductService, type ProductWithVariants, type ProductSearchResult } from '@/services/database/products';
import type { Product, NewProduct, ProductVariant, NewProductVariant } from '@/lib/db/schema';

// Mock the database connection
vi.mock('@/lib/db/connection', () => ({
  getLocalDb: vi.fn(),
  getCloudDb: vi.fn()
}));

describe('ProductService', () => {
  let productService: ProductService;
  const mockDb = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    all: vi.fn(),
    run: vi.fn()
  };

  const mockProduct: Product = {
    id: 'product-1',
    name: 'Bhagavad Gita',
    description: 'Sacred Hindu scripture',
    basePrice: 250,
    categoryId: 'category-1',
    keywords: '["gita", "scripture", "hindu"]',
    metadata: '{"author": "Vyasa", "language": "English"}',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  };

  const mockVariant: ProductVariant = {
    id: 'variant-1',
    productId: 'product-1',
    name: 'Hardcover',
    price: 300,
    stockQuantity: 10,
    attributes: '{"binding": "hardcover"}',
    keywords: '["hardcover", "premium"]',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create a new instance for each test
    productService = new ProductService();
    
    // Mock the localDb property directly
    (productService as any).localDb = mockDb;
    
    // Setup default mock chain
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([mockProduct]),
          orderBy: vi.fn().mockResolvedValue([mockProduct])
        }),
        limit: vi.fn().mockResolvedValue([mockProduct]),
        orderBy: vi.fn().mockResolvedValue([mockProduct]),
        leftJoin: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue([{
                product: mockProduct,
                variant: mockVariant,
                category: { id: 'category-1', name: 'Books' }
              }])
            })
          })
        })
      })
    });

    mockDb.insert.mockReturnValue({
      values: vi.fn().mockResolvedValue({ changes: 1 })
    });

    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue({ changes: 1 })
      })
    });

    mockDb.delete.mockReturnValue({
      where: vi.fn().mockResolvedValue({ changes: 1 })
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('findByName', () => {
    it('should find product by name', async () => {
      const result = await productService.findByName('Bhagavad Gita');
      
      expect(result).toEqual(mockProduct);
      expect(mockDb.select).toHaveBeenCalled();
    });

    it('should return null if product not found', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([])
          })
        })
      });

      const result = await productService.findByName('Non-existent Product');
      
      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      mockDb.select.mockImplementation(() => {
        throw new Error('Database error');
      });

      await expect(productService.findByName('Test')).rejects.toThrow('Database error');
    });
  });

  describe('findByCategory', () => {
    it('should find products by category', async () => {
      const result = await productService.findByCategory('category-1');
      
      expect(result).toEqual([mockProduct]);
      expect(mockDb.select).toHaveBeenCalled();
    });

    it('should return empty array if no products found', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([])
          })
        })
      });

      const result = await productService.findByCategory('empty-category');
      
      expect(result).toEqual([]);
    });
  });

  describe('findActiveProducts', () => {
    it('should find all active products', async () => {
      const result = await productService.findActiveProducts();
      
      expect(result).toEqual([mockProduct]);
      expect(mockDb.select).toHaveBeenCalled();
    });
  });

  describe('findProductsWithVariants', () => {
    it('should find products with their variants', async () => {
      const result = await productService.findProductsWithVariants();
      
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        ...mockProduct,
        category: { id: 'category-1', name: 'Books' },
        variants: [mockVariant]
      });
    });

    it('should find specific product with variants', async () => {
      const result = await productService.findProductsWithVariants('product-1');
      
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('product-1');
    });
  });

  describe('searchProducts', () => {
    it('should search products by query', async () => {
      const result = await productService.searchProducts('gita');
      
      expect(result).toEqual([mockProduct]);
      expect(mockDb.select).toHaveBeenCalled();
    });

    it('should return empty array for no matches', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([])
          })
        })
      });

      const result = await productService.searchProducts('nonexistent');
      
      expect(result).toEqual([]);
    });
  });

  describe('fullTextSearch', () => {
    it('should perform full-text search', async () => {
      const mockSearchResults = [
        { ...mockProduct, rank: 1, category_name: 'Books' }
      ];
      
      mockDb.all.mockResolvedValue(mockSearchResults);

      const result = await productService.fullTextSearch('gita');
      
      expect(result).toEqual(mockSearchResults);
      expect(mockDb.all).toHaveBeenCalled();
    });

    it('should fallback to regular search on FTS error', async () => {
      mockDb.all.mockRejectedValue(new Error('FTS error'));

      const result = await productService.fullTextSearch('gita');
      
      expect(result).toEqual([{ ...mockProduct, rank: 0 }]);
    });
  });

  describe('findProductsByPriceRange', () => {
    it('should find products within price range', async () => {
      const result = await productService.findProductsByPriceRange(200, 300);
      
      expect(result).toEqual([mockProduct]);
      expect(mockDb.select).toHaveBeenCalled();
    });
  });

  describe('createProduct', () => {
    const newProductData: Omit<NewProduct, 'id'> = {
      name: 'New Product',
      description: 'Test product',
      basePrice: 100,
      categoryId: 'category-1',
      keywords: '["test"]',
      metadata: '{}',
      isActive: true
    };

    it('should create a new product', async () => {
      // Mock category validation
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 'category-1' }])
          })
        })
      });

      // Mock name uniqueness check
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([])
          })
        })
      });

      // Mock create method
      vi.spyOn(productService, 'create').mockResolvedValue(mockProduct);

      const result = await productService.createProduct(newProductData);
      
      expect(result).toEqual(mockProduct);
      expect(productService.create).toHaveBeenCalledWith(newProductData);
    });

    it('should throw error if category not found', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([])
          })
        })
      });

      await expect(productService.createProduct(newProductData))
        .rejects.toThrow('Category not found');
    });

    it('should throw error if product name already exists', async () => {
      // Mock category validation success
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 'category-1' }])
          })
        })
      });

      // Mock name uniqueness check failure
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockProduct])
          })
        })
      });

      await expect(productService.createProduct(newProductData))
        .rejects.toThrow('Product with this name already exists');
    });
  });

  describe('updateProduct', () => {
    const updateData = { name: 'Updated Product' };

    it('should update product successfully', async () => {
      // Mock name uniqueness check
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([])
          })
        })
      });

      vi.spyOn(productService, 'update').mockResolvedValue(mockProduct);

      const result = await productService.updateProduct('product-1', updateData);
      
      expect(result).toEqual(mockProduct);
      expect(productService.update).toHaveBeenCalledWith('product-1', updateData);
    });

    it('should throw error if updated name already exists', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ ...mockProduct, id: 'different-id' }])
          })
        })
      });

      await expect(productService.updateProduct('product-1', updateData))
        .rejects.toThrow('Product with this name already exists');
    });
  });

  describe('deactivateProduct', () => {
    it('should deactivate product successfully', async () => {
      vi.spyOn(productService, 'queueForSync').mockResolvedValue();

      const result = await productService.deactivateProduct('product-1');
      
      expect(result).toBe(true);
      expect(mockDb.update).toHaveBeenCalled();
      expect(productService.queueForSync).toHaveBeenCalledWith('update', 'product-1');
    });

    it('should return false if product not found', async () => {
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({ changes: 0 })
        })
      });

      const result = await productService.deactivateProduct('nonexistent');
      
      expect(result).toBe(false);
    });
  });

  describe('Variant Methods', () => {
    describe('findVariantsByProduct', () => {
      it('should find variants by product ID', async () => {
        mockDb.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue([mockVariant])
            })
          })
        });

        const result = await productService.findVariantsByProduct('product-1');
        
        expect(result).toEqual([mockVariant]);
      });
    });

    describe('findVariantById', () => {
      it('should find variant by ID', async () => {
        mockDb.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockVariant])
            })
          })
        });

        const result = await productService.findVariantById('variant-1');
        
        expect(result).toEqual(mockVariant);
      });
    });

    describe('createVariant', () => {
      const newVariantData: Omit<NewProductVariant, 'id'> = {
        productId: 'product-1',
        name: 'Paperback',
        price: 200,
        stockQuantity: 20,
        attributes: '{"binding": "paperback"}',
        keywords: '["paperback", "affordable"]'
      };

      it('should create variant successfully', async () => {
        vi.spyOn(productService, 'findById').mockResolvedValue(mockProduct);
        vi.spyOn(productService, 'findVariantById').mockResolvedValue(mockVariant);
        vi.spyOn(productService, 'queueForSync').mockResolvedValue();

        const result = await productService.createVariant(newVariantData);
        
        expect(result).toEqual(mockVariant);
        expect(mockDb.insert).toHaveBeenCalled();
      });

      it('should throw error if product not found', async () => {
        vi.spyOn(productService, 'findById').mockResolvedValue(null);

        await expect(productService.createVariant(newVariantData))
          .rejects.toThrow('Product not found');
      });
    });

    describe('updateVariant', () => {
      it('should update variant successfully', async () => {
        vi.spyOn(productService, 'findVariantById').mockResolvedValue(mockVariant);
        vi.spyOn(productService, 'queueForSync').mockResolvedValue();

        const result = await productService.updateVariant('variant-1', { price: 350 });
        
        expect(result).toEqual(mockVariant);
        expect(mockDb.update).toHaveBeenCalled();
      });
    });

    describe('deleteVariant', () => {
      it('should delete variant successfully', async () => {
        vi.spyOn(productService, 'queueForSync').mockResolvedValue();

        const result = await productService.deleteVariant('variant-1');
        
        expect(result).toBe(true);
        expect(mockDb.delete).toHaveBeenCalled();
      });
    });

    describe('updateVariantStock', () => {
      it('should update variant stock successfully', async () => {
        vi.spyOn(productService, 'queueForSync').mockResolvedValue();

        const result = await productService.updateVariantStock('variant-1', 15);
        
        expect(result).toBe(true);
        expect(mockDb.update).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      // Mock the localDb to throw an error
      (productService as any).localDb = {
        select: () => {
          throw new Error('Database connection failed');
        }
      };

      await expect(productService.findByName('test'))
        .rejects.toThrow('Database connection failed');
    });

    it('should handle malformed data gracefully', async () => {
      const invalidData = {
        name: '',
        basePrice: -100
      } as any;

      await expect(productService.createProduct(invalidData))
        .rejects.toThrow();
    });
  });
});
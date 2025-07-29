import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { categoryService } from '@/services/database/categories';
import type { CreateCategoryInput, CategoryQueryInput } from '@/lib/validation/category';

// Mock the database connection
vi.mock('@/lib/db/connection', () => ({
  getLocalDb: vi.fn(() => ({
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  })),
}));

describe('CategoryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createCategoryWithValidation', () => {
    it('should create a category with valid data', async () => {
      const categoryData: CreateCategoryInput = {
        name: 'Books',
        description: 'Religious and spiritual books',
        keywords: ['books', 'literature', 'spiritual'],
        isActive: true,
      };

      // Mock category doesn't exist
      vi.spyOn(categoryService, 'findByName').mockResolvedValue(null);

      // Mock create method
      vi.spyOn(categoryService, 'create').mockResolvedValue({
        id: 'cat-1',
        ...categoryData,
        keywords: JSON.stringify(categoryData.keywords),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await categoryService.createCategoryWithValidation(categoryData);

      expect(result).toBeDefined();
      expect(result.name).toBe(categoryData.name);
      expect(result.keywords).toEqual(categoryData.keywords);
      expect(categoryService.create).toHaveBeenCalledWith({
        ...categoryData,
        keywords: JSON.stringify(categoryData.keywords),
      });
    });

    it('should throw error if parent category does not exist', async () => {
      const categoryData: CreateCategoryInput = {
        name: 'Subcategory',
        parentId: 'invalid-parent',
        keywords: [],
        isActive: true,
      };

      vi.spyOn(categoryService, 'findById').mockResolvedValue(null);

      await expect(categoryService.createCategoryWithValidation(categoryData)).rejects.toThrow(
        'Parent category not found'
      );
    });

    it('should throw error if category name already exists', async () => {
      const categoryData: CreateCategoryInput = {
        name: 'Existing Category',
        keywords: [],
        isActive: true,
      };

      vi.spyOn(categoryService, 'findByName').mockResolvedValue({
        id: 'existing-cat',
        name: 'Existing Category',
      } as any);

      await expect(categoryService.createCategoryWithValidation(categoryData)).rejects.toThrow(
        'Category with this name already exists'
      );
    });

    it('should create category with parent when parent exists', async () => {
      const categoryData: CreateCategoryInput = {
        name: 'Subcategory',
        parentId: 'parent-cat',
        keywords: [],
        isActive: true,
      };

      // Mock parent exists
      vi.spyOn(categoryService, 'findById').mockResolvedValue({
        id: 'parent-cat',
        name: 'Parent Category',
      } as any);

      // Mock category doesn't exist
      vi.spyOn(categoryService, 'findByName').mockResolvedValue(null);

      // Mock create method
      vi.spyOn(categoryService, 'create').mockResolvedValue({
        id: 'cat-1',
        ...categoryData,
        keywords: JSON.stringify(categoryData.keywords),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await categoryService.createCategoryWithValidation(categoryData);

      expect(result).toBeDefined();
      expect(result.name).toBe(categoryData.name);
    });
  });

  describe('updateCategoryWithValidation', () => {
    it('should update category with valid data', async () => {
      const categoryId = 'cat-1';
      const updateData = {
        name: 'Updated Category',
        description: 'Updated description',
        keywords: ['updated', 'keywords'],
      };

      // Mock category doesn't exist with same name
      vi.spyOn(categoryService, 'findByName').mockResolvedValue(null);

      // Mock update method
      vi.spyOn(categoryService, 'update').mockResolvedValue({
        id: categoryId,
        ...updateData,
        keywords: JSON.stringify(updateData.keywords),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await categoryService.updateCategoryWithValidation(categoryId, updateData);

      expect(result).toBeDefined();
      expect(result!.name).toBe(updateData.name);
      expect(result!.keywords).toEqual(updateData.keywords);
    });

    it('should prevent circular references', async () => {
      const categoryId = 'cat-1';
      const updateData = {
        parentId: 'cat-2',
      };

      // Mock parent exists
      vi.spyOn(categoryService, 'findById').mockResolvedValue({
        id: 'cat-2',
        name: 'Parent Category',
      } as any);

      // Mock circular reference check
      vi.spyOn(categoryService as any, 'wouldCreateCircularReference').mockResolvedValue(true);

      await expect(
        categoryService.updateCategoryWithValidation(categoryId, updateData)
      ).rejects.toThrow('Cannot create circular reference in category hierarchy');
    });

    it('should throw error if new name already exists for different category', async () => {
      const categoryId = 'cat-1';
      const updateData = {
        name: 'Existing Name',
      };

      vi.spyOn(categoryService, 'findByName').mockResolvedValue({
        id: 'different-cat',
        name: 'Existing Name',
      } as any);

      await expect(
        categoryService.updateCategoryWithValidation(categoryId, updateData)
      ).rejects.toThrow('Category with this name already exists');
    });
  });

  describe('getCategoryHierarchy', () => {
    it('should return hierarchical category structure', async () => {
      const mockCategories = [
        {
          id: 'cat-1',
          name: 'Books',
          parentId: null,
          keywords: '["books", "literature"]',
          isActive: true,
        },
        {
          id: 'cat-2',
          name: 'Fiction',
          parentId: 'cat-1',
          keywords: '["fiction", "novels"]',
          isActive: true,
        },
        {
          id: 'cat-3',
          name: 'Non-Fiction',
          parentId: 'cat-1',
          keywords: '["non-fiction", "educational"]',
          isActive: true,
        },
      ];

      vi.spyOn(categoryService, 'findActiveCategories').mockResolvedValue(mockCategories as any);

      const result = await categoryService.getCategoryHierarchy();

      expect(result).toHaveLength(1); // One root category
      expect(result[0].name).toBe('Books');
      expect(result[0].children).toHaveLength(2); // Two subcategories
      expect(result[0].children[0].name).toBe('Fiction');
      expect(result[0].children[1].name).toBe('Non-Fiction');
    });

    it('should include product counts when requested', async () => {
      const options = { includeProductCount: true };

      const mockCategoriesWithCounts = [
        {
          category: {
            id: 'cat-1',
            name: 'Books',
            parentId: null,
            keywords: '["books"]',
            isActive: true,
          },
          productCount: 5,
        },
      ];

      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(mockCategoriesWithCounts),
      };

      Object.defineProperty(categoryService, 'localDb', {
        value: mockDb,
        writable: true,
      });

      const result = await categoryService.getCategoryHierarchy(options);

      expect(result).toHaveLength(1);
      expect(result[0].productCount).toBe(5);
    });

    it('should respect max depth limit', async () => {
      const options = { maxDepth: 2 };

      const mockCategories = [
        { id: 'cat-1', name: 'Level 1', parentId: null, keywords: '[]', isActive: true },
        { id: 'cat-2', name: 'Level 2', parentId: 'cat-1', keywords: '[]', isActive: true },
        { id: 'cat-3', name: 'Level 3', parentId: 'cat-2', keywords: '[]', isActive: true },
      ];

      vi.spyOn(categoryService, 'findActiveCategories').mockResolvedValue(mockCategories as any);

      const result = await categoryService.getCategoryHierarchy(options);

      expect(result).toHaveLength(1);
      expect(result[0].children).toHaveLength(1);
      expect(result[0].children[0].children).toHaveLength(0); // Max depth reached
    });
  });

  describe('getCategoriesByQuery', () => {
    it('should filter categories by search query', async () => {
      const queryInput: CategoryQueryInput = {
        search: 'book',
        page: 1,
        limit: 10,
      };

      const mockCategories = [
        {
          category: {
            id: 'cat-1',
            name: 'Books',
            description: 'Book category',
            keywords: '["books", "literature"]',
            isActive: true,
          },
          productCount: 5,
        },
      ];

      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue(mockCategories),
      };

      // Mock count query
      const mockCountDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 1 }]),
      };

      Object.defineProperty(categoryService, 'localDb', {
        value: { ...mockDb, ...mockCountDb },
        writable: true,
      });

      const result = await categoryService.getCategoriesByQuery(queryInput);

      expect(result.categories).toHaveLength(1);
      expect(result.categories[0].name).toBe('Books');
      expect(result.totalCount).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should filter categories by parent ID', async () => {
      const queryInput: CategoryQueryInput = {
        parentId: 'parent-cat',
        page: 1,
        limit: 10,
      };

      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue([]),
      };

      Object.defineProperty(categoryService, 'localDb', {
        value: mockDb,
        writable: true,
      });

      const result = await categoryService.getCategoriesByQuery(queryInput);

      expect(mockDb.where).toHaveBeenCalled();
      expect(result.categories).toEqual([]);
    });

    it('should include hierarchy when requested', async () => {
      const queryInput: CategoryQueryInput = {
        includeHierarchy: true,
        page: 1,
        limit: 10,
      };

      const mockCategories = [
        {
          category: {
            id: 'cat-1',
            name: 'Books',
            parentId: null,
            keywords: '[]',
            isActive: true,
          },
          productCount: 0,
        },
      ];

      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue(mockCategories),
      };

      Object.defineProperty(categoryService, 'localDb', {
        value: mockDb,
        writable: true,
      });

      vi.spyOn(categoryService, 'findActiveCategories').mockResolvedValue([]);

      const result = await categoryService.getCategoriesByQuery(queryInput);

      expect(result.categories[0]).toHaveProperty('children');
      expect(Array.isArray(result.categories[0].children)).toBe(true);
    });
  });

  describe('moveCategory', () => {
    it('should move category to new parent', async () => {
      const categoryId = 'cat-1';
      const newParentId = 'new-parent';

      // Mock new parent exists
      vi.spyOn(categoryService, 'findById').mockResolvedValue({
        id: newParentId,
        name: 'New Parent',
      } as any);

      // Mock no circular reference
      vi.spyOn(categoryService as any, 'wouldCreateCircularReference').mockResolvedValue(false);

      const mockDb = {
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue({ changes: 1 }),
      };

      Object.defineProperty(categoryService, 'localDb', {
        value: mockDb,
        writable: true,
      });

      vi.spyOn(categoryService, 'queueForSync').mockResolvedValue();

      const result = await categoryService.moveCategory(categoryId, newParentId);

      expect(result).toBe(true);
      expect(mockDb.set).toHaveBeenCalledWith({
        parentId: newParentId,
        updatedAt: expect.any(Date),
      });
    });

    it('should move category to root level when no parent provided', async () => {
      const categoryId = 'cat-1';

      const mockDb = {
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue({ changes: 1 }),
      };

      Object.defineProperty(categoryService, 'localDb', {
        value: mockDb,
        writable: true,
      });

      vi.spyOn(categoryService, 'queueForSync').mockResolvedValue();

      const result = await categoryService.moveCategory(categoryId);

      expect(result).toBe(true);
      expect(mockDb.set).toHaveBeenCalledWith({
        parentId: null,
        updatedAt: expect.any(Date),
      });
    });

    it('should throw error if new parent does not exist', async () => {
      const categoryId = 'cat-1';
      const newParentId = 'invalid-parent';

      vi.spyOn(categoryService, 'findById').mockResolvedValue(null);

      await expect(categoryService.moveCategory(categoryId, newParentId)).rejects.toThrow(
        'New parent category not found'
      );
    });

    it('should prevent circular references', async () => {
      const categoryId = 'cat-1';
      const newParentId = 'cat-2';

      // Mock parent exists
      vi.spyOn(categoryService, 'findById').mockResolvedValue({
        id: newParentId,
        name: 'Parent',
      } as any);

      // Mock circular reference
      vi.spyOn(categoryService as any, 'wouldCreateCircularReference').mockResolvedValue(true);

      await expect(categoryService.moveCategory(categoryId, newParentId)).rejects.toThrow(
        'Cannot create circular reference in category hierarchy'
      );
    });
  });

  describe('deactivateCategory', () => {
    it('should deactivate category without subcategories', async () => {
      const categoryId = 'cat-1';

      // Mock no subcategories
      vi.spyOn(categoryService, 'findSubcategories').mockResolvedValue([]);

      const mockDb = {
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue({ changes: 1 }),
      };

      Object.defineProperty(categoryService, 'localDb', {
        value: mockDb,
        writable: true,
      });

      vi.spyOn(categoryService, 'queueForSync').mockResolvedValue();

      const result = await categoryService.deactivateCategory(categoryId);

      expect(result).toBe(true);
      expect(mockDb.set).toHaveBeenCalledWith({
        isActive: false,
        updatedAt: expect.any(Date),
      });
    });

    it('should throw error if category has active subcategories', async () => {
      const categoryId = 'cat-1';

      // Mock has subcategories
      vi.spyOn(categoryService, 'findSubcategories').mockResolvedValue([
        { id: 'sub-cat', name: 'Subcategory' } as any,
      ]);

      await expect(categoryService.deactivateCategory(categoryId)).rejects.toThrow(
        'Cannot deactivate category with active subcategories'
      );
    });
  });

  describe('searchCategories', () => {
    it('should search categories by name, description, and keywords', async () => {
      const query = 'book';

      const mockCategories = [
        {
          id: 'cat-1',
          name: 'Books',
          description: 'Book category',
          keywords: '["books", "literature"]',
          isActive: true,
        },
      ];

      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(mockCategories),
      };

      Object.defineProperty(categoryService, 'localDb', {
        value: mockDb,
        writable: true,
      });

      const result = await categoryService.searchCategories(query);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Books');
      expect(mockDb.where).toHaveBeenCalled();
    });

    it('should return empty array for empty query', async () => {
      const result = await categoryService.searchCategories('');

      // Should still perform search but with empty term
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
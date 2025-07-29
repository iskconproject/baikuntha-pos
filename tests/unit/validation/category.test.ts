import { describe, it, expect } from 'vitest';
import {
  createCategorySchema,
  updateCategorySchema,
  categoryQuerySchema,
  categoryHierarchySchema,
  categoryImportSchema,
  categoryMoveSchema,
} from '@/lib/validation/category';

describe('Category Validation Schemas', () => {
  describe('createCategorySchema', () => {
    it('should validate valid category data', () => {
      const validCategory = {
        name: 'Books',
        description: 'Religious and spiritual books',
        parentId: '550e8400-e29b-41d4-a716-446655440000',
        keywords: ['books', 'literature', 'spiritual'],
        isActive: true,
      };

      const result = createCategorySchema.safeParse(validCategory);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Books');
        expect(result.data.keywords).toEqual(['books', 'literature', 'spiritual']);
        expect(result.data.isActive).toBe(true);
      }
    });

    it('should reject invalid category data', () => {
      const invalidCategory = {
        name: '', // Empty name
        parentId: 'invalid-uuid', // Invalid UUID
        keywords: ['', 'valid'], // Empty keyword
      };

      const result = createCategorySchema.safeParse(invalidCategory);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors.length).toBeGreaterThanOrEqual(3);
        expect(result.error.errors.some(e => e.path.includes('name'))).toBe(true);
        expect(result.error.errors.some(e => e.path.includes('parentId'))).toBe(true);
        expect(result.error.errors.some(e => e.path.includes('keywords'))).toBe(true);
      }
    });

    it('should use default values for optional fields', () => {
      const minimalCategory = {
        name: 'Test Category',
      };

      const result = createCategorySchema.safeParse(minimalCategory);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.keywords).toEqual([]);
        expect(result.data.isActive).toBe(true);
      }
    });

    it('should validate name length constraints', () => {
      const longName = 'a'.repeat(101); // Too long
      const invalidCategory = {
        name: longName,
      };

      const result = createCategorySchema.safeParse(invalidCategory);
      expect(result.success).toBe(false);
    });

    it('should validate description length constraints', () => {
      const longDescription = 'a'.repeat(501); // Too long
      const invalidCategory = {
        name: 'Valid Name',
        description: longDescription,
      };

      const result = createCategorySchema.safeParse(invalidCategory);
      expect(result.success).toBe(false);
    });

    it('should remove duplicate keywords', () => {
      const categoryWithDuplicates = {
        name: 'Test Category',
        keywords: ['book', 'literature', 'book', 'spiritual'], // 'book' is duplicate
      };

      const result = createCategorySchema.safeParse(categoryWithDuplicates);
      expect(result.success).toBe(false); // Should fail due to duplicate validation
    });

    it('should reject empty keywords', () => {
      const categoryWithEmptyKeyword = {
        name: 'Test Category',
        keywords: ['valid', '', 'another'], // Empty keyword
      };

      const result = createCategorySchema.safeParse(categoryWithEmptyKeyword);
      expect(result.success).toBe(false);
    });
  });

  describe('updateCategorySchema', () => {
    it('should validate partial updates', () => {
      const partialUpdate = {
        name: 'Updated Category Name',
        description: 'Updated description',
      };

      const result = updateCategorySchema.safeParse(partialUpdate);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Updated Category Name');
        expect(result.data.description).toBe('Updated description');
      }
    });

    it('should allow empty updates', () => {
      const emptyUpdate = {};

      const result = updateCategorySchema.safeParse(emptyUpdate);
      expect(result.success).toBe(true);
    });

    it('should validate parent ID format when provided', () => {
      const updateWithInvalidParent = {
        parentId: 'invalid-uuid',
      };

      const result = updateCategorySchema.safeParse(updateWithInvalidParent);
      expect(result.success).toBe(false);
    });
  });

  describe('categoryQuerySchema', () => {
    it('should validate category query parameters', () => {
      const queryParams = {
        search: 'book',
        parentId: '550e8400-e29b-41d4-a716-446655440000',
        isActive: true,
        includeHierarchy: true,
        sortBy: 'created',
        sortOrder: 'desc',
        page: 2,
        limit: 15,
      };

      const result = categoryQuerySchema.safeParse(queryParams);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.search).toBe('book');
        expect(result.data.includeHierarchy).toBe(true);
        expect(result.data.sortBy).toBe('created');
        expect(result.data.sortOrder).toBe('desc');
        expect(result.data.page).toBe(2);
        expect(result.data.limit).toBe(15);
      }
    });

    it('should use default values', () => {
      const emptyQuery = {};

      const result = categoryQuerySchema.safeParse(emptyQuery);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.includeHierarchy).toBe(false);
        expect(result.data.sortBy).toBe('name');
        expect(result.data.sortOrder).toBe('asc');
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
      }
    });

    it('should validate sort options', () => {
      const validSortOptions = ['name', 'created', 'updated'];
      
      validSortOptions.forEach(sortBy => {
        const result = categoryQuerySchema.safeParse({ sortBy });
        expect(result.success).toBe(true);
      });

      const invalidSort = categoryQuerySchema.safeParse({ sortBy: 'invalid' });
      expect(invalidSort.success).toBe(false);
    });

    it('should validate pagination limits', () => {
      const validLimits = [1, 50, 100];
      validLimits.forEach(limit => {
        const result = categoryQuerySchema.safeParse({ limit });
        expect(result.success).toBe(true);
      });

      const invalidLimits = [0, 101, -1];
      invalidLimits.forEach(limit => {
        const result = categoryQuerySchema.safeParse({ limit });
        expect(result.success).toBe(false);
      });
    });
  });

  describe('categoryHierarchySchema', () => {
    it('should validate hierarchy parameters', () => {
      const hierarchyParams = {
        maxDepth: 3,
        includeProductCount: true,
        activeOnly: false,
      };

      const result = categoryHierarchySchema.safeParse(hierarchyParams);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.maxDepth).toBe(3);
        expect(result.data.includeProductCount).toBe(true);
        expect(result.data.activeOnly).toBe(false);
      }
    });

    it('should use default values', () => {
      const emptyParams = {};

      const result = categoryHierarchySchema.safeParse(emptyParams);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.maxDepth).toBe(5);
        expect(result.data.includeProductCount).toBe(false);
        expect(result.data.activeOnly).toBe(true);
      }
    });

    it('should validate depth constraints', () => {
      const validDepths = [1, 5, 10];
      validDepths.forEach(maxDepth => {
        const result = categoryHierarchySchema.safeParse({ maxDepth });
        expect(result.success).toBe(true);
      });

      const invalidDepths = [0, 11, -1];
      invalidDepths.forEach(maxDepth => {
        const result = categoryHierarchySchema.safeParse({ maxDepth });
        expect(result.success).toBe(false);
      });
    });
  });

  describe('categoryImportSchema', () => {
    it('should validate category import data', () => {
      const importData = {
        categories: [
          {
            name: 'Books',
            description: 'Book category',
            parentName: 'Root Category',
            keywords: ['books', 'literature'],
          },
          {
            name: 'Fiction',
            description: 'Fiction books',
            parentName: 'Books',
            keywords: ['fiction', 'novels'],
          },
        ],
      };

      const result = categoryImportSchema.safeParse(importData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.categories).toHaveLength(2);
        expect(result.data.categories[0].name).toBe('Books');
        expect(result.data.categories[1].parentName).toBe('Books');
      }
    });

    it('should require at least one category', () => {
      const emptyImport = {
        categories: [],
      };

      const result = categoryImportSchema.safeParse(emptyImport);
      expect(result.success).toBe(false);
    });

    it('should validate individual category data', () => {
      const invalidImport = {
        categories: [
          {
            name: '', // Invalid: empty name
            keywords: ['valid'],
          },
        ],
      };

      const result = categoryImportSchema.safeParse(invalidImport);
      expect(result.success).toBe(false);
    });

    it('should use default values for optional fields', () => {
      const minimalImport = {
        categories: [
          {
            name: 'Test Category',
          },
        ],
      };

      const result = categoryImportSchema.safeParse(minimalImport);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.categories[0].keywords).toEqual([]);
      }
    });
  });

  describe('categoryMoveSchema', () => {
    it('should validate category move parameters', () => {
      const moveParams = {
        categoryId: '550e8400-e29b-41d4-a716-446655440000',
        newParentId: '550e8400-e29b-41d4-a716-446655440001',
      };

      const result = categoryMoveSchema.safeParse(moveParams);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.categoryId).toBe(moveParams.categoryId);
        expect(result.data.newParentId).toBe(moveParams.newParentId);
      }
    });

    it('should allow moving to root level', () => {
      const moveToRoot = {
        categoryId: '550e8400-e29b-41d4-a716-446655440000',
        // newParentId is optional for root level
      };

      const result = categoryMoveSchema.safeParse(moveToRoot);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.categoryId).toBe(moveToRoot.categoryId);
        expect(result.data.newParentId).toBeUndefined();
      }
    });

    it('should validate UUID formats', () => {
      const invalidMove = {
        categoryId: 'invalid-uuid',
        newParentId: 'also-invalid',
      };

      const result = categoryMoveSchema.safeParse(invalidMove);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors).toHaveLength(2);
      }
    });

    it('should require category ID', () => {
      const missingCategoryId = {
        newParentId: '550e8400-e29b-41d4-a716-446655440000',
      };

      const result = categoryMoveSchema.safeParse(missingCategoryId);
      expect(result.success).toBe(false);
    });
  });
});
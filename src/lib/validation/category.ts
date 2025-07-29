import { z } from 'zod';

// Keywords array schema with validation
export const keywordsSchema = z
  .array(z.string().min(1, 'Keyword cannot be empty'))
  .default([])
  .refine((keywords) => {
    // Remove duplicates and empty strings
    const cleaned = Array.from(new Set(keywords.filter(k => k.trim().length > 0)));
    return cleaned.length === keywords.length;
  }, 'Keywords must be unique and non-empty');

// Create category schema
export const createCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100, 'Category name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  parentId: z.string().uuid('Invalid parent category ID').optional(),
  keywords: keywordsSchema,
  isActive: z.boolean().default(true),
});

// Update category schema
export const updateCategorySchema = createCategorySchema.partial();

// Category query schema for filtering and pagination
export const categoryQuerySchema = z.object({
  search: z.string().optional(),
  parentId: z.string().uuid().optional(),
  isActive: z.boolean().optional(),
  includeHierarchy: z.boolean().default(false),
  sortBy: z.enum(['name', 'created', 'updated']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

// Category hierarchy schema for nested structures
export const categoryHierarchySchema = z.object({
  maxDepth: z.number().int().min(1).max(10).default(5),
  includeProductCount: z.boolean().default(false),
  activeOnly: z.boolean().default(true),
});

// Category import schema for bulk operations
export const categoryImportSchema = z.object({
  categories: z.array(z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    parentName: z.string().optional(), // Will be resolved to parentId
    keywords: z.array(z.string()).default([]),
  })).min(1, 'At least one category is required'),
});

// Category move schema for reorganizing hierarchy
export const categoryMoveSchema = z.object({
  categoryId: z.string().uuid('Invalid category ID'),
  newParentId: z.string().uuid('Invalid parent category ID').optional(),
});

// Form-specific schema for components (with required fields for better UX)
export const categoryFormSchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100, 'Category name too long'),
  description: z.string().optional(),
  parentId: z.string().optional(),
  keywords: z.array(z.object({ value: z.string() })),
  isActive: z.boolean(),
});

// Export types
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CategoryFormInput = z.infer<typeof categoryFormSchema>;
export type CategoryQueryInput = z.infer<typeof categoryQuerySchema>;
export type CategoryHierarchyInput = z.infer<typeof categoryHierarchySchema>;
export type CategoryImportInput = z.infer<typeof categoryImportSchema>;
export type CategoryMoveInput = z.infer<typeof categoryMoveSchema>;

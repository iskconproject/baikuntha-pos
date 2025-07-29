import { z } from 'zod';

// Product metadata schema with custom attributes
export const productMetadataSchema = z.object({
  author: z.string().optional(),
  publisher: z.string().optional(),
  language: z.string().optional(),
  isbn: z.string().optional(),
  material: z.string().optional(),
  dimensions: z.string().optional(),
  weight: z.string().optional(),
  color: z.string().optional(),
  customAttributes: z.record(z.string(), z.string()),
});

// Product variant attributes schema
export const variantAttributesSchema = z.record(z.string(), z.string());

// Keywords array schema with validation
export const keywordsSchema = z
  .array(z.string().min(1, 'Keyword cannot be empty'))
  .default([])
  .refine((keywords) => {
    // Remove duplicates and empty strings
    const cleaned = Array.from(new Set(keywords.filter(k => k.trim().length > 0)));
    return cleaned.length === keywords.length;
  }, 'Keywords must be unique and non-empty');

// Product variant schema
export const productVariantSchema = z.object({
  id: z.string().optional(),
  productId: z.string().uuid('Invalid product ID'),
  name: z.string().min(1, 'Variant name is required').max(100, 'Variant name too long'),
  price: z.number().min(0, 'Price must be non-negative'),
  stockQuantity: z.number().int().min(0, 'Stock quantity must be non-negative').default(0),
  attributes: variantAttributesSchema.default({}),
  keywords: keywordsSchema,
});

// Create product schema
export const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(200, 'Product name too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  basePrice: z.number().min(0, 'Base price must be non-negative'),
  categoryId: z.string().uuid('Invalid category ID').optional(),
  keywords: keywordsSchema.default([]),
  metadata: productMetadataSchema.default({
    author: '',
    publisher: '',
    language: '',
    isbn: '',
    material: '',
    dimensions: '',
    weight: '',
    color: '',
    customAttributes: {},
  }),
  isActive: z.boolean().default(true),
});

// Update product schema
export const updateProductSchema = createProductSchema.partial();

// Form-specific schema for components (with required fields for better UX)
export const productFormSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(200, 'Product name too long'),
  description: z.string().optional(),
  basePrice: z.number().min(0, 'Base price must be non-negative'),
  categoryId: z.string().optional(),
  keywords: z.array(z.object({ value: z.string() })),
  metadata: productMetadataSchema,
  isActive: z.boolean(),
});

// Create product variant schema
export const createProductVariantSchema = productVariantSchema.omit({ id: true, productId: true });

// Update product variant schema
export const updateProductVariantSchema = createProductVariantSchema.partial();

// Product search schema
export const productSearchSchema = z.object({
  query: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  filters: z.object({
    priceMin: z.number().min(0).optional(),
    priceMax: z.number().min(0).optional(),
    attributes: z.record(z.string(), z.array(z.string())).optional(),
    inStock: z.boolean().optional(),
  }).default({}),
  sortBy: z.enum(['relevance', 'price_asc', 'price_desc', 'name', 'popularity']).default('relevance'),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

// Stock update schema
export const stockUpdateSchema = z.object({
  variantId: z.string().uuid('Invalid variant ID'),
  quantity: z.number().int().min(0, 'Stock quantity must be non-negative'),
  operation: z.enum(['set', 'add', 'subtract']).default('set'),
});

// Bulk stock update schema
export const bulkStockUpdateSchema = z.object({
  updates: z.array(stockUpdateSchema).min(1, 'At least one update is required'),
});

// Product import schema for bulk operations
export const productImportSchema = z.object({
  products: z.array(z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    basePrice: z.number().min(0),
    categoryName: z.string().optional(), // Will be resolved to categoryId
    keywords: z.array(z.string()).default([]),
    metadata: productMetadataSchema.default({
      author: '',
      publisher: '',
      language: '',
      isbn: '',
      material: '',
      dimensions: '',
      weight: '',
      color: '',
      customAttributes: {},
    }),
    variants: z.array(z.object({
      name: z.string().min(1),
      price: z.number().min(0),
      stockQuantity: z.number().int().min(0).default(0),
      attributes: variantAttributesSchema.default({}),
      keywords: z.array(z.string()).default([]),
    })).default([]),
  })).min(1, 'At least one product is required'),
});

// Low stock alert schema
export const lowStockAlertSchema = z.object({
  threshold: z.coerce.number().int().min(0).default(5),
  includeVariants: z.boolean().default(true),
});

// Product query schema for filtering and pagination
export const productQuerySchema = z.object({
  search: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  isActive: z.boolean().default(true),
  priceMin: z.number().min(0).optional(),
  priceMax: z.number().min(0).optional(),
  hasVariants: z.boolean().optional(),
  inStock: z.boolean().optional(),
  sortBy: z.enum(['name', 'price', 'category', 'created', 'updated']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

// Export types
export type ProductMetadata = z.infer<typeof productMetadataSchema>;
export type VariantAttributes = z.infer<typeof variantAttributesSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductFormInput = z.infer<typeof productFormSchema>;
export type CreateProductVariantInput = z.infer<typeof createProductVariantSchema>;
export type UpdateProductVariantInput = z.infer<typeof updateProductVariantSchema>;
export type ProductSearchInput = z.infer<typeof productSearchSchema>;
export type StockUpdateInput = z.infer<typeof stockUpdateSchema>;
export type BulkStockUpdateInput = z.infer<typeof bulkStockUpdateSchema>;
export type ProductImportInput = z.infer<typeof productImportSchema>;
export type LowStockAlertInput = z.infer<typeof lowStockAlertSchema>;
export type ProductQueryInput = z.infer<typeof productQuerySchema>;

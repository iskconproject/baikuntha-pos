import { eq, and, or, like, gte, lte, sql, desc, asc } from "drizzle-orm";
import {
  products,
  productVariants,
  categories,
  searchAnalytics,
  type Product,
  type NewProduct,
  type ProductVariant,
  type NewProductVariant,
  type SearchAnalytics,
  type NewSearchAnalytics,
} from "@/lib/db/schema";
import { BaseService } from "./base";
import type { 
  ProductSearchInput, 
  ProductQueryInput, 
  StockUpdateInput,
  LowStockAlertInput,
  ProductMetadata,
  CreateProductInput,
  UpdateProductInput
} from "@/lib/validation/product";

export class ProductService extends BaseService<Product, NewProduct> {
  get table() {
    return products;
  }

  generateId(): string {
    return this.generateUUID();
  }

  // Helper method to transform validation input to database format
  private transformProductInput(input: CreateProductInput | UpdateProductInput): Partial<NewProduct> {
    const result: Partial<NewProduct> = {};
    
    // Copy primitive fields
    if (input.name !== undefined) result.name = input.name;
    if (input.description !== undefined) result.description = input.description;
    if (input.basePrice !== undefined) result.basePrice = input.basePrice;
    if (input.categoryId !== undefined) result.categoryId = input.categoryId;
    if (input.isActive !== undefined) result.isActive = input.isActive;
    
    // Transform complex fields to JSON strings
    if (input.keywords !== undefined) {
      result.keywords = input.keywords ? JSON.stringify(input.keywords) : null;
    }
    if (input.metadata !== undefined) {
      result.metadata = input.metadata ? JSON.stringify(input.metadata) : null;
    }
    
    return result;
  }

  // Helper method to transform database output to enhanced format
  private transformProductOutput(product: Product, variants: ProductVariant[] = []): EnhancedProduct {
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      basePrice: product.basePrice,
      categoryId: product.categoryId,
      isActive: product.isActive,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      keywords: product.keywords ? JSON.parse(product.keywords) : [],
      metadata: product.metadata ? JSON.parse(product.metadata) : { customAttributes: {} },
      variants: variants.map(v => ({
        ...v,
        attributes: v.attributes ? JSON.parse(v.attributes) : {},
        keywords: v.keywords ? JSON.parse(v.keywords) : [],
      })),
    };
  }

  // Helper method to transform variant data
  private transformVariantInput(input: any): NewProductVariant {
    return {
      id: input.id || this.generateUUID(),
      productId: input.productId,
      name: input.name,
      price: input.price,
      stockQuantity: input.stockQuantity || 0,
      attributes: input.attributes ? JSON.stringify(input.attributes) : null,
      keywords: input.keywords ? JSON.stringify(input.keywords) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  // Product-specific methods
  async findByName(name: string): Promise<Product | null> {
    try {
      const result = await this.localDb
        .select()
        .from(products)
        .where(eq(products.name, name))
        .limit(1);

      return result[0] || null;
    } catch (error) {
      console.error("Error finding product by name:", error);
      throw error;
    }
  }

  async findByCategory(categoryId: string): Promise<Product[]> {
    try {
      return await this.localDb
        .select()
        .from(products)
        .where(
          and(eq(products.categoryId, categoryId), eq(products.isActive, true))
        )
        .orderBy(products.name);
    } catch (error) {
      console.error("Error finding products by category:", error);
      throw error;
    }
  }

  async findActiveProducts(): Promise<Product[]> {
    try {
      return await this.localDb
        .select()
        .from(products)
        .where(eq(products.isActive, true))
        .orderBy(products.name);
    } catch (error) {
      console.error("Error finding active products:", error);
      throw error;
    }
  }

  async findProductsWithVariants(
    productId?: string
  ): Promise<ProductWithVariants[]> {
    try {
      const baseQuery = this.localDb
        .select({
          product: products,
          variant: productVariants,
          category: categories,
        })
        .from(products)
        .leftJoin(productVariants, eq(products.id, productVariants.productId))
        .leftJoin(categories, eq(products.categoryId, categories.id));

      let results;
      if (productId) {
        results = await baseQuery
          .where(and(eq(products.isActive, true), eq(products.id, productId)))
          .orderBy(products.name, productVariants.name);
      } else {
        results = await baseQuery
          .where(eq(products.isActive, true))
          .orderBy(products.name, productVariants.name);
      }

      // Group results by product
      const productMap = new Map<string, ProductWithVariants>();

      for (const row of results) {
        if (!productMap.has(row.product.id)) {
          productMap.set(row.product.id, {
            ...row.product,
            category: row.category,
            variants: [],
          });
        }

        if (row.variant) {
          productMap.get(row.product.id)!.variants.push(row.variant);
        }
      }

      return Array.from(productMap.values());
    } catch (error) {
      console.error("Error finding products with variants:", error);
      throw error;
    }
  }

  async searchProducts(searchInput: ProductSearchInput, userId?: string): Promise<ProductSearchResult> {
    try {
      const { query, categoryId, filters, sortBy, limit, offset } = searchInput;
      
      // Build base query conditions
      const conditions = [eq(products.isActive, true)];
      
      // Add text search conditions
      if (query && query.trim()) {
        const searchTerm = `%${query.toLowerCase()}%`;
        conditions.push(
          or(
            like(products.name, searchTerm),
            like(products.description, searchTerm),
            like(products.keywords, searchTerm)
          )!
        );
      }
      
      // Add category filter
      if (categoryId) {
        conditions.push(eq(products.categoryId, categoryId));
      }
      
      // Add price range filters
      if (filters.priceMin !== undefined) {
        conditions.push(gte(products.basePrice, filters.priceMin));
      }
      if (filters.priceMax !== undefined) {
        conditions.push(lte(products.basePrice, filters.priceMax));
      }
      
      // Build the main query
      let baseQuery = this.localDb
        .select({
          product: products,
          category: categories,
        })
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(and(...conditions));
      
      // Add sorting
      switch (sortBy) {
        case 'price_asc':
          baseQuery = baseQuery.orderBy(asc(products.basePrice));
          break;
        case 'price_desc':
          baseQuery = baseQuery.orderBy(desc(products.basePrice));
          break;
        case 'name':
          baseQuery = baseQuery.orderBy(asc(products.name));
          break;
        case 'popularity':
          // TODO: Implement popularity sorting based on sales data
          baseQuery = baseQuery.orderBy(asc(products.name));
          break;
        default: // relevance
          baseQuery = baseQuery.orderBy(asc(products.name));
      }
      
      // Get total count
      const countQuery = this.localDb
        .select({ count: sql<number>`count(*)` })
        .from(products)
        .where(and(...conditions));
      
      const [{ count }] = await countQuery;
      
      // Get paginated results
      const results = await baseQuery.limit(limit).offset(offset);
      
      // Get variants for each product
      const productsWithVariants = await Promise.all(
        results.map(async (row) => {
          const variants = await this.findVariantsByProduct(row.product.id);
          const enhanced = this.transformProductOutput(row.product, variants);
          return {
            ...enhanced,
            category: row.category,
          };
        })
      );
      
      // Apply metadata filters if specified
      let filteredProducts = productsWithVariants;
      if (filters.attributes && Object.keys(filters.attributes).length > 0) {
        filteredProducts = productsWithVariants.filter(product => {
          return Object.entries(filters.attributes!).every(([key, values]) => {
            const productValue = product.metadata[key as keyof ProductMetadata];
            return productValue && typeof productValue === 'string' && values.includes(productValue);
          });
        });
      }
      
      // Apply stock filter
      if (filters.inStock) {
        filteredProducts = filteredProducts.filter(product => {
          if (product.variants.length > 0) {
            return product.variants.some(variant => (variant.stockQuantity || 0) > 0);
          }
          return true; // Products without variants are considered in stock
        });
      }
      
      // Generate search suggestions
      const suggestions = await this.generateSearchSuggestions(query || '');
      
      // Generate dynamic filters
      const dynamicFilters = await this.generateSearchFilters(productsWithVariants);
      
      // Log search analytics
      if (query && userId) {
        await this.logSearchAnalytics({
          query,
          resultCount: filteredProducts.length,
          userId,
        });
      }
      
      return {
        products: filteredProducts,
        totalCount: filteredProducts.length,
        suggestions,
        filters: dynamicFilters,
      };
    } catch (error) {
      console.error("Error searching products:", error);
      throw error;
    }
  }

  async fullTextSearch(
    query: string,
    limit: number = 20
  ): Promise<ProductSearchResultItem[]> {
    try {
      // Use FTS5 for full-text search
      const results = this.localDb.all(sql`
        SELECT 
          p.*,
          c.name as category_name,
          fts.rank
        FROM product_search_fts fts
        JOIN products p ON fts.product_id = p.id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE product_search_fts MATCH ${query}
        AND p.is_active = 1
        ORDER BY fts.rank
        LIMIT ${limit}
      `);

      return results as ProductSearchResultItem[];
    } catch (error) {
      console.error("Error in full-text search:", error);
      // Fallback to regular search
      const searchResult = await this.searchProducts({
        query,
        filters: {},
        sortBy: 'relevance',
        limit,
        offset: 0
      });
      return searchResult.products.map((p): ProductSearchResultItem => ({
        id: p.id,
        name: p.name,
        description: p.description,
        basePrice: p.basePrice,
        categoryId: p.categoryId,
        isActive: p.isActive,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        keywords: JSON.stringify(p.keywords),
        metadata: JSON.stringify(p.metadata),
        rank: 0,
        category_name: p.category?.name
      }));
    }
  }

  async findProductsByPriceRange(
    minPrice: number,
    maxPrice: number
  ): Promise<Product[]> {
    try {
      return await this.localDb
        .select()
        .from(products)
        .where(
          and(
            eq(products.isActive, true),
            gte(products.basePrice, minPrice),
            lte(products.basePrice, maxPrice)
          )
        )
        .orderBy(products.basePrice);
    } catch (error) {
      console.error("Error finding products by price range:", error);
      throw error;
    }
  }

  async createProduct(productData: CreateProductInput): Promise<Product> {
    try {
      // Validate category exists if provided
      if (productData.categoryId) {
        const category = await this.localDb
          .select()
          .from(categories)
          .where(eq(categories.id, productData.categoryId))
          .limit(1);

        if (!category.length) {
          throw new Error("Category not found");
        }
      }

      // Check for duplicate names
      const existing = await this.findByName(productData.name);
      if (existing) {
        throw new Error("Product with this name already exists");
      }

      // Transform input to database format
      const dbData = this.transformProductInput(productData);
      return await this.create(dbData);
    } catch (error) {
      console.error("Error creating product:", error);
      throw error;
    }
  }

  async updateProduct(
    id: string,
    productData: UpdateProductInput
  ): Promise<Product | null> {
    try {
      // Validate category exists if being updated
      if (productData.categoryId) {
        const category = await this.localDb
          .select()
          .from(categories)
          .where(eq(categories.id, productData.categoryId))
          .limit(1);

        if (!category.length) {
          throw new Error("Category not found");
        }
      }

      // Check for duplicate names if name is being updated
      if (productData.name) {
        const existing = await this.findByName(productData.name);
        if (existing && existing.id !== id) {
          throw new Error("Product with this name already exists");
        }
      }

      // Transform input to database format
      const dbData = this.transformProductInput(productData);
      return await this.update(id, dbData);
    } catch (error) {
      console.error("Error updating product:", error);
      throw error;
    }
  }

  async deactivateProduct(id: string): Promise<boolean> {
    try {
      const result = await this.localDb
        .update(products)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(products.id, id));

      await this.queueForSync("update", id);

      return result.changes > 0;
    } catch (error) {
      console.error("Error deactivating product:", error);
      throw error;
    }
  }

  // Product variant methods
  async findVariantsByProduct(productId: string): Promise<ProductVariant[]> {
    try {
      return await this.localDb
        .select()
        .from(productVariants)
        .where(eq(productVariants.productId, productId))
        .orderBy(productVariants.name);
    } catch (error) {
      console.error("Error finding variants by product:", error);
      throw error;
    }
  }

  async findVariantById(variantId: string): Promise<ProductVariant | null> {
    try {
      const result = await this.localDb
        .select()
        .from(productVariants)
        .where(eq(productVariants.id, variantId))
        .limit(1);

      return result[0] || null;
    } catch (error) {
      console.error("Error finding variant by ID:", error);
      throw error;
    }
  }

  async createVariant(
    variantData: Omit<NewProductVariant, "id"> & { 
      productId: string;
      name: string;
      price: number;
      attributes?: Record<string, string>;
      keywords?: string[];
    }
  ): Promise<ProductVariant> {
    try {
      // Validate product exists
      const product = await this.findById(variantData.productId);
      if (!product) {
        throw new Error("Product not found");
      }

      const id = this.generateUUID();
      const insertData: NewProductVariant = {
        id,
        productId: variantData.productId,
        name: variantData.name,
        price: variantData.price,
        stockQuantity: variantData.stockQuantity || 0,
        attributes: variantData.attributes ? JSON.stringify(variantData.attributes) : null,
        keywords: variantData.keywords ? JSON.stringify(variantData.keywords) : null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await this.localDb.insert(productVariants).values(insertData);
      await this.queueForSync("create", id);

      return (await this.findVariantById(id)) as ProductVariant;
    } catch (error) {
      console.error("Error creating variant:", error);
      throw error;
    }
  }

  async updateVariant(
    id: string,
    variantData: Partial<Omit<NewProductVariant, "id">>
  ): Promise<ProductVariant | null> {
    try {
      const updateData = {
        ...variantData,
        updatedAt: new Date(),
      };

      await this.localDb
        .update(productVariants)
        .set(updateData)
        .where(eq(productVariants.id, id));

      await this.queueForSync("update", id);

      return await this.findVariantById(id);
    } catch (error) {
      console.error("Error updating variant:", error);
      throw error;
    }
  }

  async deleteVariant(id: string): Promise<boolean> {
    try {
      const result = await this.localDb
        .delete(productVariants)
        .where(eq(productVariants.id, id));

      await this.queueForSync("delete", id);

      return result.changes > 0;
    } catch (error) {
      console.error("Error deleting variant:", error);
      throw error;
    }
  }

  async updateVariantStock(
    variantId: string,
    quantity: number
  ): Promise<boolean> {
    try {
      const result = await this.localDb
        .update(productVariants)
        .set({
          stockQuantity: quantity,
          updatedAt: new Date(),
        })
        .where(eq(productVariants.id, variantId));

      await this.queueForSync("update", variantId);

      return result.changes > 0;
    } catch (error) {
      console.error("Error updating variant stock:", error);
      throw error;
    }
  }

  async bulkUpdateStock(updates: StockUpdateInput[]): Promise<boolean> {
    try {
      for (const update of updates) {
        const variant = await this.findVariantById(update.variantId);
        if (!variant) continue;

        let newQuantity = update.quantity;
        if (update.operation === 'add') {
          newQuantity = (variant.stockQuantity || 0) + update.quantity;
        } else if (update.operation === 'subtract') {
          newQuantity = Math.max(0, (variant.stockQuantity || 0) - update.quantity);
        }

        await this.updateVariantStock(update.variantId, newQuantity);
      }
      return true;
    } catch (error) {
      console.error("Error bulk updating stock:", error);
      throw error;
    }
  }

  async getLowStockItems(options: LowStockAlertInput = { threshold: 5, includeVariants: true }): Promise<LowStockItem[]> {
    try {
      const { threshold = 5, includeVariants = true } = options;
      
      const lowStockVariants = await this.localDb
        .select({
          variant: productVariants,
          product: products,
          category: categories,
        })
        .from(productVariants)
        .innerJoin(products, eq(productVariants.productId, products.id))
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(
          and(
            eq(products.isActive, true),
            lte(productVariants.stockQuantity, threshold)
          )
        )
        .orderBy(asc(productVariants.stockQuantity));

      return lowStockVariants.map(row => ({
        productId: row.product.id,
        productName: row.product.name,
        variantId: row.variant.id,
        variantName: row.variant.name,
        currentStock: row.variant.stockQuantity || 0,
        threshold,
        categoryName: row.category?.name,
      }));
    } catch (error) {
      console.error("Error getting low stock items:", error);
      throw error;
    }
  }

  async getProductsByQuery(queryInput: ProductQueryInput): Promise<PaginatedProductResult> {
    try {
      const {
        search,
        categoryId,
        isActive = true,
        priceMin,
        priceMax,
        hasVariants,
        inStock,
        sortBy,
        sortOrder,
        page,
        limit,
      } = queryInput;

      const offset = (page - 1) * limit;
      const conditions = [];

      // Add active filter
      if (isActive !== undefined) {
        conditions.push(eq(products.isActive, isActive));
      }

      // Add search filter
      if (search) {
        const searchTerm = `%${search.toLowerCase()}%`;
        conditions.push(
          or(
            like(products.name, searchTerm),
            like(products.description, searchTerm),
            like(products.keywords, searchTerm)
          )
        );
      }

      // Add category filter
      if (categoryId) {
        conditions.push(eq(products.categoryId, categoryId));
      }

      // Add price filters
      if (priceMin !== undefined) {
        conditions.push(gte(products.basePrice, priceMin));
      }
      if (priceMax !== undefined) {
        conditions.push(lte(products.basePrice, priceMax));
      }

      // Build base query
      let query = this.localDb
        .select({
          product: products,
          category: categories,
        })
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id));

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      // Add sorting
      const sortColumn = sortBy === 'price' ? products.basePrice :
                        sortBy === 'category' ? categories.name :
                        sortBy === 'created' ? products.createdAt :
                        sortBy === 'updated' ? products.updatedAt :
                        products.name;

      query = query.orderBy(sortOrder === 'desc' ? desc(sortColumn) : asc(sortColumn));

      // Get total count
      const countQuery = this.localDb
        .select({ count: sql<number>`count(*)` })
        .from(products);
      
      let finalCountQuery = countQuery;
      if (conditions.length > 0) {
        finalCountQuery = countQuery.where(and(...conditions));
      }

      const [{ count: totalCount }] = await finalCountQuery;

      // Get paginated results
      const results = await query.limit(limit).offset(offset);

      // Enhance with variants and parsed data
      const enhancedProducts = await Promise.all(
        results.map(async (row) => {
          const variants = await this.findVariantsByProduct(row.product.id);
          
          // Apply hasVariants filter
          if (hasVariants !== undefined) {
            const productHasVariants = variants.length > 0;
            if (hasVariants !== productHasVariants) {
              return null;
            }
          }

          // Apply inStock filter
          if (inStock !== undefined) {
            const productInStock = variants.length === 0 || variants.some(v => (v.stockQuantity || 0) > 0);
            if (inStock !== productInStock) {
              return null;
            }
          }

          const enhanced = this.transformProductOutput(row.product, variants);
          return {
            ...enhanced,
            category: row.category,
          };
        })
      );

      // Filter out null results from hasVariants/inStock filtering
      const filteredProducts = enhancedProducts.filter(p => p !== null);

      return {
        products: filteredProducts,
        totalCount: filteredProducts.length,
        page,
        limit,
        totalPages: Math.ceil(filteredProducts.length / limit),
      };
    } catch (error) {
      console.error("Error getting products by query:", error);
      throw error;
    }
  }

  async generateSearchSuggestions(query: string): Promise<string[]> {
    try {
      if (!query || query.length < 2) return [];

      const searchTerm = `%${query.toLowerCase()}%`;
      
      // Get suggestions from product names
      const productSuggestions = await this.localDb
        .select({ name: products.name })
        .from(products)
        .where(
          and(
            eq(products.isActive, true),
            like(products.name, searchTerm)
          )
        )
        .limit(5);

      // Get suggestions from keywords
      const keywordSuggestions = await this.localDb
        .select({ keywords: products.keywords })
        .from(products)
        .where(
          and(
            eq(products.isActive, true),
            like(products.keywords, searchTerm)
          )
        )
        .limit(5);

      const suggestions = new Set<string>();
      
      // Add product names
      productSuggestions.forEach(p => suggestions.add(p.name));
      
      // Add matching keywords
      keywordSuggestions.forEach(p => {
        if (p.keywords) {
          const keywords = JSON.parse(p.keywords) as string[];
          keywords.forEach(keyword => {
            if (keyword.toLowerCase().includes(query.toLowerCase())) {
              suggestions.add(keyword);
            }
          });
        }
      });

      return Array.from(suggestions).slice(0, 10);
    } catch (error) {
      console.error("Error generating search suggestions:", error);
      return [];
    }
  }

  async generateSearchFilters(products: EnhancedProduct[]): Promise<SearchFilters> {
    try {
      const categoryMap = new Map<string, { id: string; name: string; count: number }>();
      const attributeMap = new Map<string, Map<string, number>>();
      const priceRanges = [
        { min: 0, max: 100, count: 0 },
        { min: 100, max: 500, count: 0 },
        { min: 500, max: 1000, count: 0 },
        { min: 1000, max: 5000, count: 0 },
        { min: 5000, max: Infinity, count: 0 },
      ];

      products.forEach(product => {
        // Count categories
        if (product.category) {
          const existing = categoryMap.get(product.category.id);
          if (existing) {
            existing.count++;
          } else {
            categoryMap.set(product.category.id, {
              id: product.category.id,
              name: product.category.name,
              count: 1,
            });
          }
        }

        // Count price ranges
        const price = product.basePrice;
        priceRanges.forEach(range => {
          if (price >= range.min && price < range.max) {
            range.count++;
          }
        });

        // Count metadata attributes
        if (product.metadata) {
          Object.entries(product.metadata).forEach(([key, value]) => {
            if (value && key !== 'customAttributes' && typeof value === 'string') {
              if (!attributeMap.has(key)) {
                attributeMap.set(key, new Map());
              }
              const valueMap = attributeMap.get(key)!;
              valueMap.set(value, (valueMap.get(value) || 0) + 1);
            }
          });

          // Handle custom attributes
          if (product.metadata.customAttributes) {
            Object.entries(product.metadata.customAttributes).forEach(([key, value]) => {
              if (value && typeof value === 'string') {
                if (!attributeMap.has(key)) {
                  attributeMap.set(key, new Map());
                }
                const valueMap = attributeMap.get(key)!;
                valueMap.set(value, (valueMap.get(value) || 0) + 1);
              }
            });
          }
        }
      });

      // Convert maps to arrays
      const categories = Array.from(categoryMap.values());
      const attributes: Record<string, { value: string; count: number }[]> = {};
      
      attributeMap.forEach((valueMap, key) => {
        attributes[key] = Array.from(valueMap.entries()).map(([value, count]) => ({
          value,
          count,
        }));
      });

      return {
        categories,
        priceRanges: priceRanges.filter(range => range.count > 0),
        attributes,
      };
    } catch (error) {
      console.error("Error generating search filters:", error);
      return { categories: [], priceRanges: [], attributes: {} };
    }
  }

  async logSearchAnalytics(analyticsData: Omit<NewSearchAnalytics, 'id'>): Promise<void> {
    try {
      const id = this.generateUUID();
      await this.localDb.insert(searchAnalytics).values({
        ...analyticsData,
        id,
      });
      await this.queueForSync('create', id);
    } catch (error) {
      console.error("Error logging search analytics:", error);
      // Don't throw error for analytics logging
    }
  }

  async getSearchAnalytics(userId?: string, limit: number = 100): Promise<SearchAnalytics[]> {
    try {
      let query = this.localDb
        .select()
        .from(searchAnalytics)
        .orderBy(desc(searchAnalytics.timestamp))
        .limit(limit);

      if (userId) {
        query = query.where(eq(searchAnalytics.userId, userId)) as any;
      }

      return await query;
    } catch (error) {
      console.error("Error getting search analytics:", error);
      throw error;
    }
  }
}

// Types
export interface ProductWithVariants extends Product {
  category?: any;
  variants: ProductVariant[];
}

export interface ProductSearchResultItem {
  id: string;
  name: string;
  description: string | null;
  basePrice: number;
  categoryId: string | null;
  isActive: boolean | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  keywords: string | null;
  metadata: string | null;
  rank: number;
  category_name?: string;
}

export interface EnhancedProduct {
  id: string;
  name: string;
  description?: string | null;
  basePrice: number;
  categoryId?: string | null;
  isActive?: boolean | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
  category?: any;
  variants: (ProductVariant & {
    attributes: Record<string, string>;
    keywords: string[];
  })[];
  keywords: string[];
  metadata: ProductMetadata;
}

export interface ProductSearchResult {
  products: EnhancedProduct[];
  totalCount: number;
  suggestions: string[];
  filters: SearchFilters;
}

export interface SearchFilters {
  categories: { id: string; name: string; count: number }[];
  priceRanges: { min: number; max: number; count: number }[];
  attributes: Record<string, { value: string; count: number }[]>;
}

export interface LowStockItem {
  productId: string;
  productName: string;
  variantId: string;
  variantName: string;
  currentStock: number;
  threshold: number;
  categoryName?: string;
}

export interface PaginatedProductResult {
  products: EnhancedProduct[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Export singleton instance
export const productService = new ProductService();

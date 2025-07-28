import { eq, and, or, like, gte, lte, sql } from "drizzle-orm";
import {
  products,
  productVariants,
  categories,
  type Product,
  type NewProduct,
  type ProductVariant,
  type NewProductVariant,
} from "@/lib/db/schema";
import { BaseService } from "./base";

export class ProductService extends BaseService<Product, NewProduct> {
  get table() {
    return products;
  }

  generateId(): string {
    return this.generateUUID();
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

  async searchProducts(query: string): Promise<Product[]> {
    try {
      const searchTerm = `%${query.toLowerCase()}%`;

      return await this.localDb
        .select()
        .from(products)
        .where(
          and(
            eq(products.isActive, true),
            or(
              like(products.name, searchTerm),
              like(products.description, searchTerm),
              like(products.keywords, searchTerm)
            )
          )
        )
        .orderBy(products.name);
    } catch (error) {
      console.error("Error searching products:", error);
      throw error;
    }
  }

  async fullTextSearch(
    query: string,
    limit: number = 20
  ): Promise<ProductSearchResult[]> {
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

      return results as ProductSearchResult[];
    } catch (error) {
      console.error("Error in full-text search:", error);
      // Fallback to regular search
      return (await this.searchProducts(query)).map((p) => ({ ...p, rank: 0 }));
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

  async createProduct(productData: Omit<NewProduct, "id">): Promise<Product> {
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

      return await this.create(productData);
    } catch (error) {
      console.error("Error creating product:", error);
      throw error;
    }
  }

  async updateProduct(
    id: string,
    productData: Partial<Omit<NewProduct, "id">>
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

      return await this.update(id, productData);
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
    variantData: Omit<NewProductVariant, "id">
  ): Promise<ProductVariant> {
    try {
      // Validate product exists
      const product = await this.findById(variantData.productId!);
      if (!product) {
        throw new Error("Product not found");
      }

      const id = this.generateUUID();
      const insertData = { ...variantData, id };

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
}

// Types
export interface ProductWithVariants extends Product {
  category?: any;
  variants: ProductVariant[];
}

export interface ProductSearchResult extends Product {
  rank: number;
  category_name?: string;
}

// Export singleton instance
export const productService = new ProductService();

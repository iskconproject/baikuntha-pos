import { eq, and, or, isNull, desc, like, asc, sql } from 'drizzle-orm';
import { categories, products, type Category, type NewCategory } from '@/lib/db/schema';
import { BaseService } from './base';
import type { 
  CategoryQueryInput, 
  CategoryHierarchyInput,
  CreateCategoryInput,
  UpdateCategoryInput 
} from '@/lib/validation/category';

export class CategoryService extends BaseService<Category, NewCategory> {
  get table() {
    return categories;
  }
  
  generateId(): string {
    return this.generateUUID();
  }

  // Helper method to transform validation input to database format
  private transformCategoryInput(input: CreateCategoryInput | UpdateCategoryInput): Partial<NewCategory> {
    const result: Partial<NewCategory> = {};
    
    // Copy primitive fields
    if (input.name !== undefined) result.name = input.name;
    if (input.description !== undefined) result.description = input.description;
    if (input.parentId !== undefined) result.parentId = input.parentId;
    if (input.isActive !== undefined) result.isActive = input.isActive;
    
    // Transform keywords array to JSON string, default to empty array if not provided
    if (input.keywords !== undefined) {
      result.keywords = input.keywords && input.keywords.length > 0 ? JSON.stringify(input.keywords) : JSON.stringify([]);
    } else {
      result.keywords = JSON.stringify([]);
    }
    
    return result;
  }

  // Helper method to transform database output to enhanced format
  private transformCategoryOutput(category: Category, productCount: number = 0): EnhancedCategory {
    return {
      id: category.id,
      name: category.name,
      description: category.description,
      parentId: category.parentId,
      isActive: category.isActive,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
      keywords: category.keywords ? JSON.parse(category.keywords) : [],
      productCount,
    };
  }
  
  // Category-specific methods
  async findByName(name: string): Promise<Category | null> {
    try {
      const result = await this.db
        .select()
        .from(categories)
        .where(eq(categories.name, name))
        .limit(1);
      
      return result[0] || null;
    } catch (error) {
      console.error('Error finding category by name:', error);
      throw error;
    }
  }
  
  async findRootCategories(): Promise<Category[]> {
    try {
      return await this.db
        .select()
        .from(categories)
        .where(and(
          isNull(categories.parentId),
          eq(categories.isActive, true)
        ))
        .orderBy(categories.name);
    } catch (error) {
      console.error('Error finding root categories:', error);
      throw error;
    }
  }
  
  async findSubcategories(parentId: string): Promise<Category[]> {
    try {
      return await this.db
        .select()
        .from(categories)
        .where(and(
          eq(categories.parentId, parentId),
          eq(categories.isActive, true)
        ))
        .orderBy(categories.name);
    } catch (error) {
      console.error('Error finding subcategories:', error);
      throw error;
    }
  }
  
  async findActiveCategories(): Promise<Category[]> {
    try {
      return await this.db
        .select()
        .from(categories)
        .where(eq(categories.isActive, true))
        .orderBy(categories.name);
    } catch (error) {
      console.error('Error finding active categories:', error);
      throw error;
    }
  }
  
  async searchCategories(query: string): Promise<Category[]> {
    try {
      if (!query || query.trim().length === 0) {
        return [];
      }
      
      const searchTerm = `%${query.toLowerCase()}%`;
      
      return await this.db
        .select()
        .from(categories)
        .where(and(
          eq(categories.isActive, true),
          or(
            like(categories.name, searchTerm),
            like(categories.description, searchTerm),
            like(categories.keywords, searchTerm)
          )
        ))
        .orderBy(categories.name);
    } catch (error) {
      console.error('Error searching categories:', error);
      throw error;
    }
  }
  
  async createCategory(categoryData: CreateCategoryInput): Promise<Category> {
    try {
      // Validate parent category exists if parentId is provided
      if (categoryData.parentId) {
        const parent = await this.findById(categoryData.parentId);
        if (!parent) {
          throw new Error('Parent category not found');
        }
      }
      
      // Check for duplicate names at the same level
      const existing = await this.findByName(categoryData.name);
      if (existing) {
        throw new Error('Category with this name already exists');
      }
      
      // Transform input to database format
      const dbData = this.transformCategoryInput(categoryData);
      // Ensure required fields are present
      if (!dbData.name) {
        throw new Error('Category name is required');
      }
      return await this.create(dbData as Omit<NewCategory, 'id'>);
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  }
  
  async updateCategory(id: string, categoryData: UpdateCategoryInput): Promise<Category | null> {
    try {
      // Validate parent category exists if parentId is being updated
      if (categoryData.parentId) {
        const parent = await this.findById(categoryData.parentId);
        if (!parent) {
          throw new Error('Parent category not found');
        }
        
        // Prevent circular references
        if (await this.wouldCreateCircularReference(id, categoryData.parentId)) {
          throw new Error('Cannot create circular reference in category hierarchy');
        }
      }
      
      // Check for duplicate names if name is being updated
      if (categoryData.name) {
        const existing = await this.findByName(categoryData.name);
        if (existing && existing.id !== id) {
          throw new Error('Category with this name already exists');
        }
      }
      
      // Transform input to database format
      const dbData = this.transformCategoryInput(categoryData);
      return await this.update(id, dbData);
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  }
  
  async deactivateCategory(id: string): Promise<boolean> {
    try {
      // Check if category has active subcategories
      const subcategories = await this.findSubcategories(id);
      if (subcategories.length > 0) {
        throw new Error('Cannot deactivate category with active subcategories');
      }
      
      const result = await this.db
        .update(categories)
        .set({ 
          isActive: false,
          updatedAt: this.getCurrentTimestamp()
        })
        .where(eq(categories.id, id));
      

      
      return result.rowsAffected > 0;
    } catch (error) {
      console.error('Error deactivating category:', error);
      throw error;
    }
  }
  
  async getCategoryHierarchy(options: CategoryHierarchyInput = { maxDepth: 5, includeProductCount: false, activeOnly: true }): Promise<CategoryHierarchy[]> {
    try {
      const { maxDepth = 5, includeProductCount = false, activeOnly = true } = options;
      
      let allCategories: EnhancedCategory[];
      
      if (includeProductCount) {
        // Get categories with product counts
        const categoriesWithCounts = await this.db
          .select({
            category: categories,
            productCount: sql<number>`count(${products.id})`,
          })
          .from(categories)
          .leftJoin(products, and(
            eq(categories.id, products.categoryId),
            eq(products.isActive, true)
          ))
          .where(activeOnly ? eq(categories.isActive, true) : undefined)
          .groupBy(categories.id)
          .orderBy(categories.name);

        allCategories = categoriesWithCounts.map(row => 
          this.transformCategoryOutput(row.category, row.productCount)
        );
      } else {
        const cats = await this.findActiveCategories();
        allCategories = cats.map(cat => 
          this.transformCategoryOutput(cat, 0)
        );
      }
      
      return this.buildHierarchy(allCategories, null, 0, maxDepth);
    } catch (error) {
      console.error('Error getting category hierarchy:', error);
      throw error;
    }
  }

  async getCategoriesByQuery(queryInput: CategoryQueryInput): Promise<PaginatedCategoryResult> {
    try {
      const {
        search,
        parentId,
        isActive = true,
        includeHierarchy = false,
        sortBy,
        sortOrder,
        page,
        limit,
      } = queryInput;

      const offset = (page - 1) * limit;
      const conditions = [];

      // Add active filter
      if (isActive !== undefined) {
        conditions.push(eq(categories.isActive, isActive));
      }

      // Add parent filter
      if (parentId !== undefined) {
        if (parentId === null) {
          conditions.push(isNull(categories.parentId));
        } else {
          conditions.push(eq(categories.parentId, parentId));
        }
      }

      // Add search filter
      if (search) {
        const searchTerm = `%${search.toLowerCase()}%`;
        conditions.push(
          or(
            like(categories.name, searchTerm),
            like(categories.description, searchTerm),
            like(categories.keywords, searchTerm)
          )
        );
      }

      // Build base query
      let query = this.db
        .select({
          category: categories,
          productCount: sql<number>`count(${products.id})`,
        })
        .from(categories)
        .leftJoin(products, and(
          eq(categories.id, products.categoryId),
          eq(products.isActive, true)
        ))
        .groupBy(categories.id);

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      // Add sorting
      const sortColumn = sortBy === 'created' ? categories.createdAt :
                        sortBy === 'updated' ? categories.updatedAt :
                        categories.name;

      query = query.orderBy(sortOrder === 'desc' ? desc(sortColumn) : asc(sortColumn)) as any;

      // Get total count
      let countQuery = this.db
        .select({ count: sql<number>`count(*)` })
        .from(categories);
      
      if (conditions.length > 0) {
        countQuery = countQuery.where(and(...conditions)) as any;
      }

      const countResult = await countQuery;
      const totalCount = countResult[0]?.count || 0;

      // Get paginated results
      const results = await query.limit(limit).offset(offset);

      // Enhance with parsed data and hierarchy if requested
      let enhancedCategories = results.map(row => ({
        ...this.transformCategoryOutput(row.category, row.productCount),
        children: [] as CategoryHierarchy[],
      }));

      if (includeHierarchy) {
        // Build hierarchy for each category
        const allCategories = await this.findActiveCategories();
        const allEnhanced = allCategories.map(cat => 
          this.transformCategoryOutput(cat, 0)
        );

        enhancedCategories = enhancedCategories.map(category => ({
          ...category,
          children: this.buildHierarchy(allEnhanced, category.id),
        }));
      }

      return {
        categories: enhancedCategories,
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      };
    } catch (error) {
      console.error('Error getting categories by query:', error);
      throw error;
    }
  }

  async createCategoryWithValidation(categoryData: CreateCategoryInput): Promise<EnhancedCategory> {
    try {
      // Validate parent category exists if parentId is provided
      if (categoryData.parentId) {
        const parent = await this.findById(categoryData.parentId);
        if (!parent) {
          throw new Error('Parent category not found');
        }
      }

      // Check for duplicate names at the same level
      const existing = await this.findByName(categoryData.name);
      if (existing) {
        throw new Error('Category with this name already exists');
      }

      // Transform input to database format
      const dbData = this.transformCategoryInput(categoryData);
      // Ensure required fields are present
      if (!dbData.name) {
        throw new Error('Category name is required');
      }
      const created = await this.create(dbData as Omit<NewCategory, 'id'>);

      return this.transformCategoryOutput(created, 0);
    } catch (error) {
      console.error('Error creating category with validation:', error);
      throw error;
    }
  }

  async updateCategoryWithValidation(id: string, categoryData: UpdateCategoryInput): Promise<EnhancedCategory | null> {
    try {
      // Validate parent category exists if parentId is being updated
      if (categoryData.parentId) {
        const parent = await this.findById(categoryData.parentId);
        if (!parent) {
          throw new Error('Parent category not found');
        }

        // Prevent circular references
        if (await this.wouldCreateCircularReference(id, categoryData.parentId)) {
          throw new Error('Cannot create circular reference in category hierarchy');
        }
      }

      // Check for duplicate names if name is being updated
      if (categoryData.name) {
        const existing = await this.findByName(categoryData.name);
        if (existing && existing.id !== id) {
          throw new Error('Category with this name already exists');
        }
      }

      // Transform input to database format
      const dbData = this.transformCategoryInput(categoryData);
      const updated = await this.update(id, dbData);
      if (!updated) return null;

      return this.transformCategoryOutput(updated, 0);
    } catch (error) {
      console.error('Error updating category with validation:', error);
      throw error;
    }
  }

  async moveCategory(categoryId: string, newParentId?: string): Promise<boolean> {
    try {
      // Validate new parent exists if provided
      if (newParentId) {
        const parent = await this.findById(newParentId);
        if (!parent) {
          throw new Error('New parent category not found');
        }

        // Prevent circular references
        if (await this.wouldCreateCircularReference(categoryId, newParentId)) {
          throw new Error('Cannot create circular reference in category hierarchy');
        }
      }

      const result = await this.db
        .update(categories)
        .set({
          parentId: newParentId || null,
          updatedAt: this.getCurrentTimestamp(),
        })
        .where(eq(categories.id, categoryId));



      return result.rowsAffected > 0;
    } catch (error) {
      console.error('Error moving category:', error);
      throw error;
    }
  }
  
  // Helper methods
  private async wouldCreateCircularReference(categoryId: string, newParentId: string): Promise<boolean> {
    let currentParentId: string | null = newParentId;
    
    while (currentParentId) {
      if (currentParentId === categoryId) {
        return true;
      }
      
      const parent = await this.findById(currentParentId);
      currentParentId = parent?.parentId || null;
    }
    
    return false;
  }
  
  private buildHierarchy(
    categories: EnhancedCategory[], 
    parentId: string | null = null, 
    currentDepth: number = 0, 
    maxDepth: number = 5
  ): CategoryHierarchy[] {
    if (currentDepth >= maxDepth) return [];
    
    return categories
      .filter(cat => cat.parentId === parentId)
      .map(cat => ({
        ...cat,
        children: this.buildHierarchy(categories, cat.id, currentDepth + 1, maxDepth)
      }));
  }
}

// Types
export interface CategoryHierarchy {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  isActive: boolean | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  children: CategoryHierarchy[];
  keywords: string[];
  productCount: number;
}

export interface EnhancedCategory {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  isActive: boolean | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  keywords: string[];
  productCount: number;
}

export interface PaginatedCategoryResult {
  categories: CategoryHierarchy[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Export singleton instance
export const categoryService = new CategoryService();
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
  
  // Category-specific methods
  async findByName(name: string): Promise<Category | null> {
    try {
      const result = await this.localDb
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
      return await this.localDb
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
      return await this.localDb
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
      return await this.localDb
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
      const searchTerm = `%${query.toLowerCase()}%`;
      
      return await this.localDb
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
  
  async createCategory(categoryData: Omit<NewCategory, 'id'>): Promise<Category> {
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
      
      return await this.create(categoryData);
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  }
  
  async updateCategory(id: string, categoryData: Partial<Omit<NewCategory, 'id'>>): Promise<Category | null> {
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
      
      return await this.update(id, categoryData);
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
      
      const result = await this.localDb
        .update(categories)
        .set({ 
          isActive: false,
          updatedAt: new Date()
        })
        .where(eq(categories.id, id));
      
      await this.queueForSync('update', id);
      
      return result.changes > 0;
    } catch (error) {
      console.error('Error deactivating category:', error);
      throw error;
    }
  }
  
  async getCategoryHierarchy(options: CategoryHierarchyInput = {}): Promise<CategoryHierarchy[]> {
    try {
      const { maxDepth = 5, includeProductCount = false, activeOnly = true } = options;
      
      let allCategories: EnhancedCategory[];
      
      if (includeProductCount) {
        // Get categories with product counts
        const categoriesWithCounts = await this.localDb
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

        allCategories = categoriesWithCounts.map(row => ({
          ...row.category,
          keywords: row.category.keywords ? JSON.parse(row.category.keywords) : [],
          productCount: row.productCount,
        }));
      } else {
        const cats = await this.findActiveCategories();
        allCategories = cats.map(cat => ({
          ...cat,
          keywords: cat.keywords ? JSON.parse(cat.keywords) : [],
          productCount: 0,
        }));
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
      let query = this.localDb
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
        query = query.where(and(...conditions));
      }

      // Add sorting
      const sortColumn = sortBy === 'created' ? categories.createdAt :
                        sortBy === 'updated' ? categories.updatedAt :
                        categories.name;

      query = query.orderBy(sortOrder === 'desc' ? desc(sortColumn) : asc(sortColumn));

      // Get total count
      const countQuery = this.localDb
        .select({ count: sql<number>`count(*)` })
        .from(categories);
      
      if (conditions.length > 0) {
        countQuery.where(and(...conditions));
      }

      const [{ count: totalCount }] = await countQuery;

      // Get paginated results
      const results = await query.limit(limit).offset(offset);

      // Enhance with parsed data and hierarchy if requested
      let enhancedCategories = results.map(row => ({
        ...row.category,
        keywords: row.category.keywords ? JSON.parse(row.category.keywords) : [],
        productCount: row.productCount,
        children: [] as CategoryHierarchy[],
      }));

      if (includeHierarchy) {
        // Build hierarchy for each category
        const allCategories = await this.findActiveCategories();
        const allEnhanced = allCategories.map(cat => ({
          ...cat,
          keywords: cat.keywords ? JSON.parse(cat.keywords) : [],
          productCount: 0,
        }));

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

      // Create the category
      const created = await this.create({
        ...categoryData,
        keywords: JSON.stringify(categoryData.keywords || []),
      });

      return {
        ...created,
        keywords: categoryData.keywords || [],
        productCount: 0,
      };
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

      // Update the category
      const updateData = {
        ...categoryData,
        keywords: categoryData.keywords ? JSON.stringify(categoryData.keywords) : undefined,
      };

      const updated = await this.update(id, updateData);
      if (!updated) return null;

      return {
        ...updated,
        keywords: categoryData.keywords || (updated.keywords ? JSON.parse(updated.keywords) : []),
        productCount: 0,
      };
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

      const result = await this.localDb
        .update(categories)
        .set({
          parentId: newParentId || null,
          updatedAt: new Date(),
        })
        .where(eq(categories.id, categoryId));

      await this.queueForSync('update', categoryId);

      return result.changes > 0;
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
export interface CategoryHierarchy extends Category {
  children: CategoryHierarchy[];
  keywords: string[];
  productCount: number;
}

export interface EnhancedCategory extends Category {
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
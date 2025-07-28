import { eq, and, or, isNull, desc, like } from 'drizzle-orm';
import { categories, type Category, type NewCategory } from '@/lib/db/schema';
import { BaseService } from './base';

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
  
  async getCategoryHierarchy(): Promise<CategoryHierarchy[]> {
    try {
      const allCategories = await this.findActiveCategories();
      return this.buildHierarchy(allCategories);
    } catch (error) {
      console.error('Error getting category hierarchy:', error);
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
  
  private buildHierarchy(categories: Category[], parentId: string | null = null): CategoryHierarchy[] {
    return categories
      .filter(cat => cat.parentId === parentId)
      .map(cat => ({
        ...cat,
        children: this.buildHierarchy(categories, cat.id)
      }));
  }
}

// Types
export interface CategoryHierarchy extends Category {
  children: CategoryHierarchy[];
}

// Export singleton instance
export const categoryService = new CategoryService();
'use client';

import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { categoryFormSchema, createCategorySchema, type CategoryFormInput, type CreateCategoryInput } from '@/lib/validation/category';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';

interface Category {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  keywords: string[];
  isActive: boolean;
  productCount: number;
  children: Category[];
}

interface CategoryManagerProps {
  categories: Category[];
  onCreateCategory: (data: CategoryFormInput) => Promise<void>;
  onUpdateCategory: (id: string, data: Partial<CategoryFormInput>) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
  isLoading?: boolean;
}

export function CategoryManager({
  categories,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
  isLoading = false,
}: CategoryManagerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [keywordInput, setKeywordInput] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: '',
      description: '',
      parentId: '',
      keywords: [],
      isActive: true,
    },
  });

  const { fields: keywordFields, append: appendKeyword, remove: removeKeyword } = useFieldArray({
    control,
    name: 'keywords',
  });

  const keywords = watch('keywords');

  const handleOpenModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      reset({
        name: category.name,
        description: category.description || '',
        parentId: category.parentId || '',
        keywords: category.keywords.map(k => ({ value: k })),
        isActive: category.isActive,
      });
    } else {
      setEditingCategory(null);
      reset({
        name: '',
        description: '',
        parentId: '',
        keywords: [],
        isActive: true,
      });
    }
    setKeywordInput('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    reset();
    setKeywordInput('');
  };

  const handleAddKeyword = () => {
    if (keywordInput.trim() && !keywords?.some(k => k.value === keywordInput.trim())) {
      appendKeyword({ value: keywordInput.trim() });
      setKeywordInput('');
    }
  };

  const handleKeywordKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddKeyword();
    }
  };

  const handleFormSubmit = async (data: CategoryFormInput) => {
    try {
      // Transform keywords back to string array
      const transformedData = {
        ...data,
        keywords: data.keywords.map(k => k.value),
      };
      if (editingCategory) {
        await onUpdateCategory(editingCategory.id, transformedData as any);
      } else {
        await onCreateCategory(transformedData as any);
      }
      handleCloseModal();
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  const handleDeleteCategory = async (category: Category) => {
    if (category.children.length > 0) {
      alert('Cannot delete category with subcategories. Please delete or move subcategories first.');
      return;
    }

    if (category.productCount > 0) {
      const confirmed = confirm(
        `This category has ${category.productCount} products. Are you sure you want to delete it?`
      );
      if (!confirmed) return;
    }

    try {
      await onDeleteCategory(category.id);
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  const toggleExpanded = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const renderCategoryTree = (categories: Category[], level: number = 0) => {
    return categories.map((category) => (
      <div key={category.id} className={`${level > 0 ? 'ml-6' : ''}`}>
        <div className="flex items-center justify-between p-3 bg-white border rounded-lg mb-2">
          <div className="flex items-center space-x-3">
            {category.children.length > 0 && (
              <button
                onClick={() => toggleExpanded(category.id)}
                className="text-gray-400 hover:text-gray-600"
              >
                {expandedCategories.has(category.id) ? '▼' : '▶'}
              </button>
            )}

            <div>
              <h3 className="font-medium text-gray-900">{category.name}</h3>
              {category.description && (
                <p className="text-sm text-gray-600">{category.description}</p>
              )}
              <div className="flex items-center space-x-4 mt-1">
                <span className="text-xs text-gray-500">
                  {category.productCount} products
                </span>
                {category.keywords.length > 0 && (
                  <div className="flex space-x-1">
                    {category.keywords.slice(0, 2).map((keyword, index) => (
                      <span
                        key={index}
                        className="inline-block px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded"
                      >
                        {keyword}
                      </span>
                    ))}
                    {category.keywords.length > 2 && (
                      <span className="text-xs text-gray-500">
                        +{category.keywords.length - 2} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleOpenModal(category)}
            >
              Edit
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleDeleteCategory(category)}
              className="text-red-600 hover:text-red-800"
            >
              Delete
            </Button>
          </div>
        </div>

        {expandedCategories.has(category.id) && category.children.length > 0 && (
          <div className="ml-4">
            {renderCategoryTree(category.children, level + 1)}
          </div>
        )}
      </div>
    ));
  };

  // Get flat list of categories for parent selection
  const getFlatCategories = (categories: Category[], level: number = 0): Array<{ id: string; name: string; level: number }> => {
    const result: Array<{ id: string; name: string; level: number }> = [];

    categories.forEach(category => {
      result.push({ id: category.id, name: category.name, level });
      if (category.children.length > 0) {
        result.push(...getFlatCategories(category.children, level + 1));
      }
    });

    return result;
  };

  const flatCategories = getFlatCategories(categories);
  const parentOptions = flatCategories
    .filter(cat => !editingCategory || cat.id !== editingCategory.id)
    .map(cat => ({
      value: cat.id,
      label: '  '.repeat(cat.level) + cat.name,
    }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Categories</h2>
          <p className="text-gray-600">Manage product categories and hierarchy</p>
        </div>
        <Button
          onClick={() => handleOpenModal()}
          className="bg-orange-600 hover:bg-orange-700"
        >
          Add Category
        </Button>
      </div>

      {/* Category Tree */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white p-4 rounded-lg border animate-pulse">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No categories found</p>
            <p className="text-gray-400">Create your first category to get started</p>
          </div>
        ) : (
          renderCategoryTree(categories)
        )}
      </div>

      {/* Category Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingCategory ? 'Edit Category' : 'Create Category'}
      >
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category Name *
            </label>
            <Input
              {...register('name')}
              placeholder="Enter category name"
              error={errors.name?.message}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              {...register('description')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Enter category description"
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Parent Category
            </label>
            <Select
              {...register('parentId')}
              options={[
                { value: '', label: 'No parent (root category)' },
                ...parentOptions,
              ]}
              error={errors.parentId?.message}
            />
          </div>

          {/* Keywords */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search Keywords
              </label>
              <div className="flex gap-2">
                <Input
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={handleKeywordKeyPress}
                  placeholder="Enter keyword and press Enter"
                  className="flex-1"
                />
                <Button
                  type="button"
                  onClick={handleAddKeyword}
                  variant="outline"
                  disabled={!keywordInput.trim()}
                >
                  Add
                </Button>
              </div>
            </div>

            {keywordFields.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Keywords
                </label>
                <div className="flex flex-wrap gap-2">
                  {keywords.map((keyword, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-orange-100 text-orange-800"
                    >
                      {keywords?.[index]?.value}
                      <button
                        type="button"
                        onClick={() => removeKeyword(index)}
                        className="ml-2 text-orange-600 hover:text-orange-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseModal}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isSubmitting ? 'Saving...' : editingCategory ? 'Update Category' : 'Create Category'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

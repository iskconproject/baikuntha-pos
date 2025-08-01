'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { Category } from '@/lib/db/schema';

interface CategoryNavigationProps {
  categories: Category[];
  selectedCategory: string;
  onCategorySelect: (categoryId: string) => void;
}

interface CategoryWithChildren extends Category {
  children: CategoryWithChildren[];
  productCount?: number;
}

export function CategoryNavigation({ 
  categories, 
  selectedCategory, 
  onCategorySelect 
}: CategoryNavigationProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [categoryTree, setCategoryTree] = useState<CategoryWithChildren[]>([]);
  const [productCounts, setProductCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    buildCategoryTree();
    fetchProductCounts();
  }, [categories, buildCategoryTree, fetchProductCounts]);

  const buildCategoryTree = useCallback(() => {
    const categoryMap = new Map<string, CategoryWithChildren>();
    const rootCategories: CategoryWithChildren[] = [];

    // Create category map
    categories.forEach(category => {
      categoryMap.set(category.id, {
        ...category,
        children: []
      });
    });

    // Build tree structure
    categories.forEach(category => {
      const categoryWithChildren = categoryMap.get(category.id)!;
      
      if (category.parentId && categoryMap.has(category.parentId)) {
        const parent = categoryMap.get(category.parentId)!;
        parent.children.push(categoryWithChildren);
      } else {
        rootCategories.push(categoryWithChildren);
      }
    });

    setCategoryTree(rootCategories);
  }, [categories]);

  const fetchProductCounts = useCallback(async () => {
    try {
      const response = await fetch('/api/categories/counts');
      const data = await response.json();
      setProductCounts(data.counts || {});
    } catch (error) {
      console.error('Error fetching product counts:', error);
    }
  }, []);

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const renderCategory = (category: CategoryWithChildren, level: number = 0) => {
    const hasChildren = category.children.length > 0;
    const isExpanded = expandedCategories.has(category.id);
    const isSelected = selectedCategory === category.id;
    const productCount = productCounts[category.id] || 0;

    return (
      <div key={category.id} className="select-none">
        <div
          className={`flex items-center justify-between py-2 px-3 rounded-md cursor-pointer transition-colors ${
            isSelected
              ? 'bg-orange-100 text-orange-800 border-l-4 border-orange-600'
              : 'hover:bg-gray-100 text-gray-700'
          }`}
          style={{ paddingLeft: `${12 + level * 16}px` }}
          onClick={() => onCategorySelect(category.id)}
        >
          <div className="flex items-center flex-1 min-w-0">
            {hasChildren && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleCategory(category.id);
                }}
                className="mr-2 p-1 hover:bg-gray-200 rounded transition-colors"
              >
                <svg
                  className={`w-4 h-4 transition-transform ${
                    isExpanded ? 'transform rotate-90' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            )}
            <span className="truncate font-medium">{category.name}</span>
          </div>
          {productCount > 0 && (
            <span className="ml-2 px-2 py-1 text-xs bg-gray-200 text-gray-600 rounded-full">
              {productCount}
            </span>
          )}
        </div>

        {hasChildren && isExpanded && (
          <div className="mt-1">
            {category.children.map(child => renderCategory(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Categories</h3>
        <button
          onClick={() => onCategorySelect('')}
          className={`text-sm font-medium transition-colors ${
            selectedCategory === ''
              ? 'text-orange-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          All Products
        </button>
      </div>

      <div className="space-y-1 max-h-96 overflow-y-auto">
        {categoryTree.map(category => renderCategory(category))}
      </div>

      {categoryTree.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <p className="mt-2 text-sm">No categories available</p>
        </div>
      )}
    </div>
  );
}
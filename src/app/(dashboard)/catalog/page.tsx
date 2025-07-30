'use client';

import React, { useState, useEffect } from 'react';
import { SearchInterface } from '@/components/search/SearchInterface';
import { ProductCatalog } from '@/components/catalog/ProductCatalog';
import { ProductDetailModal } from '@/components/catalog/ProductDetailModal';
import { CategoryNavigation } from '@/components/catalog/CategoryNavigation';
import type { ProductSearchResult } from '@/types/search';
import type { Category } from '@/lib/db/schema';

export default function CatalogPage() {
  const [selectedProduct, setSelectedProduct] = useState<ProductSearchResult | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [viewMode, setViewMode] = useState<'search' | 'browse'>('browse');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      const data = await response.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleProductSelect = (product: ProductSearchResult) => {
    setSelectedProduct(product);
  };

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setViewMode('browse');
  };

  const handleSearchFocus = () => {
    setViewMode('search');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Product Catalog</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setViewMode('browse')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'browse'
                    ? 'bg-orange-600 text-white'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                Browse
              </button>
              <button
                onClick={() => setViewMode('search')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'search'
                    ? 'bg-orange-600 text-white'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                Search
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {viewMode === 'search' ? (
          <SearchInterface
            onProductSelect={handleProductSelect}
            className="w-full"
          />
        ) : (
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Category Navigation */}
            <div className="w-full lg:w-64 flex-shrink-0">
              <CategoryNavigation
                categories={categories}
                selectedCategory={selectedCategory}
                onCategorySelect={handleCategorySelect}
              />
            </div>

            {/* Product Catalog */}
            <div className="flex-1">
              <ProductCatalog
                selectedCategory={selectedCategory}
                onProductSelect={handleProductSelect}
                onSearchFocus={handleSearchFocus}
              />
            </div>
          </div>
        )}
      </div>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          isOpen={!!selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}
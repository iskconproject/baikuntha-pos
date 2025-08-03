'use client';

import { useState, useEffect } from 'react';
import { SearchInterface } from '@/components/search/SearchInterface';
import { useCartStore } from '@/stores/cartStore';
import type { Product, ProductVariant } from '@/types';
import type { ProductSearchResult } from '@/types/search';

interface ProductSelectionProps {
  className?: string;
}

export function ProductSelection({ className = '' }: ProductSelectionProps) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'search' | 'categories' | 'recent'>('search');

  const addItem = useCartStore((state) => state.addItem);

  // Mock categories for quick access
  const quickCategories = [
    { id: '1', name: 'Books', icon: '📚', count: 25 },
    { id: '2', name: 'Accessories', icon: '📿', count: 15 },
    { id: '3', name: 'Incense', icon: '🕯️', count: 8 },
    { id: '4', name: 'Clothing', icon: '👕', count: 12 },
    { id: '5', name: 'Jewelry', icon: '💍', count: 6 },
    { id: '6', name: 'Gifts', icon: '🎁', count: 20 },
  ];

  // Mock recent/popular products
  const recentProducts = [
    { id: '1', name: 'Bhagavad Gita As It Is', price: 350, image: '📖' },
    { id: '2', name: 'Tulsi Japa Mala', price: 250, image: '📿' },
    { id: '3', name: 'Sandalwood Incense', price: 150, image: '🕯️' },
    { id: '4', name: 'Krishna T-Shirt', price: 450, image: '👕' },
  ];

  const handleProductSelect = async (product: ProductSearchResult) => {
    // Fetch full product details including variants
    try {
      const response = await fetch(`/api/products/${product.id}`);
      const result = await response.json();
      
      if (!result.success) {
        console.error('Error fetching product:', result.error);
        return;
      }
      
      const fullProduct = result.data;
      
      const productData: Product = {
        id: fullProduct.id,
        name: fullProduct.name,
        description: fullProduct.description,
        basePrice: fullProduct.basePrice,
        categoryId: fullProduct.categoryId,
        keywords: fullProduct.keywords || [],
        metadata: fullProduct.metadata || { customAttributes: {} },
        isActive: fullProduct.isActive,
        createdAt: new Date(fullProduct.createdAt),
        updatedAt: new Date(fullProduct.updatedAt),
        variants: fullProduct.variants || [],
      };

      setSelectedProduct(productData);
      
      // If product has variants, show variant selection modal
      if (productData.variants && productData.variants.length > 0) {
        setShowVariantModal(true);
      } else {
        // Add product directly to cart
        addItem(productData, undefined, quantity);
        setQuantity(1);
      }
    } catch (error) {
      console.error('Error fetching product details:', error);
    }
  };

  const handleAddToCart = async (product: ProductSearchResult, variant?: any) => {
    // For direct add to cart from search results, fetch full product details
    try {
      const response = await fetch(`/api/products/${product.id}`);
      const result = await response.json();
      
      if (!result.success) {
        console.error('Error fetching product:', result.error);
        return;
      }
      
      const fullProduct = result.data;
      
      const productData: Product = {
        id: fullProduct.id,
        name: fullProduct.name,
        description: fullProduct.description,
        basePrice: fullProduct.basePrice,
        categoryId: fullProduct.categoryId,
        keywords: fullProduct.keywords || [],
        metadata: fullProduct.metadata || { customAttributes: {} },
        isActive: fullProduct.isActive,
        createdAt: new Date(fullProduct.createdAt),
        updatedAt: new Date(fullProduct.updatedAt),
        variants: fullProduct.variants || [],
      };

      // If product has variants, show variant selection modal
      if (productData.variants && productData.variants.length > 0) {
        setSelectedProduct(productData);
        setShowVariantModal(true);
      } else {
        // Add product directly to cart
        addItem(productData, undefined, 1);
      }
    } catch (error) {
      console.error('Error adding product to cart:', error);
    }
  };

  const handleVariantSelect = (variant: ProductVariant) => {
    setSelectedVariant(variant);
  };

  const handleAddSelectedToCart = () => {
    if (selectedProduct) {
      addItem(selectedProduct, selectedVariant || undefined, quantity);
      setShowVariantModal(false);
      setSelectedProduct(null);
      setSelectedVariant(null);
      setQuantity(1);
    }
  };

  const handleCloseModal = () => {
    setShowVariantModal(false);
    setSelectedProduct(null);
    setSelectedVariant(null);
    setQuantity(1);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-4" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('search')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'search'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span>Search</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'categories'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span>Categories</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('recent')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'recent'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Recent</span>
              </div>
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-4">
          {activeTab === 'search' && (
            <SearchInterface
              onProductSelect={handleProductSelect}
              onAddToCart={handleAddToCart}
              className="border-0 shadow-none bg-transparent p-0"
            />
          )}

          {activeTab === 'categories' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Browse by Category</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {quickCategories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => {
                      // Switch to search tab and filter by category
                      setActiveTab('search');
                      // TODO: Implement category filtering
                    }}
                    className="p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors text-left"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{category.icon}</span>
                      <div>
                        <h4 className="font-medium text-gray-900">{category.name}</h4>
                        <p className="text-sm text-gray-600">{category.count} items</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'recent' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Popular Products</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {recentProducts.map((product) => (
                  <div
                    key={product.id}
                    className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{product.image}</span>
                        <div>
                          <h4 className="font-medium text-gray-900">{product.name}</h4>
                          <p className="text-lg font-semibold text-orange-600">₹{product.price}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          // TODO: Add to cart directly
                          console.log('Add to cart:', product);
                        }}
                        className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors text-sm font-medium"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Variant Selection Modal */}
      {showVariantModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedProduct.name}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Select variant and quantity
                  </p>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Variant Selection */}
              {selectedProduct.variants && selectedProduct.variants.length > 0 && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Variant
                  </label>
                  <div className="space-y-2">
                    {selectedProduct.variants.map((variant) => (
                      <label
                        key={variant.id}
                        className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedVariant?.id === variant.id
                            ? 'border-orange-500 bg-orange-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="variant"
                          value={variant.id}
                          checked={selectedVariant?.id === variant.id}
                          onChange={() => handleVariantSelect(variant)}
                          className="sr-only"
                        />
                        <div className="flex-1">
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-gray-900">
                              {variant.name}
                            </span>
                            <span className="text-lg font-semibold text-gray-900">
                              ₹{variant.price}
                            </span>
                          </div>
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-sm text-gray-600">
                              Stock: {variant.stockQuantity}
                            </span>
                            {variant.stockQuantity === 0 && (
                              <span className="text-xs text-red-600 font-medium">
                                Out of Stock
                              </span>
                            )}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity
                </label>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 text-center border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddSelectedToCart}
                  disabled={
                    (selectedProduct.variants && selectedProduct.variants.length > 0 && !selectedVariant) ||
                    (selectedVariant && selectedVariant.stockQuantity === 0) || false
                  }
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add to Cart
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { SearchInterface } from '@/components/search/SearchInterface';
import { useCartStore } from '@/stores/cartStore';
import type { Product, ProductVariant } from '@/types';

interface ProductSelectionProps {
  className?: string;
}

export function ProductSelection({ className = '' }: ProductSelectionProps) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [showVariantModal, setShowVariantModal] = useState(false);

  const addItem = useCartStore((state) => state.addItem);

  const handleProductSelect = (product: any) => {
    const productData: Product = {
      id: product.id,
      name: product.name,
      description: product.description,
      basePrice: product.basePrice,
      categoryId: product.categoryId,
      keywords: product.keywords || [],
      metadata: product.metadata || { customAttributes: {} },
      isActive: product.isActive,
      createdAt: new Date(product.createdAt),
      updatedAt: new Date(product.updatedAt),
      variants: product.variants || [],
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
  };

  const handleAddToCart = (product: any, variant?: any) => {
    const productData: Product = {
      id: product.id,
      name: product.name,
      description: product.description,
      basePrice: product.basePrice,
      categoryId: product.categoryId,
      keywords: product.keywords || [],
      metadata: product.metadata || { customAttributes: {} },
      isActive: product.isActive,
      createdAt: new Date(product.createdAt),
      updatedAt: new Date(product.updatedAt),
      variants: product.variants || [],
    };

    const variantData = variant ? {
      id: variant.id,
      productId: variant.productId,
      name: variant.name,
      price: variant.price,
      stockQuantity: variant.stockQuantity,
      attributes: variant.attributes || {},
      keywords: variant.keywords || [],
    } : undefined;

    addItem(productData, variantData, 1);
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
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Product Selection</h2>
          <p className="text-sm text-gray-600 mt-1">
            Search and select products to add to cart
          </p>
        </div>
        
        <div className="p-4">
          <SearchInterface
            onProductSelect={handleProductSelect}
            onAddToCart={handleAddToCart}
            className="h-96"
          />
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
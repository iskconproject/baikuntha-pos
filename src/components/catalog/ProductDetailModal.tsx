'use client';

import React, { useState, useEffect } from 'react';
import type { ProductSearchResult } from '@/types/search';

interface ProductDetailModalProps {
  product: ProductSearchResult;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart?: (product: ProductSearchResult, variant?: any, quantity?: number) => void;
}

// Helper function to format currency with commas
const formatCurrency = (amount: number): string => {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export function ProductDetailModal({ 
  product, 
  isOpen, 
  onClose, 
  onAddToCart 
}: ProductDetailModalProps) {
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'details' | 'variants' | 'metadata'>('details');

  useEffect(() => {
    if (product.variants.length > 0) {
      setSelectedVariant(product.variants[0]);
    }
  }, [product]);

  if (!isOpen) return null;

  const currentPrice = selectedVariant ? selectedVariant.price : product.basePrice;
  const currentStock = selectedVariant ? selectedVariant.stockQuantity : product.stockQuantity;
  const maxQuantity = Math.min(currentStock, 10);

  const handleAddToCart = () => {
    if (onAddToCart) {
      onAddToCart(product, selectedVariant, quantity);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{product.name}</h2>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>{product.categoryName}</span>
                  <span>Score: {product.relevanceScore}</span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="ml-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Price and Stock */}
            <div className="flex items-center justify-between mb-6 p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="text-3xl font-bold text-orange-600">{formatCurrency(currentPrice)}</div>
                {selectedVariant && selectedVariant.price !== product.basePrice && (
                  <div className="text-sm text-gray-500">Base price: {formatCurrency(product.basePrice)}</div>
                )}
              </div>
              <div className="text-right">
                <div className={`text-sm font-medium ${
                  currentStock > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {currentStock > 0 ? `${currentStock} in stock` : 'Out of stock'}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 mb-6">
              <nav className="-mb-px flex space-x-8">
                {[
                  { id: 'details', label: 'Details' },
                  { id: 'variants', label: `Variants (${product.variants.length})` },
                  { id: 'metadata', label: 'Metadata' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-orange-500 text-orange-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="min-h-[200px] max-h-[400px] overflow-y-auto">
              {activeTab === 'details' && (
                <div className="space-y-4">
                  {product.description && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Description</h4>
                      <p className="text-gray-700">{product.description}</p>
                    </div>
                  )}

                  {product.keywords.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Keywords</h4>
                      <div className="flex flex-wrap gap-2">
                        {product.keywords.map((keyword, index) => (
                          <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded">
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Custom Attributes */}
                  {Object.keys(product.metadata.customAttributes).length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Product Details</h4>
                      <div className="space-y-2">
                        {Object.entries(product.metadata.customAttributes).map(([key, value]) => (
                          <div key={key} className="flex justify-between text-sm">
                            <span className="font-medium capitalize">{key}:</span>
                            <span className="text-gray-700">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'variants' && (
                <div className="space-y-3">
                  {product.variants.length > 0 ? (
                    product.variants.map((variant) => (
                      <div
                        key={variant.id}
                        className={`p-3 border rounded cursor-pointer ${
                          selectedVariant?.id === variant.id
                            ? 'border-orange-500 bg-orange-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedVariant(variant)}
                      >
                        <div className="flex justify-between">
                          <div>
                            <h5 className="font-medium">{variant.name}</h5>
                            <div className="text-sm text-gray-600">{formatCurrency(variant.price)}</div>
                            {/* Variant Attributes */}
                            {Object.keys(variant.attributes).length > 0 && (
                              <div className="mt-2 space-y-1">
                                {Object.entries(variant.attributes).map(([key, value]) => (
                                  <div key={key} className="text-xs text-gray-500">
                                    {key}: {value}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="text-sm">
                            {variant.stockQuantity > 0 
                              ? `${variant.stockQuantity} in stock` 
                              : 'Out of stock'
                            }
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-8">No variants available for this product</p>
                  )}
                </div>
              )}

              {activeTab === 'metadata' && (
                <div className="space-y-4">
                  <div className="text-sm">
                    <strong>Product ID:</strong> {product.id}
                  </div>
                  <div className="text-sm">
                    <strong>Category ID:</strong> {product.categoryId}
                  </div>
                  <div className="text-sm">
                    <strong>Status:</strong> {product.isActive ? 'Active' : 'Inactive'}
                  </div>
                  {Object.keys(product.metadata.customAttributes).length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Custom Attributes</h4>
                      <pre className="text-xs bg-gray-100 p-3 rounded overflow-x-auto">
                        {JSON.stringify(product.metadata.customAttributes, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            {onAddToCart && currentStock > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <label className="text-sm font-medium">Quantity:</label>
                    <div className="flex items-center border rounded">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="px-3 py-1 hover:bg-gray-100"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, Math.min(maxQuantity, parseInt(e.target.value) || 1)))}
                        className="w-16 px-2 py-1 text-center border-0"
                        min="1"
                        max={maxQuantity}
                      />
                      <button
                        onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
                        className="px-3 py-1 hover:bg-gray-100"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm text-gray-600">Total:</div>
                      <div className="text-xl font-bold text-orange-600">
                        {formatCurrency(currentPrice * quantity)}
                      </div>
                    </div>
                    <button
                      onClick={handleAddToCart}
                      className="px-6 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
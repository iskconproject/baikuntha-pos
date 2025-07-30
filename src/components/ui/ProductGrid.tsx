'use client';

import React from 'react';
import type { ProductSearchResult } from '@/types/search';

interface ProductGridProps {
  products: ProductSearchResult[];
  onProductClick: (product: ProductSearchResult) => void;
  onAddToCart?: (product: ProductSearchResult) => void;
  className?: string;
}

export function ProductGrid({ 
  products, 
  onProductClick, 
  onAddToCart, 
  className = 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
}: ProductGridProps) {
  return (
    <div className={`grid gap-6 ${className}`}>
      {products.map((product) => (
        <div
          key={product.id}
          className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
          onClick={() => onProductClick(product)}
        >
          <div className="p-4">
            {/* Product Name */}
            <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-orange-600 transition-colors">
              {product.name}
            </h3>

            {/* Description */}
            {product.description && (
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {product.description}
              </p>
            )}

            {/* Price and Stock */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex flex-col">
                <span className="text-xl font-bold text-orange-600">
                  ₹{product.basePrice.toFixed(2)}
                </span>
                {product.variants.length > 0 && (
                  <span className="text-xs text-gray-500">
                    {product.variants.length} variant{product.variants.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div className="text-right">
                <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                  product.stockQuantity > 0 
                    ? product.stockQuantity <= 5
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {product.stockQuantity > 0 
                    ? `${product.stockQuantity} in stock` 
                    : 'Out of stock'
                  }
                </span>
              </div>
            </div>

            {/* Category and Relevance */}
            <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
              <span className="truncate">{product.categoryName}</span>
              <span className="ml-2 flex-shrink-0">Score: {product.relevanceScore}</span>
            </div>

            {/* Keywords */}
            {product.keywords.length > 0 && (
              <div className="mb-3">
                <div className="flex flex-wrap gap-1">
                  {product.keywords.slice(0, 3).map((keyword, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                    >
                      {keyword}
                    </span>
                  ))}
                  {product.keywords.length > 3 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                      +{product.keywords.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Custom Attributes */}
            {Object.keys(product.metadata.customAttributes).length > 0 && (
              <div className="mb-3">
                <div className="text-xs text-gray-500 space-y-1">
                  {Object.entries(product.metadata.customAttributes)
                    .slice(0, 2)
                    .map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="capitalize font-medium">
                          {key.replace(/([A-Z])/g, ' $1').trim()}:
                        </span>
                        <span className="truncate ml-2">
                          {typeof value === 'string' ? value : JSON.stringify(value)}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Action Button */}
            {onAddToCart && product.stockQuantity > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToCart(product);
                }}
                className="w-full mt-3 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors text-sm font-medium"
              >
                Add to Cart
              </button>
            )}

            {/* View Details Button */}
            <button
              onClick={() => onProductClick(product)}
              className="w-full mt-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors text-sm font-medium"
            >
              View Details
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
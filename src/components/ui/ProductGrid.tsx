'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import type { Product, ProductVariant } from '@/types';

interface ProductGridProps {
  products: Product[];
  onProductSelect?: (product: Product) => void;
  onAddToCart?: (product: Product, variant?: ProductVariant) => void;
  className?: string;
  loading?: boolean;
}

interface ProductCardProps {
  product: Product;
  onSelect?: (product: Product) => void;
  onAddToCart?: (product: Product, variant?: ProductVariant) => void;
  className?: string;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onSelect,
  onAddToCart,
  className,
}) => {
  const formatCurrency = (amount: number) => `₹${amount.toFixed(2)}`;
  
  const hasVariants = product.variants && product.variants.length > 0;
  const basePrice = hasVariants ? 
    Math.min(...product.variants.map(v => v.price)) : 
    product.basePrice;
  
  const maxPrice = hasVariants ? 
    Math.max(...product.variants.map(v => v.price)) : 
    product.basePrice;
  
  const totalStock = hasVariants ?
    product.variants.reduce((sum, v) => sum + v.stockQuantity, 0) :
    999; // Assume unlimited for base products
  
  const isOutOfStock = totalStock === 0;

  const handleCardClick = () => {
    if (onSelect) {
      onSelect(product);
    }
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAddToCart) {
      onAddToCart(product);
    }
  };

  return (
    <div
      className={cn(
        // Base card styling
        'group relative bg-white rounded-xl border border-gray-200 shadow-sm',
        'transition-all duration-200 ease-in-out',
        'hover:shadow-md hover:border-primary-300',
        // Touch optimization - larger touch targets
        'min-h-[200px] sm:min-h-[220px] md:min-h-[240px]',
        // Responsive padding
        'p-3 sm:p-4 md:p-5',
        // Cursor and interaction states
        onSelect && 'cursor-pointer',
        isOutOfStock && 'opacity-60',
        className
      )}
      onClick={handleCardClick}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onKeyDown={(e) => {
        if (onSelect && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onSelect(product);
        }
      }}
      aria-label={`Product: ${product.name}`}
    >
      {/* Stock status indicator */}
      {isOutOfStock && (
        <div className="absolute top-2 right-2 z-10">
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            Out of Stock
          </span>
        </div>
      )}
      
      {/* Low stock indicator */}
      {!isOutOfStock && totalStock <= 5 && totalStock > 0 && (
        <div className="absolute top-2 right-2 z-10">
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-warning-100 text-warning-800">
            Low Stock
          </span>
        </div>
      )}

      {/* Product content */}
      <div className="flex flex-col h-full">
        {/* Product name */}
        <div className="flex-1 mb-3">
          <h3 className={cn(
            'font-semibold text-gray-900 line-clamp-2',
            // Responsive text sizing
            'text-sm sm:text-base md:text-lg',
            // Touch-friendly line height
            'leading-tight sm:leading-snug'
          )}>
            {product.name}
          </h3>
          
          {product.description && (
            <p className={cn(
              'text-gray-600 line-clamp-2 mt-1',
              'text-xs sm:text-sm',
              'leading-relaxed'
            )}>
              {product.description}
            </p>
          )}
        </div>

        {/* Product metadata */}
        {product.metadata && Object.keys(product.metadata.customAttributes || {}).length > 0 && (
          <div className="mb-3">
            <div className="flex flex-wrap gap-1">
              {Object.entries(product.metadata.customAttributes || {})
                .slice(0, 2)
                .map(([key, value]) => (
                  <span
                    key={key}
                    className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-700"
                  >
                    {value}
                  </span>
                ))}
            </div>
          </div>
        )}

        {/* Price and stock info */}
        <div className="mb-3">
          <div className="flex items-center justify-between">
            <div>
              {hasVariants && basePrice !== maxPrice ? (
                <span className={cn(
                  'font-bold text-primary-600',
                  'text-base sm:text-lg md:text-xl'
                )}>
                  {formatCurrency(basePrice)} - {formatCurrency(maxPrice)}
                </span>
              ) : (
                <span className={cn(
                  'font-bold text-primary-600',
                  'text-base sm:text-lg md:text-xl'
                )}>
                  {formatCurrency(basePrice)}
                </span>
              )}
              
              {hasVariants && (
                <p className="text-xs text-gray-500 mt-1">
                  {product.variants.length} variant{product.variants.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>
            
            <div className="text-right">
              <p className="text-xs text-gray-500">
                Stock: {totalStock === 999 ? '∞' : totalStock}
              </p>
            </div>
          </div>
        </div>

        {/* Action button */}
        {onAddToCart && (
          <button
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className={cn(
              // Base button styling
              'w-full flex items-center justify-center gap-2',
              'px-3 py-2.5 sm:py-3 rounded-lg font-medium',
              'transition-all duration-200 ease-in-out',
              // Touch optimization
              'min-h-[44px] sm:min-h-[48px]',
              'text-sm sm:text-base',
              // Color variants
              !isOutOfStock && [
                'bg-primary-600 text-white',
                'hover:bg-primary-700 active:bg-primary-800',
                'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
                'shadow-sm hover:shadow-md'
              ],
              isOutOfStock && [
                'bg-gray-200 text-gray-500 cursor-not-allowed'
              ]
            )}
            aria-label={`Add ${product.name} to cart`}
          >
            <svg 
              className="w-4 h-4 sm:w-5 sm:h-5" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.1 5M7 13l-1.1 5m0 0h9.1M6 18a2 2 0 100 4 2 2 0 000-4zm12 0a2 2 0 100 4 2 2 0 000-4z" 
              />
            </svg>
            {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
          </button>
        )}
      </div>
    </div>
  );
};

export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  onProductSelect,
  onAddToCart,
  className,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className={cn('grid gap-4', className)}>
        {/* Loading skeleton */}
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className={cn(
              'bg-white rounded-xl border border-gray-200',
              'min-h-[200px] sm:min-h-[220px] md:min-h-[240px]',
              'p-3 sm:p-4 md:p-5',
              'animate-pulse'
            )}
          >
            <div className="flex flex-col h-full">
              <div className="flex-1 mb-3">
                <div className="h-4 sm:h-5 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 sm:h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
              <div className="mb-3">
                <div className="h-6 sm:h-7 bg-gray-200 rounded w-1/2"></div>
              </div>
              <div className="h-10 sm:h-12 bg-gray-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className={cn(
        'flex flex-col items-center justify-center',
        'min-h-[300px] sm:min-h-[400px]',
        'text-center p-6',
        className
      )}>
        <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
          <svg 
            className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" 
            />
          </svg>
        </div>
        <h3 className="text-lg sm:text-xl font-medium text-gray-900 mb-2">
          No Products Found
        </h3>
        <p className="text-gray-600 text-sm sm:text-base">
          Try adjusting your search or filters to find products.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        // Responsive grid layout optimized for different screen sizes
        'grid gap-3 sm:gap-4 md:gap-5 lg:gap-6',
        // Mobile: 1-2 columns
        'grid-cols-1 xs:grid-cols-2',
        // Tablet: 2-3 columns  
        'sm:grid-cols-2 md:grid-cols-3',
        // Desktop: 3-4 columns
        'lg:grid-cols-3 xl:grid-cols-4',
        // Large desktop: 4-5 columns
        '2xl:grid-cols-5',
        className
      )}
      role="grid"
      aria-label="Product grid"
    >
      {products.map((product) => (
        <div key={product.id} role="gridcell">
          <ProductCard
            product={product}
            onSelect={onProductSelect}
            onAddToCart={onAddToCart}
          />
        </div>
      ))}
    </div>
  );
};
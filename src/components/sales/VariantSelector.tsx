'use client';

import { useState, useEffect } from 'react';
import type { ProductVariant } from '@/types';

interface VariantSelectorProps {
  variants: ProductVariant[];
  onSelect: (variant: ProductVariant) => void;
  onCancel: () => void;
  className?: string;
}

export function VariantSelector({ variants, onSelect, onCancel, className = '' }: VariantSelectorProps) {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);

  // Auto-focus first available variant for keyboard navigation
  useEffect(() => {
    const firstAvailable = variants.find(v => v.stockQuantity > 0);
    if (firstAvailable) {
      setSelectedVariant(firstAvailable);
    }
  }, [variants]);

  const handleSelect = (variant: ProductVariant) => {
    setSelectedVariant(variant);
    onSelect(variant);
  };

  const handleKeyDown = (e: React.KeyboardEvent, variant: ProductVariant) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSelect(variant);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toFixed(2)}`;
  };

  return (
    <div className={`bg-orange-50 rounded-lg p-4 border-2 border-orange-200 shadow-sm ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h5 className="text-sm font-semibold text-orange-900 flex items-center">
          <svg className="w-4 h-4 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          Choose Variant:
        </h5>
        <button
          onClick={onCancel}
          className="text-orange-400 hover:text-orange-600 p-1 rounded hover:bg-orange-100 transition-colors"
          title="Cancel (Esc)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      {/* Quick selection hint */}
      <div className="text-xs text-orange-700 mb-3 flex items-center">
        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Click to add to cart • Press Esc to cancel
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {variants.map((variant, index) => (
          <button
            key={variant.id}
            onClick={() => handleSelect(variant)}
            onKeyDown={(e) => handleKeyDown(e, variant)}
            disabled={variant.stockQuantity === 0}
            autoFocus={index === 0 && variant.stockQuantity > 0}
            className={`p-3 text-left border-2 rounded-lg transition-all duration-200 ${
              variant.stockQuantity === 0
                ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                : selectedVariant?.id === variant.id
                ? 'border-orange-500 bg-orange-100 shadow-md transform scale-105'
                : 'border-orange-300 bg-white hover:border-orange-500 hover:bg-orange-50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500'
            }`}
          >
            <div className="flex justify-between items-center">
              <div className="flex-1 min-w-0">
                <span className={`font-medium text-sm block truncate ${
                  variant.stockQuantity === 0 ? 'text-gray-400' : 'text-gray-900'
                }`}>
                  {variant.name}
                </span>
                <div className={`text-xs mt-1 flex items-center ${
                  variant.stockQuantity === 0 ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  <span className="mr-2">Stock: {variant.stockQuantity}</span>
                  {variant.stockQuantity <= 5 && variant.stockQuantity > 0 && (
                    <span className="text-amber-600 font-medium">Low!</span>
                  )}
                </div>
              </div>
              <div className="text-right ml-2">
                <span className={`font-bold text-sm ${
                  variant.stockQuantity === 0 ? 'text-gray-400' : 'text-orange-600'
                }`}>
                  {formatCurrency(variant.price)}
                </span>
                {variant.stockQuantity === 0 && (
                  <div className="text-xs text-red-600 font-medium">
                    Out of Stock
                  </div>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
      
      {/* Quick info for many variants */}
      {variants.length > 3 && (
        <div className="mt-3 pt-3 border-t border-orange-200">
          <div className="text-xs text-orange-700 text-center">
            {variants.filter(v => v.stockQuantity > 0).length} of {variants.length} variants available
          </div>
        </div>
      )}
    </div>
  );
}
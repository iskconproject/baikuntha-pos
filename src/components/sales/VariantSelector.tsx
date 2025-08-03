'use client';

import { useState } from 'react';
import type { ProductVariant } from '@/types';

interface VariantSelectorProps {
  variants: ProductVariant[];
  onSelect: (variant: ProductVariant) => void;
  onCancel: () => void;
  className?: string;
}

export function VariantSelector({ variants, onSelect, onCancel, className = '' }: VariantSelectorProps) {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);

  const handleSelect = (variant: ProductVariant) => {
    setSelectedVariant(variant);
    onSelect(variant);
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toFixed(2)}`;
  };

  return (
    <div className={`bg-gray-50 rounded-lg p-4 border border-gray-200 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h5 className="text-sm font-semibold text-gray-900">Select Variant:</h5>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600 p-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {variants.map((variant) => (
          <button
            key={variant.id}
            onClick={() => handleSelect(variant)}
            disabled={variant.stockQuantity === 0}
            className={`p-3 text-left border rounded-lg transition-colors ${
              variant.stockQuantity === 0
                ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'border-gray-300 hover:border-orange-500 hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-orange-500'
            }`}
          >
            <div className="flex justify-between items-center">
              <div>
                <span className="font-medium text-sm">{variant.name}</span>
                <div className="text-xs text-gray-500 mt-1">
                  Stock: {variant.stockQuantity}
                </div>
              </div>
              <div className="text-right">
                <span className="text-orange-600 font-bold">
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
    </div>
  );
}
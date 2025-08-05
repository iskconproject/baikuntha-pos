'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import type { ProductVariant } from '@/types';

interface VariantSelectorModalProps {
  variants: ProductVariant[];
  productName: string;
  isOpen: boolean;
  onSelect: (variant: ProductVariant) => void;
  onCancel: () => void;
}

export function VariantSelectorModal({ 
  variants, 
  productName, 
  isOpen, 
  onSelect, 
  onCancel 
}: VariantSelectorModalProps) {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);

  useEffect(() => {
    if (isOpen) {
      const firstAvailable = variants.find(v => v.stockQuantity > 0);
      if (firstAvailable) {
        setSelectedVariant(firstAvailable);
      }
    }
  }, [isOpen, variants]);

  const handleSelect = (variant: ProductVariant) => {
    setSelectedVariant(variant);
    onSelect(variant);
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toFixed(2)}`;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={`Select Variant - ${productName}`}
      size="md"
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Choose a variant to add to your cart:
        </p>
        
        <div className="grid grid-cols-1 gap-3">
          {variants.map((variant) => (
            <button
              key={variant.id}
              onClick={() => handleSelect(variant)}
              disabled={variant.stockQuantity === 0}
              className={`p-4 text-left border-2 rounded-lg transition-all ${
                variant.stockQuantity === 0
                  ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                  : selectedVariant?.id === variant.id
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-gray-300 hover:border-orange-500 hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-orange-500'
              }`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-medium">{variant.name}</span>
                  <div className="text-sm text-gray-500 mt-1">
                    Stock: {variant.stockQuantity}
                    {variant.stockQuantity <= 5 && variant.stockQuantity > 0 && (
                      <span className="text-amber-600 font-medium ml-2">Low Stock!</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-orange-600 font-bold text-lg">
                    {formatCurrency(variant.price)}
                  </span>
                  {variant.stockQuantity === 0 && (
                    <div className="text-sm text-red-600 font-medium">
                      Out of Stock
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
        
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}
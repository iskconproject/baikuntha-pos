'use client';

import { useState, useEffect, useRef } from 'react';
import type { Product, ProductVariant } from '@/types';

interface QuickQuantityModalProps {
  product: Product;
  variant?: ProductVariant;
  isOpen: boolean;
  onConfirm: (quantity: number) => void;
  onCancel: () => void;
}

export function QuickQuantityModal({
  product,
  variant,
  isOpen,
  onConfirm,
  onCancel,
}: QuickQuantityModalProps) {
  const [quantity, setQuantity] = useState(1);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity > 0) {
      onConfirm(quantity);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  if (!isOpen) return null;

  const productName = variant ? `${product.name} - ${variant.name}` : product.name;
  const price = variant?.price || product.basePrice;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4">
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Add to Cart
            </h3>
            
            <div className="mb-4">
              <p className="font-medium text-gray-900">{productName}</p>
              <p className="text-orange-600 font-bold">₹{price.toFixed(2)} each</p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity
              </label>
              <input
                ref={inputRef}
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                onKeyDown={handleKeyDown}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-center text-lg font-semibold"
              />
            </div>

            <div className="mb-6 p-3 bg-orange-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total:</span>
                <span className="text-lg font-bold text-orange-600">
                  ₹{(price * quantity).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 font-medium"
              >
                Add to Cart
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
'use client';

import { useState, useRef, useEffect } from 'react';
import type { Product, CustomVariantData } from '@/types';

interface CustomVariantSelectorProps {
  product: Product;
  onSelect: (customData: CustomVariantData) => void;
  onCancel: () => void;
  className?: string;
}

export function CustomVariantSelector({ 
  product, 
  onSelect, 
  onCancel, 
  className = '' 
}: CustomVariantSelectorProps) {
  const [customPrice, setCustomPrice] = useState<string>('');
  const [customDescription, setCustomDescription] = useState<string>('');
  const [error, setError] = useState<string>('');
  const priceInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus price input
  useEffect(() => {
    if (priceInputRef.current) {
      priceInputRef.current.focus();
    }
  }, []);

  const handlePriceChange = (value: string) => {
    // Allow only numbers and decimal point
    const cleanValue = value.replace(/[^0-9.]/g, '');
    
    // Prevent multiple decimal points
    const parts = cleanValue.split('.');
    if (parts.length > 2) {
      return;
    }
    
    // Limit decimal places to 2
    if (parts[1] && parts[1].length > 2) {
      return;
    }
    
    setCustomPrice(cleanValue);
    setError('');
  };

  const handleSubmit = () => {
    const price = parseFloat(customPrice);
    
    if (!customPrice || isNaN(price) || price <= 0) {
      setError('Please enter a valid price greater than 0');
      return;
    }
    
    if (price > 100000) {
      setError('Price cannot exceed ₹1,00,000');
      return;
    }

    const customData: CustomVariantData = {
      customPrice: price,
      customDescription: customDescription.trim() || undefined,
      customAttributes: {
        originalBasePrice: product.basePrice.toString(),
        customPriceReason: 'Custom pricing applied during sale'
      }
    };

    onSelect(customData);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toFixed(2)}`;
  };

  return (
    <div className={`bg-blue-50 rounded-lg p-4 border-2 border-blue-200 shadow-sm ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h5 className="text-sm font-semibold text-blue-900 flex items-center">
          <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
          Custom Pricing for: {product.name}
        </h5>
        <button
          onClick={onCancel}
          className="text-blue-400 hover:text-blue-600 p-1 rounded hover:bg-blue-100 transition-colors"
          title="Cancel (Esc)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Base price reference */}
      <div className="text-xs text-blue-700 mb-3 flex items-center">
        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Base price: {formatCurrency(product.basePrice)} • Enter custom price below
      </div>

      <div className="space-y-3">
        {/* Custom Price Input */}
        <div>
          <label htmlFor="customPrice" className="block text-sm font-medium text-blue-900 mb-1">
            Custom Price *
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500 text-lg">₹</span>
            </div>
            <input
              ref={priceInputRef}
              id="customPrice"
              type="text"
              value={customPrice}
              onChange={(e) => handlePriceChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="0.00"
              className={`w-full pl-8 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg font-medium ${
                error ? 'border-red-300 bg-red-50' : 'border-blue-300 bg-white'
              }`}
            />
          </div>
          {error && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </p>
          )}
        </div>

        {/* Optional Description */}
        <div>
          <label htmlFor="customDescription" className="block text-sm font-medium text-blue-900 mb-1">
            Description (Optional)
          </label>
          <input
            id="customDescription"
            type="text"
            value={customDescription}
            onChange={(e) => setCustomDescription(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g., Special edition, Custom size, etc."
            className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            maxLength={100}
          />
          <div className="mt-1 text-xs text-blue-600">
            {customDescription.length}/100 characters
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 pt-2">
          <button
            onClick={handleSubmit}
            disabled={!customPrice || parseFloat(customPrice) <= 0}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Add to Cart
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-blue-300 text-blue-700 rounded-lg font-medium hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Price comparison if different from base */}
      {customPrice && !isNaN(parseFloat(customPrice)) && parseFloat(customPrice) !== product.basePrice && (
        <div className="mt-3 pt-3 border-t border-blue-200">
          <div className="text-xs text-blue-700 flex items-center justify-between">
            <span>Base Price: {formatCurrency(product.basePrice)}</span>
            <span className={`font-medium ${
              parseFloat(customPrice) > product.basePrice ? 'text-green-600' : 'text-orange-600'
            }`}>
              Custom: {formatCurrency(parseFloat(customPrice))}
              {parseFloat(customPrice) > product.basePrice ? ' (+' : ' ('}
              {formatCurrency(Math.abs(parseFloat(customPrice) - product.basePrice))}
              {parseFloat(customPrice) > product.basePrice ? ' more)' : ' less)'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
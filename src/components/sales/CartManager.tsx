'use client';

import { useState } from 'react';
import { useCartStore } from '@/stores/cartStore';
import type { CartItem } from '@/types';

interface CartManagerProps {
  className?: string;
  onCheckout?: () => void;
}

export function CartManager({ className = '', onCheckout }: CartManagerProps) {
  const {
    items,
    total,
    updateQuantity,
    removeItem,
    clearCart,
    getItemCount,
  } = useCartStore();

  // Calculate subtotal, tax, discount locally if needed
  const subtotal = total;
  const tax = 0;
  const discount = 0;

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleQuantityChange = (item: CartItem, newQuantity: number) => {
    updateQuantity(item.productId, item.variantId, newQuantity);
  };

  const handleRemoveItem = (item: CartItem) => {
    removeItem(item.productId, item.variantId);
  };

  const handleClearCart = () => {
    clearCart();
    setShowClearConfirm(false);
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toFixed(2)}`;
  };

  const getItemPrice = (item: CartItem) => {
    return item.variant?.price || item.product.basePrice;
  };

  const getItemName = (item: CartItem) => {
    if (item.variant) {
      return `${item.product.name} - ${item.variant.name}`;
    }
    return item.product.name;
  };

  const getStockQuantity = (item: CartItem) => {
    return item.variant?.stockQuantity || 999; // Assume unlimited stock for base products
  };

  if (items.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
        <div className="p-4 sm:p-6 text-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.1 5M7 13l-1.1 5m0 0h9.1M6 18a2 2 0 100 4 2 2 0 000-4zm12 0a2 2 0 100 4 2 2 0 000-4z" />
            </svg>
          </div>
          <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">Cart is Empty</h3>
          <p className="text-sm text-gray-600">Add products to start a transaction</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">Cart</h2>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              {getItemCount()} {getItemCount() === 1 ? 'item' : 'items'}
            </p>
          </div>
          <button
            onClick={() => setShowClearConfirm(true)}
            className="text-xs sm:text-sm text-red-600 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Cart Items */}
      <div className="max-h-64 sm:max-h-96 overflow-y-auto">
        {items.map((item) => (
          <div key={`${item.productId}-${item.variantId || 'base'}`} className="p-3 sm:p-4 border-b border-gray-100 last:border-b-0">
            <div className="space-y-2">
              {/* Product Info */}
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0 pr-2">
                  <h4 className="text-sm font-medium text-gray-900 truncate">
                    {getItemName(item)}
                  </h4>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm font-semibold text-orange-600">
                      {formatCurrency(getItemPrice(item))}
                    </span>
                    <span className="text-xs text-gray-500">
                      Stock: {getStockQuantity(item)}
                    </span>
                  </div>
                </div>
                
                {/* Remove Button */}
                <button
                  onClick={() => handleRemoveItem(item)}
                  className="text-red-600 hover:text-red-700 p-1 hover:bg-red-50 rounded transition-colors"
                  title="Remove item"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Quantity Controls and Total */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleQuantityChange(item, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                  </button>
                  
                  <span className="w-8 text-center text-sm font-medium">
                    {item.quantity}
                  </span>
                  
                  <button
                    onClick={() => handleQuantityChange(item, item.quantity + 1)}
                    disabled={item.quantity >= getStockQuantity(item)}
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </button>
                </div>

                {/* Item Total */}
                <span className="text-sm font-semibold text-gray-900">
                  {formatCurrency(getItemPrice(item) * item.quantity)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Cart Summary */}
      <div className="p-3 sm:p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex justify-between items-center text-lg font-bold text-gray-900 mb-3">
          <span>Total</span>
          <span className="text-orange-600">{formatCurrency(total)}</span>
        </div>

        {/* Checkout Button */}
        {onCheckout && (
          <button
            onClick={onCheckout}
            className="w-full px-4 py-3 sm:py-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 font-semibold text-base transition-colors"
          >
            Checkout • {formatCurrency(total)}
          </button>
        )}
      </div>

      {/* Clear Cart Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Clear Cart</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Are you sure you want to remove all items from the cart?
                  </p>
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearCart}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                >
                  Clear Cart
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useCartStore } from "@/stores/cartStore";
import { Lightbulb } from "lucide-react";
import type { CartItem } from "@/types";

interface CartManagerProps {
  className?: string;
  onCheckout?: () => void;
}

export function CartManager({ className = "", onCheckout }: CartManagerProps) {
  const { items, total, updateQuantity, removeItem, clearCart, getItemCount } =
    useCartStore();

  // Calculate subtotal, tax, discount locally if needed
  const subtotal = total;
  const tax = 0;
  const discount = 0;

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleQuantityChange = (item: CartItem, newQuantity: number) => {
    updateQuantity(
      item.productId,
      item.variantId,
      newQuantity,
      item.isCustomVariant
    );
  };

  const handleRemoveItem = (item: CartItem) => {
    removeItem(item.productId, item.variantId, item.isCustomVariant);
  };

  const handleClearCart = () => {
    clearCart();
    setShowClearConfirm(false);
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toFixed(2)}`;
  };

  const getItemPrice = (item: CartItem) => {
    if (item.isCustomVariant && item.customVariantData) {
      return item.customVariantData.customPrice;
    }
    return item.variant?.price || item.product.basePrice;
  };

  const getItemName = (item: CartItem) => {
    if (item.isCustomVariant) {
      const customDesc = item.customVariantData?.customDescription;
      return customDesc
        ? `${item.product.name} - Custom (${customDesc})`
        : `${item.product.name} - Custom Price`;
    }
    if (item.variant) {
      return `${item.product.name} - ${item.variant.name}`;
    }
    return item.product.name;
  };

  const getStockQuantity = (item: CartItem) => {
    if (item.isCustomVariant) {
      return 999; // Custom variants have unlimited stock
    }
    return item.variant?.stockQuantity || 999; // Assume unlimited stock for base products
  };

  if (items.length === 0) {
    return (
      <div
        className={`bg-white rounded-lg shadow-sm border border-gray-200 sticky top-4 ${className}`}
      >
        <div className="p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-orange-100 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-orange-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.1 5M7 13l-1.1 5m0 0h9.1M6 18a2 2 0 100 4 2 2 0 000-4zm12 0a2 2 0 100 4 2 2 0 000-4z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Cart is Empty
          </h3>
          <p className="text-sm text-gray-600">
            Search and add products to start a transaction
          </p>
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-700 font-medium flex items-center">
              <Lightbulb className="w-3 h-3 mr-1" />
              Tip: Press Enter after searching to quickly add the first result
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-white rounded-lg shadow-lg border border-gray-200 sticky top-4 ${className}`}
    >
      {/* Header with prominent total */}
      <div className="p-4 border-b border-gray-200 bg-orange-50">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-bold text-gray-900">Shopping Cart</h2>
          <button
            onClick={() => setShowClearConfirm(true)}
            className="text-sm text-red-600 hover:text-red-700 font-medium px-3 py-1 rounded-full hover:bg-red-50 transition-colors"
          >
            Clear All
          </button>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">
            {getItemCount()} {getItemCount() === 1 ? "item" : "items"}
          </span>
          <span className="text-2xl font-bold text-orange-600">
            {formatCurrency(total)}
          </span>
        </div>
      </div>

      {/* Cart Items */}
      <div className="max-h-80 overflow-y-auto">
        {items.map((item) => (
          <div
            key={`${item.productId}-${item.variantId || "base"}`}
            className="p-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <h4 className="text-base font-medium text-gray-900 truncate">
                    {getItemName(item)}
                  </h4>
                  {item.isCustomVariant && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      <svg
                        className="w-3 h-3 mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                        />
                      </svg>
                      Custom
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-lg font-bold text-orange-600">
                    {formatCurrency(getItemPrice(item))}
                  </span>
                  <span className="text-xs text-gray-500">
                    {item.isCustomVariant
                      ? "Unlimited"
                      : `Stock: ${getStockQuantity(item)}`}
                  </span>
                </div>
              </div>

              {/* Remove Button */}
              <button
                onClick={() => handleRemoveItem(item)}
                className="ml-3 text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded-full transition-colors"
                title="Remove item"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>

            {/* Quantity Controls and Total */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => handleQuantityChange(item, item.quantity - 1)}
                  disabled={item.quantity <= 1}
                  className="w-10 h-10 rounded-lg bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20 12H4"
                    />
                  </svg>
                </button>

                <span className="w-12 text-center text-lg font-bold text-gray-900">
                  {item.quantity}
                </span>

                <button
                  onClick={() => handleQuantityChange(item, item.quantity + 1)}
                  disabled={item.quantity >= getStockQuantity(item)}
                  className="w-10 h-10 rounded-lg bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                </button>
              </div>

              {/* Item Total */}
              <div className="text-right">
                <div className="text-lg font-bold text-gray-900">
                  {formatCurrency(getItemPrice(item) * item.quantity)}
                </div>
                <div className="text-xs text-gray-500">
                  {item.quantity} × {formatCurrency(getItemPrice(item))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Checkout Section */}
      <div className="p-4 border-t-2 border-orange-200 bg-gradient-to-r from-orange-50 to-orange-100">
        {/* Quick Actions */}
        <div className="flex space-x-2 mb-4">
          <button
            onClick={() => setShowClearConfirm(true)}
            className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors"
          >
            Clear Cart
          </button>
          <button className="flex-1 px-3 py-2 text-sm font-medium text-orange-700 bg-white border border-orange-300 rounded-lg hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors">
            Save for Later
          </button>
        </div>

        {/* Total Summary */}
        <div className="bg-white rounded-lg p-4 mb-4 shadow-sm">
          <div className="flex justify-between items-center text-2xl font-bold">
            <span className="text-gray-900">Total</span>
            <span className="text-orange-600">{formatCurrency(total)}</span>
          </div>
          <div className="text-sm text-gray-600 mt-1">
            {getItemCount()} {getItemCount() === 1 ? "item" : "items"} • Tax
            included
          </div>
        </div>

        {/* Checkout Button */}
        {onCheckout && (
          <button
            onClick={onCheckout}
            className="w-full px-6 py-4 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-xl hover:from-orange-700 hover:to-orange-800 focus:outline-none focus:ring-4 focus:ring-orange-500 focus:ring-offset-2 font-bold text-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            <div className="flex items-center justify-center space-x-2">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <span>Proceed to Payment</span>
            </div>
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
                  <svg
                    className="w-5 h-5 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Clear Cart
                  </h3>
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

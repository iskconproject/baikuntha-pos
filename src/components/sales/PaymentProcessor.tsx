'use client';

import { useState } from 'react';
import { useCartStore } from '@/stores/cartStore';
import { ReceiptPrinter } from './ReceiptPrinter';
import type { Transaction } from '@/types';
import type { ReceiptData, PrintResult } from '@/types/receipt';

interface PaymentProcessorProps {
  onPaymentComplete: (transaction: Transaction) => void;
  onCancel: () => void;
  className?: string;
}

type PaymentMethod = 'cash' | 'upi';

interface PaymentFormData {
  paymentMethod: PaymentMethod;
  paymentReference?: string;
  cashReceived?: number;
  upiTransactionId?: string;
}

export function PaymentProcessor({ onPaymentComplete, onCancel, className = '' }: PaymentProcessorProps) {
  const { items, total, clearCart } = useCartStore();
  const [formData, setFormData] = useState<PaymentFormData>({
    paymentMethod: 'cash',
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [completedTransaction, setCompletedTransaction] = useState<Transaction | null>(null);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [showReceiptPrinter, setShowReceiptPrinter] = useState(false);

  const handlePaymentMethodChange = (method: PaymentMethod) => {
    setFormData(prev => ({
      ...prev,
      paymentMethod: method,
      paymentReference: undefined,
      cashReceived: undefined,
      upiTransactionId: undefined,
    }));
    setErrors({});
  };

  const handleInputChange = (field: keyof PaymentFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (formData.paymentMethod === 'cash') {
      if (!formData.cashReceived || formData.cashReceived <= 0) {
        newErrors.cashReceived = 'Please enter the cash amount received';
      } else if (formData.cashReceived < total) {
        newErrors.cashReceived = 'Cash received cannot be less than the total amount';
      }
    } else if (formData.paymentMethod === 'upi') {
      // UPI transaction ID is optional - can be added later if needed
      // No validation required
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsProcessing(true);

    try {
      // Prepare transaction data
      const transactionData = {
        items: items.map(item => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          unitPrice: item.variant?.price || item.product.basePrice,
        })),
        paymentMethod: formData.paymentMethod,
        paymentReference: formData.paymentMethod === 'upi' 
          ? (formData.upiTransactionId || `UPI-${Date.now()}`)
          : `CASH-${Date.now()}`,
        tax: 0, // No tax for temple store
        discount: 0, // No discount for now
      };

      // Call API to create transaction
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transactionData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process payment');
      }

      const transaction = await response.json();
      
      // Store completed transaction
      setCompletedTransaction(transaction.data);
      
      // Generate receipt data
      const receiptResponse = await fetch(`/api/transactions/${transaction.data.id}/receipt`);
      if (receiptResponse.ok) {
        const receiptResult = await receiptResponse.json();
        setReceiptData(receiptResult.data);
        setShowReceiptPrinter(true);
      } else {
        // If receipt generation fails, still complete the transaction
        clearCart();
        onPaymentComplete(transaction.data);
      }
      
    } catch (error) {
      console.error('Payment processing error:', error);
      setErrors({
        submit: error instanceof Error ? error.message : 'Failed to process payment',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toFixed(2)}`;
  };

  const calculateChange = () => {
    if (formData.paymentMethod === 'cash' && formData.cashReceived) {
      return Math.max(0, formData.cashReceived - total);
    }
    return 0;
  };

  const handlePrintComplete = (result: PrintResult) => {
    if (result.success && completedTransaction) {
      // Clear cart and notify parent
      clearCart();
      onPaymentComplete(completedTransaction);
      setShowReceiptPrinter(false);
    }
  };

  const handleSkipPrint = () => {
    if (completedTransaction) {
      // Clear cart and notify parent without printing
      clearCart();
      onPaymentComplete(completedTransaction);
      setShowReceiptPrinter(false);
    }
  };

  // If showing receipt printer, render that instead
  if (showReceiptPrinter && receiptData) {
    return (
      <div className={`space-y-4 ${className}`}>
        <ReceiptPrinter
          receiptData={receiptData}
          onPrintComplete={handlePrintComplete}
          onClose={handleSkipPrint}
        />
        <div className="flex justify-center">
          <button
            onClick={handleSkipPrint}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 underline"
          >
            Skip printing and continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Payment</h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Order Summary */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-gray-900 mb-3">Order Summary</h3>
          <div className="space-y-2">
            {items.map((item) => (
              <div key={`${item.productId}-${item.variantId || 'base'}`} className="flex justify-between text-sm">
                <span className="text-gray-600">
                  {item.product.name}
                  {item.variant && ` - ${item.variant.name}`}
                  {item.quantity > 1 && ` × ${item.quantity}`}
                </span>
                <span className="font-medium">
                  {formatCurrency((item.variant?.price || item.product.basePrice) * item.quantity)}
                </span>
              </div>
            ))}
            <div className="border-t border-gray-300 pt-2 mt-3">
              <div className="flex justify-between text-lg font-semibold">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Payment Method Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Payment Method
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                formData.paymentMethod === 'cash'
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="cash"
                  checked={formData.paymentMethod === 'cash'}
                  onChange={() => handlePaymentMethodChange('cash')}
                  className="sr-only"
                />
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <span className="font-medium">Cash</span>
                </div>
              </label>

              <label className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                formData.paymentMethod === 'upi'
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="upi"
                  checked={formData.paymentMethod === 'upi'}
                  onChange={() => handlePaymentMethodChange('upi')}
                  className="sr-only"
                />
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <span className="font-medium">UPI</span>
                    <p className="text-xs text-gray-600 mt-1">Digital payment</p>
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Cash Payment Fields */}
          {formData.paymentMethod === 'cash' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cash Received
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.cashReceived || ''}
                    onChange={(e) => handleInputChange('cashReceived', parseFloat(e.target.value) || 0)}
                    className={`w-full pl-8 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                      errors.cashReceived ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="0.00"
                  />
                </div>
                {errors.cashReceived && (
                  <p className="mt-1 text-sm text-red-600">{errors.cashReceived}</p>
                )}
              </div>

              {formData.cashReceived && formData.cashReceived >= total && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-green-800">Change to Return</span>
                    <span className="text-lg font-semibold text-green-800">
                      {formatCurrency(calculateChange())}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* UPI Payment Fields */}
          {formData.paymentMethod === 'upi' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                UPI Transaction ID <span className="text-gray-500 text-sm">(Optional)</span>
              </label>
              <input
                type="text"
                value={formData.upiTransactionId || ''}
                onChange={(e) => handleInputChange('upiTransactionId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Enter UPI transaction ID (optional)"
              />
              <p className="mt-1 text-xs text-gray-600">
                You can add the transaction ID now or leave it blank to add later
              </p>
            </div>
          )}

          {/* Submit Error */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessing}
              className="flex-1 px-4 py-3 bg-orange-600 text-white rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isProcessing ? 'Processing...' : `Complete Payment ${formatCurrency(total)}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
'use client';

import { useState } from 'react';
import { ProductSelection } from '@/components/sales/ProductSelection';
import { CartManager } from '@/components/sales/CartManager';
import { PaymentProcessor } from '@/components/sales/PaymentProcessor';
import { TransactionHistory } from '@/components/sales/TransactionHistory';
import type { Transaction } from '@/types';

type SalesStep = 'selection' | 'payment' | 'receipt';

export default function SalesPage() {
  const [currentStep, setCurrentStep] = useState<SalesStep>('selection');
  const [completedTransaction, setCompletedTransaction] = useState<Transaction | null>(null);

  const handleCheckout = () => {
    setCurrentStep('payment');
  };

  const handlePaymentComplete = (transaction: Transaction) => {
    setCompletedTransaction(transaction);
    setCurrentStep('receipt');
  };

  const handlePaymentCancel = () => {
    setCurrentStep('selection');
  };

  const handleNewTransaction = () => {
    setCompletedTransaction(null);
    setCurrentStep('selection');
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toFixed(2)}`;
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Sales Transaction</h1>
          <p className="text-gray-600 mt-2">
            Process customer purchases and manage transactions
          </p>
        </div>

        {/* Step Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-8">
            <div className={`flex items-center ${
              currentStep === 'selection' ? 'text-orange-600' : 
              currentStep === 'payment' || currentStep === 'receipt' ? 'text-green-600' : 'text-gray-400'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                currentStep === 'selection' ? 'border-orange-600 bg-orange-50' :
                currentStep === 'payment' || currentStep === 'receipt' ? 'border-green-600 bg-green-50' : 'border-gray-300'
              }`}>
                {currentStep === 'payment' || currentStep === 'receipt' ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className="text-sm font-medium">1</span>
                )}
              </div>
              <span className="ml-2 text-sm font-medium">Product Selection</span>
            </div>

            <div className={`w-16 h-0.5 ${
              currentStep === 'payment' || currentStep === 'receipt' ? 'bg-green-600' : 'bg-gray-300'
            }`} />

            <div className={`flex items-center ${
              currentStep === 'payment' ? 'text-orange-600' :
              currentStep === 'receipt' ? 'text-green-600' : 'text-gray-400'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                currentStep === 'payment' ? 'border-orange-600 bg-orange-50' :
                currentStep === 'receipt' ? 'border-green-600 bg-green-50' : 'border-gray-300'
              }`}>
                {currentStep === 'receipt' ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className="text-sm font-medium">2</span>
                )}
              </div>
              <span className="ml-2 text-sm font-medium">Payment</span>
            </div>

            <div className={`w-16 h-0.5 ${
              currentStep === 'receipt' ? 'bg-green-600' : 'bg-gray-300'
            }`} />

            <div className={`flex items-center ${
              currentStep === 'receipt' ? 'text-green-600' : 'text-gray-400'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                currentStep === 'receipt' ? 'border-green-600 bg-green-50' : 'border-gray-300'
              }`}>
                {currentStep === 'receipt' ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className="text-sm font-medium">3</span>
                )}
              </div>
              <span className="ml-2 text-sm font-medium">Receipt</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        {currentStep === 'selection' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <ProductSelection />
              </div>
              <div className="lg:col-span-1">
                <CartManager onCheckout={handleCheckout} />
              </div>
            </div>
            
            {/* Transaction History for Cashiers */}
            <div className="border-t border-gray-200 pt-8">
              <TransactionHistory limit={5} />
            </div>
          </div>
        )}

        {currentStep === 'payment' && (
          <div className="max-w-2xl mx-auto">
            <PaymentProcessor
              onPaymentComplete={handlePaymentComplete}
              onCancel={handlePaymentCancel}
            />
          </div>
        )}

        {currentStep === 'receipt' && completedTransaction && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6">
                {/* Success Header */}
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Payment Successful!</h2>
                  <p className="text-gray-600 mt-2">Transaction completed successfully</p>
                </div>

                {/* Transaction Details */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Transaction Details</h3>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Transaction ID:</span>
                      <p className="font-mono text-gray-900">{completedTransaction.id}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Date & Time:</span>
                      <p className="text-gray-900">{formatDate(completedTransaction.createdAt)}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Payment Method:</span>
                      <p className="text-gray-900 capitalize">{completedTransaction.paymentMethod}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Status:</span>
                      <p className="text-green-600 font-medium capitalize">{completedTransaction.status}</p>
                    </div>
                  </div>

                  {completedTransaction.paymentReference && (
                    <div className="mt-4">
                      <span className="text-gray-600 text-sm">Payment Reference:</span>
                      <p className="font-mono text-gray-900">{completedTransaction.paymentReference}</p>
                    </div>
                  )}
                </div>

                {/* Items List */}
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Items Purchased</h3>
                  <div className="space-y-3">
                    {completedTransaction.items?.map((item, index) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                        <div>
                          <p className="font-medium text-gray-900">
                            Product ID: {item.productId}
                            {item.variantId && ` - Variant: ${item.variantId}`}
                          </p>
                          <p className="text-sm text-gray-600">
                            Qty: {item.quantity} × {formatCurrency(item.unitPrice)}
                          </p>
                        </div>
                        <p className="font-semibold text-gray-900">
                          {formatCurrency(item.totalPrice)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total Summary */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium">{formatCurrency(completedTransaction.subtotal)}</span>
                    </div>
                    {completedTransaction.tax > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Tax:</span>
                        <span className="font-medium">{formatCurrency(completedTransaction.tax)}</span>
                      </div>
                    )}
                    {completedTransaction.discount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Discount:</span>
                        <span className="font-medium text-green-600">-{formatCurrency(completedTransaction.discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-300">
                      <span>Total:</span>
                      <span>{formatCurrency(completedTransaction.total)}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3">
                  <button
                    onClick={() => window.print()}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 font-medium"
                  >
                    Print Receipt
                  </button>
                  <button
                    onClick={handleNewTransaction}
                    className="flex-1 px-4 py-3 bg-orange-600 text-white rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 font-medium"
                  >
                    New Transaction
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
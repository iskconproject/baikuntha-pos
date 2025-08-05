'use client';

import { useState, useEffect } from 'react';
import { ProductSelection } from '@/components/sales/ProductSelection';
import { CartManager } from '@/components/sales/CartManager';
import { PaymentProcessor } from '@/components/sales/PaymentProcessor';
import { TransactionHistory } from '@/components/sales/TransactionHistory';
import { ReceiptPrinter } from '@/components/sales/ReceiptPrinter';
import { NotificationProvider } from '@/components/providers/NotificationProvider';
import type { Transaction, Product, ProductVariant } from '@/types';

type SalesStep = 'selection' | 'payment' | 'receipt';

interface EnhancedTransactionItem {
  id: string;
  productId: string;
  variantId?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  productName: string;
  variantName?: string;
}

interface EnhancedTransaction extends Omit<Transaction, 'items'> {
  items: EnhancedTransactionItem[];
}

export default function SalesPage() {
  const [currentStep, setCurrentStep] = useState<SalesStep>('selection');
  const [completedTransaction, setCompletedTransaction] = useState<Transaction | null>(null);
  const [enhancedTransaction, setEnhancedTransaction] = useState<EnhancedTransaction | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showReceiptPrinter, setShowReceiptPrinter] = useState(false);

  const handleCheckout = () => {
    setCurrentStep('payment');
  };

  const handlePaymentComplete = async (transaction: Transaction) => {
    setCompletedTransaction(transaction);
    
    // Enhance transaction with product details
    const enhanced = await enhanceTransactionWithProductDetails(transaction);
    setEnhancedTransaction(enhanced);
    
    setCurrentStep('receipt');
  };

  const enhanceTransactionWithProductDetails = async (transaction: Transaction): Promise<EnhancedTransaction> => {
    try {
      const enhancedItems: EnhancedTransactionItem[] = await Promise.all(
        transaction.items.map(async (item) => {
          try {
            // Fetch product details
            const productResponse = await fetch(`/api/products/${item.productId}`);
            const productData = await productResponse.json();
            
            let productName = `Product ${item.productId}`;
            let variantName: string | undefined;
            
            if (productResponse.ok && productData.success) {
              const product: Product = productData.data;
              productName = product.name;
              
              // If there's a variant, get its name
              if (item.variantId && product.variants) {
                const variant = product.variants.find((v: ProductVariant) => v.id === item.variantId);
                if (variant) {
                  variantName = variant.name;
                }
              }
            }
            
            return {
              ...item,
              productName,
              variantName,
            };
          } catch (error) {
            console.error('Error fetching product details:', error);
            return {
              ...item,
              productName: `Product ${item.productId}`,
            };
          }
        })
      );

      return {
        ...transaction,
        items: enhancedItems,
      };
    } catch (error) {
      console.error('Error enhancing transaction:', error);
      // Return original transaction with basic product names
      return {
        ...transaction,
        items: transaction.items.map(item => ({
          ...item,
          productName: `Product ${item.productId}`,
        })),
      };
    }
  };

  const handlePaymentCancel = () => {
    setCurrentStep('selection');
  };

  const handleNewTransaction = () => {
    setCompletedTransaction(null);
    setEnhancedTransaction(null);
    setShowReceiptPrinter(false);
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
      <NotificationProvider />
      {/* Mobile-First Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Point of Sale</h1>
              <p className="text-sm text-gray-600 hidden sm:block">
                {currentStep === 'selection' && 'Add products to cart'}
                {currentStep === 'payment' && 'Process payment'}
                {currentStep === 'receipt' && 'Transaction complete'}
              </p>
            </div>
            
            {/* Quick Actions */}
            <div className="flex items-center space-x-2">
              {currentStep === 'selection' && (
                <>
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Transaction History"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                  <button
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Scan Barcode"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Step Indicator - Simplified for Mobile */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-center space-x-4 sm:space-x-8">
            <div className={`flex items-center ${
              currentStep === 'selection' ? 'text-orange-600' : 
              currentStep === 'payment' || currentStep === 'receipt' ? 'text-green-600' : 'text-gray-400'
            }`}>
              <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border-2 ${
                currentStep === 'selection' ? 'border-orange-600 bg-orange-50' :
                currentStep === 'payment' || currentStep === 'receipt' ? 'border-green-600 bg-green-50' : 'border-gray-300'
              }`}>
                {currentStep === 'payment' || currentStep === 'receipt' ? (
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className="text-xs sm:text-sm font-medium">1</span>
                )}
              </div>
              <span className="ml-2 text-xs sm:text-sm font-medium hidden sm:inline">Product Selection</span>
              <span className="ml-2 text-xs font-medium sm:hidden">Products</span>
            </div>

            <div className={`w-8 sm:w-16 h-0.5 ${
              currentStep === 'payment' || currentStep === 'receipt' ? 'bg-green-600' : 'bg-gray-300'
            }`} />

            <div className={`flex items-center ${
              currentStep === 'payment' ? 'text-orange-600' :
              currentStep === 'receipt' ? 'text-green-600' : 'text-gray-400'
            }`}>
              <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border-2 ${
                currentStep === 'payment' ? 'border-orange-600 bg-orange-50' :
                currentStep === 'receipt' ? 'border-green-600 bg-green-50' : 'border-gray-300'
              }`}>
                {currentStep === 'receipt' ? (
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className="text-xs sm:text-sm font-medium">2</span>
                )}
              </div>
              <span className="ml-2 text-xs sm:text-sm font-medium">Payment</span>
            </div>

            <div className={`w-8 sm:w-16 h-0.5 ${
              currentStep === 'receipt' ? 'bg-green-600' : 'bg-gray-300'
            }`} />

            <div className={`flex items-center ${
              currentStep === 'receipt' ? 'text-green-600' : 'text-gray-400'
            }`}>
              <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border-2 ${
                currentStep === 'receipt' ? 'border-green-600 bg-green-50' : 'border-gray-300'
              }`}>
                {currentStep === 'receipt' ? (
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className="text-xs sm:text-sm font-medium">3</span>
                )}
              </div>
              <span className="ml-2 text-xs sm:text-sm font-medium">Receipt</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {currentStep === 'selection' && (
          <div className="space-y-4">
            {/* Mobile-First Layout */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Product Selection - Takes full width on mobile, 2/3 on desktop */}
              <div className="xl:col-span-2 order-2 xl:order-1">
                <ProductSelection />
              </div>
              
              {/* Cart - Prominent position */}
              <div className="xl:col-span-1 order-1 xl:order-2">
                <CartManager onCheckout={handleCheckout} />
              </div>
            </div>
            
            {/* Transaction History Modal/Sidebar */}
            {showHistory && (
              <div className="fixed inset-0 bg-black bg-opacity-50 z-50 lg:relative lg:bg-transparent lg:z-auto">
                <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl lg:relative lg:max-w-none lg:shadow-none lg:bg-gray-50 lg:rounded-lg lg:border lg:border-gray-200">
                  <div className="flex items-center justify-between p-4 border-b border-gray-200 lg:border-none">
                    <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
                    <button
                      onClick={() => setShowHistory(false)}
                      className="p-2 text-gray-400 hover:text-gray-600 lg:hidden"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="p-4">
                    <TransactionHistory limit={10} />
                  </div>
                </div>
              </div>
            )}
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

        {currentStep === 'receipt' && enhancedTransaction && (
          <div className="max-w-2xl mx-auto">
            {showReceiptPrinter ? (
              <ReceiptPrinter
                receiptData={{
                  storeName: "ISKCON Asansol Temple",
                  storeAddress: "Gift & Book Store",
                  receiptNumber: enhancedTransaction.id,
                  timestamp: enhancedTransaction.createdAt,
                  items: enhancedTransaction.items.map(item => ({
                    name: item.variantName ? `${item.productName} (${item.variantName})` : item.productName,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    totalPrice: item.totalPrice,
                  })),
                  subtotal: enhancedTransaction.subtotal,
                  tax: enhancedTransaction.tax,
                  discount: enhancedTransaction.discount,
                  total: enhancedTransaction.total,
                  paymentMethod: enhancedTransaction.paymentMethod,
                  paymentReference: enhancedTransaction.paymentReference,
                }}
                onPrintComplete={(result) => {
                  if (result.success) {
                    console.log('Receipt printed successfully');
                  } else {
                    console.error('Print failed:', result.error);
                  }
                  setShowReceiptPrinter(false);
                }}
                onClose={() => setShowReceiptPrinter(false)}
              />
            ) : (
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
                        <p className="font-mono text-gray-900">{enhancedTransaction.id}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Date & Time:</span>
                        <p className="text-gray-900">{formatDate(enhancedTransaction.createdAt)}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Payment Method:</span>
                        <p className="text-gray-900 capitalize">{enhancedTransaction.paymentMethod}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Status:</span>
                        <p className="text-green-600 font-medium capitalize">{enhancedTransaction.status}</p>
                      </div>
                    </div>

                    {enhancedTransaction.paymentReference && (
                      <div className="mt-4">
                        <span className="text-gray-600 text-sm">Payment Reference:</span>
                        <p className="font-mono text-gray-900">{enhancedTransaction.paymentReference}</p>
                      </div>
                    )}
                  </div>

                  {/* Items List */}
                  <div className="mb-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Items Purchased</h3>
                    <div className="space-y-3">
                      {enhancedTransaction.items?.map((item, index) => (
                        <div key={index} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                          <div>
                            <p className="font-medium text-gray-900">
                              {item.productName}
                              {item.variantName && (
                                <span className="text-gray-600"> ({item.variantName})</span>
                              )}
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
                        <span className="font-medium">{formatCurrency(enhancedTransaction.subtotal)}</span>
                      </div>
                      {enhancedTransaction.tax > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Tax:</span>
                          <span className="font-medium">{formatCurrency(enhancedTransaction.tax)}</span>
                        </div>
                      )}
                      {enhancedTransaction.discount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Discount:</span>
                          <span className="font-medium text-green-600">-{formatCurrency(enhancedTransaction.discount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-300">
                        <span>Total:</span>
                        <span>{formatCurrency(enhancedTransaction.total)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setShowReceiptPrinter(true)}
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
            )}
          </div>
        )}
      </div>
    </div>
  );
}
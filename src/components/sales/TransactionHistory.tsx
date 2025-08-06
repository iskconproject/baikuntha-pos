"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";

interface TransactionHistoryProps {
  className?: string;
  limit?: number;
  showFilters?: boolean;
}

interface TransactionWithDetails {
  id: string;
  userId: string;
  items: Array<{
    id: string;
    productId: string;
    variantId?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    productName?: string;
    variantName?: string;
  }>;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: "cash" | "upi";
  paymentReference?: string;
  status: "completed" | "pending" | "cancelled";
  createdAt: Date;
  syncStatus: "synced" | "pending" | "failed";
  userName: string;
  itemCount: number;
}

export function TransactionHistory({
  className = "",
  limit = 10,
  showFilters = true,
}: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedTransaction, setExpandedTransaction] = useState<string | null>(
    null
  );

  // Filters
  const [dateFilter, setDateFilter] = useState("today");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchTransactions();
  }, [dateFilter, paymentMethodFilter, currentPage, limit]);

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
      });

      if (dateFilter !== "all") {
        params.append("dateFilter", dateFilter);
      }
      if (paymentMethodFilter !== "all") {
        params.append("paymentMethod", paymentMethodFilter);
      }

      const response = await fetch(`/api/transactions/history?${params}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch transactions");
      }

      setTransactions(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [dateFilter, paymentMethodFilter, currentPage, limit]);

  const formatCurrency = (amount: number) => {
    return `₹${amount.toFixed(2)}`;
  };

  const formatDateTime = (date: Date | string) => {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return {
      date: format(dateObj, "MMM dd, yyyy"),
      time: format(dateObj, "HH:mm:ss"),
    };
  };

  const toggleTransactionDetails = (transactionId: string) => {
    setExpandedTransaction(
      expandedTransaction === transactionId ? null : transactionId
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getSyncStatusIcon = (syncStatus: string) => {
    switch (syncStatus) {
      case "synced":
        return (
          <svg
            className="w-4 h-4 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        );
      case "pending":
        return (
          <svg
            className="w-4 h-4 text-yellow-600 animate-spin"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        );
      case "failed":
        return (
          <svg
            className="w-4 h-4 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-orange-500 border-t-transparent"></div>
        <span className="ml-2 text-gray-600">Loading transactions...</span>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date Range
              </label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="all">All Time</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Method
              </label>
              <select
                value={paymentMethodFilter}
                onChange={(e) => setPaymentMethodFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="all">All Methods</option>
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setDateFilter("today");
                  setPaymentMethodFilter("all");
                  setCurrentPage(1);
                }}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Recent Transactions
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {transactions.length} transaction
            {transactions.length !== 1 ? "s" : ""} found
          </p>
        </div>

        {error && (
          <div className="p-4 bg-yellow-50 border-b border-yellow-200">
            <div className="flex">
              <svg
                className="w-5 h-5 text-yellow-400 mr-2"
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
              <p className="text-sm text-yellow-700">
                Unable to load live data. Showing sample transactions.
              </p>
            </div>
          </div>
        )}

        {transactions.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {transactions.map((transaction) => (
              <div key={transaction.id}>
                <div className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          {getSyncStatusIcon(transaction.syncStatus)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              Transaction #{transaction.id.slice(-8)}
                            </p>
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                                transaction.status
                              )}`}
                            >
                              {transaction.status}
                            </span>
                          </div>
                          <div className="flex items-center space-x-4 mt-1">
                            <p className="text-sm text-gray-500">
                              {formatDateTime(transaction.createdAt).date} at{" "}
                              {formatDateTime(transaction.createdAt).time}
                            </p>
                            <p className="text-sm text-gray-500">
                              {transaction.itemCount} item
                              {transaction.itemCount !== 1 ? "s" : ""}
                            </p>
                            <p className="text-sm text-gray-500 capitalize">
                              {transaction.paymentMethod}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-lg font-semibold text-gray-900">
                          {formatCurrency(transaction.total)}
                        </p>
                        {transaction.paymentReference && (
                          <p className="text-xs text-gray-500 font-mono">
                            {transaction.paymentReference}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => toggleTransactionDetails(transaction.id)}
                        className="p-2 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 rounded-md"
                      >
                        <svg
                          className={`w-5 h-5 transform transition-transform ${
                            expandedTransaction === transaction.id
                              ? "rotate-180"
                              : ""
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedTransaction === transaction.id && (
                  <div className="px-4 pb-4 bg-gray-50">
                    <div className="space-y-4">
                      {/* Transaction Summary */}
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Subtotal:</span>
                          <p className="font-medium">
                            {formatCurrency(transaction.subtotal)}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600">Tax:</span>
                          <p className="font-medium">
                            {formatCurrency(transaction.tax)}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600">Discount:</span>
                          <p className="font-medium text-green-600">
                            {transaction.discount > 0 ? "-" : ""}
                            {formatCurrency(transaction.discount)}
                          </p>
                        </div>
                      </div>

                      {/* Items List */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-2">
                          Items:
                        </h4>
                        <div className="space-y-2">
                          {transaction.items.map((item, index) => (
                            <div
                              key={item.id || index}
                              className="flex justify-between items-center text-sm bg-white rounded p-2"
                            >
                              <div>
                                <span className="font-medium">
                                  {item.productName || `Product ${item.productId}`}
                                  {item.variantName && (
                                    <span className="text-gray-600">
                                      {" "}({item.variantName})
                                    </span>
                                  )}
                                </span>
                                <p className="text-gray-600">
                                  Qty: {item.quantity} ×{" "}
                                  {formatCurrency(item.unitPrice)}
                                </p>
                              </div>
                              <span className="font-semibold">
                                {formatCurrency(item.totalPrice)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex space-x-2 pt-2 border-t border-gray-200">
                        <button
                          onClick={() =>
                            window.open(
                              `/api/transactions/${transaction.id}/receipt`,
                              "_blank"
                            )
                          }
                          className="px-3 py-1 text-sm bg-orange-600 text-white rounded hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                        >
                          View Receipt
                        </button>
                        <button
                          onClick={() => {
                            // Implement reprint functionality
                            console.log(
                              "Reprint receipt for transaction:",
                              transaction.id
                            );
                          }}
                          className="px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                        >
                          Reprint
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Transactions Found
            </h3>
            <p className="text-gray-600">
              No transactions match your current filters. Try adjusting the date
              range or payment method.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

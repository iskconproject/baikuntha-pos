'use client';

import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/Button';
import { ReportExportService } from '@/services/reports/exportService';

interface DailySalesData {
  date: Date;
  totalSales: number;
  totalTransactions: number;
  totalTax: number;
  totalDiscount: number;
  paymentMethodBreakdown: {
    cash: { count: number; amount: number };
    upi: { count: number; amount: number };
  };
  topProducts: Array<{
    productId: string;
    productName: string;
    categoryName?: string;
    totalQuantity: number;
    totalRevenue: number;
    transactionCount: number;
  }>;
}

interface DailySalesReportProps {
  selectedDate: string;
}

export function DailySalesReport({ selectedDate }: DailySalesReportProps) {
  const [data, setData] = useState<DailySalesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDailySalesData();
  }, [selectedDate]);

  const fetchDailySalesData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/reports/daily?date=${selectedDate}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch daily sales data');
      }

      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const handleExport = async (format: 'csv' | 'pdf') => {
    try {
      const response = await fetch('/api/reports/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportType: 'daily-sales',
          format,
          filters: { startDate: selectedDate },
        }),
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      if (format === 'csv') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `daily_sales_${selectedDate}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const htmlContent = await response.text();
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(htmlContent);
          printWindow.document.close();
          printWindow.focus();
          setTimeout(() => {
            printWindow.print();
            printWindow.close();
          }, 250);
        }
      }
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to export report');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        <span className="ml-2 text-gray-600">Loading daily sales report...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">Error: {error}</div>
        <Button onClick={fetchDailySalesData} variant="outline">
          Retry
        </Button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-gray-500">
        No data available for the selected date
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Export Options */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">
          Daily Sales Report - {format(parseISO(selectedDate), 'MMMM dd, yyyy')}
        </h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('csv')}
          >
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('pdf')}
          >
            Export PDF
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
          <div className="text-sm font-medium opacity-90">Total Sales</div>
          <div className="text-2xl font-bold">{formatCurrency(data.totalSales)}</div>
        </div>
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
          <div className="text-sm font-medium opacity-90">Transactions</div>
          <div className="text-2xl font-bold">{data.totalTransactions}</div>
        </div>
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
          <div className="text-sm font-medium opacity-90">Tax Collected</div>
          <div className="text-2xl font-bold">{formatCurrency(data.totalTax)}</div>
        </div>
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-6 text-white">
          <div className="text-sm font-medium opacity-90">Discounts Given</div>
          <div className="text-2xl font-bold">{formatCurrency(data.totalDiscount)}</div>
        </div>
      </div>

      {/* Payment Method Breakdown with Visual Chart */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Methods</h3>
        
        {/* Visual pie chart representation */}
        <div className="mb-6">
          <div className="flex items-center justify-center mb-4">
            <div className="relative w-32 h-32">
              {(() => {
                const total = data.paymentMethodBreakdown.cash.amount + data.paymentMethodBreakdown.upi.amount;
                const cashPercentage = total > 0 ? (data.paymentMethodBreakdown.cash.amount / total) * 100 : 0;
                const upiPercentage = total > 0 ? (data.paymentMethodBreakdown.upi.amount / total) * 100 : 0;
                
                return (
                  <div className="w-32 h-32 rounded-full relative overflow-hidden" 
                       style={{
                         background: `conic-gradient(
                           #10b981 0deg ${cashPercentage * 3.6}deg,
                           #3b82f6 ${cashPercentage * 3.6}deg 360deg
                         )`
                       }}>
                    <div className="absolute inset-4 bg-white rounded-full flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-xs text-gray-500">Total</div>
                        <div className="text-sm font-bold">{formatCurrency(total)}</div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
          
          {/* Legend */}
          <div className="flex justify-center gap-6">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
              <span className="text-sm text-gray-600">Cash</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
              <span className="text-sm text-gray-600">UPI</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
                <span className="text-sm font-medium text-gray-600">Cash</span>
              </div>
              <span className="text-sm text-gray-500">
                {data.paymentMethodBreakdown.cash.count} transactions
              </span>
            </div>
            <div className="text-xl font-bold text-gray-900">
              {formatCurrency(data.paymentMethodBreakdown.cash.amount)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {(() => {
                const total = data.paymentMethodBreakdown.cash.amount + data.paymentMethodBreakdown.upi.amount;
                const percentage = total > 0 ? (data.paymentMethodBreakdown.cash.amount / total) * 100 : 0;
                return `${percentage.toFixed(1)}% of total`;
              })()}
            </div>
          </div>
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
                <span className="text-sm font-medium text-gray-600">UPI</span>
              </div>
              <span className="text-sm text-gray-500">
                {data.paymentMethodBreakdown.upi.count} transactions
              </span>
            </div>
            <div className="text-xl font-bold text-gray-900">
              {formatCurrency(data.paymentMethodBreakdown.upi.amount)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {(() => {
                const total = data.paymentMethodBreakdown.cash.amount + data.paymentMethodBreakdown.upi.amount;
                const percentage = total > 0 ? (data.paymentMethodBreakdown.upi.amount / total) * 100 : 0;
                return `${percentage.toFixed(1)}% of total`;
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Top Products */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Selling Products</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.topProducts.map((product) => (
                <tr key={product.productId}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {product.productName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {product.categoryName || 'Uncategorized'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {product.totalQuantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatCurrency(product.totalRevenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { DailySalesReport } from '@/components/reports/DailySalesReport';
import { TransactionHistory } from '@/components/reports/TransactionHistory';
import { ProductPerformance } from '@/components/reports/ProductPerformance';

type ReportTab = 'daily' | 'transactions' | 'products' | 'analytics';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>('daily');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const tabs = [
    { id: 'daily' as ReportTab, label: 'Daily Sales', icon: '📊' },
    { id: 'transactions' as ReportTab, label: 'Transaction History', icon: '📋' },
    { id: 'products' as ReportTab, label: 'Product Performance', icon: '📦' },
    { id: 'analytics' as ReportTab, label: 'Analytics', icon: '📈' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="mt-2 text-gray-600">
            View sales reports, transaction history, and product performance analytics
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-sm">
          {activeTab === 'daily' && (
            <div className="p-6">
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Date
                </label>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="max-w-xs"
                />
              </div>
              <DailySalesReport selectedDate={selectedDate} />
            </div>
          )}

          {activeTab === 'transactions' && (
            <div className="p-6">
              <TransactionHistory />
            </div>
          )}

          {activeTab === 'products' && (
            <div className="p-6">
              <div className="mb-6">
                <div className="flex gap-4">
                  <Button
                    variant={activeTab === 'products' ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setActiveTab('products')}
                  >
                    Performance Analytics
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // We'll handle this by passing a prop to ProductPerformance
                    }}
                  >
                    Top Selling Products
                  </Button>
                </div>
              </div>
              <ProductPerformance reportType="performance" />
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="p-6">
              <SalesAnalytics />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Sales Analytics Component
function SalesAnalytics() {
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    startDate: format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  });

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (dateRange.startDate) params.append('startDate', dateRange.startDate);
      if (dateRange.endDate) params.append('endDate', dateRange.endDate);

      const response = await fetch(`/api/reports/analytics?${params}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch analytics data');
      }

      setAnalyticsData(result.data);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        <span className="ml-2 text-gray-600">Loading analytics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">Error: {error}</div>
        <Button onClick={fetchAnalytics} variant="outline">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Sales Analytics</h2>
        <div className="flex gap-4">
          <Input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
          />
          <Input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
          />
          <Button onClick={fetchAnalytics}>Update</Button>
        </div>
      </div>

      {analyticsData && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
              <div className="text-sm font-medium opacity-90">Total Revenue</div>
              <div className="text-2xl font-bold">{formatCurrency(analyticsData.totalRevenue)}</div>
            </div>
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
              <div className="text-sm font-medium opacity-90">Total Transactions</div>
              <div className="text-2xl font-bold">{analyticsData.totalTransactions}</div>
            </div>
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
              <div className="text-sm font-medium opacity-90">Avg Order Value</div>
              <div className="text-2xl font-bold">{formatCurrency(analyticsData.averageOrderValue)}</div>
            </div>
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-6 text-white">
              <div className="text-sm font-medium opacity-90">Top Payment Method</div>
              <div className="text-2xl font-bold capitalize">{analyticsData.topPaymentMethod}</div>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Category</h3>
            <div className="space-y-3">
              {analyticsData.categoryBreakdown.map((category: any) => (
                <div key={category.categoryId} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-orange-500 rounded mr-3"></div>
                    <span className="text-sm font-medium text-gray-900">
                      {category.categoryName}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500">
                      {category.percentage.toFixed(1)}%
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(category.revenue)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sales Trend */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Trend</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sales
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transactions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {analyticsData.salesTrend.map((day: any) => (
                    <tr key={day.date}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {format(new Date(day.date), 'MMM dd, yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatCurrency(day.sales)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {day.transactions}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { EnhancedDashboardLayout } from './EnhancedDashboardLayout';
import { SmartGrid } from './SmartGrid';
import { MetricsOverview } from './MetricsOverview';
import { QuickActionsPanel } from './QuickActionsPanel';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { 
  ShoppingCart, 
  Receipt, 
  TrendingUp, 
  Printer,
  HelpCircle,
  Clock,
  DollarSign,
  Package
} from 'lucide-react';

export function EnhancedCashierDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMetrics = async () => {
      if (authLoading || !user?.id) return;
      
      try {
        setLoading(true);
        const response = await fetch('/api/dashboard/cashier');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        setMetrics(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    loadMetrics();
  }, [user?.id, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
        <span className="ml-2 text-gray-600">Loading dashboard...</span>
      </div>
    );
  }

  if (!user) return null;

  const metricsData = [
    {
      id: 'today-sales',
      title: "Today's Sales",
      value: metrics?.todaySales?.total ? `₹${metrics.todaySales.total.toLocaleString()}` : '₹0',
      change: metrics?.todaySales?.trend ? {
        value: metrics.todaySales.trend.value,
        direction: metrics.todaySales.trend.direction,
        period: 'vs yesterday'
      } : undefined,
      icon: DollarSign,
      color: 'green' as const,
      size: 'lg' as const,
    },
    {
      id: 'transactions',
      title: 'My Transactions',
      value: metrics?.myTransactions?.length || 0,
      icon: Receipt,
      color: 'blue' as const,
    },
    {
      id: 'avg-sale',
      title: 'Average Sale',
      value: `₹${Math.round(metrics?.todaySales?.averageTransaction || 0)}`,
      icon: TrendingUp,
      color: 'purple' as const,
    },
    {
      id: 'items-sold',
      title: 'Items Sold',
      value: metrics?.todaySales?.itemCount || 0,
      icon: Package,
      color: 'yellow' as const,
    },
  ];

  const quickActions = [
    {
      id: 'new-sale',
      title: 'Start New Sale',
      description: 'Begin a new transaction',
      icon: ShoppingCart,
      href: '/sales',
      color: 'green' as const,
      priority: 'high' as const,
    },
    {
      id: 'recent-transactions',
      title: 'My Transactions',
      description: 'View recent sales',
      icon: Receipt,
      color: 'blue' as const,
      priority: 'medium' as const,
    },
    {
      id: 'printer-status',
      title: 'Printer Setup',
      description: 'Configure receipt printer',
      icon: Printer,
      color: 'gray' as const,
      priority: 'low' as const,
    },
    {
      id: 'help',
      title: 'Help & Shortcuts',
      description: 'View keyboard shortcuts',
      icon: HelpCircle,
      color: 'purple' as const,
      priority: 'low' as const,
    },
  ];

  return (
    <EnhancedDashboardLayout>
      {/* Welcome Section */}
      <Card variant="elevated" className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Welcome back, {user.username}! 👋
              </h1>
              <p className="text-gray-600">
                Ready to process sales and serve customers
              </p>
            </div>
            <div className="hidden md:flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span>{new Date().toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card variant="outlined" className="bg-red-50 border-red-200">
          <CardContent className="p-4">
            <p className="text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      <MetricsOverview metrics={metricsData} />

      {/* Quick Actions */}
      <QuickActionsPanel 
        actions={quickActions}
        title="Quick Actions"
        showPriority={true}
      />

      {/* Recent Activity */}
      <SmartGrid minItemWidth={350} maxColumns={2}>
        {/* Recent Transactions */}
        <Card variant="elevated" className="h-fit">
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">
              My Recent Transactions
            </h3>
          </CardHeader>
          <CardContent>
            {metrics?.myTransactions && metrics.myTransactions.length > 0 ? (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {metrics.myTransactions.slice(0, 5).map((transaction: any) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        ₹{transaction.total?.toLocaleString() || '0'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {transaction.itemCount || 0} items
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600 capitalize">
                        {transaction.paymentMethod || 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {transaction.createdAt
                          ? new Date(transaction.createdAt).toLocaleTimeString()
                          : 'Unknown time'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  No Recent Transactions
                </h4>
                <p className="text-gray-600 mb-4">
                  Your transactions will appear here once you start making sales.
                </p>
                <a
                  href="/sales"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Start First Sale
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Tips */}
        <Card variant="outlined" className="bg-gradient-to-br from-orange-50 to-yellow-50 border-orange-200 h-fit">
          <CardHeader>
            <h3 className="text-lg font-semibold text-orange-900">
              💡 Quick Tips
            </h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-sm text-orange-800">
                  Press <kbd className="px-2 py-1 bg-orange-200 rounded text-xs">Enter</kbd> after searching to quickly add the first result
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-sm text-orange-800">
                  Use <kbd className="px-2 py-1 bg-orange-200 rounded text-xs">Esc</kbd> to clear search or cancel operations
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-sm text-orange-800">
                  Double-click cart items to quickly edit quantities
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-sm text-orange-800">
                  Click category buttons for quick product filtering
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </SmartGrid>
    </EnhancedDashboardLayout>
  );
}
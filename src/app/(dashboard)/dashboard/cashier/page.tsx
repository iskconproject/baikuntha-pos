'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { DashboardWidget } from '@/components/dashboard/DashboardWidget';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { dashboardService } from '@/services/dashboard/dashboardService';
import Link from 'next/link';

// Icons
const SalesIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v5a2 2 0 01-2 2H9a2 2 0 01-2-2v-5m6-5V6a2 2 0 00-2-2H9a2 2 0 00-2 2v2" />
  </svg>
);

const SearchIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const TransactionIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>
);

const StatsIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const PrinterIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
  </svg>
);

const HelpIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export default function CashierDashboard() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<{
    todaySales: any;
    myTransactions: any[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load dashboard metrics
  useEffect(() => {
    const loadMetrics = async () => {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        const data = await dashboardService.getCashierMetrics(user.id);
        setMetrics(data);
        setError(null);
      } catch (err) {
        console.error('Failed to load dashboard metrics:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    loadMetrics();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Welcome back, {user?.username}!
        </h1>
        <p className="text-gray-600">
          Cashier Dashboard - Process sales and manage transactions
        </p>
      </div>

      {error && (
        <div className="bg-error-50 border border-error-200 rounded-lg p-4">
          <p className="text-error-700">{error}</p>
        </div>
      )}

      {/* Key Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <DashboardWidget
            title="Today's Sales"
            icon={SalesIcon}
            iconColor="success"
            value={`₹${metrics.todaySales.total.toLocaleString()}`}
            subValue={`${metrics.todaySales.transactionCount} transactions`}
            trend={{
              ...metrics.todaySales.trend,
              label: 'vs yesterday'
            }}
            size="lg"
            className="md:col-span-2 lg:col-span-1"
          />
          
          <DashboardWidget
            title="My Transactions"
            icon={TransactionIcon}
            iconColor="primary"
            value={metrics.myTransactions.length}
            subValue="today"
          />
          
          <DashboardWidget
            title="Avg. Sale"
            icon={StatsIcon}
            iconColor="info"
            value={`₹${Math.round(metrics.todaySales.averageTransaction)}`}
          />
        </div>
      )}

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Sales - Primary Action */}
        <DashboardWidget
          title="Start Sale"
          description="Begin a new sale transaction. Add products, calculate totals, and process payments."
          icon={SalesIcon}
          iconColor="success"
          size="lg"
          className="md:col-span-2 lg:col-span-1"
          action={{
            label: "New Sale",
            href: "/sales"
          }}
        />

        <DashboardWidget
          title="Product Search"
          description="Search and browse available products"
          icon={SearchIcon}
          iconColor="info"
          action={{
            label: "Coming Soon",
            disabled: true
          }}
        />

        <DashboardWidget
          title="My Transactions"
          description="View your recent transactions and receipts"
          icon={TransactionIcon}
          iconColor="primary"
          action={{
            label: "Coming Soon",
            disabled: true
          }}
        />

        <DashboardWidget
          title="Printer Status"
          description="Monitor receipt printer connection"
          icon={PrinterIcon}
          iconColor="gray"
          status={{
            label: "Not Connected",
            type: "warning"
          }}
          action={{
            label: "Connect Printer",
            disabled: true
          }}
        />

        <DashboardWidget
          title="Help"
          description="Need help? View keyboard shortcuts and guides"
          icon={HelpIcon}
          iconColor="info"
          action={{
            label: "View Help",
            disabled: true
          }}
        />
      </div>

      {/* My Recent Transactions */}
      {metrics && metrics.myTransactions.length > 0 && (
        <Card variant="elevated">
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">My Recent Transactions</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.myTransactions.slice(0, 5).map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">₹{transaction.total.toLocaleString()}</p>
                    <p className="text-sm text-gray-600">
                      {transaction.itemCount} items
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600 capitalize">{transaction.paymentMethod}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(transaction.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Tips */}
      <Card variant="outlined" className="bg-blue-50 border-blue-200">
        <CardContent>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-medium text-blue-900 mb-1">Quick Tips</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Use the search function to quickly find products</li>
                <li>• Press Enter to add products to cart</li>
                <li>• Double-click on cart items to edit quantities</li>
                <li>• Use keyboard shortcuts for faster checkout</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
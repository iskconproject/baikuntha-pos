'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { DashboardWidget } from '@/components/dashboard/DashboardWidget';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
// Types for dashboard metrics
interface DashboardMetrics {
  todaySales: {
    total: number;
    transactionCount: number;
    averageTransaction: number;
    trend: {
      value: number;
      direction: 'up' | 'down' | 'neutral';
    };
  };
  inventory: {
    totalProducts: number;
    lowStockCount: number;
    totalCategories: number;
    outOfStockCount: number;
  };
  users: {
    totalUsers: number;
    activeUsers: number;
    recentLogins: number;
  };
  recentTransactions: Array<{
    id: string;
    total: number;
    itemCount: number;
    paymentMethod: string;
    createdAt: Date;
    userName: string;
  }>;
  topProducts: Array<{
    id: string;
    name: string;
    salesCount: number;
    revenue: number;
  }>;
}
import Link from 'next/link';

// Icons
const UsersIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
  </svg>
);

const SalesIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v5a2 2 0 01-2 2H9a2 2 0 01-2-2v-5m6-5V6a2 2 0 00-2-2H9a2 2 0 00-2 2v2" />
  </svg>
);

const InventoryIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
);

const ReportsIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const SettingsIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const StatusIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export default function AdminDashboard() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load dashboard metrics
  useEffect(() => {
    const loadMetrics = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/dashboard/admin');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Convert date strings back to Date objects
        if (data.recentTransactions) {
          data.recentTransactions = data.recentTransactions.map((transaction: any) => ({
            ...transaction,
            createdAt: new Date(transaction.createdAt)
          }));
        }
        
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
  }, []);

  // Redirect if not admin (this should be handled by middleware in production)
  if (user?.role !== 'admin') {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
        <p className="text-gray-600">You don&apos;t have permission to access this page.</p>
      </div>
    );
  }

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
          Welcome back, {user.username}!
        </h1>
        <p className="text-gray-600">
          Administrator Dashboard - Full system access and management
        </p>
      </div>

      {error && (
        <div className="bg-error-50 border border-error-200 rounded-lg p-4">
          <p className="text-error-700">{error}</p>
        </div>
      )}

      {/* Key Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
          />
          
          <DashboardWidget
            title="Total Products"
            icon={InventoryIcon}
            iconColor="warning"
            value={metrics.inventory.totalProducts}
            subValue={`${metrics.inventory.lowStockCount} low stock`}
            status={
              metrics.inventory.lowStockCount > 0
                ? { label: 'Attention Needed', type: 'warning' }
                : { label: 'All Good', type: 'success' }
            }
          />
          
          <DashboardWidget
            title="Active Users"
            icon={UsersIcon}
            iconColor="primary"
            value={metrics.users.activeUsers}
            subValue={`of ${metrics.users.totalUsers} total`}
          />
          
          <DashboardWidget
            title="Categories"
            icon={InventoryIcon}
            iconColor="info"
            value={metrics.inventory.totalCategories}
          />
        </div>
      )}

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <DashboardWidget
          title="User Management"
          description="Manage user accounts, roles, and permissions"
          icon={UsersIcon}
          iconColor="error"
          action={{
            label: "Manage Users",
            href: "/users"
          }}
        />

        <DashboardWidget
          title="Sales"
          description="Process transactions and manage sales"
          icon={SalesIcon}
          iconColor="success"
          action={{
            label: "Go to Sales",
            href: "/sales"
          }}
        />

        <DashboardWidget
          title="Inventory"
          description="Manage products, categories, and stock"
          icon={InventoryIcon}
          iconColor="warning"
          action={{
            label: "Manage Inventory",
            href: "/inventory"
          }}
        />

        <DashboardWidget
          title="Reports"
          description="View sales reports and analytics"
          icon={ReportsIcon}
          iconColor="primary"
          action={{
            label: "View Reports",
            href: "/reports"
          }}
        />

        <DashboardWidget
          title="Settings"
          description="Configure system settings and preferences"
          icon={SettingsIcon}
          iconColor="gray"
          action={{
            label: "Coming Soon",
            disabled: true
          }}
        />

        <DashboardWidget
          title="System Status"
          description="Monitor system health and sync status"
          icon={StatusIcon}
          iconColor="success"
          status={{
            label: "All Systems Online",
            type: "success"
          }}
        />
      </div>

      {/* Recent Activity */}
      {metrics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Transactions */}
          <Card variant="elevated">
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
            </CardHeader>
            <CardContent>
              {metrics.recentTransactions.length > 0 ? (
                <div className="space-y-3">
                  {metrics.recentTransactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">₹{transaction.total.toLocaleString()}</p>
                        <p className="text-sm text-gray-600">
                          {transaction.itemCount} items • {transaction.userName}
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
              ) : (
                <p className="text-gray-500 text-center py-4">No recent transactions</p>
              )}
            </CardContent>
          </Card>

          {/* Top Products */}
          <Card variant="elevated">
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">Top Products</h3>
            </CardHeader>
            <CardContent>
              {metrics.topProducts.length > 0 ? (
                <div className="space-y-3">
                  {metrics.topProducts.map((product, index) => (
                    <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-primary-600">#{index + 1}</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 truncate">{product.name}</p>
                          <p className="text-sm text-gray-600">{product.salesCount} sales</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">₹{product.revenue.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No sales data available</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
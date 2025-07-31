'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { DashboardWidget } from '@/components/dashboard/DashboardWidget';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { 
  Users, 
  ShoppingCart, 
  Package, 
  BarChart3, 
  Settings, 
  CheckCircle,
  Folder
} from 'lucide-react';

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-fr">
          <DashboardWidget
            title="Today's Sales"
            icon={ShoppingCart}
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
            icon={Package}
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
            icon={Users}
            iconColor="primary"
            value={metrics.users.activeUsers}
            subValue={`of ${metrics.users.totalUsers} total`}
          />
          
          <DashboardWidget
            title="Categories"
            icon={Folder}
            iconColor="info"
            value={metrics.inventory.totalCategories}
          />
        </div>
      )}

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr">
        <DashboardWidget
          title="User Management"
          description="Manage user accounts, roles, and permissions"
          icon={Users}
          iconColor="error"
          action={{
            label: "Manage Users",
            href: "/users"
          }}
        />

        <DashboardWidget
          title="Sales"
          description="Process transactions and manage sales"
          icon={ShoppingCart}
          iconColor="success"
          action={{
            label: "Go to Sales",
            href: "/sales"
          }}
        />

        <DashboardWidget
          title="Inventory"
          description="Manage products, categories, and stock"
          icon={Package}
          iconColor="warning"
          action={{
            label: "Manage Inventory",
            href: "/inventory"
          }}
        />

        <DashboardWidget
          title="Reports"
          description="View sales reports and analytics"
          icon={BarChart3}
          iconColor="primary"
          action={{
            label: "View Reports",
            href: "/reports"
          }}
        />

        <DashboardWidget
          title="Settings"
          description="Configure system settings and preferences"
          icon={Settings}
          iconColor="gray"
          action={{
            label: "Configure",
            href: "/settings"
          }}
        />

        <DashboardWidget
          title="System Status"
          description="Monitor system health and sync status"
          icon={CheckCircle}
          iconColor="success"
          status={{
            label: "All Systems Online",
            type: "success"
          }}
        />
      </div>

      {/* Recent Activity */}
      {metrics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 auto-rows-fr">
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
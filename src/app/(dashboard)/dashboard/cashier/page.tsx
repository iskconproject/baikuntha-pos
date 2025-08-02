"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { DashboardWidget } from "@/components/dashboard/DashboardWidget";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

import {
  ShoppingCart,
  Receipt,
  TrendingUp,
  Printer,
  HelpCircle,
  Info,
} from "lucide-react";

export default function CashierDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const [metrics, setMetrics] = useState<{
    todaySales: any;
    myTransactions: any[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load dashboard metrics
  useEffect(() => {
    const loadMetrics = async () => {
      console.log("Loading metrics for user:", user?.id);
      console.log("Auth loading:", authLoading);

      // Wait for auth to complete
      if (authLoading) {
        console.log("Auth still loading, waiting...");
        return;
      }

      if (!user?.id) {
        console.log("No user ID, skipping metrics load");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        console.log("Calling cashier dashboard API...");

        const response = await fetch('/api/dashboard/cashier');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("Metrics loaded successfully:", data);
        setMetrics(data);
      } catch (err) {
        console.error("Failed to load dashboard metrics:", err);
        console.error(
          "Error stack:",
          err instanceof Error ? err.stack : "No stack trace"
        );
        setError(
          `Failed to load dashboard data: ${
            err instanceof Error ? err.message : "Unknown error"
          }`
        );
      } finally {
        setLoading(false);
      }
    };

    // Only run if we have a user and auth is not loading
    if (!authLoading && user?.id) {
      loadMetrics();
    } else if (!authLoading && !user?.id) {
      setLoading(false);
    }
  }, [user?.id, authLoading]);

  // Show loading while auth is loading or metrics are loading
  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
        <span className="ml-2 text-gray-600">
          {authLoading ? "Authenticating..." : "Loading dashboard..."}
        </span>
      </div>
    );
  }

  // Show message if no user
  if (!user) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-600">Please log in to view the dashboard.</p>
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
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 text-sm text-red-600 underline"
          >
            Reload page
          </button>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <DashboardWidget
          title="Today's Sales"
          icon={ShoppingCart}
          iconColor="success"
          value={
            metrics?.todaySales?.total
              ? `₹${metrics.todaySales.total.toLocaleString()}`
              : "₹0"
          }
          subValue={`${
            metrics?.todaySales?.transactionCount || 0
          } transactions`}
          trend={
            metrics?.todaySales?.trend
              ? {
                  ...metrics.todaySales.trend,
                  label: "vs yesterday",
                }
              : {
                  value: 0,
                  direction: "neutral" as const,
                  label: "vs yesterday",
                }
          }
          size="lg"
          className="md:col-span-2 lg:col-span-1"
        />

        <DashboardWidget
          title="My Transactions"
          icon={Receipt}
          iconColor="primary"
          value={metrics?.myTransactions?.length || 0}
          subValue="today"
        />

        <DashboardWidget
          title="Avg. Sale"
          icon={TrendingUp}
          iconColor="info"
          value={`₹${Math.round(metrics?.todaySales?.averageTransaction || 0)}`}
        />
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
        {/* Sales - Primary Action */}
        <DashboardWidget
          title="Start Sale"
          description="Begin a new sale transaction. Add products, calculate totals, and process payments."
          icon={ShoppingCart}
          iconColor="success"
          size="lg"
          className="md:col-span-2 lg:col-span-1"
          action={{
            label: "New Sale",
            href: "/sales",
          }}
        />

        <DashboardWidget
          title="My Transactions"
          description="View your recent transactions and receipts"
          icon={Receipt}
          iconColor="primary"
          action={{
            label: "Coming Soon",
            disabled: true,
          }}
        />

        <DashboardWidget
          title="Printer Status"
          description="Monitor receipt printer connection"
          icon={Printer}
          iconColor="gray"
          status={{
            label: "Not Connected",
            type: "warning",
          }}
          action={{
            label: "Connect Printer",
            disabled: true,
          }}
        />

        <DashboardWidget
          title="Help"
          description="Need help? View keyboard shortcuts and guides"
          icon={HelpCircle}
          iconColor="info"
          action={{
            label: "View Help",
            disabled: true,
          }}
        />
      </div>

      {/* My Recent Transactions */}
      {metrics?.myTransactions && metrics.myTransactions.length > 0 ? (
        <Card variant="elevated">
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">
              My Recent Transactions
            </h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.myTransactions.slice(0, 5).map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      ₹{transaction.total?.toLocaleString() || "0"}
                    </p>
                    <p className="text-sm text-gray-600">
                      {transaction.itemCount || 0} items
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600 capitalize">
                      {transaction.paymentMethod || "Unknown"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {transaction.createdAt
                        ? new Date(transaction.createdAt).toLocaleTimeString()
                        : "Unknown time"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card variant="outlined">
          <CardContent>
            <div className="text-center py-8">
              <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Recent Transactions
              </h3>
              <p className="text-gray-600">
                Your recent transactions will appear here once you start making
                sales.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Tips */}
      <Card variant="outlined" className="bg-blue-50 border-blue-200">
        <CardContent>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <Info className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-blue-900 mb-1">
                Quick Tips
              </h4>
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

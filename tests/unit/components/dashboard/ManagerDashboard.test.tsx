import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ManagerDashboard from '@/app/(dashboard)/dashboard/manager/page';
import { dashboardService } from '@/services/dashboard/dashboardService';

// Mock the auth hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: { id: '1', username: 'manager', role: 'manager' },
    isLoading: false
  }))
}));

// Mock the dashboard service
vi.mock('@/services/dashboard/dashboardService', () => ({
  dashboardService: {
    getManagerMetrics: vi.fn()
  }
}));

// Mock the DashboardWidget component
vi.mock('@/components/dashboard/DashboardWidget', () => ({
  DashboardWidget: ({ title, value, action, status }: any) => (
    <div data-testid="dashboard-widget">
      <h3>{title}</h3>
      {value && <span data-testid="widget-value">{value}</span>}
      {action && (
        <button data-testid="widget-action">{action.label}</button>
      )}
      {status && (
        <span data-testid="widget-status">{status.label}</span>
      )}
    </div>
  )
}));

// Mock the LoadingSpinner component
vi.mock('@/components/ui/LoadingSpinner', () => ({
  LoadingSpinner: ({ size }: { size?: string }) => (
    <div data-testid="loading-spinner" data-size={size}>Loading...</div>
  )
}));

const mockMetrics = {
  todaySales: {
    total: 3500,
    transactionCount: 18,
    averageTransaction: 194,
    trend: { value: 8, direction: 'up' as const }
  },
  inventory: {
    totalProducts: 120,
    lowStockCount: 3,
    totalCategories: 8,
    outOfStockCount: 1
  },
  recentTransactions: [
    {
      id: '1',
      total: 180,
      itemCount: 2,
      paymentMethod: 'upi',
      createdAt: new Date(),
      userName: 'cashier1'
    }
  ],
  topProducts: [
    {
      id: '1',
      name: 'Srimad Bhagavatam',
      salesCount: 12,
      revenue: 2400
    }
  ]
};

describe('ManagerDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders welcome message for manager user', async () => {
    vi.mocked(dashboardService.getManagerMetrics).mockResolvedValue(mockMetrics);
    
    render(<ManagerDashboard />);
    
    expect(screen.getByText('Welcome back, manager!')).toBeInTheDocument();
    expect(screen.getByText('Manager Dashboard - Inventory, sales, and reporting access')).toBeInTheDocument();
  });

  it('allows admin users to access manager dashboard', async () => {
    // Mock admin user
    vi.mocked(require('@/hooks/useAuth').useAuth).mockReturnValue({
      user: { id: '1', username: 'admin', role: 'admin' },
      isLoading: false
    });
    
    vi.mocked(dashboardService.getManagerMetrics).mockResolvedValue(mockMetrics);
    
    render(<ManagerDashboard />);
    
    expect(screen.getByText('Welcome back, admin!')).toBeInTheDocument();
  });

  it('shows loading spinner while fetching metrics', () => {
    vi.mocked(dashboardService.getManagerMetrics).mockImplementation(() => 
      new Promise(() => {}) // Never resolves
    );
    
    render(<ManagerDashboard />);
    
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('displays key metrics widgets when data is loaded', async () => {
    vi.mocked(dashboardService.getManagerMetrics).mockResolvedValue(mockMetrics);
    
    render(<ManagerDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText("Today's Sales")).toBeInTheDocument();
      expect(screen.getByText("Products")).toBeInTheDocument();
      expect(screen.getByText("Avg. Transaction")).toBeInTheDocument();
    });
  });

  it('displays manager-specific quick action widgets', async () => {
    vi.mocked(dashboardService.getManagerMetrics).mockResolvedValue(mockMetrics);
    
    render(<ManagerDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText("Sales")).toBeInTheDocument();
      expect(screen.getByText("Inventory")).toBeInTheDocument();
      expect(screen.getByText("Reports")).toBeInTheDocument();
      expect(screen.getByText("Product Search")).toBeInTheDocument();
      expect(screen.getByText("Stock Alerts")).toBeInTheDocument();
      expect(screen.getByText("Categories")).toBeInTheDocument();
    });
  });

  it('does not display user management widget (admin only)', async () => {
    vi.mocked(dashboardService.getManagerMetrics).mockResolvedValue(mockMetrics);
    
    render(<ManagerDashboard />);
    
    await waitFor(() => {
      expect(screen.queryByText("User Management")).not.toBeInTheDocument();
    });
  });

  it('displays stock alert status correctly when no low stock', async () => {
    const metricsWithGoodStock = {
      ...mockMetrics,
      inventory: {
        ...mockMetrics.inventory,
        lowStockCount: 0
      }
    };
    
    vi.mocked(dashboardService.getManagerMetrics).mockResolvedValue(metricsWithGoodStock);
    
    render(<ManagerDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText("Stock Alerts")).toBeInTheDocument();
    });
  });

  it('displays stock alert status correctly when low stock exists', async () => {
    const metricsWithLowStock = {
      ...mockMetrics,
      inventory: {
        ...mockMetrics.inventory,
        lowStockCount: 5
      }
    };
    
    vi.mocked(dashboardService.getManagerMetrics).mockResolvedValue(metricsWithLowStock);
    
    render(<ManagerDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText("Stock Alerts")).toBeInTheDocument();
    });
  });

  it('displays recent transactions section', async () => {
    vi.mocked(dashboardService.getManagerMetrics).mockResolvedValue(mockMetrics);
    
    render(<ManagerDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText("Recent Transactions")).toBeInTheDocument();
      expect(screen.getByText("₹180")).toBeInTheDocument();
      expect(screen.getByText("2 items • cashier1")).toBeInTheDocument();
      expect(screen.getByText("upi")).toBeInTheDocument();
    });
  });

  it('displays top products section', async () => {
    vi.mocked(dashboardService.getManagerMetrics).mockResolvedValue(mockMetrics);
    
    render(<ManagerDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText("Top Products")).toBeInTheDocument();
      expect(screen.getByText("Srimad Bhagavatam")).toBeInTheDocument();
      expect(screen.getByText("12 sales")).toBeInTheDocument();
      expect(screen.getByText("₹2,400")).toBeInTheDocument();
    });
  });

  it('shows error message when metrics fail to load', async () => {
    vi.mocked(dashboardService.getManagerMetrics).mockRejectedValue(new Error('Failed to load'));
    
    render(<ManagerDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load dashboard data')).toBeInTheDocument();
    });
  });

  it('shows access denied for cashier users', () => {
    // Mock cashier user
    vi.mocked(require('@/hooks/useAuth').useAuth).mockReturnValue({
      user: { id: '1', username: 'cashier', role: 'cashier' },
      isLoading: false
    });
    
    render(<ManagerDashboard />);
    
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.getByText("You don't have permission to access this page.")).toBeInTheDocument();
  });

  it('displays empty state for no recent transactions', async () => {
    const metricsWithoutTransactions = {
      ...mockMetrics,
      recentTransactions: []
    };
    
    vi.mocked(dashboardService.getManagerMetrics).mockResolvedValue(metricsWithoutTransactions);
    
    render(<ManagerDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText("No recent transactions")).toBeInTheDocument();
    });
  });

  it('displays empty state for no top products', async () => {
    const metricsWithoutProducts = {
      ...mockMetrics,
      topProducts: []
    };
    
    vi.mocked(dashboardService.getManagerMetrics).mockResolvedValue(metricsWithoutProducts);
    
    render(<ManagerDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText("No sales data available")).toBeInTheDocument();
    });
  });
});
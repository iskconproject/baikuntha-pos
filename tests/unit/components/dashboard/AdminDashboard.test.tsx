import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdminDashboard from '@/app/(dashboard)/dashboard/admin/page';
import { dashboardService } from '@/services/dashboard/dashboardService';

// Mock the auth hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: { id: '1', username: 'admin', role: 'admin' },
    isLoading: false
  }))
}));

// Mock the dashboard service
vi.mock('@/services/dashboard/dashboardService', () => ({
  dashboardService: {
    getAdminMetrics: vi.fn()
  }
}));

// Mock the DashboardWidget component
vi.mock('@/components/dashboard/DashboardWidget', () => ({
  DashboardWidget: ({ title, value, action }: any) => (
    <div data-testid="dashboard-widget">
      <h3>{title}</h3>
      {value && <span data-testid="widget-value">{value}</span>}
      {action && (
        <button data-testid="widget-action">{action.label}</button>
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
    total: 5000,
    transactionCount: 25,
    averageTransaction: 200,
    trend: { value: 15, direction: 'up' as const }
  },
  inventory: {
    totalProducts: 150,
    lowStockCount: 5,
    totalCategories: 10,
    outOfStockCount: 2
  },
  users: {
    totalUsers: 8,
    activeUsers: 6,
    recentLogins: 4
  },
  recentTransactions: [
    {
      id: '1',
      total: 250,
      itemCount: 3,
      paymentMethod: 'cash',
      createdAt: new Date(),
      userName: 'cashier1'
    }
  ],
  topProducts: [
    {
      id: '1',
      name: 'Bhagavad Gita',
      salesCount: 15,
      revenue: 3750
    }
  ]
};

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders welcome message for admin user', async () => {
    vi.mocked(dashboardService.getAdminMetrics).mockResolvedValue(mockMetrics);
    
    render(<AdminDashboard />);
    
    expect(screen.getByText('Welcome back, admin!')).toBeInTheDocument();
    expect(screen.getByText('Administrator Dashboard - Full system access and management')).toBeInTheDocument();
  });

  it('shows loading spinner while fetching metrics', () => {
    vi.mocked(dashboardService.getAdminMetrics).mockImplementation(() => 
      new Promise(() => {}) // Never resolves
    );
    
    render(<AdminDashboard />);
    
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('displays metrics widgets when data is loaded', async () => {
    vi.mocked(dashboardService.getAdminMetrics).mockResolvedValue(mockMetrics);
    
    render(<AdminDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText("Today's Sales")).toBeInTheDocument();
      expect(screen.getByText("Total Products")).toBeInTheDocument();
      expect(screen.getByText("Active Users")).toBeInTheDocument();
      expect(screen.getByText("Categories")).toBeInTheDocument();
    });
  });

  it('displays quick action widgets', async () => {
    vi.mocked(dashboardService.getAdminMetrics).mockResolvedValue(mockMetrics);
    
    render(<AdminDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText("User Management")).toBeInTheDocument();
      expect(screen.getByText("Sales")).toBeInTheDocument();
      expect(screen.getByText("Inventory")).toBeInTheDocument();
      expect(screen.getByText("Reports")).toBeInTheDocument();
      expect(screen.getByText("Settings")).toBeInTheDocument();
      expect(screen.getByText("System Status")).toBeInTheDocument();
    });
  });

  it('displays recent transactions when available', async () => {
    vi.mocked(dashboardService.getAdminMetrics).mockResolvedValue(mockMetrics);
    
    render(<AdminDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText("Recent Transactions")).toBeInTheDocument();
      expect(screen.getByText("₹250")).toBeInTheDocument();
      expect(screen.getByText("3 items • cashier1")).toBeInTheDocument();
    });
  });

  it('displays top products when available', async () => {
    vi.mocked(dashboardService.getAdminMetrics).mockResolvedValue(mockMetrics);
    
    render(<AdminDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText("Top Products")).toBeInTheDocument();
      expect(screen.getByText("Bhagavad Gita")).toBeInTheDocument();
      expect(screen.getByText("15 sales")).toBeInTheDocument();
      expect(screen.getByText("₹3,750")).toBeInTheDocument();
    });
  });

  it('shows error message when metrics fail to load', async () => {
    vi.mocked(dashboardService.getAdminMetrics).mockRejectedValue(new Error('Failed to load'));
    
    render(<AdminDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load dashboard data')).toBeInTheDocument();
    });
  });

  it('shows access denied for non-admin users', () => {
    // Mock non-admin user
    vi.mocked(require('@/hooks/useAuth').useAuth).mockReturnValue({
      user: { id: '1', username: 'cashier', role: 'cashier' },
      isLoading: false
    });
    
    render(<AdminDashboard />);
    
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.getByText("You don't have permission to access this page.")).toBeInTheDocument();
  });

  it('displays empty state for no recent transactions', async () => {
    const metricsWithoutTransactions = {
      ...mockMetrics,
      recentTransactions: []
    };
    
    vi.mocked(dashboardService.getAdminMetrics).mockResolvedValue(metricsWithoutTransactions);
    
    render(<AdminDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText("No recent transactions")).toBeInTheDocument();
    });
  });

  it('displays empty state for no top products', async () => {
    const metricsWithoutProducts = {
      ...mockMetrics,
      topProducts: []
    };
    
    vi.mocked(dashboardService.getAdminMetrics).mockResolvedValue(metricsWithoutProducts);
    
    render(<AdminDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText("No sales data available")).toBeInTheDocument();
    });
  });
});
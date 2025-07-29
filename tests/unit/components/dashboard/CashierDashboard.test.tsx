import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CashierDashboard from '@/app/(dashboard)/dashboard/cashier/page';
import { dashboardService } from '@/services/dashboard/dashboardService';

// Mock the auth hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: { id: '1', username: 'cashier', role: 'cashier' },
    isLoading: false
  }))
}));

// Mock the dashboard service
vi.mock('@/services/dashboard/dashboardService', () => ({
  dashboardService: {
    getCashierMetrics: vi.fn()
  }
}));

// Mock the DashboardWidget component
vi.mock('@/components/dashboard/DashboardWidget', () => ({
  DashboardWidget: ({ title, value, action, status, size, className }: any) => (
    <div data-testid="dashboard-widget" className={className} data-size={size}>
      <h3>{title}</h3>
      {value && <span data-testid="widget-value">{value}</span>}
      {action && (
        <button data-testid="widget-action" disabled={action.disabled}>
          {action.label}
        </button>
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
    total: 1200,
    transactionCount: 8,
    averageTransaction: 150,
    trend: { value: 5, direction: 'up' as const }
  },
  myTransactions: [
    {
      id: '1',
      total: 150,
      itemCount: 2,
      paymentMethod: 'cash',
      createdAt: new Date(),
      userName: 'cashier'
    },
    {
      id: '2',
      total: 300,
      itemCount: 4,
      paymentMethod: 'upi',
      createdAt: new Date(),
      userName: 'cashier'
    }
  ]
};

describe('CashierDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders welcome message for cashier user', async () => {
    vi.mocked(dashboardService.getCashierMetrics).mockResolvedValue(mockMetrics);
    
    render(<CashierDashboard />);
    
    expect(screen.getByText('Welcome back, cashier!')).toBeInTheDocument();
    expect(screen.getByText('Cashier Dashboard - Process sales and manage transactions')).toBeInTheDocument();
  });

  it('shows loading spinner while fetching metrics', () => {
    vi.mocked(dashboardService.getCashierMetrics).mockImplementation(() => 
      new Promise(() => {}) // Never resolves
    );
    
    render(<CashierDashboard />);
    
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('displays key metrics widgets when data is loaded', async () => {
    vi.mocked(dashboardService.getCashierMetrics).mockResolvedValue(mockMetrics);
    
    render(<CashierDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText("Today's Sales")).toBeInTheDocument();
      expect(screen.getByText("My Transactions")).toBeInTheDocument();
      expect(screen.getByText("Avg. Sale")).toBeInTheDocument();
    });
  });

  it('displays cashier-specific quick action widgets', async () => {
    vi.mocked(dashboardService.getCashierMetrics).mockResolvedValue(mockMetrics);
    
    render(<CashierDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText("Start Sale")).toBeInTheDocument();
      expect(screen.getByText("Product Search")).toBeInTheDocument();
      expect(screen.getByText("My Transactions")).toBeInTheDocument();
      expect(screen.getByText("Printer Status")).toBeInTheDocument();
      expect(screen.getByText("Help")).toBeInTheDocument();
    });
  });

  it('displays primary sales action with large size', async () => {
    vi.mocked(dashboardService.getCashierMetrics).mockResolvedValue(mockMetrics);
    
    render(<CashierDashboard />);
    
    await waitFor(() => {
      const startSaleWidget = screen.getByText("Start Sale").closest('[data-testid="dashboard-widget"]');
      expect(startSaleWidget).toHaveAttribute('data-size', 'lg');
      expect(startSaleWidget).toHaveClass('md:col-span-2', 'lg:col-span-1');
    });
  });

  it('shows coming soon for disabled features', async () => {
    vi.mocked(dashboardService.getCashierMetrics).mockResolvedValue(mockMetrics);
    
    render(<CashierDashboard />);
    
    await waitFor(() => {
      const comingSoonButtons = screen.getAllByText("Coming Soon");
      expect(comingSoonButtons).toHaveLength(3); // Product Search, My Transactions, Help
      
      comingSoonButtons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });
  });

  it('displays printer status as not connected', async () => {
    vi.mocked(dashboardService.getCashierMetrics).mockResolvedValue(mockMetrics);
    
    render(<CashierDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText("Printer Status")).toBeInTheDocument();
      expect(screen.getByText("Not Connected")).toBeInTheDocument();
      expect(screen.getByText("Connect Printer")).toBeDisabled();
    });
  });

  it('displays recent transactions when available', async () => {
    vi.mocked(dashboardService.getCashierMetrics).mockResolvedValue(mockMetrics);
    
    render(<CashierDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText("My Recent Transactions")).toBeInTheDocument();
      expect(screen.getByText("₹150")).toBeInTheDocument();
      expect(screen.getByText("₹300")).toBeInTheDocument();
      expect(screen.getByText("2 items")).toBeInTheDocument();
      expect(screen.getByText("4 items")).toBeInTheDocument();
      expect(screen.getByText("cash")).toBeInTheDocument();
      expect(screen.getByText("upi")).toBeInTheDocument();
    });
  });

  it('does not display recent transactions section when no transactions', async () => {
    const metricsWithoutTransactions = {
      ...mockMetrics,
      myTransactions: []
    };
    
    vi.mocked(dashboardService.getCashierMetrics).mockResolvedValue(metricsWithoutTransactions);
    
    render(<CashierDashboard />);
    
    await waitFor(() => {
      expect(screen.queryByText("My Recent Transactions")).not.toBeInTheDocument();
    });
  });

  it('limits recent transactions display to 5 items', async () => {
    const metricsWithManyTransactions = {
      ...mockMetrics,
      myTransactions: Array.from({ length: 10 }, (_, i) => ({
        id: `${i + 1}`,
        total: 100 + i * 10,
        itemCount: 1 + i,
        paymentMethod: i % 2 === 0 ? 'cash' : 'upi',
        createdAt: new Date(),
        userName: 'cashier'
      }))
    };
    
    vi.mocked(dashboardService.getCashierMetrics).mockResolvedValue(metricsWithManyTransactions);
    
    render(<CashierDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText("My Recent Transactions")).toBeInTheDocument();
      
      // Should only show first 5 transactions
      expect(screen.getByText("₹100")).toBeInTheDocument(); // First transaction
      expect(screen.getByText("₹140")).toBeInTheDocument(); // Fifth transaction
      expect(screen.queryByText("₹150")).not.toBeInTheDocument(); // Sixth transaction should not be visible
    });
  });

  it('shows error message when metrics fail to load', async () => {
    vi.mocked(dashboardService.getCashierMetrics).mockRejectedValue(new Error('Failed to load'));
    
    render(<CashierDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load dashboard data')).toBeInTheDocument();
    });
  });

  it('handles missing user ID gracefully', async () => {
    // Mock user without ID
    const mockUseAuth = vi.mocked(require('@/hooks/useAuth'));
    mockUseAuth.useAuth.mockReturnValue({
      user: { username: 'cashier', role: 'cashier' }, // No ID
      isLoading: false
    });
    
    render(<CashierDashboard />);
    
    // Should not call getCashierMetrics without user ID
    expect(dashboardService.getCashierMetrics).not.toHaveBeenCalled();
  });

  it('calls getCashierMetrics with correct user ID', async () => {
    vi.mocked(dashboardService.getCashierMetrics).mockResolvedValue(mockMetrics);
    
    render(<CashierDashboard />);
    
    await waitFor(() => {
      expect(dashboardService.getCashierMetrics).toHaveBeenCalledWith('1');
    });
  });

  it('displays correct metric values', async () => {
    vi.mocked(dashboardService.getCashierMetrics).mockResolvedValue(mockMetrics);
    
    render(<CashierDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText("₹1,200")).toBeInTheDocument(); // Today's sales
      expect(screen.getByText("8 transactions")).toBeInTheDocument(); // Transaction count
      expect(screen.getByText("2")).toBeInTheDocument(); // My transactions count
      expect(screen.getByText("₹150")).toBeInTheDocument(); // Average sale
    });
  });
});
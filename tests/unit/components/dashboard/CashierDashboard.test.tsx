import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import CashierDashboard from '@/app/(dashboard)/dashboard/cashier/page';

// Mock the useAuth hook
const mockCashierUser = {
  id: 'cashier-1',
  username: 'cashier',
  role: 'cashier' as const,
  isActive: true
};

const mockUseAuth = vi.fn();
vi.mock('@/hooks/useAuth', () => ({
  useAuth: mockUseAuth
}));

// Mock dashboard service
const mockGetCashierMetrics = vi.fn();
vi.mock('@/services/dashboard/dashboardService', () => ({
  dashboardService: {
    getCashierMetrics: mockGetCashierMetrics
  }
}));

// Mock cashier metrics
const mockCashierMetrics = {
  todaySales: {
    total: 1200,
    transactionCount: 8,
    averageTransaction: 150,
    trend: {
      value: 5,
      direction: 'up' as const
    }
  },
  myTransactions: [
    {
      id: 'txn-1',
      total: 150,
      itemCount: 2,
      paymentMethod: 'cash',
      createdAt: new Date('2024-01-15T10:30:00Z'),
      userName: 'cashier'
    },
    {
      id: 'txn-2',
      total: 200,
      itemCount: 3,
      paymentMethod: 'upi',
      createdAt: new Date('2024-01-15T11:15:00Z'),
      userName: 'cashier'
    }
  ]
};

describe('CashierDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCashierMetrics.mockResolvedValue(mockCashierMetrics);
  });

  it('renders welcome message for cashier user', async () => {
    vi.mocked(vi.importActual('@/hooks/useAuth')).useAuth.mockReturnValue({
      user: mockCashierUser,
      isLoading: false
    });
    
    render(<CashierDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Welcome back, cashier!')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Cashier Dashboard - Process sales and manage transactions')).toBeInTheDocument();
  });

  it('displays cashier-specific key metrics', async () => {
    vi.mocked(vi.importActual('@/hooks/useAuth')).useAuth.mockReturnValue({
      user: mockCashierUser,
      isLoading: false
    });
    
    render(<CashierDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Today\'s Sales')).toBeInTheDocument();
    });
    
    expect(screen.getByText('₹1,200')).toBeInTheDocument();
    expect(screen.getByText('8 transactions')).toBeInTheDocument();
    expect(screen.getByText('My Transactions')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // Number of user's transactions
    expect(screen.getByText('today')).toBeInTheDocument();
    expect(screen.getByText('Avg. Sale')).toBeInTheDocument();
    expect(screen.getByText('₹150')).toBeInTheDocument();
  });

  it('displays cashier-appropriate quick actions', async () => {
    vi.mocked(vi.importActual('@/hooks/useAuth')).useAuth.mockReturnValue({
      user: mockCashierUser,
      isLoading: false
    });
    
    render(<CashierDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Start Sale')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Begin a new sale transaction. Add products, calculate totals, and process payments.')).toBeInTheDocument();
    expect(screen.getByText('Product Search')).toBeInTheDocument();
    expect(screen.getByText('Search and browse available products')).toBeInTheDocument();
    expect(screen.getByText('My Transactions')).toBeInTheDocument();
    expect(screen.getByText('View your recent transactions and receipts')).toBeInTheDocument();
    expect(screen.getByText('Printer Status')).toBeInTheDocument();
    expect(screen.getByText('Monitor receipt printer connection')).toBeInTheDocument();
    expect(screen.getByText('Help')).toBeInTheDocument();
    expect(screen.getByText('Need help? View keyboard shortcuts and guides')).toBeInTheDocument();
  });

  it('does not display admin/manager features', async () => {
    vi.mocked(vi.importActual('@/hooks/useAuth')).useAuth.mockReturnValue({
      user: mockCashierUser,
      isLoading: false
    });
    
    render(<CashierDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Start Sale')).toBeInTheDocument();
    });
    
    // Should not show admin/manager features
    expect(screen.queryByText('User Management')).not.toBeInTheDocument();
    expect(screen.queryByText('Inventory')).not.toBeInTheDocument();
    expect(screen.queryByText('Reports')).not.toBeInTheDocument();
    expect(screen.queryByText('Settings')).not.toBeInTheDocument();
  });

  it('displays my recent transactions when available', async () => {
    vi.mocked(vi.importActual('@/hooks/useAuth')).useAuth.mockReturnValue({
      user: mockCashierUser,
      isLoading: false
    });
    
    render(<CashierDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('My Recent Transactions')).toBeInTheDocument();
    });
    
    expect(screen.getByText('₹150')).toBeInTheDocument();
    expect(screen.getByText('2 items')).toBeInTheDocument();
    expect(screen.getByText('cash')).toBeInTheDocument();
    expect(screen.getByText('₹200')).toBeInTheDocument();
    expect(screen.getByText('3 items')).toBeInTheDocument();
    expect(screen.getByText('upi')).toBeInTheDocument();
  });

  it('does not display my transactions section when empty', async () => {
    const emptyMetrics = {
      ...mockCashierMetrics,
      myTransactions: []
    };
    
    mockDashboardService.getCashierMetrics.mockResolvedValue(emptyMetrics);
    
    vi.mocked(vi.importActual('@/hooks/useAuth')).useAuth.mockReturnValue({
      user: mockCashierUser,
      isLoading: false
    });
    
    render(<CashierDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Today\'s Sales')).toBeInTheDocument();
    });
    
    // Should not show the transactions section if empty
    expect(screen.queryByText('My Recent Transactions')).not.toBeInTheDocument();
  });

  it('displays quick tips section', async () => {
    vi.mocked(vi.importActual('@/hooks/useAuth')).useAuth.mockReturnValue({
      user: mockCashierUser,
      isLoading: false
    });
    
    render(<CashierDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Quick Tips')).toBeInTheDocument();
    });
    
    expect(screen.getByText('• Use the search function to quickly find products')).toBeInTheDocument();
    expect(screen.getByText('• Press Enter to add products to cart')).toBeInTheDocument();
    expect(screen.getByText('• Double-click on cart items to edit quantities')).toBeInTheDocument();
    expect(screen.getByText('• Use keyboard shortcuts for faster checkout')).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    vi.mocked(vi.importActual('@/hooks/useAuth')).useAuth.mockReturnValue({
      user: mockCashierUser,
      isLoading: false
    });
    
    // Mock a delayed response
    mockDashboardService.getCashierMetrics.mockImplementation(() => 
      new Promise(resolve => {
        setTimeout(() => resolve(mockCashierMetrics), 100);
      })
    );
    
    render(<CashierDashboard />);
    
    expect(screen.getByRole('status')).toBeInTheDocument(); // LoadingSpinner has role="status"
  });

  it('handles service error gracefully', async () => {
    vi.mocked(vi.importActual('@/hooks/useAuth')).useAuth.mockReturnValue({
      user: mockCashierUser,
      isLoading: false
    });
    
    mockDashboardService.getCashierMetrics.mockRejectedValue(new Error('Service error'));
    
    render(<CashierDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load dashboard data')).toBeInTheDocument();
    });
  });

  it('displays trend indicators correctly', async () => {
    vi.mocked(vi.importActual('@/hooks/useAuth')).useAuth.mockReturnValue({
      user: mockCashierUser,
      isLoading: false
    });
    
    render(<CashierDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Today\'s Sales')).toBeInTheDocument();
    });
    
    // Should show upward trend
    expect(screen.getByText('+5% vs yesterday')).toBeInTheDocument();
  });

  it('calls dashboard service with correct user ID', async () => {
    vi.mocked(vi.importActual('@/hooks/useAuth')).useAuth.mockReturnValue({
      user: mockCashierUser,
      isLoading: false
    });
    
    render(<CashierDashboard />);
    
    await waitFor(() => {
      expect(mockDashboardService.getCashierMetrics).toHaveBeenCalledWith('cashier-1');
    });
  });

  it('does not call service when user ID is not available', () => {
    vi.mocked(vi.importActual('@/hooks/useAuth')).useAuth.mockReturnValue({
      user: { ...mockCashierUser, id: undefined },
      isLoading: false
    });
    
    render(<CashierDashboard />);
    
    expect(mockDashboardService.getCashierMetrics).not.toHaveBeenCalled();
  });

  it('displays printer status as not connected', async () => {
    vi.mocked(vi.importActual('@/hooks/useAuth')).useAuth.mockReturnValue({
      user: mockCashierUser,
      isLoading: false
    });
    
    render(<CashierDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Printer Status')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Not Connected')).toBeInTheDocument();
  });

  it('displays disabled action buttons correctly', async () => {
    vi.mocked(vi.importActual('@/hooks/useAuth')).useAuth.mockReturnValue({
      user: mockCashierUser,
      isLoading: false
    });
    
    render(<CashierDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Product Search')).toBeInTheDocument();
    });
    
    // Check for disabled buttons
    const comingSoonButtons = screen.getAllByText('Coming Soon');
    expect(comingSoonButtons.length).toBeGreaterThan(0);
    
    const connectPrinterButton = screen.getByText('Connect Printer');
    expect(connectPrinterButton.closest('button')).toBeDisabled();
    
    const viewHelpButton = screen.getByText('View Help');
    expect(viewHelpButton.closest('button')).toBeDisabled();
  });

  it('has working New Sale action button', async () => {
    vi.mocked(vi.importActual('@/hooks/useAuth')).useAuth.mockReturnValue({
      user: mockCashierUser,
      isLoading: false
    });
    
    render(<CashierDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Start Sale')).toBeInTheDocument();
    });
    
    const newSaleButton = screen.getByText('New Sale');
    expect(newSaleButton.closest('a')).toHaveAttribute('href', '/sales');
  });

  it('formats transaction times correctly', async () => {
    vi.mocked(vi.importActual('@/hooks/useAuth')).useAuth.mockReturnValue({
      user: mockCashierUser,
      isLoading: false
    });
    
    render(<CashierDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('My Recent Transactions')).toBeInTheDocument();
    });
    
    // Should display formatted time (exact format may vary by locale)
    const timeElements = screen.getAllByText(/\d{1,2}:\d{2}:\d{2}/);
    expect(timeElements.length).toBeGreaterThan(0);
  });

  it('limits displayed transactions to 5', async () => {
    const manyTransactions = Array.from({ length: 10 }, (_, i) => ({
      id: `txn-${i}`,
      total: 100 + i * 10,
      itemCount: 2,
      paymentMethod: 'cash',
      createdAt: new Date(),
      userName: 'cashier'
    }));
    
    const metricsWithManyTransactions = {
      ...mockCashierMetrics,
      myTransactions: manyTransactions
    };
    
    mockDashboardService.getCashierMetrics.mockResolvedValue(metricsWithManyTransactions);
    
    vi.mocked(vi.importActual('@/hooks/useAuth')).useAuth.mockReturnValue({
      user: mockCashierUser,
      isLoading: false
    });
    
    render(<CashierDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('My Recent Transactions')).toBeInTheDocument();
    });
    
    // Should only show first 5 transactions
    const transactionElements = screen.getAllByText(/₹\d+/);
    // 3 from metrics (Today's Sales, Avg. Sale) + 5 from transactions = 8 total
    expect(transactionElements.length).toBeLessThanOrEqual(8);
  });
});
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import ManagerDashboard from '@/app/(dashboard)/dashboard/manager/page';

// Mock the useAuth hook
const mockManagerUser = {
  id: 'manager-1',
  username: 'manager',
  role: 'manager' as const,
  isActive: true
};

const mockAdminUser = {
  id: 'admin-1',
  username: 'admin',
  role: 'admin' as const,
  isActive: true
};

const mockUseAuth = vi.fn();
vi.mock('@/hooks/useAuth', () => ({
  useAuth: mockUseAuth
}));

// Mock dashboard service
const mockGetManagerMetrics = vi.fn();
vi.mock('@/services/dashboard/dashboardService', () => ({
  dashboardService: {
    getManagerMetrics: mockGetManagerMetrics
  }
}));

// Mock dashboard metrics (without users data)
const mockManagerMetrics = {
  todaySales: {
    total: 3500,
    transactionCount: 18,
    averageTransaction: 194,
    trend: {
      value: 8,
      direction: 'up' as const
    }
  },
  inventory: {
    totalProducts: 120,
    lowStockCount: 3,
    totalCategories: 8,
    outOfStockCount: 1
  },
  recentTransactions: [
    {
      id: 'txn-1',
      total: 180,
      itemCount: 2,
      paymentMethod: 'upi',
      createdAt: new Date('2024-01-15T10:30:00Z'),
      userName: 'cashier1'
    }
  ],
  topProducts: [
    {
      id: 'prod-1',
      name: 'Srimad Bhagavatam',
      salesCount: 12,
      revenue: 2400
    }
  ]
};

describe('ManagerDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetManagerMetrics.mockResolvedValue(mockManagerMetrics);
  });

  it('renders welcome message for manager user', async () => {
    mockUseAuth.mockReturnValue({
      user: mockManagerUser,
      isLoading: false
    });
    
    render(<ManagerDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Welcome back, manager!')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Manager Dashboard - Inventory, sales, and reporting access')).toBeInTheDocument();
  });

  it('renders welcome message for admin user', async () => {
    vi.mocked(vi.importActual('@/hooks/useAuth')).useAuth.mockReturnValue({
      user: mockAdminUser,
      isLoading: false
    });
    
    render(<ManagerDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Welcome back, admin!')).toBeInTheDocument();
    });
  });

  it('displays manager-specific key metrics', async () => {
    vi.mocked(vi.importActual('@/hooks/useAuth')).useAuth.mockReturnValue({
      user: mockManagerUser,
      isLoading: false
    });
    
    render(<ManagerDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Today\'s Sales')).toBeInTheDocument();
    });
    
    expect(screen.getByText('₹3,500')).toBeInTheDocument();
    expect(screen.getByText('18 transactions')).toBeInTheDocument();
    expect(screen.getByText('Products')).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.getByText('3 low stock')).toBeInTheDocument();
    expect(screen.getByText('Avg. Transaction')).toBeInTheDocument();
    expect(screen.getByText('₹194')).toBeInTheDocument();
  });

  it('does not display user management metrics', async () => {
    vi.mocked(vi.importActual('@/hooks/useAuth')).useAuth.mockReturnValue({
      user: mockManagerUser,
      isLoading: false
    });
    
    render(<ManagerDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Today\'s Sales')).toBeInTheDocument();
    });
    
    // Should not show user-related metrics
    expect(screen.queryByText('Active Users')).not.toBeInTheDocument();
    expect(screen.queryByText('Total Users')).not.toBeInTheDocument();
  });

  it('displays manager-appropriate quick actions', async () => {
    vi.mocked(vi.importActual('@/hooks/useAuth')).useAuth.mockReturnValue({
      user: mockManagerUser,
      isLoading: false
    });
    
    render(<ManagerDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Sales')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Process transactions and manage sales')).toBeInTheDocument();
    expect(screen.getByText('Inventory')).toBeInTheDocument();
    expect(screen.getByText('Manage products, categories, and stock')).toBeInTheDocument();
    expect(screen.getByText('Reports')).toBeInTheDocument();
    expect(screen.getByText('View sales reports and analytics')).toBeInTheDocument();
    expect(screen.getByText('Product Search')).toBeInTheDocument();
    expect(screen.getByText('Stock Alerts')).toBeInTheDocument();
    expect(screen.getByText('Categories')).toBeInTheDocument();
  });

  it('does not display user management action', async () => {
    vi.mocked(vi.importActual('@/hooks/useAuth')).useAuth.mockReturnValue({
      user: mockManagerUser,
      isLoading: false
    });
    
    render(<ManagerDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Sales')).toBeInTheDocument();
    });
    
    // Should not show user management
    expect(screen.queryByText('User Management')).not.toBeInTheDocument();
    expect(screen.queryByText('Manage user accounts, roles, and permissions')).not.toBeInTheDocument();
  });

  it('displays stock alert status correctly', async () => {
    vi.mocked(vi.importActual('@/hooks/useAuth')).useAuth.mockReturnValue({
      user: mockManagerUser,
      isLoading: false
    });
    
    render(<ManagerDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Stock Alerts')).toBeInTheDocument();
    });
    
    // Should show warning status for low stock items
    expect(screen.getByText('3 Items Low')).toBeInTheDocument();
  });

  it('displays stock alert as OK when no low stock', async () => {
    const metricsWithNoLowStock = {
      ...mockManagerMetrics,
      inventory: {
        ...mockManagerMetrics.inventory,
        lowStockCount: 0
      }
    };
    
    mockDashboardService.getManagerMetrics.mockResolvedValue(metricsWithNoLowStock);
    
    vi.mocked(vi.importActual('@/hooks/useAuth')).useAuth.mockReturnValue({
      user: mockManagerUser,
      isLoading: false
    });
    
    render(<ManagerDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Stock Alerts')).toBeInTheDocument();
    });
    
    expect(screen.getByText('All Stock Levels OK')).toBeInTheDocument();
  });

  it('shows access denied for cashier users', () => {
    vi.mocked(vi.importActual('@/hooks/useAuth')).useAuth.mockReturnValue({
      user: { ...mockManagerUser, role: 'cashier' },
      isLoading: false
    });
    
    render(<ManagerDashboard />);
    
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.getByText('You don\'t have permission to access this page.')).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    vi.mocked(vi.importActual('@/hooks/useAuth')).useAuth.mockReturnValue({
      user: mockManagerUser,
      isLoading: false
    });
    
    // Mock a delayed response
    mockDashboardService.getManagerMetrics.mockImplementation(() => 
      new Promise(resolve => {
        setTimeout(() => resolve(mockManagerMetrics), 100);
      })
    );
    
    render(<ManagerDashboard />);
    
    expect(screen.getByRole('status')).toBeInTheDocument(); // LoadingSpinner has role="status"
  });

  it('handles service error gracefully', async () => {
    vi.mocked(vi.importActual('@/hooks/useAuth')).useAuth.mockReturnValue({
      user: mockManagerUser,
      isLoading: false
    });
    
    mockDashboardService.getManagerMetrics.mockRejectedValue(new Error('Service error'));
    
    render(<ManagerDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load dashboard data')).toBeInTheDocument();
    });
  });

  it('displays recent transactions', async () => {
    vi.mocked(vi.importActual('@/hooks/useAuth')).useAuth.mockReturnValue({
      user: mockManagerUser,
      isLoading: false
    });
    
    render(<ManagerDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Recent Transactions')).toBeInTheDocument();
    });
    
    expect(screen.getByText('₹180')).toBeInTheDocument();
    expect(screen.getByText('2 items • cashier1')).toBeInTheDocument();
    expect(screen.getByText('upi')).toBeInTheDocument();
  });

  it('displays top products', async () => {
    vi.mocked(vi.importActual('@/hooks/useAuth')).useAuth.mockReturnValue({
      user: mockManagerUser,
      isLoading: false
    });
    
    render(<ManagerDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Top Products')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Srimad Bhagavatam')).toBeInTheDocument();
    expect(screen.getByText('12 sales')).toBeInTheDocument();
    expect(screen.getByText('₹2,400')).toBeInTheDocument();
  });

  it('displays trend indicators correctly', async () => {
    vi.mocked(vi.importActual('@/hooks/useAuth')).useAuth.mockReturnValue({
      user: mockManagerUser,
      isLoading: false
    });
    
    render(<ManagerDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Today\'s Sales')).toBeInTheDocument();
    });
    
    // Should show upward trend
    expect(screen.getByText('+8% vs yesterday')).toBeInTheDocument();
  });

  it('calls dashboard service with correct method', async () => {
    vi.mocked(vi.importActual('@/hooks/useAuth')).useAuth.mockReturnValue({
      user: mockManagerUser,
      isLoading: false
    });
    
    render(<ManagerDashboard />);
    
    await waitFor(() => {
      expect(mockDashboardService.getManagerMetrics).toHaveBeenCalledOnce();
    });
  });

  it('displays categories count correctly', async () => {
    vi.mocked(vi.importActual('@/hooks/useAuth')).useAuth.mockReturnValue({
      user: mockManagerUser,
      isLoading: false
    });
    
    render(<ManagerDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Categories')).toBeInTheDocument();
    });
    
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('handles empty recent transactions', async () => {
    const emptyMetrics = {
      ...mockManagerMetrics,
      recentTransactions: []
    };
    
    mockDashboardService.getManagerMetrics.mockResolvedValue(emptyMetrics);
    
    vi.mocked(vi.importActual('@/hooks/useAuth')).useAuth.mockReturnValue({
      user: mockManagerUser,
      isLoading: false
    });
    
    render(<ManagerDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Recent Transactions')).toBeInTheDocument();
    });
    
    expect(screen.getByText('No recent transactions')).toBeInTheDocument();
  });

  it('handles empty top products', async () => {
    const emptyMetrics = {
      ...mockManagerMetrics,
      topProducts: []
    };
    
    mockDashboardService.getManagerMetrics.mockResolvedValue(emptyMetrics);
    
    vi.mocked(vi.importActual('@/hooks/useAuth')).useAuth.mockReturnValue({
      user: mockManagerUser,
      isLoading: false
    });
    
    render(<ManagerDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Top Products')).toBeInTheDocument();
    });
    
    expect(screen.getByText('No sales data available')).toBeInTheDocument();
  });
});
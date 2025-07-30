import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import AdminDashboard from '@/app/(dashboard)/dashboard/admin/page';

// Mock the useAuth hook
const mockUser = {
  id: 'admin-1',
  username: 'admin',
  role: 'admin' as const,
  isActive: true
};

const mockUseAuth = vi.fn();
vi.mock('@/hooks/useAuth', () => ({
  useAuth: mockUseAuth
}));

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock dashboard metrics
const mockDashboardMetrics = {
  todaySales: {
    total: 5000,
    transactionCount: 25,
    averageTransaction: 200,
    trend: {
      value: 15,
      direction: 'up' as const
    }
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
      id: 'txn-1',
      total: 250,
      itemCount: 3,
      paymentMethod: 'cash',
      createdAt: new Date('2024-01-15T10:30:00Z'),
      userName: 'cashier1'
    },
    {
      id: 'txn-2',
      total: 180,
      itemCount: 2,
      paymentMethod: 'upi',
      createdAt: new Date('2024-01-15T11:15:00Z'),
      userName: 'cashier2'
    }
  ],
  topProducts: [
    {
      id: 'prod-1',
      name: 'Bhagavad Gita',
      salesCount: 15,
      revenue: 3750
    },
    {
      id: 'prod-2',
      name: 'Srimad Bhagavatam',
      salesCount: 12,
      revenue: 2400
    }
  ]
};

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false
    });
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockDashboardMetrics)
    });
  });

  it('renders welcome message with admin username', async () => {
    render(<AdminDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Welcome back, admin!')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Administrator Dashboard - Full system access and management')).toBeInTheDocument();
  });

  it('displays key metrics widgets', async () => {
    render(<AdminDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Today\'s Sales')).toBeInTheDocument();
    });
    
    expect(screen.getByText('₹5,000')).toBeInTheDocument();
    expect(screen.getByText('25 transactions')).toBeInTheDocument();
    expect(screen.getByText('Total Products')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('5 low stock')).toBeInTheDocument();
    expect(screen.getByText('Active Users')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByText('of 8 total')).toBeInTheDocument();
    expect(screen.getByText('Categories')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('displays quick action widgets', async () => {
    render(<AdminDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('User Management')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Manage user accounts, roles, and permissions')).toBeInTheDocument();
    expect(screen.getByText('Sales')).toBeInTheDocument();
    expect(screen.getByText('Process transactions and manage sales')).toBeInTheDocument();
    expect(screen.getByText('Inventory')).toBeInTheDocument();
    expect(screen.getByText('Manage products, categories, and stock')).toBeInTheDocument();
    expect(screen.getByText('Reports')).toBeInTheDocument();
    expect(screen.getByText('View sales reports and analytics')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('System Status')).toBeInTheDocument();
  });

  it('displays recent transactions', async () => {
    render(<AdminDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Recent Transactions')).toBeInTheDocument();
    });
    
    expect(screen.getByText('₹250')).toBeInTheDocument();
    expect(screen.getByText('3 items • cashier1')).toBeInTheDocument();
    expect(screen.getByText('cash')).toBeInTheDocument();
    expect(screen.getByText('₹180')).toBeInTheDocument();
    expect(screen.getByText('2 items • cashier2')).toBeInTheDocument();
    expect(screen.getByText('upi')).toBeInTheDocument();
  });

  it('displays top products', async () => {
    render(<AdminDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Top Products')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Bhagavad Gita')).toBeInTheDocument();
    expect(screen.getByText('15 sales')).toBeInTheDocument();
    expect(screen.getByText('₹3,750')).toBeInTheDocument();
    expect(screen.getByText('Srimad Bhagavatam')).toBeInTheDocument();
    expect(screen.getByText('12 sales')).toBeInTheDocument();
    expect(screen.getByText('₹2,400')).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    // Mock a delayed response
    mockFetch.mockImplementation(() => new Promise(resolve => {
      setTimeout(() => resolve({
        ok: true,
        json: () => Promise.resolve(mockDashboardMetrics)
      }), 100);
    }));
    
    render(<AdminDashboard />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument(); // LoadingSpinner screen reader text
  });

  it('handles API error gracefully', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500
    });
    
    render(<AdminDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load dashboard data')).toBeInTheDocument();
    });
  });

  it('handles network error gracefully', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));
    
    render(<AdminDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load dashboard data')).toBeInTheDocument();
    });
  });

  it('shows access denied for non-admin users', () => {
    // Override the mock for this specific test
    mockUseAuth.mockReturnValue({
      user: { ...mockUser, role: 'cashier' },
      isLoading: false
    });
    
    render(<AdminDashboard />);
    
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.getByText('You don\'t have permission to access this page.')).toBeInTheDocument();
  });

  it('displays empty state for no recent transactions', async () => {
    const emptyMetrics = {
      ...mockDashboardMetrics,
      recentTransactions: []
    };
    
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(emptyMetrics)
    });
    
    render(<AdminDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Recent Transactions')).toBeInTheDocument();
    });
    
    expect(screen.getByText('No recent transactions')).toBeInTheDocument();
  });

  it('displays empty state for no top products', async () => {
    const emptyMetrics = {
      ...mockDashboardMetrics,
      topProducts: []
    };
    
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(emptyMetrics)
    });
    
    render(<AdminDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Top Products')).toBeInTheDocument();
    });
    
    expect(screen.getByText('No sales data available')).toBeInTheDocument();
  });

  it('makes correct API call', async () => {
    render(<AdminDashboard />);
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/dashboard/admin');
    });
  });

  it('displays trend indicators correctly', async () => {
    render(<AdminDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Today\'s Sales')).toBeInTheDocument();
    });
    
    // Should show upward trend
    expect(screen.getByText('+15% vs yesterday')).toBeInTheDocument();
  });

  it('handles low stock warning correctly', async () => {
    render(<AdminDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Total Products')).toBeInTheDocument();
    });
    
    // Should show attention needed status for low stock
    expect(screen.getByText('Attention Needed')).toBeInTheDocument();
  });

  it('displays system status as online', async () => {
    render(<AdminDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('System Status')).toBeInTheDocument();
    });
    
    expect(screen.getByText('All Systems Online')).toBeInTheDocument();
  });

  it('formats transaction times correctly', async () => {
    render(<AdminDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Recent Transactions')).toBeInTheDocument();
    });
    
    // Should display formatted time (exact format may vary by locale)
    const timeElements = screen.getAllByText(/\d{1,2}:\d{2}:\d{2}/);
    expect(timeElements.length).toBeGreaterThan(0);
  });
});
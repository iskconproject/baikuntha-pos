import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TransactionHistory } from '@/components/sales/TransactionHistory';

// Mock fetch globally
global.fetch = vi.fn();

describe('TransactionHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    // Mock fetch to never resolve
    (global.fetch as any).mockImplementation(() => new Promise(() => {}));

    render(<TransactionHistory />);
    
    expect(screen.getByText('Loading transactions...')).toBeInTheDocument();
  });

  it('renders transaction list when data is loaded', async () => {
    const mockTransactions = [
      {
        id: 'txn-1',
        userId: 'user-1',
        userName: 'Test User',
        subtotal: 500,
        tax: 0,
        discount: 0,
        total: 500,
        paymentMethod: 'cash' as const,
        paymentReference: 'CASH-123',
        status: 'completed' as const,
        createdAt: new Date('2024-01-01T10:00:00Z'),
        syncStatus: 'synced' as const,
        itemCount: 2,
        items: [
          {
            id: 'item-1',
            productId: 'prod-1',
            variantId: 'variant-1',
            quantity: 1,
            unitPrice: 300,
            totalPrice: 300,
          },
          {
            id: 'item-2',
            productId: 'prod-2',
            variantId: 'variant-2',
            quantity: 1,
            unitPrice: 200,
            totalPrice: 200,
          }
        ]
      }
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockTransactions,
        totalCount: 1,
      }),
    });

    render(<TransactionHistory />);

    await waitFor(() => {
      expect(screen.getByText('Recent Transactions')).toBeInTheDocument();
    });

    expect(screen.getByText('1 transaction found')).toBeInTheDocument();
    expect(screen.getByText('Transaction #txn-1')).toBeInTheDocument();
    expect(screen.getByText('₹500.00')).toBeInTheDocument();
    expect(screen.getByText('2 items')).toBeInTheDocument();
    expect(screen.getByText('cash')).toBeInTheDocument();
  });

  it('handles API error gracefully', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('API Error'));

    render(<TransactionHistory />);

    await waitFor(() => {
      expect(screen.getByText('Unable to load live data. Showing sample transactions.')).toBeInTheDocument();
    });
  });

  it('expands transaction details when clicked', async () => {
    const mockTransactions = [
      {
        id: 'txn-1',
        userId: 'user-1',
        userName: 'Test User',
        subtotal: 500,
        tax: 50,
        discount: 25,
        total: 525,
        paymentMethod: 'cash' as const,
        paymentReference: 'CASH-123',
        status: 'completed' as const,
        createdAt: new Date('2024-01-01T10:00:00Z'),
        syncStatus: 'synced' as const,
        itemCount: 1,
        items: [
          {
            id: 'item-1',
            productId: 'prod-1',
            variantId: 'variant-1',
            quantity: 1,
            unitPrice: 500,
            totalPrice: 500,
          }
        ]
      }
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockTransactions,
        totalCount: 1,
      }),
    });

    render(<TransactionHistory />);

    await waitFor(() => {
      expect(screen.getByText('Recent Transactions')).toBeInTheDocument();
    });

    // Click expand button
    const expandButton = screen.getByRole('button', { name: /expand/i });
    fireEvent.click(expandButton);

    // Check if expanded details are shown
    expect(screen.getByText('Subtotal:')).toBeInTheDocument();
    expect(screen.getByText('₹500.00')).toBeInTheDocument();
    expect(screen.getByText('Tax:')).toBeInTheDocument();
    expect(screen.getByText('₹50.00')).toBeInTheDocument();
    expect(screen.getByText('Discount:')).toBeInTheDocument();
    expect(screen.getByText('-₹25.00')).toBeInTheDocument();
    expect(screen.getByText('Items:')).toBeInTheDocument();
  });

  it('applies filters correctly', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: [],
        totalCount: 0,
      }),
    });

    render(<TransactionHistory showFilters={true} />);

    await waitFor(() => {
      expect(screen.getByText('Recent Transactions')).toBeInTheDocument();
    });

    // Change date filter
    const dateFilter = screen.getByDisplayValue('Today');
    fireEvent.change(dateFilter, { target: { value: 'week' } });

    // Change payment method filter
    const paymentFilter = screen.getByDisplayValue('All Methods');
    fireEvent.change(paymentFilter, { target: { value: 'upi' } });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('dateFilter=week&paymentMethod=upi')
      );
    });
  });

  it('clears filters when clear button is clicked', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: [],
        totalCount: 0,
      }),
    });

    render(<TransactionHistory showFilters={true} />);

    await waitFor(() => {
      expect(screen.getByText('Recent Transactions')).toBeInTheDocument();
    });

    // Change filters first
    const dateFilter = screen.getByDisplayValue('Today');
    fireEvent.change(dateFilter, { target: { value: 'week' } });

    // Click clear button
    const clearButton = screen.getByText('Clear');
    fireEvent.click(clearButton);

    // Check if filters are reset
    expect(screen.getByDisplayValue('Today')).toBeInTheDocument();
    expect(screen.getByDisplayValue('All Methods')).toBeInTheDocument();
  });

  it('shows empty state when no transactions found', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: [],
        totalCount: 0,
      }),
    });

    render(<TransactionHistory />);

    await waitFor(() => {
      expect(screen.getByText('No Transactions Found')).toBeInTheDocument();
    });

    expect(screen.getByText('No transactions match your current filters. Try adjusting the date range or payment method.')).toBeInTheDocument();
  });

  it('formats currency correctly', async () => {
    const mockTransactions = [
      {
        id: 'txn-1',
        userId: 'user-1',
        userName: 'Test User',
        subtotal: 1234.56,
        tax: 0,
        discount: 0,
        total: 1234.56,
        paymentMethod: 'cash' as const,
        status: 'completed' as const,
        createdAt: new Date(),
        syncStatus: 'synced' as const,
        itemCount: 1,
        items: []
      }
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockTransactions,
        totalCount: 1,
      }),
    });

    render(<TransactionHistory />);

    await waitFor(() => {
      expect(screen.getByText('₹1234.56')).toBeInTheDocument();
    });
  });

  it('displays sync status icons correctly', async () => {
    const mockTransactions = [
      {
        id: 'txn-1',
        userId: 'user-1',
        userName: 'Test User',
        subtotal: 500,
        tax: 0,
        discount: 0,
        total: 500,
        paymentMethod: 'cash' as const,
        status: 'completed' as const,
        createdAt: new Date(),
        syncStatus: 'synced' as const,
        itemCount: 1,
        items: []
      }
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockTransactions,
        totalCount: 1,
      }),
    });

    render(<TransactionHistory />);

    await waitFor(() => {
      // Check for synced status icon (checkmark)
      const syncIcon = screen.getByRole('img', { hidden: true });
      expect(syncIcon).toBeInTheDocument();
    });
  });
});
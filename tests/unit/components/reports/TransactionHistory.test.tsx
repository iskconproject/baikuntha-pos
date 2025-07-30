import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { TransactionHistory } from '@/components/reports/TransactionHistory';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockTransactionData = {
  transactions: [
    {
      id: 'txn-1',
      userId: 'user-1',
      userName: 'John Cashier',
      subtotal: 1000,
      tax: 100,
      discount: 50,
      total: 1050,
      paymentMethod: 'cash',
      paymentReference: null,
      status: 'completed',
      createdAt: '2024-01-15T10:30:00Z',
      itemCount: 2,
      items: [
        {
          productName: 'Bhagavad Gita',
          variantName: 'Hardcover',
          quantity: 1,
          unitPrice: 500,
          totalPrice: 500,
        },
        {
          productName: 'Tulsi Mala',
          variantName: null,
          quantity: 1,
          unitPrice: 500,
          totalPrice: 500,
        },
      ],
    },
    {
      id: 'txn-2',
      userId: 'user-2',
      userName: 'Jane Manager',
      subtotal: 750,
      tax: 75,
      discount: 0,
      total: 825,
      paymentMethod: 'upi',
      paymentReference: 'UPI123456',
      status: 'completed',
      createdAt: '2024-01-15T14:15:00Z',
      itemCount: 1,
      items: [
        {
          productName: 'Krishna Statue',
          variantName: 'Small',
          quantity: 1,
          unitPrice: 750,
          totalPrice: 750,
        },
      ],
    },
  ],
  totalCount: 2,
  page: 1,
  limit: 25,
  totalPages: 1,
};

describe('TransactionHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  it('renders loading state initially', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<TransactionHistory />);

    expect(screen.getByText('Loading transaction history...')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders transaction history data correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockTransactionData }),
    });

    render(<TransactionHistory />);

    await waitFor(() => {
      expect(screen.getByText('Transaction History')).toBeInTheDocument();
    });

    // Check transaction data
    expect(screen.getByText('John Cashier')).toBeInTheDocument();
    expect(screen.getByText('Jane Manager')).toBeInTheDocument();
    expect(screen.getByText('2 items')).toBeInTheDocument();
    expect(screen.getByText('1 items')).toBeInTheDocument();
    expect(screen.getByText('₹1,050.00')).toBeInTheDocument();
    expect(screen.getByText('₹825.00')).toBeInTheDocument();

    // Check payment methods
    expect(screen.getByText('Cash')).toBeInTheDocument();
    expect(screen.getByText('Upi')).toBeInTheDocument();
    expect(screen.getByText('UPI123456')).toBeInTheDocument();

    // Check pagination info
    expect(screen.getByText('Showing 1 to 2 of 2 transactions')).toBeInTheDocument();
  });

  it('displays error state when API call fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Failed to fetch transactions' }),
    });

    render(<TransactionHistory />);

    await waitFor(() => {
      expect(screen.getByText('Error: Failed to fetch transactions')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('displays no data message when no transactions are found', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ 
        success: true, 
        data: { ...mockTransactionData, transactions: [], totalCount: 0 } 
      }),
    });

    render(<TransactionHistory />);

    await waitFor(() => {
      expect(screen.getByText('No transactions found for the selected criteria')).toBeInTheDocument();
    });
  });

  it('applies filters correctly', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: mockTransactionData }),
    });

    render(<TransactionHistory />);

    await waitFor(() => {
      expect(screen.getByText('Transaction History')).toBeInTheDocument();
    });

    // Set start date filter
    const dateInputs = screen.getAllByDisplayValue('');
    const startDateInput = dateInputs.find(input => input.getAttribute('type') === 'date');
    fireEvent.change(startDateInput!, { target: { value: '2024-01-15' } });

    // Set end date filter
    const endDateInput = dateInputs.filter(input => input.getAttribute('type') === 'date')[1];
    fireEvent.change(endDateInput, { target: { value: '2024-01-15' } });

    // Set payment method filter
    const paymentMethodSelect = screen.getByRole('combobox');
    fireEvent.change(paymentMethodSelect, { target: { value: 'cash' } });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('startDate=2024-01-15&endDate=2024-01-15&paymentMethod=cash')
      );
    });
  });

  it('clears filters when clear button is clicked', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: mockTransactionData }),
    });

    render(<TransactionHistory />);

    await waitFor(() => {
      expect(screen.getByText('Transaction History')).toBeInTheDocument();
    });

    // Set some filters first
    const dateInputs = screen.getAllByDisplayValue('');
    const startDateInput = dateInputs.find(input => input.getAttribute('type') === 'date');
    fireEvent.change(startDateInput!, { target: { value: '2024-01-15' } });

    const paymentMethodSelect = screen.getByRole('combobox');
    fireEvent.change(paymentMethodSelect, { target: { value: 'cash' } });

    // Clear filters
    const clearButton = screen.getByRole('button', { name: 'Clear Filters' });
    fireEvent.click(clearButton);

    expect(startDateInput).toHaveValue('');
    expect(paymentMethodSelect).toHaveValue('');
  });

  it('expands and collapses transaction details', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockTransactionData }),
    });

    render(<TransactionHistory />);

    await waitFor(() => {
      expect(screen.getByText('Transaction History')).toBeInTheDocument();
    });

    // Initially, details should not be visible
    expect(screen.queryByText('Bhagavad Gita (Hardcover) x1')).not.toBeInTheDocument();

    // Click details button to expand
    const detailsButtons = screen.getAllByRole('button', { name: 'Details' });
    fireEvent.click(detailsButtons[0]);

    // Wait for details to be visible
    await waitFor(() => {
      expect(screen.getByText('Bhagavad Gita (Hardcover) x1')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Tulsi Mala x1')).toBeInTheDocument();
    expect(screen.getByText('Subtotal:')).toBeInTheDocument();
    expect(screen.getByText('Tax:')).toBeInTheDocument();
    expect(screen.getByText('Discount:')).toBeInTheDocument();

    // Click hide button to collapse
    const hideButton = screen.getByRole('button', { name: 'Hide' });
    fireEvent.click(hideButton);

    // Details should be hidden again
    expect(screen.queryByText('Bhagavad Gita (Hardcover) x1')).not.toBeInTheDocument();
  });

  it('handles pagination correctly', async () => {
    const paginatedData = {
      ...mockTransactionData,
      totalCount: 50,
      totalPages: 2,
      page: 1,
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: paginatedData }),
    });

    render(<TransactionHistory />);

    await waitFor(() => {
      expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
    });

    // Next button should be enabled
    const nextButton = screen.getByRole('button', { name: 'Next' });
    expect(nextButton).not.toBeDisabled();

    // Previous button should be disabled on first page
    const prevButton = screen.getByRole('button', { name: 'Previous' });
    expect(prevButton).toBeDisabled();

    // Click next page
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('page=2')
      );
    });
  });

  it('handles CSV export correctly', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockTransactionData }),
      })
      .mockResolvedValueOnce({
        ok: true,
        blob: async () => new Blob(['csv,data'], { type: 'text/csv' }),
      });

    // Mock document methods for download
    const mockAnchor = {
      href: '',
      download: '',
      click: vi.fn(),
    };
    const mockCreateElement = vi.fn(() => mockAnchor);
    const mockAppendChild = vi.fn();
    const mockRemoveChild = vi.fn();

    Object.defineProperty(document, 'createElement', {
      writable: true,
      value: mockCreateElement,
    });
    Object.defineProperty(document.body, 'appendChild', {
      writable: true,
      value: mockAppendChild,
    });
    Object.defineProperty(document.body, 'removeChild', {
      writable: true,
      value: mockRemoveChild,
    });

    // Mock URL methods
    Object.defineProperty(window.URL, 'createObjectURL', {
      writable: true,
      value: vi.fn(() => 'mock-url'),
    });
    Object.defineProperty(window.URL, 'revokeObjectURL', {
      writable: true,
      value: vi.fn(),
    });

    render(<TransactionHistory />);

    await waitFor(() => {
      expect(screen.getByText('Transaction History')).toBeInTheDocument();
    });

    const exportButton = screen.getByRole('button', { name: 'Export CSV' });
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/reports/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportType: 'transactions',
          format: 'csv',
          filters: {
            startDate: '',
            endDate: '',
            paymentMethod: '',
            search: '',
          },
        }),
      });
    });

    expect(mockAnchor.click).toHaveBeenCalled();
  });

  it('formats dates and times correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockTransactionData }),
    });

    render(<TransactionHistory />);

    await waitFor(() => {
      // Check date formatting
      expect(screen.getByText('Jan 15, 2024')).toBeInTheDocument();
      
      // Check time formatting
      expect(screen.getByText('10:30:00')).toBeInTheDocument();
      expect(screen.getByText('14:15:00')).toBeInTheDocument();
    });
  });

  it('displays variant names correctly in expanded details', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockTransactionData }),
    });

    render(<TransactionHistory />);

    await waitFor(() => {
      expect(screen.getByText('Transaction History')).toBeInTheDocument();
    });

    // Expand first transaction details
    const detailsButtons = screen.getAllByRole('button', { name: 'Details' });
    fireEvent.click(detailsButtons[0]);

    // Check that variant names are displayed
    expect(screen.getByText('Bhagavad Gita (Hardcover) x1')).toBeInTheDocument();
    expect(screen.getByText('Tulsi Mala x1')).toBeInTheDocument(); // No variant name
  });
});
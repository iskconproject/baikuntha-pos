import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { DailySalesReport } from '@/components/reports/DailySalesReport';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock window.open for export functionality
const mockWindowOpen = vi.fn();
Object.defineProperty(window, 'open', {
  writable: true,
  value: mockWindowOpen,
});

// Mock URL.createObjectURL and revokeObjectURL
Object.defineProperty(window.URL, 'createObjectURL', {
  writable: true,
  value: vi.fn(() => 'mock-url'),
});

Object.defineProperty(window.URL, 'revokeObjectURL', {
  writable: true,
  value: vi.fn(),
});

const mockDailySalesData = {
  date: new Date('2024-01-15'),
  totalSales: 15000,
  totalTransactions: 25,
  totalTax: 1500,
  totalDiscount: 500,
  paymentMethodBreakdown: {
    cash: { count: 15, amount: 9000 },
    upi: { count: 10, amount: 6000 },
  },
  topProducts: [
    {
      productId: '1',
      productName: 'Bhagavad Gita',
      categoryName: 'Books',
      totalQuantity: 10,
      totalRevenue: 2500,
      transactionCount: 8,
    },
    {
      productId: '2',
      productName: 'Tulsi Mala',
      categoryName: 'Accessories',
      totalQuantity: 5,
      totalRevenue: 750,
      transactionCount: 5,
    },
  ],
};

describe('DailySalesReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders loading state initially', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<DailySalesReport selectedDate="2024-01-15" />);

    expect(screen.getByText('Loading daily sales report...')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders daily sales report data correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockDailySalesData }),
    });

    render(<DailySalesReport selectedDate="2024-01-15" />);

    await waitFor(() => {
      expect(screen.getByText('Daily Sales Report - January 15, 2024')).toBeInTheDocument();
    });

    // Check key metrics cards
    expect(screen.getByText('₹15,000.00')).toBeInTheDocument(); // Total Sales
    expect(screen.getByText('25')).toBeInTheDocument(); // Total Transactions
    expect(screen.getByText('₹1,500.00')).toBeInTheDocument(); // Tax Collected
    expect(screen.getByText('₹500.00')).toBeInTheDocument(); // Discounts Given

    // Check payment method breakdown
    expect(screen.getByText('15 transactions')).toBeInTheDocument(); // Cash transactions
    expect(screen.getByText('10 transactions')).toBeInTheDocument(); // UPI transactions
    expect(screen.getByText('₹9,000.00')).toBeInTheDocument(); // Cash amount
    expect(screen.getByText('₹6,000.00')).toBeInTheDocument(); // UPI amount

    // Check top products table
    expect(screen.getByText('Bhagavad Gita')).toBeInTheDocument();
    expect(screen.getByText('Tulsi Mala')).toBeInTheDocument();
    expect(screen.getByText('Books')).toBeInTheDocument();
    expect(screen.getByText('Accessories')).toBeInTheDocument();
  });

  it('displays error state when API call fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Failed to fetch data' }),
    });

    render(<DailySalesReport selectedDate="2024-01-15" />);

    await waitFor(() => {
      expect(screen.getByText('Error: Failed to fetch data')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('displays no data message when no data is available', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: null }),
    });

    render(<DailySalesReport selectedDate="2024-01-15" />);

    await waitFor(() => {
      expect(screen.getByText('No data available for the selected date')).toBeInTheDocument();
    });
  });

  it('refetches data when selectedDate prop changes', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: mockDailySalesData }),
    });

    const { rerender } = render(<DailySalesReport selectedDate="2024-01-15" />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/reports/daily?date=2024-01-15');
    });

    rerender(<DailySalesReport selectedDate="2024-01-16" />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/reports/daily?date=2024-01-16');
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('handles CSV export correctly', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockDailySalesData }),
      })
      .mockResolvedValueOnce({
        ok: true,
        blob: async () => new Blob(['csv,data'], { type: 'text/csv' }),
      });

    // Mock document.createElement and appendChild
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

    render(<DailySalesReport selectedDate="2024-01-15" />);

    await waitFor(() => {
      expect(screen.getByText('Daily Sales Report - January 15, 2024')).toBeInTheDocument();
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
          reportType: 'daily-sales',
          format: 'csv',
          filters: { startDate: '2024-01-15' },
        }),
      });
    });

    expect(mockCreateElement).toHaveBeenCalledWith('a');
    expect(mockAnchor.download).toBe('daily_sales_2024-01-15.csv');
    expect(mockAnchor.click).toHaveBeenCalled();
  });

  it('handles PDF export correctly', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockDailySalesData }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => '<html><body>PDF content</body></html>',
      });

    const mockPrintWindow = {
      document: {
        write: vi.fn(),
        close: vi.fn(),
      },
      focus: vi.fn(),
      print: vi.fn(),
      close: vi.fn(),
    };

    mockWindowOpen.mockReturnValue(mockPrintWindow);

    render(<DailySalesReport selectedDate="2024-01-15" />);

    await waitFor(() => {
      expect(screen.getByText('Daily Sales Report - January 15, 2024')).toBeInTheDocument();
    });

    const exportButton = screen.getByRole('button', { name: 'Export PDF' });
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/reports/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportType: 'daily-sales',
          format: 'pdf',
          filters: { startDate: '2024-01-15' },
        }),
      });
    });

    expect(mockWindowOpen).toHaveBeenCalledWith('', '_blank');
    expect(mockPrintWindow.document.write).toHaveBeenCalledWith('<html><body>PDF content</body></html>');
  });

  it('calculates payment method percentages correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockDailySalesData }),
    });

    render(<DailySalesReport selectedDate="2024-01-15" />);

    await waitFor(() => {
      expect(screen.getByText('60.0% of total')).toBeInTheDocument(); // Cash percentage
      expect(screen.getByText('40.0% of total')).toBeInTheDocument(); // UPI percentage
    });
  });

  it('displays visual chart elements', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockDailySalesData }),
    });

    render(<DailySalesReport selectedDate="2024-01-15" />);

    await waitFor(() => {
      // Check for chart legend elements
      expect(screen.getByText('Cash')).toBeInTheDocument();
      expect(screen.getByText('UPI')).toBeInTheDocument();
      
      // Check for visual indicators (colored squares)
      const coloredElements = document.querySelectorAll('.bg-green-500, .bg-blue-500');
      expect(coloredElements.length).toBeGreaterThan(0);
    });
  });

  it('retries data fetch when retry button is clicked', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Network error' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockDailySalesData }),
      });

    render(<DailySalesReport selectedDate="2024-01-15" />);

    await waitFor(() => {
      expect(screen.getByText('Error: Network error')).toBeInTheDocument();
    });

    const retryButton = screen.getByRole('button', { name: 'Retry' });
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText('Daily Sales Report - January 15, 2024')).toBeInTheDocument();
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
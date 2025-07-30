import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ProductPerformance } from '@/components/reports/ProductPerformance';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockProductData = [
  {
    productId: 'prod-1',
    productName: 'Bhagavad Gita',
    categoryName: 'Books',
    totalQuantity: 50,
    totalRevenue: 12500,
    transactionCount: 25,
    averageOrderValue: 500,
    lastSoldAt: '2024-01-15T10:30:00Z',
    currentStock: 20,
  },
  {
    productId: 'prod-2',
    productName: 'Tulsi Mala',
    categoryName: 'Accessories',
    totalQuantity: 30,
    totalRevenue: 4500,
    transactionCount: 30,
    averageOrderValue: 150,
    lastSoldAt: '2024-01-14T14:15:00Z',
    currentStock: 5,
  },
  {
    productId: 'prod-3',
    productName: 'Krishna Statue',
    categoryName: 'Idols',
    totalQuantity: 10,
    totalRevenue: 7500,
    transactionCount: 10,
    averageOrderValue: 750,
    lastSoldAt: null,
    currentStock: 0,
  },
];

describe('ProductPerformance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders loading state initially', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<ProductPerformance />);

    expect(screen.getByText('Loading product performance data...')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders product performance data correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockProductData }),
    });

    render(<ProductPerformance />);

    await waitFor(() => {
      expect(screen.getByText('Product Performance Analytics')).toBeInTheDocument();
    });

    // Check summary cards
    expect(screen.getByText('3')).toBeInTheDocument(); // Total Products
    expect(screen.getByText('₹24,500.00')).toBeInTheDocument(); // Total Revenue
    expect(screen.getByText('90')).toBeInTheDocument(); // Total Quantity Sold

    // Check product data in table
    expect(screen.getByText('Bhagavad Gita')).toBeInTheDocument();
    expect(screen.getByText('Tulsi Mala')).toBeInTheDocument();
    expect(screen.getByText('Krishna Statue')).toBeInTheDocument();

    // Check categories
    expect(screen.getByText('Books')).toBeInTheDocument();
    expect(screen.getByText('Accessories')).toBeInTheDocument();
    expect(screen.getByText('Idols')).toBeInTheDocument();

    // Check quantities and revenues
    expect(screen.getByText('50')).toBeInTheDocument(); // Bhagavad Gita quantity
    expect(screen.getByText('₹12,500.00')).toBeInTheDocument(); // Bhagavad Gita revenue
  });

  it('renders top-selling products when reportType is top-selling', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockProductData }),
    });

    render(<ProductPerformance reportType="top-selling" />);

    await waitFor(() => {
      expect(screen.getByText('Top Selling Products')).toBeInTheDocument();
    });

    // Should not show performance-specific columns
    expect(screen.queryByText('Current Stock')).not.toBeInTheDocument();
    expect(screen.queryByText('Last Sold')).not.toBeInTheDocument();
  });

  it('displays error state when API call fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Failed to fetch product data' }),
    });

    render(<ProductPerformance />);

    await waitFor(() => {
      expect(screen.getByText('Error: Failed to fetch product data')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('displays no data message when no products are found', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    });

    render(<ProductPerformance />);

    await waitFor(() => {
      expect(screen.getByText('No product performance data available for the selected criteria')).toBeInTheDocument();
    });
  });

  it('applies filters correctly', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: mockProductData }),
    });

    render(<ProductPerformance />);

    await waitFor(() => {
      expect(screen.getByText('Product Performance Analytics')).toBeInTheDocument();
    });

    // Set start date filter
    const dateInputs = screen.getAllByDisplayValue('');
    const startDateInput = dateInputs.find(input => input.getAttribute('type') === 'date');
    fireEvent.change(startDateInput!, { target: { value: '2024-01-01' } });

    // Set end date filter
    const endDateInput = dateInputs.filter(input => input.getAttribute('type') === 'date')[1];
    fireEvent.change(endDateInput, { target: { value: '2024-01-31' } });

    // Set limit
    const limitSelect = screen.getByRole('combobox');
    fireEvent.change(limitSelect, { target: { value: '25' } });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('startDate=2024-01-01&endDate=2024-01-31&limit=25')
      );
    });
  });

  it('clears filters when clear button is clicked', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: mockProductData }),
    });

    render(<ProductPerformance />);

    await waitFor(() => {
      expect(screen.getByText('Product Performance Analytics')).toBeInTheDocument();
    });

    // Set some filters first
    const dateInputs = screen.getAllByDisplayValue('');
    const startDateInput = dateInputs.find(input => input.getAttribute('type') === 'date');
    fireEvent.change(startDateInput!, { target: { value: '2024-01-01' } });

    // Clear filters
    const clearButton = screen.getByRole('button', { name: 'Clear Filters' });
    fireEvent.click(clearButton);

    expect(startDateInput).toHaveValue('');
  });

  it('displays stock levels with correct color coding', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockProductData }),
    });

    render(<ProductPerformance />);

    await waitFor(() => {
      expect(screen.getByText('Product Performance Analytics')).toBeInTheDocument();
    });

    // Check stock level indicators
    const stockElements = screen.getAllByText(/^\d+$/);
    
    // Find stock values in the table
    const stockCells = document.querySelectorAll('td span.inline-flex');
    expect(stockCells.length).toBeGreaterThan(0);

    // Check for different stock level colors
    const greenStock = document.querySelector('.bg-green-100'); // High stock
    const yellowStock = document.querySelector('.bg-yellow-100'); // Low stock
    const redStock = document.querySelector('.bg-red-100'); // Out of stock

    expect(greenStock || yellowStock || redStock).toBeTruthy();
  });

  it('formats last sold dates correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockProductData }),
    });

    render(<ProductPerformance />);

    await waitFor(() => {
      expect(screen.getByText('Product Performance Analytics')).toBeInTheDocument();
    });

    // Check formatted dates
    expect(screen.getByText('1/15/2024')).toBeInTheDocument(); // Bhagavad Gita
    expect(screen.getByText('1/14/2024')).toBeInTheDocument(); // Tulsi Mala
    expect(screen.getByText('Never')).toBeInTheDocument(); // Krishna Statue (null date)
  });

  it('displays ranking numbers correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockProductData }),
    });

    render(<ProductPerformance />);

    await waitFor(() => {
      expect(screen.getByText('Product Performance Analytics')).toBeInTheDocument();
    });

    // Check ranking circles
    expect(screen.getByText('1')).toBeInTheDocument(); // First product
    expect(screen.getByText('2')).toBeInTheDocument(); // Second product
    expect(screen.getByText('3')).toBeInTheDocument(); // Third product
  });

  it('handles CSV export correctly', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockProductData }),
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

    render(<ProductPerformance />);

    await waitFor(() => {
      expect(screen.getByText('Product Performance Analytics')).toBeInTheDocument();
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
          reportType: 'products',
          format: 'csv',
          filters: {
            startDate: '',
            endDate: '',
            categoryId: '',
          },
        }),
      });
    });

    expect(mockAnchor.click).toHaveBeenCalled();
  });

  it('calculates summary statistics correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockProductData }),
    });

    render(<ProductPerformance />);

    await waitFor(() => {
      expect(screen.getByText('Product Performance Analytics')).toBeInTheDocument();
    });

    // Total products: 3
    expect(screen.getByText('3')).toBeInTheDocument();

    // Total revenue: 12500 + 4500 + 7500 = 24500
    expect(screen.getByText('₹24,500.00')).toBeInTheDocument();

    // Total quantity: 50 + 30 + 10 = 90
    expect(screen.getByText('90')).toBeInTheDocument();

    // Average order value: (500 + 150 + 750) / 3 = 466.67
    expect(screen.getByText('₹466.67')).toBeInTheDocument();
  });

  it('refetches data when filters change', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: mockProductData }),
    });

    render(<ProductPerformance />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    // Change limit filter
    const limitSelect = screen.getByRole('combobox');
    fireEvent.change(limitSelect, { target: { value: '100' } });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenLastCalledWith(
        expect.stringContaining('limit=100')
      );
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
        json: async () => ({ success: true, data: mockProductData }),
      });

    render(<ProductPerformance />);

    await waitFor(() => {
      expect(screen.getByText('Error: Network error')).toBeInTheDocument();
    });

    const retryButton = screen.getByRole('button', { name: 'Retry' });
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText('Product Performance Analytics')).toBeInTheDocument();
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
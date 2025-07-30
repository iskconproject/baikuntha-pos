import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ReportScheduler } from '@/components/reports/ReportScheduler';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock window.confirm
const mockConfirm = vi.fn();
Object.defineProperty(window, 'confirm', {
  writable: true,
  value: mockConfirm,
});

// Mock window.alert
const mockAlert = vi.fn();
Object.defineProperty(window, 'alert', {
  writable: true,
  value: mockAlert,
});

const mockScheduledReports = [
  {
    id: 'report-1',
    name: 'Daily Sales Summary',
    reportType: 'daily-sales',
    frequency: 'daily',
    format: 'csv',
    recipients: ['manager@temple.com'],
    filters: { startDate: '2024-01-01' },
    isActive: true,
    nextRun: new Date('2024-01-16T09:00:00Z'),
    lastRun: new Date('2024-01-15T09:00:00Z'),
    createdAt: new Date('2024-01-01T00:00:00Z'),
  },
  {
    id: 'report-2',
    name: 'Weekly Product Performance',
    reportType: 'products',
    frequency: 'weekly',
    format: 'pdf',
    recipients: ['admin@temple.com', 'manager@temple.com'],
    filters: {},
    isActive: false,
    nextRun: new Date('2024-01-22T09:00:00Z'),
    lastRun: null,
    createdAt: new Date('2024-01-01T00:00:00Z'),
  },
];

describe('ReportScheduler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders loading state initially', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<ReportScheduler />);

    expect(screen.getByText('Loading scheduled reports...')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders scheduled reports correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockScheduledReports }),
    });

    render(<ReportScheduler />);

    await waitFor(() => {
      expect(screen.getByText('Scheduled Reports')).toBeInTheDocument();
    });

    // Check report data
    expect(screen.getByText('Daily Sales Summary')).toBeInTheDocument();
    expect(screen.getByText('Weekly Product Performance')).toBeInTheDocument();
    expect(screen.getByText('Daily Sales')).toBeInTheDocument();
    expect(screen.getByText('Product Performance')).toBeInTheDocument();
    expect(screen.getByText('Daily')).toBeInTheDocument();
    expect(screen.getByText('Weekly')).toBeInTheDocument();
    expect(screen.getByText('CSV')).toBeInTheDocument();
    expect(screen.getByText('PDF')).toBeInTheDocument();

    // Check status indicators
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();

    // Check recipients
    expect(screen.getByText('Recipients: manager@temple.com')).toBeInTheDocument();
    expect(screen.getByText('Recipients: admin@temple.com, manager@temple.com')).toBeInTheDocument();
  });

  it('displays error state when API call fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Failed to fetch scheduled reports' }),
    });

    render(<ReportScheduler />);

    await waitFor(() => {
      expect(screen.getByText('Error: Failed to fetch scheduled reports')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('displays empty state when no reports exist', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    });

    render(<ReportScheduler />);

    await waitFor(() => {
      expect(screen.getByText('No scheduled reports')).toBeInTheDocument();
      expect(screen.getByText('Create your first scheduled report to automate report generation and delivery.')).toBeInTheDocument();
    });
  });

  it('opens create modal when create button is clicked', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    });

    render(<ReportScheduler />);

    await waitFor(() => {
      expect(screen.getByText('No scheduled reports')).toBeInTheDocument();
    });

    const createButton = screen.getByRole('button', { name: 'Create Scheduled Report' });
    fireEvent.click(createButton);

    expect(screen.getByText('Create Scheduled Report')).toBeInTheDocument();
    expect(screen.getByLabelText('Report Name *')).toBeInTheDocument();
  });

  it('toggles report status correctly', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockScheduledReports }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

    render(<ReportScheduler />);

    await waitFor(() => {
      expect(screen.getByText('Scheduled Reports')).toBeInTheDocument();
    });

    // Find and click disable button for active report
    const disableButtons = screen.getAllByRole('button', { name: 'Disable' });
    fireEvent.click(disableButtons[0]);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/reports/scheduled/report-1', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: false }),
      });
    });
  });

  it('deletes report with confirmation', async () => {
    mockConfirm.mockReturnValue(true);
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockScheduledReports }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

    render(<ReportScheduler />);

    await waitFor(() => {
      expect(screen.getByText('Scheduled Reports')).toBeInTheDocument();
    });

    // Find and click delete button
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
    fireEvent.click(deleteButtons[0]);

    expect(mockConfirm).toHaveBeenCalledWith('Are you sure you want to delete this scheduled report?');

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/reports/scheduled/report-1', {
        method: 'DELETE',
      });
    });
  });

  it('cancels delete when user declines confirmation', async () => {
    mockConfirm.mockReturnValue(false);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockScheduledReports }),
    });

    render(<ReportScheduler />);

    await waitFor(() => {
      expect(screen.getByText('Scheduled Reports')).toBeInTheDocument();
    });

    // Find and click delete button
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
    fireEvent.click(deleteButtons[0]);

    expect(mockConfirm).toHaveBeenCalled();
    
    // Should not make delete API call
    expect(mockFetch).toHaveBeenCalledTimes(1); // Only the initial fetch
  });

  it('runs report immediately', async () => {
    mockAlert.mockImplementation(() => {});
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockScheduledReports }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Report queued' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockScheduledReports }),
      });

    render(<ReportScheduler />);

    await waitFor(() => {
      expect(screen.getByText('Scheduled Reports')).toBeInTheDocument();
    });

    // Find and click run now button
    const runButtons = screen.getAllByRole('button', { name: 'Run Now' });
    fireEvent.click(runButtons[0]);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/reports/scheduled/report-1/run', {
        method: 'POST',
      });
    });

    expect(mockAlert).toHaveBeenCalledWith('Report has been queued for generation');
  });

  it('creates new scheduled report successfully', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { id: 'new-report' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      });

    render(<ReportScheduler />);

    await waitFor(() => {
      expect(screen.getByText('No scheduled reports')).toBeInTheDocument();
    });

    // Open create modal
    const createButton = screen.getByRole('button', { name: 'Create Scheduled Report' });
    fireEvent.click(createButton);

    // Fill form
    const nameInput = screen.getByPlaceholderText('e.g., Daily Sales Summary');
    fireEvent.change(nameInput, { target: { value: 'Test Report' } });

    const selects = screen.getAllByRole('combobox');
    const reportTypeSelect = selects[0];
    fireEvent.change(reportTypeSelect, { target: { value: 'transactions' } });

    const frequencySelect = selects[1];
    fireEvent.change(frequencySelect, { target: { value: 'weekly' } });

    const formatSelect = selects[2];
    fireEvent.change(formatSelect, { target: { value: 'pdf' } });

    const recipientsInput = screen.getByPlaceholderText('email1@example.com, email2@example.com');
    fireEvent.change(recipientsInput, { target: { value: 'test@example.com' } });

    // Submit form
    const submitButton = screen.getByRole('button', { name: 'Create Report' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/reports/scheduled', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Test Report',
          reportType: 'transactions',
          frequency: 'weekly',
          format: 'pdf',
          recipients: ['test@example.com'],
          filters: {
            startDate: expect.any(String),
            categoryId: undefined,
          },
        }),
      });
    });
  });

  it('validates required fields in create form', async () => {
    mockAlert.mockImplementation(() => {});
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    });

    render(<ReportScheduler />);

    await waitFor(() => {
      expect(screen.getByText('No scheduled reports')).toBeInTheDocument();
    });

    // Open create modal
    const createButton = screen.getByRole('button', { name: 'Create Scheduled Report' });
    fireEvent.click(createButton);

    // Try to submit without name
    const submitButton = screen.getByRole('button', { name: 'Create Report' });
    fireEvent.click(submitButton);

    expect(mockAlert).toHaveBeenCalledWith('Please enter a report name');
  });

  it('handles create form errors gracefully', async () => {
    mockAlert.mockImplementation(() => {});
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Validation failed' }),
      });

    render(<ReportScheduler />);

    await waitFor(() => {
      expect(screen.getByText('No scheduled reports')).toBeInTheDocument();
    });

    // Open create modal and fill form
    const createButton = screen.getByRole('button', { name: 'Create Scheduled Report' });
    fireEvent.click(createButton);

    const nameInput = screen.getByPlaceholderText('e.g., Daily Sales Summary');
    fireEvent.change(nameInput, { target: { value: 'Test Report' } });

    const submitButton = screen.getByRole('button', { name: 'Create Report' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Validation failed');
    });
  });

  it('closes create modal when cancel is clicked', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    });

    render(<ReportScheduler />);

    await waitFor(() => {
      expect(screen.getByText('No scheduled reports')).toBeInTheDocument();
    });

    // Open create modal
    const createButton = screen.getByRole('button', { name: 'Create Scheduled Report' });
    fireEvent.click(createButton);

    expect(screen.getByText('Create Scheduled Report')).toBeInTheDocument();

    // Click cancel
    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelButton);

    expect(screen.queryByText('Create Scheduled Report')).not.toBeInTheDocument();
  });

  it('formats frequency and report type labels correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockScheduledReports }),
    });

    render(<ReportScheduler />);

    await waitFor(() => {
      expect(screen.getByText('Daily Sales')).toBeInTheDocument(); // daily-sales -> Daily Sales
      expect(screen.getByText('Product Performance')).toBeInTheDocument(); // products -> Product Performance
      expect(screen.getByText('Daily')).toBeInTheDocument(); // daily -> Daily
      expect(screen.getByText('Weekly')).toBeInTheDocument(); // weekly -> Weekly
    });
  });

  it('formats next run dates correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockScheduledReports }),
    });

    render(<ReportScheduler />);

    await waitFor(() => {
      // Check that dates are formatted properly
      expect(screen.getByText(/Jan \d{2}, \d{4} \d{2}:\d{2}/)).toBeInTheDocument();
    });
  });
});
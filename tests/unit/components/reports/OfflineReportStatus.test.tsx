import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { OfflineReportStatus } from '@/components/reports/OfflineReportStatus';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockSyncStatus = {
  isActive: false,
  progress: 0,
  message: 'All reports up to date',
  lastSyncTime: new Date('2024-01-15T10:30:00Z'),
  pendingReports: 0,
};

describe('OfflineReportStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('renders online status correctly', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockSyncStatus,
    });

    render(<OfflineReportStatus isOnline={true} />);

    await waitFor(() => {
      expect(screen.getByText('Report Status')).toBeInTheDocument();
      expect(screen.getByText('Online')).toBeInTheDocument();
      expect(screen.getByText('All reports synced')).toBeInTheDocument();
      expect(screen.getByText('All reports up to date')).toBeInTheDocument();
    });

    // Check for green status indicator
    const statusIndicator = document.querySelector('.bg-green-500');
    expect(statusIndicator).toBeInTheDocument();
  });

  it('renders offline status correctly', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockSyncStatus,
    });

    render(<OfflineReportStatus isOnline={false} />);

    await waitFor(() => {
      expect(screen.getByText('Offline')).toBeInTheDocument();
      expect(screen.getByText('Offline - Reports available locally')).toBeInTheDocument();
    });

    // Check for red status indicator
    const statusIndicator = document.querySelector('.bg-red-500');
    expect(statusIndicator).toBeInTheDocument();

    // Check for offline mode warning
    expect(screen.getByText('Offline Mode:')).toBeInTheDocument();
    expect(screen.getByText(/Reports are generated from local data/)).toBeInTheDocument();
  });

  it('displays sync in progress status', async () => {
    const activeSyncStatus = {
      ...mockSyncStatus,
      isActive: true,
      progress: 45,
      message: 'Syncing data...',
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => activeSyncStatus,
    });

    render(<OfflineReportStatus isOnline={true} />);

    await waitFor(() => {
      expect(screen.getByText('Syncing... 45%')).toBeInTheDocument();
      expect(screen.getByText('Syncing data...')).toBeInTheDocument();
    });

    // Check for yellow status indicator
    const statusIndicator = document.querySelector('.bg-yellow-500');
    expect(statusIndicator).toBeInTheDocument();

    // Check for progress bar
    const progressBar = document.querySelector('[style*="width: 45%"]');
    expect(progressBar).toBeInTheDocument();
  });

  it('displays pending reports status', async () => {
    const pendingSyncStatus = {
      ...mockSyncStatus,
      pendingReports: 5,
      message: '5 transactions pending sync',
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => pendingSyncStatus,
    });

    render(<OfflineReportStatus isOnline={true} />);

    await waitFor(() => {
      expect(screen.getByText('5 reports pending sync')).toBeInTheDocument();
      expect(screen.getByText('5 transactions pending sync')).toBeInTheDocument();
    });

    // Check for orange status indicator
    const statusIndicator = document.querySelector('.bg-orange-500');
    expect(statusIndicator).toBeInTheDocument();

    // Check for sync now button
    expect(screen.getByRole('button', { name: 'Sync Now' })).toBeInTheDocument();
  });

  it('displays last sync time when available', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockSyncStatus,
    });

    render(<OfflineReportStatus isOnline={true} />);

    await waitFor(() => {
      expect(screen.getByText(/Last sync:/)).toBeInTheDocument();
      // The exact format depends on locale, so we just check for the presence
      expect(screen.getByText(/2024/)).toBeInTheDocument();
    });
  });

  it('triggers manual sync when sync now button is clicked', async () => {
    const pendingSyncStatus = {
      ...mockSyncStatus,
      pendingReports: 3,
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => pendingSyncStatus,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...pendingSyncStatus, pendingReports: 0 }),
      });

    render(<OfflineReportStatus isOnline={true} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Sync Now' })).toBeInTheDocument();
    });

    const syncButton = screen.getByRole('button', { name: 'Sync Now' });
    fireEvent.click(syncButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/sync/trigger', { method: 'POST' });
    });
  });

  it('handles sync trigger errors gracefully', async () => {
    const pendingSyncStatus = {
      ...mockSyncStatus,
      pendingReports: 3,
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => pendingSyncStatus,
      })
      .mockRejectedValueOnce(new Error('Network error'));

    render(<OfflineReportStatus isOnline={true} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Sync Now' })).toBeInTheDocument();
    });

    const syncButton = screen.getByRole('button', { name: 'Sync Now' });
    fireEvent.click(syncButton);

    await waitFor(() => {
      expect(screen.getByText('Sync failed - will retry automatically')).toBeInTheDocument();
    });
  });

  it('periodically checks sync status', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockSyncStatus,
    });

    render(<OfflineReportStatus isOnline={true} />);

    // Initial call
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    // Advance time by 30 seconds
    vi.advanceTimersByTime(30000);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    // Advance time by another 30 seconds
    vi.advanceTimersByTime(30000);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  it('handles sync status check errors silently', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    mockFetch.mockRejectedValue(new Error('Network error'));

    render(<OfflineReportStatus isOnline={true} />);

    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith('Failed to check sync status:', expect.any(Error));
    });

    // Component should still render with default state
    expect(screen.getByText('Report Status')).toBeInTheDocument();

    consoleError.mockRestore();
  });

  it('cleans up interval on unmount', async () => {
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
    
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockSyncStatus,
    });

    const { unmount } = render(<OfflineReportStatus isOnline={true} />);

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
    
    clearIntervalSpy.mockRestore();
  });

  it('updates status when isOnline prop changes', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockSyncStatus,
    });

    const { rerender } = render(<OfflineReportStatus isOnline={true} />);

    await waitFor(() => {
      expect(screen.getByText('Online')).toBeInTheDocument();
    });

    rerender(<OfflineReportStatus isOnline={false} />);

    expect(screen.getByText('Offline')).toBeInTheDocument();
    expect(screen.getByText('Offline - Reports available locally')).toBeInTheDocument();
  });

  it('does not show sync now button when offline', async () => {
    const pendingSyncStatus = {
      ...mockSyncStatus,
      pendingReports: 3,
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => pendingSyncStatus,
    });

    render(<OfflineReportStatus isOnline={false} />);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Sync Now' })).not.toBeInTheDocument();
    });
  });

  it('does not show sync now button when sync is active', async () => {
    const activeSyncStatus = {
      ...mockSyncStatus,
      isActive: true,
      pendingReports: 3,
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => activeSyncStatus,
    });

    render(<OfflineReportStatus isOnline={true} />);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Sync Now' })).not.toBeInTheDocument();
    });
  });

  it('shows sync now button only when online with pending reports and not syncing', async () => {
    const pendingSyncStatus = {
      ...mockSyncStatus,
      isActive: false,
      pendingReports: 3,
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => pendingSyncStatus,
    });

    render(<OfflineReportStatus isOnline={true} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Sync Now' })).toBeInTheDocument();
    });
  });
});
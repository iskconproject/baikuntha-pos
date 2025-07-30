import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OfflineNotification, OfflineStatusBadge } from '@/components/common/OfflineNotification';
import { offlineQueue } from '@/services/database/offlineQueue';

// Mock dependencies
vi.mock('@/services/database/offlineQueue');
vi.mock('@/lib/utils/connection');

const mockOfflineQueue = vi.mocked(offlineQueue);

describe('OfflineNotification', () => {
  const mockQueueStats = {
    totalOperations: 0,
    pendingOperations: 0,
    failedOperations: 0,
    completedOperations: 0
  };

  const mockConnectionStatus = {
    isOnline: true,
    connectionType: 'wifi' as const,
    effectiveType: '4g' as const,
    downlink: 10,
    rtt: 50
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockOfflineQueue.subscribe = vi.fn((callback) => {
      callback(mockQueueStats);
      return vi.fn(); // unsubscribe function
    });

    // Mock useConnectionStatus hook
    vi.doMock('@/lib/utils/connection', () => ({
      useConnectionStatus: () => mockConnectionStatus
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not render when online with no pending operations', () => {
    const { container } = render(<OfflineNotification />);
    expect(container.firstChild).toBeNull();
  });

  it('renders offline notification when offline', () => {
    const offlineConnection = { ...mockConnectionStatus, isOnline: false };
    
    vi.doMock('@/lib/utils/connection', () => ({
      useConnectionStatus: () => offlineConnection
    }));

    render(<OfflineNotification />);
    
    expect(screen.getByText('Working Offline')).toBeInTheDocument();
    expect(screen.getByText(/no internet connection/i)).toBeInTheDocument();
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('renders sync notification when operations are pending', () => {
    const queueStatsWithPending = {
      ...mockQueueStats,
      totalOperations: 5,
      pendingOperations: 3,
      failedOperations: 2
    };

    mockOfflineQueue.subscribe = vi.fn((callback) => {
      callback(queueStatsWithPending);
      return vi.fn();
    });

    render(<OfflineNotification />);
    
    expect(screen.getByText('Syncing Changes')).toBeInTheDocument();
    expect(screen.getByText(/3 operations pending sync/i)).toBeInTheDocument();
    expect(screen.getByText('Syncing')).toBeInTheDocument();
  });

  it('shows queue details when operations are present', () => {
    const queueStatsWithOperations = {
      ...mockQueueStats,
      totalOperations: 5,
      pendingOperations: 3,
      failedOperations: 2
    };

    mockOfflineQueue.subscribe = vi.fn((callback) => {
      callback(queueStatsWithOperations);
      return vi.fn();
    });

    render(<OfflineNotification />);
    
    expect(screen.getByText('Pending: 3')).toBeInTheDocument();
    expect(screen.getByText('Failed: 2')).toBeInTheDocument();
  });

  it('shows feature limitations when offline and enabled', () => {
    const offlineConnection = { ...mockConnectionStatus, isOnline: false };
    
    vi.doMock('@/lib/utils/connection', () => ({
      useConnectionStatus: () => offlineConnection
    }));

    render(<OfflineNotification showFeatureLimitations={true} />);
    
    expect(screen.getByText('Limited Features in Offline Mode:')).toBeInTheDocument();
    expect(screen.getByText(/cloud reports and analytics unavailable/i)).toBeInTheDocument();
    expect(screen.getByText(/real-time inventory sync disabled/i)).toBeInTheDocument();
    expect(screen.getByText(/user management restricted/i)).toBeInTheDocument();
    expect(screen.getByText(/receipt printing may be limited/i)).toBeInTheDocument();
  });

  it('hides feature limitations when disabled', () => {
    const offlineConnection = { ...mockConnectionStatus, isOnline: false };
    
    vi.doMock('@/lib/utils/connection', () => ({
      useConnectionStatus: () => offlineConnection
    }));

    render(<OfflineNotification showFeatureLimitations={false} />);
    
    expect(screen.queryByText('Limited Features in Offline Mode:')).not.toBeInTheDocument();
  });

  it('can be dismissed', async () => {
    const offlineConnection = { ...mockConnectionStatus, isOnline: false };
    
    vi.doMock('@/lib/utils/connection', () => ({
      useConnectionStatus: () => offlineConnection
    }));

    render(<OfflineNotification />);
    
    expect(screen.getByText('Working Offline')).toBeInTheDocument();
    
    const dismissButton = screen.getByRole('button');
    fireEvent.click(dismissButton);

    await waitFor(() => {
      expect(screen.queryByText('Working Offline')).not.toBeInTheDocument();
    });
  });

  it('reappears after dismissal when conditions change', async () => {
    let connectionStatus = { ...mockConnectionStatus, isOnline: true };
    let queueStats = { ...mockQueueStats };

    const mockUseConnectionStatus = vi.fn(() => connectionStatus);
    const mockSubscribe = vi.fn((callback) => {
      callback(queueStats);
      return vi.fn();
    });

    vi.doMock('@/lib/utils/connection', () => ({
      useConnectionStatus: mockUseConnectionStatus
    }));

    mockOfflineQueue.subscribe = mockSubscribe;

    const { rerender } = render(<OfflineNotification />);
    
    // Initially not visible
    expect(screen.queryByText('Working Offline')).not.toBeInTheDocument();

    // Go offline
    connectionStatus = { ...mockConnectionStatus, isOnline: false };
    rerender(<OfflineNotification />);
    
    expect(screen.getByText('Working Offline')).toBeInTheDocument();
    
    // Dismiss
    const dismissButton = screen.getByRole('button');
    fireEvent.click(dismissButton);

    await waitFor(() => {
      expect(screen.queryByText('Working Offline')).not.toBeInTheDocument();
    });

    // Come back online and go offline again - should reappear
    connectionStatus = { ...mockConnectionStatus, isOnline: true };
    rerender(<OfflineNotification />);
    
    connectionStatus = { ...mockConnectionStatus, isOnline: false };
    rerender(<OfflineNotification />);
    
    expect(screen.getByText('Working Offline')).toBeInTheDocument();
  });

  it('positions notification at top by default', () => {
    const offlineConnection = { ...mockConnectionStatus, isOnline: false };
    
    vi.doMock('@/lib/utils/connection', () => ({
      useConnectionStatus: () => offlineConnection
    }));

    const { container } = render(<OfflineNotification />);
    
    const notification = container.firstChild as HTMLElement;
    expect(notification).toHaveClass('top-4');
    expect(notification).not.toHaveClass('bottom-4');
  });

  it('positions notification at bottom when specified', () => {
    const offlineConnection = { ...mockConnectionStatus, isOnline: false };
    
    vi.doMock('@/lib/utils/connection', () => ({
      useConnectionStatus: () => offlineConnection
    }));

    const { container } = render(<OfflineNotification position="bottom" />);
    
    const notification = container.firstChild as HTMLElement;
    expect(notification).toHaveClass('bottom-4');
    expect(notification).not.toHaveClass('top-4');
  });

  it('applies custom className', () => {
    const offlineConnection = { ...mockConnectionStatus, isOnline: false };
    
    vi.doMock('@/lib/utils/connection', () => ({
      useConnectionStatus: () => offlineConnection
    }));

    const { container } = render(<OfflineNotification className="custom-class" />);
    
    const notification = container.firstChild as HTMLElement;
    expect(notification).toHaveClass('custom-class');
  });
});

describe('OfflineStatusBadge', () => {
  const mockQueueStats = {
    totalOperations: 0,
    pendingOperations: 0,
    failedOperations: 0,
    completedOperations: 0
  };

  const mockConnectionStatus = {
    isOnline: true,
    connectionType: 'wifi' as const,
    effectiveType: '4g' as const,
    downlink: 10,
    rtt: 50
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockOfflineQueue.subscribe = vi.fn((callback) => {
      callback(mockQueueStats);
      return vi.fn();
    });

    vi.doMock('@/lib/utils/connection', () => ({
      useConnectionStatus: () => mockConnectionStatus
    }));
  });

  it('does not render when online with no pending operations', () => {
    const { container } = render(<OfflineStatusBadge />);
    expect(container.firstChild).toBeNull();
  });

  it('renders offline badge when offline', () => {
    const offlineConnection = { ...mockConnectionStatus, isOnline: false };
    
    vi.doMock('@/lib/utils/connection', () => ({
      useConnectionStatus: () => offlineConnection
    }));

    render(<OfflineStatusBadge />);
    
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('renders syncing badge when operations are pending', () => {
    const queueStatsWithPending = {
      ...mockQueueStats,
      pendingOperations: 5
    };

    mockOfflineQueue.subscribe = vi.fn((callback) => {
      callback(queueStatsWithPending);
      return vi.fn();
    });

    render(<OfflineStatusBadge />);
    
    expect(screen.getByText('5 Syncing')).toBeInTheDocument();
  });

  it('shows both badges when offline with pending operations', () => {
    const offlineConnection = { ...mockConnectionStatus, isOnline: false };
    const queueStatsWithPending = {
      ...mockQueueStats,
      pendingOperations: 3
    };

    vi.doMock('@/lib/utils/connection', () => ({
      useConnectionStatus: () => offlineConnection
    }));

    mockOfflineQueue.subscribe = vi.fn((callback) => {
      callback(queueStatsWithPending);
      return vi.fn();
    });

    render(<OfflineStatusBadge />);
    
    expect(screen.getByText('Offline')).toBeInTheDocument();
    expect(screen.getByText('3 Syncing')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const offlineConnection = { ...mockConnectionStatus, isOnline: false };
    
    vi.doMock('@/lib/utils/connection', () => ({
      useConnectionStatus: () => offlineConnection
    }));

    const { container } = render(<OfflineStatusBadge className="custom-badge" />);
    
    expect(container.firstChild).toHaveClass('custom-badge');
  });
});
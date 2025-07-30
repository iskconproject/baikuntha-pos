import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SyncManager } from '@/components/common/SyncManager';
import { syncService } from '@/services/database/sync';
import { offlineQueue } from '@/services/database/offlineQueue';
import { connectionMonitor } from '@/lib/utils/connection';

// Mock dependencies
vi.mock('@/services/database/sync');
vi.mock('@/services/database/offlineQueue');
vi.mock('@/lib/utils/connection');

const mockSyncService = vi.mocked(syncService);
const mockOfflineQueue = vi.mocked(offlineQueue);
const mockConnectionMonitor = vi.mocked(connectionMonitor);

describe('SyncManager', () => {
  const mockSyncStatus = {
    isOnline: true,
    isSyncing: false,
    lastSyncAt: new Date('2024-01-01T12:00:00Z'),
    pendingOperations: 0,
    errors: []
  };

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
    // Reset all mocks
    vi.clearAllMocks();

    // Setup default mock implementations
    mockSyncService.subscribeSyncStatus = vi.fn((callback) => {
      callback(mockSyncStatus);
      return vi.fn(); // unsubscribe function
    });

    mockOfflineQueue.subscribe = vi.fn((callback) => {
      callback(mockQueueStats);
      return vi.fn(); // unsubscribe function
    });

    mockOfflineQueue.getAllOperations = vi.fn(() => []);

    // Mock useConnectionStatus hook
    vi.doMock('@/lib/utils/connection', () => ({
      useConnectionStatus: () => mockConnectionStatus,
      connectionMonitor: mockConnectionMonitor
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders sync status correctly', () => {
    render(<SyncManager />);
    
    expect(screen.getByText('Sync Status')).toBeInTheDocument();
    expect(screen.getByText('Online')).toBeInTheDocument();
    expect(screen.getByText('Synced')).toBeInTheDocument();
  });

  it('displays connection details when online', () => {
    render(<SyncManager />);
    
    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.getByText(/wifi/i)).toBeInTheDocument();
    expect(screen.getByText(/4g/i)).toBeInTheDocument();
    expect(screen.getByText(/10 Mbps/i)).toBeInTheDocument();
  });

  it('shows offline mode notice when offline', () => {
    const offlineStatus = { ...mockSyncStatus, isOnline: false };
    const offlineConnection = { ...mockConnectionStatus, isOnline: false };
    
    mockSyncService.subscribeSyncStatus = vi.fn((callback) => {
      callback(offlineStatus);
      return vi.fn();
    });

    vi.doMock('@/lib/utils/connection', () => ({
      useConnectionStatus: () => offlineConnection,
      connectionMonitor: mockConnectionMonitor
    }));

    render(<SyncManager />);
    
    expect(screen.getByText('Offline Mode')).toBeInTheDocument();
    expect(screen.getByText(/operations will be queued/i)).toBeInTheDocument();
  });

  it('displays queue status when operations are pending', () => {
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

    render(<SyncManager />);
    
    expect(screen.getByText('Operation Queue')).toBeInTheDocument();
    expect(screen.getByText('Pending: 3')).toBeInTheDocument();
    expect(screen.getByText('Failed: 2')).toBeInTheDocument();
    expect(screen.getByText('Total: 5')).toBeInTheDocument();
  });

  it('shows sync errors when present', () => {
    const statusWithErrors = {
      ...mockSyncStatus,
      errors: ['Connection timeout', 'Invalid data format']
    };

    mockSyncService.subscribeSyncStatus = vi.fn((callback) => {
      callback(statusWithErrors);
      return vi.fn();
    });

    render(<SyncManager />);
    
    expect(screen.getByText('Sync Errors:')).toBeInTheDocument();
    expect(screen.getByText(/Connection timeout/)).toBeInTheDocument();
    expect(screen.getByText(/Invalid data format/)).toBeInTheDocument();
  });

  it('handles manual sync trigger', async () => {
    const mockPerformFullSync = vi.fn().mockResolvedValue({
      success: true,
      tablesProcessed: 5,
      recordsSynced: 100,
      conflicts: 0,
      errors: []
    });

    mockSyncService.performFullSync = mockPerformFullSync;

    render(<SyncManager />);
    
    const syncButton = screen.getByText('Sync Now');
    fireEvent.click(syncButton);

    await waitFor(() => {
      expect(mockPerformFullSync).toHaveBeenCalledOnce();
    });
  });

  it('disables sync button when offline', () => {
    const offlineConnection = { ...mockConnectionStatus, isOnline: false };
    
    vi.doMock('@/lib/utils/connection', () => ({
      useConnectionStatus: () => offlineConnection,
      connectionMonitor: mockConnectionMonitor
    }));

    render(<SyncManager />);
    
    const syncButton = screen.getByText('Sync Now');
    expect(syncButton).toBeDisabled();
  });

  it('disables sync button when already syncing', () => {
    const syncingStatus = { ...mockSyncStatus, isSyncing: true };
    
    mockSyncService.subscribeSyncStatus = vi.fn((callback) => {
      callback(syncingStatus);
      return vi.fn();
    });

    render(<SyncManager />);
    
    const syncButton = screen.getByText('Syncing...');
    expect(syncButton).toBeDisabled();
  });

  it('opens queue details modal', async () => {
    const queueStatsWithOperations = {
      ...mockQueueStats,
      totalOperations: 3,
      pendingOperations: 2,
      failedOperations: 1
    };

    const mockOperations = [
      {
        id: 'op1',
        type: 'create' as const,
        tableName: 'products',
        data: { id: 'prod1', name: 'Test Product' },
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: 3,
        priority: 1
      },
      {
        id: 'op2',
        type: 'update' as const,
        tableName: 'users',
        data: { id: 'user1', name: 'Test User' },
        timestamp: Date.now(),
        retryCount: 2,
        maxRetries: 3,
        priority: 1
      }
    ];

    mockOfflineQueue.subscribe = vi.fn((callback) => {
      callback(queueStatsWithOperations);
      return vi.fn();
    });

    mockOfflineQueue.getAllOperations = vi.fn(() => mockOperations);

    render(<SyncManager />);
    
    const viewDetailsButton = screen.getByText('View Details');
    fireEvent.click(viewDetailsButton);

    await waitFor(() => {
      expect(screen.getByText('Operation Queue Details')).toBeInTheDocument();
      expect(screen.getByText('Create')).toBeInTheDocument();
      expect(screen.getByText('Update')).toBeInTheDocument();
      expect(screen.getByText('Products')).toBeInTheDocument();
      expect(screen.getByText('Users')).toBeInTheDocument();
    });
  });

  it('handles retry failed operations', () => {
    const queueStatsWithFailed = {
      ...mockQueueStats,
      totalOperations: 2,
      pendingOperations: 0,
      failedOperations: 2
    };

    mockOfflineQueue.subscribe = vi.fn((callback) => {
      callback(queueStatsWithFailed);
      return vi.fn();
    });

    mockOfflineQueue.retryFailed = vi.fn();

    render(<SyncManager />);
    
    const retryButton = screen.getByText('Retry Failed');
    fireEvent.click(retryButton);

    expect(mockOfflineQueue.retryFailed).toHaveBeenCalledOnce();
  });

  it('opens sync history modal', async () => {
    render(<SyncManager />);
    
    const historyButton = screen.getByText('History');
    fireEvent.click(historyButton);

    await waitFor(() => {
      expect(screen.getByText('Sync History')).toBeInTheDocument();
    });
  });

  it('formats last sync time correctly', () => {
    const recentSyncStatus = {
      ...mockSyncStatus,
      lastSyncAt: new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago
    };

    mockSyncService.subscribeSyncStatus = vi.fn((callback) => {
      callback(recentSyncStatus);
      return vi.fn();
    });

    render(<SyncManager />);
    
    expect(screen.getByText('5m ago')).toBeInTheDocument();
  });

  it('shows loading state during manual sync', async () => {
    const mockPerformFullSync = vi.fn(() => 
      new Promise(resolve => setTimeout(() => resolve({
        success: true,
        tablesProcessed: 5,
        recordsSynced: 100,
        conflicts: 0,
        errors: []
      }), 100))
    );

    mockSyncService.performFullSync = mockPerformFullSync;

    render(<SyncManager />);
    
    const syncButton = screen.getByText('Sync Now');
    fireEvent.click(syncButton);

    // Should show loading state
    expect(screen.getByText('Syncing...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /syncing/i })).toBeDisabled();

    await waitFor(() => {
      expect(screen.getByText('Sync Now')).toBeInTheDocument();
    });
  });

  it('cleans up subscriptions on unmount', () => {
    const unsubscribeSync = vi.fn();
    const unsubscribeQueue = vi.fn();

    mockSyncService.subscribeSyncStatus = vi.fn(() => unsubscribeSync);
    mockOfflineQueue.subscribe = vi.fn(() => unsubscribeQueue);

    const { unmount } = render(<SyncManager />);
    
    unmount();

    expect(unsubscribeSync).toHaveBeenCalledOnce();
    expect(unsubscribeQueue).toHaveBeenCalledOnce();
  });
});
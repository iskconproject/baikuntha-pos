import { offlineReportService } from './offlineReportService';

interface SyncStatus {
  isOnline: boolean;
  lastSyncAt?: Date;
  pendingReports: number;
  failedReports: number;
}

class ReportSyncService {
  private syncInterval: NodeJS.Timeout | null = null;
  private readonly SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
  private listeners: Array<(status: SyncStatus) => void> = [];

  constructor() {
    this.setupOnlineListener();
    this.startPeriodicSync();
  }

  /**
   * Get current sync status
   */
  getSyncStatus(): SyncStatus {
    const reports = offlineReportService.getOfflineReports();
    return {
      isOnline: navigator.onLine,
      lastSyncAt: this.getLastSyncTime(),
      pendingReports: reports.filter(r => r.syncStatus === 'pending').length,
      failedReports: reports.filter(r => r.syncStatus === 'failed').length,
    };
  }

  /**
   * Manually trigger sync
   */
  async triggerSync(): Promise<void> {
    if (!navigator.onLine) {
      throw new Error('Cannot sync while offline');
    }

    try {
      await offlineReportService.syncOfflineReports();
      this.setLastSyncTime(new Date());
      this.notifyListeners();
    } catch (error) {
      console.error('Manual sync failed:', error);
      throw error;
    }
  }

  /**
   * Subscribe to sync status changes
   */
  onSyncStatusChange(callback: (status: SyncStatus) => void): () => void {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Check if reports can be generated offline
   */
  canGenerateOfflineReports(): boolean {
    // Check if local database has sufficient data
    return true; // For now, assume we can always generate offline reports
  }

  /**
   * Get sync recommendations
   */
  getSyncRecommendations(): string[] {
    const recommendations: string[] = [];
    const status = this.getSyncStatus();

    if (!status.isOnline) {
      recommendations.push('Connect to internet to sync reports with cloud');
    }

    if (status.failedReports > 0) {
      recommendations.push(`${status.failedReports} reports failed to sync - check connection`);
    }

    if (status.pendingReports > 10) {
      recommendations.push('Many reports pending sync - consider manual sync');
    }

    const storage = offlineReportService.getStorageUsage();
    if (storage.sizeKB > 5000) { // 5MB
      recommendations.push('Offline reports using significant storage - consider cleanup');
    }

    return recommendations;
  }

  /**
   * Estimate sync time based on pending reports
   */
  estimateSyncTime(): number {
    const status = this.getSyncStatus();
    const totalReports = status.pendingReports + status.failedReports;
    
    // Estimate 2 seconds per report
    return totalReports * 2;
  }

  private setupOnlineListener(): void {
    window.addEventListener('online', () => {
      console.log('Connection restored - triggering report sync');
      this.triggerSync().catch(console.error);
    });

    window.addEventListener('offline', () => {
      console.log('Connection lost - reports will be generated offline');
      this.notifyListeners();
    });
  }

  private startPeriodicSync(): void {
    this.syncInterval = setInterval(() => {
      if (navigator.onLine) {
        this.triggerSync().catch(console.error);
      }
    }, this.SYNC_INTERVAL_MS);
  }

  private stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  private notifyListeners(): void {
    const status = this.getSyncStatus();
    this.listeners.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        console.error('Error in sync status listener:', error);
      }
    });
  }

  private getLastSyncTime(): Date | undefined {
    const stored = localStorage.getItem('vaikunthapos_last_report_sync');
    return stored ? new Date(stored) : undefined;
  }

  private setLastSyncTime(date: Date): void {
    localStorage.setItem('vaikunthapos_last_report_sync', date.toISOString());
  }

  /**
   * Cleanup service
   */
  destroy(): void {
    this.stopPeriodicSync();
    this.listeners = [];
  }
}

export const reportSyncService = new ReportSyncService();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    reportSyncService.destroy();
  });
}
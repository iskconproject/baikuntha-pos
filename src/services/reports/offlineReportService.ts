import { reportService } from './reportService';
import { ReportExportService } from './exportService';

interface OfflineReport {
  id: string;
  type: 'daily-sales' | 'transactions' | 'products';
  filters: any;
  data: any[];
  generatedAt: Date;
  syncStatus: 'pending' | 'synced' | 'failed';
}

class OfflineReportService {
  private reports: Map<string, OfflineReport> = new Map();
  private readonly STORAGE_KEY = 'baikunthapos_offline_reports';

  constructor() {
    this.loadReportsFromStorage();
  }

  /**
   * Generate report offline using local data
   */
  async generateOfflineReport(
    type: 'daily-sales' | 'transactions' | 'products',
    filters: any = {}
  ): Promise<OfflineReport> {
    try {
      const id = this.generateReportId();
      
      // Get data from local database
      let data: any[] = [];
      
      switch (type) {
        case 'daily-sales':
          if (filters.date) {
            const dailyReport = await reportService.getDailySalesReport(new Date(filters.date));
            data = [dailyReport];
          }
          break;
          
        case 'transactions':
          const transactionResult = await reportService.getTransactionHistory(filters, 1000, 0);
          data = transactionResult.transactions;
          break;
          
        case 'products':
          data = await reportService.getProductPerformanceReport(filters);
          break;
      }

      const report: OfflineReport = {
        id,
        type,
        filters,
        data,
        generatedAt: new Date(),
        syncStatus: 'pending',
      };

      this.reports.set(id, report);
      this.saveReportsToStorage();

      return report;
    } catch (error) {
      console.error('Error generating offline report:', error);
      throw error;
    }
  }

  /**
   * Get all offline reports
   */
  getOfflineReports(): OfflineReport[] {
    return Array.from(this.reports.values()).sort(
      (a, b) => b.generatedAt.getTime() - a.generatedAt.getTime()
    );
  }

  /**
   * Get offline report by ID
   */
  getOfflineReport(id: string): OfflineReport | null {
    return this.reports.get(id) || null;
  }

  /**
   * Export offline report
   */
  async exportOfflineReport(
    id: string,
    format: 'csv' | 'pdf'
  ): Promise<void> {
    const report = this.reports.get(id);
    if (!report) {
      throw new Error('Report not found');
    }

    const formattedData = ReportExportService.formatExportData(report.data, report.type);
    const filename = ReportExportService.generateFilename(
      report.type,
      report.filters.startDate ? new Date(report.filters.startDate) : undefined,
      report.filters.endDate ? new Date(report.filters.endDate) : undefined
    );

    if (format === 'csv') {
      ReportExportService.exportAsCSV(formattedData, filename);
    } else {
      const title = `${report.type.replace('-', ' ').toUpperCase()} Report (Offline)`;
      ReportExportService.exportAsPDF(formattedData, title);
    }
  }

  /**
   * Delete offline report
   */
  deleteOfflineReport(id: string): boolean {
    const deleted = this.reports.delete(id);
    if (deleted) {
      this.saveReportsToStorage();
    }
    return deleted;
  }

  /**
   * Sync offline reports when connectivity is restored
   */
  async syncOfflineReports(): Promise<void> {
    const pendingReports = Array.from(this.reports.values()).filter(
      report => report.syncStatus === 'pending'
    );

    for (const report of pendingReports) {
      try {
        // Attempt to sync with cloud database
        await this.syncReportToCloud(report);
        report.syncStatus = 'synced';
      } catch (error) {
        console.error(`Failed to sync report ${report.id}:`, error);
        report.syncStatus = 'failed';
      }
    }

    this.saveReportsToStorage();
  }

  /**
   * Check if device is online
   */
  isOnline(): boolean {
    return navigator.onLine;
  }

  /**
   * Get storage usage for offline reports
   */
  getStorageUsage(): { count: number; sizeKB: number } {
    const reportsData = JSON.stringify(Array.from(this.reports.values()));
    return {
      count: this.reports.size,
      sizeKB: Math.round(new Blob([reportsData]).size / 1024),
    };
  }

  /**
   * Clean up old offline reports (older than 30 days)
   */
  cleanupOldReports(): number {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    let deletedCount = 0;

    Array.from(this.reports.entries()).forEach(([id, report]) => {
      if (report.generatedAt < thirtyDaysAgo && report.syncStatus === 'synced') {
        this.reports.delete(id);
        deletedCount++;
      }
    });

    if (deletedCount > 0) {
      this.saveReportsToStorage();
    }

    return deletedCount;
  }

  private generateReportId(): string {
    return `offline_report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private loadReportsFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const reportsArray = JSON.parse(stored) as OfflineReport[];
        this.reports = new Map(
          reportsArray.map(report => [
            report.id,
            {
              ...report,
              generatedAt: new Date(report.generatedAt),
            },
          ])
        );
      }
    } catch (error) {
      console.error('Error loading offline reports from storage:', error);
      this.reports = new Map();
    }
  }

  private saveReportsToStorage(): void {
    try {
      const reportsArray = Array.from(this.reports.values());
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(reportsArray));
    } catch (error) {
      console.error('Error saving offline reports to storage:', error);
    }
  }

  private async syncReportToCloud(report: OfflineReport): Promise<void> {
    // This would sync the report metadata to the cloud database
    // For now, we'll just simulate the sync
    return new Promise((resolve) => {
      setTimeout(resolve, 1000);
    });
  }
}

export const offlineReportService = new OfflineReportService();

// Auto-cleanup old reports on service initialization
offlineReportService.cleanupOldReports();
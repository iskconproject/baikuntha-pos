// Lazy imports to avoid client-side database connection issues

/**
 * Simplified report manager for single Turso DB architecture
 * No complex sync needed - reports are generated on-demand from live data
 */
class ReportManager {
  /**
   * Generate report directly from Turso DB (server-side only)
   */
  async generateReport(
    type: 'daily-sales' | 'transactions' | 'products' | 'analytics',
    filters: any = {}
  ): Promise<any> {
    // This should only be called on the server side via API routes
    if (typeof window !== 'undefined') {
      throw new Error('Report generation must be done server-side via API routes');
    }

    try {
      // Lazy import to avoid client-side issues
      const { reportService } = await import('./reportService');
      
      let data: any;
      
      switch (type) {
        case 'daily-sales':
          if (filters.date) {
            data = await reportService.getDailySalesReport(new Date(filters.date));
          } else {
            data = await reportService.getDailySalesReport(new Date());
          }
          break;
          
        case 'transactions':
          const result = await reportService.getTransactionHistory(filters, 1000, 0);
          data = result.transactions;
          break;
          
        case 'products':
          data = await reportService.getProductPerformanceReport(filters);
          break;
          
        case 'analytics':
          data = await reportService.getSalesAnalytics(filters);
          break;
          
        default:
          throw new Error(`Unsupported report type: ${type}`);
      }

      return {
        id: this.generateReportId(),
        type,
        filters,
        data,
        generatedAt: new Date(),
      };
    } catch (error) {
      console.error('Error generating report:', error);
      throw error;
    }
  }

  /**
   * Export report in specified format (client-side)
   */
  async exportReport(
    reportData: any,
    format: 'csv' | 'pdf'
  ): Promise<void> {
    // Lazy import to avoid server-side issues
    const { ReportExportService } = await import('./exportService');
    
    const formattedData = ReportExportService.formatExportData(reportData.data, reportData.type);
    const filename = ReportExportService.generateFilename(
      reportData.type,
      reportData.filters.startDate ? new Date(reportData.filters.startDate) : undefined,
      reportData.filters.endDate ? new Date(reportData.filters.endDate) : undefined
    );

    if (format === 'csv') {
      ReportExportService.exportAsCSV(formattedData, filename);
    } else {
      const title = `${reportData.type.replace('-', ' ').toUpperCase()} Report`;
      ReportExportService.exportAsPDF(formattedData, title);
    }
  }

  /**
   * Get scheduled reports (server-side only)
   */
  async getScheduledReports(): Promise<any[]> {
    if (typeof window !== 'undefined') {
      throw new Error('Scheduled reports access must be done server-side via API routes');
    }
    
    const { scheduledReportsService } = await import('@/services/database/scheduledReports');
    return await scheduledReportsService.getAll();
  }

  /**
   * Create scheduled report (server-side only)
   */
  async createScheduledReport(data: any): Promise<any> {
    if (typeof window !== 'undefined') {
      throw new Error('Scheduled reports access must be done server-side via API routes');
    }
    
    const { scheduledReportsService } = await import('@/services/database/scheduledReports');
    return await scheduledReportsService.create(data);
  }

  /**
   * Update scheduled report (server-side only)
   */
  async updateScheduledReport(id: string, data: any): Promise<any> {
    if (typeof window !== 'undefined') {
      throw new Error('Scheduled reports access must be done server-side via API routes');
    }
    
    const { scheduledReportsService } = await import('@/services/database/scheduledReports');
    return await scheduledReportsService.update(id, data);
  }

  /**
   * Delete scheduled report (server-side only)
   */
  async deleteScheduledReport(id: string): Promise<void> {
    if (typeof window !== 'undefined') {
      throw new Error('Scheduled reports access must be done server-side via API routes');
    }
    
    const { scheduledReportsService } = await import('@/services/database/scheduledReports');
    return await scheduledReportsService.delete(id);
  }

  /**
   * Check connection status
   */
  isOnline(): boolean {
    if (typeof window === 'undefined') return false; // Server-side
    return navigator.onLine;
  }

  /**
   * Get system status for reports
   */
  getSystemStatus(): {
    isOnline: boolean;
    canGenerateReports: boolean;
    message: string;
  } {
    const isOnline = this.isOnline();
    
    return {
      isOnline,
      canGenerateReports: isOnline, // With Turso, we need connection to generate reports
      message: isOnline 
        ? 'Connected - Reports available' 
        : 'Offline - Connect to internet to generate reports'
    };
  }

  private generateReportId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const reportManager = new ReportManager();
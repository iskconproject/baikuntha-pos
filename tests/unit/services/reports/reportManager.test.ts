import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reportManager } from '@/services/reports/reportManager';

// Mock the report service
vi.mock('@/services/reports/reportService', () => ({
  reportService: {
    getDailySalesReport: vi.fn(),
    getTransactionHistory: vi.fn(),
    getProductPerformanceReport: vi.fn(),
    getSalesAnalytics: vi.fn(),
  },
}));

// Mock the scheduled reports service
vi.mock('@/services/database/scheduledReports', () => ({
  scheduledReportsService: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

describe('ReportManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (navigator as any).onLine = true;
  });

  describe('getSystemStatus', () => {
    it('should return online status when connected', () => {
      (navigator as any).onLine = true;
      
      const status = reportManager.getSystemStatus();
      
      expect(status.isOnline).toBe(true);
      expect(status.canGenerateReports).toBe(true);
      expect(status.message).toBe('Connected - Reports available');
    });

    it('should return offline status when disconnected', () => {
      (navigator as any).onLine = false;
      
      const status = reportManager.getSystemStatus();
      
      expect(status.isOnline).toBe(false);
      expect(status.canGenerateReports).toBe(false);
      expect(status.message).toBe('Offline - Connect to internet to generate reports');
    });
  });

  describe('generateReport', () => {
    it('should generate daily sales report', async () => {
      const mockReportService = await import('@/services/reports/reportService');
      const mockData = { totalSales: 1000, transactionCount: 10 };
      
      vi.mocked(mockReportService.reportService.getDailySalesReport).mockResolvedValue(mockData);

      const result = await reportManager.generateReport('daily-sales', { date: '2024-01-01' });

      expect(result.type).toBe('daily-sales');
      expect(result.data).toEqual(mockData);
      expect(result.generatedAt).toBeInstanceOf(Date);
    });

    it('should generate transaction report', async () => {
      const mockReportService = await import('@/services/reports/reportService');
      const mockData = { transactions: [{ id: '1', amount: 100 }] };
      
      vi.mocked(mockReportService.reportService.getTransactionHistory).mockResolvedValue(mockData);

      const result = await reportManager.generateReport('transactions', {});

      expect(result.type).toBe('transactions');
      expect(result.data).toEqual(mockData.transactions);
    });

    it('should throw error for unsupported report type', async () => {
      await expect(
        reportManager.generateReport('unsupported' as any, {})
      ).rejects.toThrow('Unsupported report type: unsupported');
    });
  });

  describe('isOnline', () => {
    it('should return navigator.onLine status', () => {
      (navigator as any).onLine = true;
      expect(reportManager.isOnline()).toBe(true);

      (navigator as any).onLine = false;
      expect(reportManager.isOnline()).toBe(false);
    });
  });
});
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReceiptService } from '@/services/printer/receiptService';
import type { ReceiptData, PrinterConfig } from '@/types/receipt';
import type { SystemSettings } from '@/types/settings';

// Mock the thermal printer
vi.mock('@/services/printer/thermalPrinter', () => ({
  ThermalPrinter: vi.fn().mockImplementation(() => ({
    isReady: vi.fn().mockReturnValue(true),
    connect: vi.fn().mockResolvedValue(true),
    print: vi.fn().mockResolvedValue({ success: true, printMethod: 'thermal' }),
    printTest: vi.fn().mockResolvedValue({ success: true, printMethod: 'thermal' }),
    disconnect: vi.fn().mockResolvedValue(undefined)
  }))
}));

// Mock the receipt generator
vi.mock('@/services/printer/receiptGenerator', () => ({
  ReceiptGenerator: {
    generateThermalReceipt: vi.fn().mockReturnValue('Mock thermal receipt text'),
    generateHTMLReceipt: vi.fn().mockReturnValue('<html>Mock HTML receipt</html>'),
  },
}));

// Mock the settings service
vi.mock('@/services/settings/settingsService', () => ({
  settingsService: {
    getSettings: vi.fn().mockResolvedValue({
      printer: {
        enabled: true,
        type: 'thermal',
        paperWidth: 80,
        characterWidth: 32,
        deviceId: 'test-device',
        testPrintEnabled: true,
      },
      display: {
        theme: 'light',
        fontSize: 'medium',
        language: 'en',
        currency: 'INR',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '24h',
      },
      backup: {
        autoBackup: true,
        backupFrequency: 'daily',
        retentionDays: 30,
        cloudSync: false,
      },
      audit: {
        enabled: true,
        logLevel: 'info',
        retentionDays: 90,
        includeUserActions: true,
      },
    }),
    updateSettings: vi.fn().mockResolvedValue(undefined),
    testPrinter: vi.fn().mockResolvedValue(true),
  },
}));

// Mock URL.createObjectURL and related APIs
Object.defineProperty(global, 'URL', {
  value: {
    createObjectURL: vi.fn().mockReturnValue('blob:mock-url'),
    revokeObjectURL: vi.fn()
  }
});

// Mock document methods
Object.defineProperty(global, 'document', {
  value: {
    createElement: vi.fn().mockReturnValue({
      href: '',
      download: '',
      click: vi.fn(),
      remove: vi.fn()
    }),
    body: {
      appendChild: vi.fn(),
      removeChild: vi.fn()
    }
  }
});

describe('ReceiptService', () => {
  let receiptService: ReceiptService;
  
  const mockTransaction = {
    id: 'txn_123',
    userId: 'user_1',
    subtotal: 650,
    tax: 0,
    discount: 0,
    total: 650,
    paymentMethod: 'cash',
    paymentReference: 'CASH-1234567890',
    status: 'completed',
    createdAt: new Date('2024-01-15T10:30:00Z'),
    items: [
      {
        id: 'item_1',
        productId: 'prod_1',
        variantId: 'var_1',
        quantity: 2,
        unitPrice: 250,
        totalPrice: 500,
        product: {
          name: 'Bhagavad Gita'
        },
        variant: {
          name: 'English'
        }
      },
      {
        id: 'item_2',
        productId: 'prod_2',
        quantity: 1,
        unitPrice: 150,
        totalPrice: 150,
        product: {
          name: 'Tulsi Mala'
        }
      }
    ]
  };

  const mockCashier = {
    id: 'user_1',
    username: 'cashier1'
  };

  beforeEach(() => {
    receiptService = new ReceiptService();
  });

  describe('generateReceiptData', () => {
    it('should generate receipt data from transaction', () => {
      const receiptData = receiptService.generateReceiptData(
        mockTransaction,
        mockCashier,
        700
      );

      expect(receiptData.transactionId).toBe('txn_123');
      expect(receiptData.storeName).toBe('ISKCON Asansol Temple');
      expect(receiptData.cashier).toEqual(mockCashier);
      expect(receiptData.items).toHaveLength(2);
      expect(receiptData.items[0].name).toBe('Bhagavad Gita');
      expect(receiptData.items[0].variant).toBe('English');
      expect(receiptData.items[0].quantity).toBe(2);
      expect(receiptData.items[0].unitPrice).toBe(250);
      expect(receiptData.items[0].totalPrice).toBe(500);
      expect(receiptData.subtotal).toBe(650);
      expect(receiptData.total).toBe(650);
      expect(receiptData.paymentMethod).toBe('cash');
      expect(receiptData.cashReceived).toBe(700);
      expect(receiptData.changeGiven).toBe(50);
    });

    it('should handle UPI payment without cash received', () => {
      const upiTransaction = {
        ...mockTransaction,
        paymentMethod: 'upi',
        paymentReference: 'UPI123456789'
      };

      const receiptData = receiptService.generateReceiptData(
        upiTransaction,
        mockCashier
      );

      expect(receiptData.paymentMethod).toBe('upi');
      expect(receiptData.paymentReference).toBe('UPI123456789');
      expect(receiptData.cashReceived).toBeUndefined();
      expect(receiptData.changeGiven).toBeUndefined();
    });

    it('should generate unique receipt numbers', async () => {
      const receiptData1 = receiptService.generateReceiptData(mockTransaction, mockCashier);
      
      // Wait a bit to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 1));
      
      const receiptData2 = receiptService.generateReceiptData(mockTransaction, mockCashier);

      expect(receiptData1.receiptNumber).not.toBe(receiptData2.receiptNumber);
      expect(receiptData1.id).not.toBe(receiptData2.id);
    });

    it('should handle items without variants', () => {
      const transactionWithoutVariants = {
        ...mockTransaction,
        items: [
          {
            id: 'item_1',
            productId: 'prod_1',
            quantity: 1,
            unitPrice: 100,
            totalPrice: 100,
            product: {
              name: 'Simple Product'
            }
          }
        ]
      };

      const receiptData = receiptService.generateReceiptData(
        transactionWithoutVariants,
        mockCashier
      );

      expect(receiptData.items[0].name).toBe('Simple Product');
      expect(receiptData.items[0].variant).toBeUndefined();
    });
  });

  describe('printReceipt', () => {
    let mockReceiptData: ReceiptData;

    beforeEach(() => {
      mockReceiptData = receiptService.generateReceiptData(mockTransaction, mockCashier);
    });

    it('should print receipt successfully (falls back to PDF in test environment)', async () => {
      const result = await receiptService.printReceipt(mockReceiptData);

      expect(result.success).toBe(true);
      // In test environment, thermal printing is not supported, so it falls back to PDF
      expect(result.printMethod).toBe('pdf');
      expect(result.receiptId).toBe(mockReceiptData.id);
    });

    it('should generate PDF receipt when configured for PDF', async () => {
      // Mock settings to return PDF configuration
      const { settingsService } = await import('@/services/settings/settingsService');
      vi.mocked(settingsService.getSettings).mockResolvedValueOnce({
        printer: {
          enabled: true,
          type: 'pdf',
          paperWidth: 80,
          characterWidth: 32,
          deviceId: 'test-device',
          testPrintEnabled: true,
        },
        display: {
          theme: 'light',
          fontSize: 'medium',
          language: 'en',
          currency: 'INR',
          dateFormat: 'DD/MM/YYYY',
          timeFormat: '24h',
        },
        backup: {
          autoBackup: true,
          backupFrequency: 'daily',
          retentionDays: 30,
          cloudSync: false,
        },
        audit: {
          enabled: true,
          logLevel: 'info',
          retentionDays: 90,
          includeUserActions: true,
        },
      });
      
      const result = await receiptService.printReceipt(mockReceiptData);

      expect(result.success).toBe(true);
      expect(result.printMethod).toBe('pdf');
      expect(result.receiptId).toBe(mockReceiptData.id);
    });

    it('should store receipt for reprint functionality', async () => {
      await receiptService.printReceipt(mockReceiptData);

      const storedReceipt = receiptService.getStoredReceipt(mockReceiptData.id);
      
      expect(storedReceipt).toBeDefined();
      expect(storedReceipt?.transactionId).toBe(mockTransaction.id);
      expect(storedReceipt?.printStatus).toBe('printed');
    });

    it('should handle thermal printer connection failure', async () => {
      // Mock thermal printer to fail connection
      const mockThermalPrinter = {
        isReady: vi.fn().mockReturnValue(false),
        connect: vi.fn().mockRejectedValue(new Error('Connection failed')),
        print: vi.fn(),
        printTest: vi.fn(),
        disconnect: vi.fn()
      };

      // Create service with failing thermal printer
      const failingService = new ReceiptService();

      // Mock the thermal printer instance
      (failingService as any).thermalPrinter = mockThermalPrinter;

      const result = await failingService.printReceipt(mockReceiptData);

      // Should fallback to PDF
      expect(result.success).toBe(true);
      expect(result.printMethod).toBe('pdf');
    });
  });

  describe('reprintReceipt', () => {
    it('should reprint stored receipt', async () => {
      const mockReceiptData = receiptService.generateReceiptData(mockTransaction, mockCashier);
      
      // First print to store the receipt
      await receiptService.printReceipt(mockReceiptData);
      
      // Then reprint
      const result = await receiptService.reprintReceipt(mockReceiptData.id);

      expect(result.success).toBe(true);
    });

    it('should fail to reprint non-existent receipt', async () => {
      const result = await receiptService.reprintReceipt('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Receipt not found');
    });
  });

  describe('getReceiptsByTransaction', () => {
    it('should return receipts for a transaction', async () => {
      const mockReceiptData = receiptService.generateReceiptData(mockTransaction, mockCashier);
      
      await receiptService.printReceipt(mockReceiptData);
      
      const receipts = receiptService.getReceiptsByTransaction(mockTransaction.id);

      expect(receipts).toHaveLength(1);
      expect(receipts[0].transactionId).toBe(mockTransaction.id);
    });

    it('should return empty array for transaction with no receipts', () => {
      const receipts = receiptService.getReceiptsByTransaction('non-existent-txn');

      expect(receipts).toHaveLength(0);
    });
  });

  describe('testPrinter', () => {
    it('should test thermal printer', async () => {
      const result = await receiptService.testPrinter();

      expect(result.success).toBe(true);
      expect(result.printMethod).toBe('thermal');
    });

    it('should return success for PDF printer test', async () => {
      // Mock settings to return PDF configuration
      const { settingsService } = await import('@/services/settings/settingsService');
      vi.mocked(settingsService.getSettings).mockResolvedValueOnce({
        printer: {
          enabled: true,
          type: 'pdf',
          paperWidth: 80,
          characterWidth: 32,
          deviceId: 'test-device',
          testPrintEnabled: true,
        },
        display: {
          theme: 'light',
          fontSize: 'medium',
          language: 'en',
          currency: 'INR',
          dateFormat: 'DD/MM/YYYY',
          timeFormat: '24h',
        },
        backup: {
          autoBackup: true,
          backupFrequency: 'daily',
          retentionDays: 30,
          cloudSync: false,
        },
        audit: {
          enabled: true,
          logLevel: 'info',
          retentionDays: 90,
          includeUserActions: true,
        },
      });
      
      const result = await receiptService.testPrinter();

      expect(result.success).toBe(true);
      expect(result.printMethod).toBe('pdf');
    });
  });

  describe('configuration management', () => {
    it('should show deprecation warning for updateConfig', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const newConfig: PrinterConfig = {
        type: 'pdf',
      };

      receiptService.updateConfig(newConfig);

      expect(consoleSpy).toHaveBeenCalledWith(
        'receiptService.updateConfig is deprecated. Use settings service to update printer configuration.'
      );
      
      consoleSpy.mockRestore();
    });

    it('should handle thermal printer connection status', () => {
      expect(receiptService.isThermalPrinterReady()).toBe(true);
    });
  });
});
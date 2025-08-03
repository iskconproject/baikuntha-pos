import { ReceiptGenerator } from './receiptGenerator';
import { ThermalPrinter } from './thermalPrinter';
import { settingsService } from '@/services/settings/settingsService';
import type { 
  ReceiptData, 
  PrinterConfig, 
  PrintResult, 
  StoredReceipt,
  ReceiptTemplate 
} from '@/types/receipt';
import type { Transaction, TransactionItem } from '@/types';
import type { SystemSettings } from '@/types/settings';

export class ReceiptService {
  private thermalPrinter: ThermalPrinter;
  private receipts: Map<string, StoredReceipt> = new Map();
  
  constructor() {
    this.thermalPrinter = new ThermalPrinter();
  }

  /**
   * Get current printer configuration from settings
   */
  private async getConfig(): Promise<PrinterConfig> {
    const settings = await settingsService.getSettings();
    
    return {
      type: settings.printer.type as 'thermal' | 'pdf',
      thermalConfig: settings.printer.type === 'thermal' ? {
        width: settings.printer.characterWidth,
        cutPaper: true, // Default to true, could be added to settings if needed
        openDrawer: false, // Default to false, could be added to settings if needed
      } : undefined,
    };
  }
  
  /**
   * Generate receipt data from transaction
   */
  generateReceiptData(
    transaction: any, // TransactionWithItems from transaction service
    cashier: { id: string; username: string },
    cashReceived?: number
  ): ReceiptData {
    const receiptNumber = this.generateReceiptNumber(transaction.id);
    
    // Calculate change if cash payment
    const changeGiven = transaction.paymentMethod === 'cash' && cashReceived 
      ? Math.max(0, cashReceived - transaction.total)
      : undefined;
    
    return {
      id: this.generateReceiptId(),
      transactionId: transaction.id,
      receiptNumber,
      storeName: 'ISKCON Asansol Temple',
      storeAddress: 'Gift & Book Store, ISKCON Asansol, West Bengal, India',
      storePhone: '+91-XXXX-XXXXXX', // Replace with actual phone
      storeEmail: 'store@iskconasansol.org', // Replace with actual email
      cashier,
      items: transaction.items.map((item: any) => ({
        name: item.product?.name || 'Unknown Product',
        variant: item.variant?.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice
      })),
      subtotal: transaction.subtotal,
      tax: transaction.tax,
      discount: transaction.discount,
      total: transaction.total,
      paymentMethod: transaction.paymentMethod,
      paymentReference: transaction.paymentReference,
      cashReceived,
      changeGiven,
      timestamp: new Date(transaction.createdAt),
      footer: 'Thank you for your visit!\nHare Krishna!\n\nVisit us again!'
    };
  }
  
  /**
   * Print receipt using configured method
   */
  async printReceipt(
    receiptData: ReceiptData, 
    template?: ReceiptTemplate
  ): Promise<PrintResult> {
    // Get current configuration from settings
    const config = await this.getConfig();
    
    // Store receipt for reprint functionality
    const storedReceipt: StoredReceipt = {
      id: receiptData.id,
      transactionId: receiptData.transactionId,
      receiptData,
      printStatus: 'pending',
      createdAt: new Date()
    };
    
    this.receipts.set(receiptData.id, storedReceipt);
    
    let result: PrintResult;
    
    try {
      if (config.type === 'thermal') {
        result = await this.printThermal(receiptData, template, config);
      } else {
        result = await this.printPDF(receiptData);
      }
      
      // Update stored receipt status
      storedReceipt.printStatus = result.success ? 'printed' : 'failed';
      storedReceipt.printMethod = result.printMethod;
      storedReceipt.printedAt = result.success ? new Date() : undefined;
      
      return result;
    } catch (error) {
      console.error('Receipt printing failed:', error);
      
      storedReceipt.printStatus = 'failed';
      
      // Try fallback to PDF if thermal printing fails
      if (config.type === 'thermal') {
        console.log('Thermal printing failed, trying PDF fallback...');
        try {
          result = await this.printPDF(receiptData);
          storedReceipt.printStatus = result.success ? 'printed' : 'failed';
          storedReceipt.printMethod = result.printMethod;
          storedReceipt.printedAt = result.success ? new Date() : undefined;
          return result;
        } catch (pdfError) {
          console.error('PDF fallback also failed:', pdfError);
        }
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Print failed',
        printMethod: 'failed'
      };
    }
  }
  
  /**
   * Print using thermal printer
   */
  private async printThermal(
    receiptData: ReceiptData, 
    template?: ReceiptTemplate,
    config?: PrinterConfig
  ): Promise<PrintResult> {
    // Use provided config or get from settings
    const printerConfig = config || await this.getConfig();
    
    // Check if thermal printing is supported
    const isSupported = typeof ThermalPrinter.isSupported === 'function' 
      ? ThermalPrinter.isSupported() 
      : false;
      
    if (!isSupported) {
      throw new Error('Thermal printing not supported in this browser');
    }
    
    // Connect to printer if not already connected
    if (!this.thermalPrinter.isReady()) {
      await this.thermalPrinter.connect(printerConfig.thermalConfig);
    }
    
    // Generate thermal receipt text
    const receiptText = ReceiptGenerator.generateThermalReceipt(receiptData, template);
    
    // Print the receipt
    const result = await this.thermalPrinter.print(receiptText, printerConfig.thermalConfig);
    
    return {
      ...result,
      receiptId: receiptData.id
    };
  }
  
  /**
   * Generate PDF receipt
   */
  private async printPDF(receiptData: ReceiptData): Promise<PrintResult> {
    try {
      // Generate HTML content
      const htmlContent = ReceiptGenerator.generateHTMLReceipt(receiptData);
      
      // Create blob and download link
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      
      // Create temporary link and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = `receipt-${receiptData.receiptNumber}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      URL.revokeObjectURL(url);
      
      return {
        success: true,
        receiptId: receiptData.id,
        printMethod: 'pdf'
      };
    } catch (error) {
      throw new Error(`PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Reprint a stored receipt
   */
  async reprintReceipt(receiptId: string): Promise<PrintResult> {
    const storedReceipt = this.receipts.get(receiptId);
    
    if (!storedReceipt) {
      return {
        success: false,
        error: 'Receipt not found',
        printMethod: 'failed'
      };
    }
    
    return await this.printReceipt(storedReceipt.receiptData);
  }
  
  /**
   * Get stored receipt by ID
   */
  getStoredReceipt(receiptId: string): StoredReceipt | undefined {
    return this.receipts.get(receiptId);
  }
  
  /**
   * Get all stored receipts for a transaction
   */
  getReceiptsByTransaction(transactionId: string): StoredReceipt[] {
    return Array.from(this.receipts.values())
      .filter(receipt => receipt.transactionId === transactionId);
  }
  
  /**
   * Test printer connection
   */
  async testPrinter(): Promise<PrintResult> {
    const config = await this.getConfig();
    
    if (config.type === 'thermal') {
      if (!this.thermalPrinter.isReady()) {
        await this.thermalPrinter.connect(config.thermalConfig);
      }
      return await this.thermalPrinter.printTest();
    } else {
      // For PDF, just return success since there's no physical printer to test
      return {
        success: true,
        printMethod: 'pdf'
      };
    }
  }
  
  /**
   * Connect to thermal printer
   */
  async connectThermalPrinter(): Promise<boolean> {
    const config = await this.getConfig();
    
    if (config.type !== 'thermal') {
      throw new Error('Not configured for thermal printing');
    }
    
    return await this.thermalPrinter.connect(config.thermalConfig);
  }
  
  /**
   * Disconnect from thermal printer
   */
  async disconnectThermalPrinter(): Promise<void> {
    await this.thermalPrinter.disconnect();
  }
  
  /**
   * Check if thermal printer is ready
   */
  isThermalPrinterReady(): boolean {
    return this.thermalPrinter.isReady();
  }
  
  /**
   * Update printer configuration (deprecated - settings are now managed centrally)
   * @deprecated Use settings service to update printer configuration
   */
  updateConfig(config: PrinterConfig): void {
    console.warn('receiptService.updateConfig is deprecated. Use settings service to update printer configuration.');
  }
  
  /**
   * Generate unique receipt ID
   */
  private generateReceiptId(): string {
    return `receipt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Generate receipt number from transaction ID
   */
  private generateReceiptNumber(transactionId: string): string {
    // Use last 8 characters of transaction ID with timestamp
    const timestamp = Date.now().toString().slice(-6);
    const txnSuffix = transactionId.slice(-4).toUpperCase();
    return `R${timestamp}${txnSuffix}`;
  }
  
  /**
   * Clear old stored receipts (keep only last 100)
   */
  private cleanupStoredReceipts(): void {
    const receipts = Array.from(this.receipts.entries())
      .sort(([, a], [, b]) => b.createdAt.getTime() - a.createdAt.getTime());
    
    if (receipts.length > 100) {
      const toRemove = receipts.slice(100);
      toRemove.forEach(([id]) => this.receipts.delete(id));
    }
  }
}

// Export singleton instance
export const receiptService = new ReceiptService();
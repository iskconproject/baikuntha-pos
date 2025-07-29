export interface ReceiptData {
  id: string;
  transactionId: string;
  receiptNumber: string;
  storeName: string;
  storeAddress: string;
  storePhone: string;
  storeEmail: string;
  cashier: {
    id: string;
    username: string;
  };
  items: Array<{
    name: string;
    variant?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: string;
  paymentReference?: string;
  cashReceived?: number;
  changeGiven?: number;
  timestamp: Date;
  footer: string;
}

export interface PrinterConfig {
  type: 'thermal' | 'pdf';
  thermalConfig?: {
    vendorId?: number;
    productId?: number;
    width?: number;
    cutPaper?: boolean;
    openDrawer?: boolean;
  };
  pdfConfig?: {
    pageSize?: 'A4' | 'A5' | 'receipt';
    orientation?: 'portrait' | 'landscape';
  };
}

export interface PrintResult {
  success: boolean;
  error?: string;
  printMethod: 'thermal' | 'pdf' | 'failed';
  receiptId?: string;
}

export interface StoredReceipt {
  id: string;
  transactionId: string;
  receiptData: ReceiptData;
  printStatus: 'pending' | 'printed' | 'failed';
  printMethod?: string;
  createdAt: Date;
  printedAt?: Date;
}

export interface ReceiptTemplate {
  header?: string;
  footer?: string;
  showLogo?: boolean;
  showQRCode?: boolean;
  customFields?: Record<string, string>;
}
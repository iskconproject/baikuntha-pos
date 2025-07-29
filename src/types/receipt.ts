// Receipt-related types for VaikunthaPOS

export interface ReceiptData {
  id: string;
  transactionId: string;
  receiptNumber: string;
  storeName: string;
  storeAddress: string;
  storePhone?: string;
  storeEmail?: string;
  cashier: {
    id: string;
    username: string;
  };
  customer?: {
    name?: string;
    phone?: string;
    email?: string;
  };
  items: ReceiptItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: 'cash' | 'upi';
  paymentReference?: string;
  cashReceived?: number;
  changeGiven?: number;
  timestamp: Date;
  footer?: string;
}

export interface ReceiptItem {
  name: string;
  variant?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface ReceiptTemplate {
  id: string;
  name: string;
  width: number; // in characters for thermal printer
  header: ReceiptTemplateSection;
  body: ReceiptTemplateSection;
  footer: ReceiptTemplateSection;
  isDefault: boolean;
}

export interface ReceiptTemplateSection {
  logo?: boolean;
  storeName?: boolean;
  storeAddress?: boolean;
  storeContact?: boolean;
  separator?: boolean;
  timestamp?: boolean;
  receiptNumber?: boolean;
  cashier?: boolean;
  items?: boolean;
  totals?: boolean;
  payment?: boolean;
  customText?: string;
}

export interface PrinterConfig {
  type: 'thermal' | 'pdf';
  thermalConfig?: {
    vendorId?: number;
    productId?: number;
    width: number; // characters per line
    cutPaper?: boolean;
    openDrawer?: boolean;
  };
  pdfConfig?: {
    pageSize: 'A4' | 'A5' | 'receipt';
    orientation: 'portrait' | 'landscape';
  };
}

export interface PrintResult {
  success: boolean;
  receiptId?: string;
  error?: string;
  printMethod: 'thermal' | 'pdf' | 'failed';
}

export interface StoredReceipt {
  id: string;
  transactionId: string;
  receiptData: ReceiptData;
  printStatus: 'printed' | 'failed' | 'pending';
  printMethod?: 'thermal' | 'pdf' | 'failed';
  createdAt: Date;
  printedAt?: Date;
}
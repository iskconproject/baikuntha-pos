import { describe, it, expect } from 'vitest';
import { ReceiptGenerator } from '@/services/printer/receiptGenerator';
import type { ReceiptData } from '@/types/receipt';

describe('ReceiptGenerator', () => {
  const mockReceiptData: ReceiptData = {
    id: 'receipt_123',
    transactionId: 'txn_456',
    receiptNumber: 'R123456',
    storeName: 'ISKCON Asansol Temple',
    storeAddress: 'Gift & Book Store, ISKCON Asansol, West Bengal, India',
    storePhone: '+91-1234-567890',
    storeEmail: 'store@iskconasansol.org',
    cashier: {
      id: 'user_1',
      username: 'cashier1'
    },
    items: [
      {
        name: 'Bhagavad Gita',
        variant: 'English',
        quantity: 2,
        unitPrice: 250,
        totalPrice: 500
      },
      {
        name: 'Tulsi Mala',
        quantity: 1,
        unitPrice: 150,
        totalPrice: 150
      }
    ],
    subtotal: 650,
    tax: 0,
    discount: 0,
    total: 650,
    paymentMethod: 'cash',
    paymentReference: 'CASH-1234567890',
    cashReceived: 700,
    changeGiven: 50,
    timestamp: new Date('2024-01-15T10:30:00Z'),
    footer: 'Thank you for your visit!\nHare Krishna!'
  };

  describe('generateThermalReceipt', () => {
    it('should generate thermal receipt text with all required sections', () => {
      const receipt = ReceiptGenerator.generateThermalReceipt(mockReceiptData);

      expect(receipt).toContain('ISKCON Asansol Temple');
      expect(receipt).toContain('Gift & Book Store');
      expect(receipt).toContain('+91-1234-567890');
      expect(receipt).toContain('store@iskconasansol.org');
      expect(receipt).toContain('R123456');
      expect(receipt).toContain('cashier1');
      expect(receipt).toContain('Bhagavad Gita - English');
      expect(receipt).toContain('2 x ₹250.00');
      expect(receipt).toContain('₹500.00');
      expect(receipt).toContain('Tulsi Mala');
      expect(receipt).toContain('1 x ₹150.00');
      expect(receipt).toContain('₹150.00');
      expect(receipt).toContain('Subtotal:');
      expect(receipt).toContain('₹650.00');
      expect(receipt).toContain('TOTAL:');
      expect(receipt).toContain('CASH');
      expect(receipt).toContain('Cash Received:');
      expect(receipt).toContain('₹700.00');
      expect(receipt).toContain('Change:');
      expect(receipt).toContain('₹50.00');
      expect(receipt).toContain('Thank you for your visit!');
      expect(receipt).toContain('Hare Krishna!');
    });

    it('should handle items without variants', () => {
      const dataWithoutVariants = {
        ...mockReceiptData,
        items: [
          {
            name: 'Simple Item',
            quantity: 1,
            unitPrice: 100,
            totalPrice: 100
          }
        ]
      };

      const receipt = ReceiptGenerator.generateThermalReceipt(dataWithoutVariants);

      expect(receipt).toContain('Simple Item');
      expect(receipt).not.toContain(' - '); // No variant separator
    });

    it('should handle UPI payment method', () => {
      const upiData = {
        ...mockReceiptData,
        paymentMethod: 'upi' as const,
        paymentReference: 'UPI123456789',
        cashReceived: undefined,
        changeGiven: undefined
      };

      const receipt = ReceiptGenerator.generateThermalReceipt(upiData);

      expect(receipt).toContain('UPI');
      expect(receipt).toContain('UPI123456789');
      expect(receipt).not.toContain('Cash Received');
      expect(receipt).not.toContain('Change');
    });

    it('should handle tax and discount', () => {
      const dataWithTaxDiscount = {
        ...mockReceiptData,
        tax: 65,
        discount: 50,
        total: 665
      };

      const receipt = ReceiptGenerator.generateThermalReceipt(dataWithTaxDiscount);

      expect(receipt).toContain('Tax:');
      expect(receipt).toContain('₹65.00');
      expect(receipt).toContain('Discount:');
      expect(receipt).toContain('-₹50.00');
      expect(receipt).toContain('₹665.00');
    });

    it('should respect custom width', () => {
      const customTemplate = {
        id: 'custom',
        name: 'Custom Template',
        width: 24,
        header: '',
        body: '',
        footer: '',
        isDefault: false
      };

      const receipt = ReceiptGenerator.generateThermalReceipt(mockReceiptData, customTemplate);

      // Check that separators use the custom width
      const lines = receipt.split('\n');
      const separatorLines = lines.filter(line => line.match(/^-+$/));

      separatorLines.forEach(line => {
        expect(line.length).toBe(24);
      });
    });
  });

  describe('generateHTMLReceipt', () => {
    it('should generate valid HTML receipt', () => {
      const html = ReceiptGenerator.generateHTMLReceipt(mockReceiptData);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html>');
      expect(html).toContain('</html>');
      expect(html).toContain('<title>Receipt - R123456</title>');
      expect(html).toContain('ISKCON Asansol Temple');
      expect(html).toContain('Bhagavad Gita - English');
      expect(html).toContain('₹650.00');
    });

    it('should include all transaction details in HTML', () => {
      const html = ReceiptGenerator.generateHTMLReceipt(mockReceiptData);

      expect(html).toContain('Receipt #:');
      expect(html).toContain('R123456');
      expect(html).toContain('Cashier:');
      expect(html).toContain('cashier1');
      expect(html).toContain('Payment:');
      expect(html).toContain('CASH');
      expect(html).toContain('Reference:');
      expect(html).toContain('CASH-1234567890');
    });

    it('should handle optional fields gracefully', () => {
      const minimalData = {
        ...mockReceiptData,
        storePhone: '',
        storeEmail: '',
        tax: 0,
        discount: 0,
        paymentReference: undefined,
        cashReceived: undefined,
        changeGiven: undefined
      };

      const html = ReceiptGenerator.generateHTMLReceipt(minimalData);

      expect(html).not.toContain('Tel:');
      expect(html).not.toContain('Email:');
      expect(html).not.toContain('Tax:');
      expect(html).not.toContain('Discount:');
      expect(html).not.toContain('Reference:');
      expect(html).not.toContain('Cash Received:');
      expect(html).not.toContain('Change:');
    });

    it('should format dates correctly', () => {
      const html = ReceiptGenerator.generateHTMLReceipt(mockReceiptData);

      // Should contain formatted date (exact format may vary by locale)
      expect(html).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/); // Date pattern
      expect(html).toMatch(/\d{1,2}:\d{2}/); // Time pattern
    });
  });

  describe('edge cases', () => {
    it('should handle very long product names', () => {
      const longNameData = {
        ...mockReceiptData,
        items: [
          {
            name: 'This is a very long product name that should be wrapped properly in the receipt',
            quantity: 1,
            unitPrice: 100,
            totalPrice: 100
          }
        ]
      };

      const receipt = ReceiptGenerator.generateThermalReceipt(longNameData);

      expect(receipt).toContain('This is a very long product name');
      // Should not have lines longer than the width
      const lines = receipt.split('\n');
      lines.forEach(line => {
        expect(line.length).toBeLessThanOrEqual(32);
      });
    });

    it('should handle zero quantities and prices', () => {
      const zeroData = {
        ...mockReceiptData,
        items: [
          {
            name: 'Free Item',
            quantity: 0,
            unitPrice: 0,
            totalPrice: 0
          }
        ],
        subtotal: 0,
        total: 0
      };

      const receipt = ReceiptGenerator.generateThermalReceipt(zeroData);

      expect(receipt).toContain('Free Item');
      expect(receipt).toContain('0 x ₹0.00');
      expect(receipt).toContain('₹0.00');
    });

    it('should handle empty footer', () => {
      const noFooterData = {
        ...mockReceiptData,
        footer: ''
      };

      const receipt = ReceiptGenerator.generateThermalReceipt(noFooterData);

      expect(receipt).toContain('Thank you for your visit!');
      expect(receipt).toContain('Hare Krishna!');
    });
  });
});

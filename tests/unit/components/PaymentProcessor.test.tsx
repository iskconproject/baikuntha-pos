import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PaymentProcessor } from '@/components/sales/PaymentProcessor';
import { useCartStore } from '@/stores/cartStore';
import type { Product, Transaction } from '@/types';

// Mock the cart store
vi.mock('@/stores/cartStore', () => ({
  useCartStore: vi.fn(),
}));

// Mock fetch
global.fetch = vi.fn();

const mockProduct: Product = {
  id: 'product-1',
  name: 'Bhagavad Gita',
  description: 'Sacred text',
  basePrice: 250,
  categoryId: 'books',
  keywords: ['gita', 'book'],
  metadata: { customAttributes: {} },
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  variants: [],
};

const mockCartItem = {
  productId: mockProduct.id,
  quantity: 2,
  product: mockProduct,
};

const mockTransaction: Transaction = {
  id: 'transaction-1',
  userId: 'user-1',
  items: [],
  subtotal: 500,
  tax: 0,
  discount: 0,
  total: 500,
  paymentMethod: 'cash',
  status: 'completed',
  createdAt: new Date(),
  syncStatus: 'pending',
};

describe('PaymentProcessor', () => {
  const mockOnPaymentComplete = vi.fn();
  const mockOnCancel = vi.fn();
  const mockClearCart = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    (useCartStore as any).mockReturnValue({
      items: [mockCartItem],
      total: 500,
      clearCart: mockClearCart,
    });

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: mockTransaction }),
    });
  });

  describe('Rendering', () => {
    it('should render payment form with order summary', () => {
      render(
        <PaymentProcessor
          onPaymentComplete={mockOnPaymentComplete}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Payment')).toBeInTheDocument();
      expect(screen.getByText('Order Summary')).toBeInTheDocument();
      expect(screen.getByText('Payment Method')).toBeInTheDocument();
      expect(screen.getByText(`${mockProduct.name} × 2`)).toBeInTheDocument();
      expect(screen.getAllByText('₹500.00')).toHaveLength(2); // Item total and grand total
    });

    it('should display item with quantity when more than 1', () => {
      render(
        <PaymentProcessor
          onPaymentComplete={mockOnPaymentComplete}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText(`${mockProduct.name} × 2`)).toBeInTheDocument();
    });

    it('should display variant name when present', () => {
      const mockVariant = {
        id: 'variant-1',
        name: 'Hardcover',
        price: 350,
        stockQuantity: 10,
        attributes: {},
        keywords: [],
      };

      (useCartStore as any).mockReturnValue({
        items: [{
          ...mockCartItem,
          variant: mockVariant,
        }],
        total: 700,
        clearCart: mockClearCart,
      });

      render(
        <PaymentProcessor
          onPaymentComplete={mockOnPaymentComplete}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText(`${mockProduct.name} - ${mockVariant.name} × 2`)).toBeInTheDocument();
    });
  });

  describe('Payment Method Selection', () => {
    it('should default to cash payment method', () => {
      render(
        <PaymentProcessor
          onPaymentComplete={mockOnPaymentComplete}
          onCancel={mockOnCancel}
        />
      );

      const cashRadio = screen.getByRole('radio', { name: /cash/i });
      expect(cashRadio).toBeChecked();
    });

    it('should switch to UPI payment method', () => {
      render(
        <PaymentProcessor
          onPaymentComplete={mockOnPaymentComplete}
          onCancel={mockOnCancel}
        />
      );

      const upiLabel = screen.getByText('UPI').closest('label');
      fireEvent.click(upiLabel!);

      const upiRadio = screen.getByRole('radio', { name: /upi/i });
      expect(upiRadio).toBeChecked();
    });

    it('should show cash received field for cash payment', () => {
      render(
        <PaymentProcessor
          onPaymentComplete={mockOnPaymentComplete}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Cash Received')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument();
    });

    it('should show UPI transaction ID field for UPI payment', () => {
      render(
        <PaymentProcessor
          onPaymentComplete={mockOnPaymentComplete}
          onCancel={mockOnCancel}
        />
      );

      const upiLabel = screen.getByText('UPI').closest('label');
      fireEvent.click(upiLabel!);

      expect(screen.getByText('UPI Transaction ID')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter UPI transaction ID')).toBeInTheDocument();
    });
  });

  describe('Cash Payment', () => {
    it('should calculate and display change when cash received is more than total', () => {
      render(
        <PaymentProcessor
          onPaymentComplete={mockOnPaymentComplete}
          onCancel={mockOnCancel}
        />
      );

      const cashInput = screen.getByPlaceholderText('0.00');
      fireEvent.change(cashInput, { target: { value: '600' } });

      expect(screen.getByText('Change to Return')).toBeInTheDocument();
      expect(screen.getByText('₹100.00')).toBeInTheDocument();
    });

    it('should validate cash received amount', async () => {
      render(
        <PaymentProcessor
          onPaymentComplete={mockOnPaymentComplete}
          onCancel={mockOnCancel}
        />
      );

      const submitButton = screen.getByText('Complete Payment ₹500.00');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Please enter the cash amount received')).toBeInTheDocument();
      });
    });

    it('should validate cash received is not less than total', async () => {
      render(
        <PaymentProcessor
          onPaymentComplete={mockOnPaymentComplete}
          onCancel={mockOnCancel}
        />
      );

      const cashInput = screen.getByPlaceholderText('0.00');
      fireEvent.change(cashInput, { target: { value: '400' } });

      const submitButton = screen.getByText('Complete Payment ₹500.00');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Cash received cannot be less than the total amount')).toBeInTheDocument();
      });
    });
  });

  describe('UPI Payment', () => {
    beforeEach(() => {
      render(
        <PaymentProcessor
          onPaymentComplete={mockOnPaymentComplete}
          onCancel={mockOnCancel}
        />
      );

      const upiLabel = screen.getByText('UPI').closest('label');
      fireEvent.click(upiLabel!);
    });

    it('should validate UPI transaction ID', async () => {
      const submitButton = screen.getByText('Complete Payment ₹500.00');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Please enter the UPI transaction ID')).toBeInTheDocument();
      });
    });

    it('should accept valid UPI transaction ID', async () => {
      const upiInput = screen.getByPlaceholderText('Enter UPI transaction ID');
      fireEvent.change(upiInput, { target: { value: 'UPI123456789' } });

      const submitButton = screen.getByText('Complete Payment ₹500.00');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/transactions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            items: [{
              productId: mockCartItem.productId,
              variantId: undefined,
              quantity: mockCartItem.quantity,
              unitPrice: mockProduct.basePrice,
            }],
            paymentMethod: 'upi',
            paymentReference: 'UPI123456789',
            tax: 0,
            discount: 0,
          }),
        });
      });
    });
  });

  describe('Form Submission', () => {
    it('should submit cash payment successfully', async () => {
      render(
        <PaymentProcessor
          onPaymentComplete={mockOnPaymentComplete}
          onCancel={mockOnCancel}
        />
      );

      const cashInput = screen.getByPlaceholderText('0.00');
      fireEvent.change(cashInput, { target: { value: '500' } });

      const submitButton = screen.getByText('Complete Payment ₹500.00');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/transactions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            items: [{
              productId: mockCartItem.productId,
              variantId: undefined,
              quantity: mockCartItem.quantity,
              unitPrice: mockProduct.basePrice,
            }],
            paymentMethod: 'cash',
            paymentReference: expect.any(String),
            tax: 0,
            discount: 0,
          }),
        });
      });

      expect(mockClearCart).toHaveBeenCalled();
      expect(mockOnPaymentComplete).toHaveBeenCalledWith(mockTransaction);
    });

    it('should show loading state during submission', async () => {
      (global.fetch as any).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockTransaction }),
        }), 100))
      );

      render(
        <PaymentProcessor
          onPaymentComplete={mockOnPaymentComplete}
          onCancel={mockOnCancel}
        />
      );

      const cashInput = screen.getByPlaceholderText('0.00');
      fireEvent.change(cashInput, { target: { value: '500' } });

      const submitButton = screen.getByText('Complete Payment ₹500.00');
      fireEvent.click(submitButton);

      expect(screen.getByText('Processing...')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();

      await waitFor(() => {
        expect(mockOnPaymentComplete).toHaveBeenCalled();
      });
    });

    it('should handle API errors', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Payment failed' }),
      });

      render(
        <PaymentProcessor
          onPaymentComplete={mockOnPaymentComplete}
          onCancel={mockOnCancel}
        />
      );

      const cashInput = screen.getByPlaceholderText('0.00');
      fireEvent.change(cashInput, { target: { value: '500' } });

      const submitButton = screen.getByText('Complete Payment ₹500.00');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Payment failed')).toBeInTheDocument();
      });

      expect(mockClearCart).not.toHaveBeenCalled();
      expect(mockOnPaymentComplete).not.toHaveBeenCalled();
    });

    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      render(
        <PaymentProcessor
          onPaymentComplete={mockOnPaymentComplete}
          onCancel={mockOnCancel}
        />
      );

      const cashInput = screen.getByPlaceholderText('0.00');
      fireEvent.change(cashInput, { target: { value: '500' } });

      const submitButton = screen.getByText('Complete Payment ₹500.00');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });
  });

  describe('Cancel Functionality', () => {
    it('should call onCancel when cancel button is clicked', () => {
      render(
        <PaymentProcessor
          onPaymentComplete={mockOnPaymentComplete}
          onCancel={mockOnCancel}
        />
      );

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('should call onCancel when close button is clicked', () => {
      render(
        <PaymentProcessor
          onPaymentComplete={mockOnPaymentComplete}
          onCancel={mockOnCancel}
        />
      );

      const closeButton = screen.getByRole('button', { name: '' }); // Close button with X icon
      fireEvent.click(closeButton);

      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  describe('Currency Formatting', () => {
    it('should format currency correctly', () => {
      (useCartStore as any).mockReturnValue({
        items: [mockCartItem],
        total: 1234.56,
        clearCart: mockClearCart,
      });

      render(
        <PaymentProcessor
          onPaymentComplete={mockOnPaymentComplete}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('₹1234.56')).toBeInTheDocument();
      expect(screen.getByText('Complete Payment ₹1234.56')).toBeInTheDocument();
    });
  });
});
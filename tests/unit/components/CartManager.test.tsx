import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CartManager } from '@/components/sales/CartManager';
import { useCartStore } from '@/stores/cartStore';
import type { Product, ProductVariant } from '@/types';

// Mock the cart store
vi.mock('@/stores/cartStore', () => ({
  useCartStore: vi.fn(),
}));

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

const mockVariant: ProductVariant = {
  id: 'variant-1',
  productId: 'product-1',
  name: 'Hardcover',
  price: 350,
  stockQuantity: 10,
  attributes: { binding: 'hardcover' },
  keywords: ['hardcover'],
};

const mockCartItem = {
  productId: mockProduct.id,
  quantity: 2,
  product: mockProduct,
};

const mockCartItemWithVariant = {
  productId: mockProduct.id,
  variantId: mockVariant.id,
  quantity: 1,
  product: mockProduct,
  variant: mockVariant,
};

describe('CartManager', () => {
  const mockUpdateQuantity = vi.fn();
  const mockRemoveItem = vi.fn();
  const mockClearCart = vi.fn();
  const mockGetItemCount = vi.fn();
  const mockOnCheckout = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset to empty cart state
    (useCartStore as any).mockReturnValue({
      items: [],
      subtotal: 0,
      tax: 0,
      discount: 0,
      total: 0,
      updateQuantity: mockUpdateQuantity,
      removeItem: mockRemoveItem,
      clearCart: mockClearCart,
      getItemCount: mockGetItemCount.mockReturnValue(0),
    });
  });

  describe('Empty Cart', () => {
    it('should display empty cart message when no items', () => {
      render(<CartManager />);
      
      expect(screen.getByText('Cart is Empty')).toBeInTheDocument();
      expect(screen.getByText('Add products to start a transaction')).toBeInTheDocument();
    });

    it('should not display checkout button when cart is empty', () => {
      render(<CartManager onCheckout={mockOnCheckout} />);
      
      expect(screen.queryByText('Proceed to Checkout')).not.toBeInTheDocument();
    });
  });

  describe('Cart with Items', () => {
    beforeEach(() => {
      (useCartStore as any).mockReturnValue({
        items: [mockCartItem],
        subtotal: 500,
        tax: 0,
        discount: 0,
        total: 500,
        updateQuantity: mockUpdateQuantity,
        removeItem: mockRemoveItem,
        clearCart: mockClearCart,
        getItemCount: mockGetItemCount.mockReturnValue(2),
      });
    });

    it('should display cart items', () => {
      render(<CartManager />);
      
      expect(screen.getByText('Shopping Cart')).toBeInTheDocument();
      expect(screen.getByText('2 items')).toBeInTheDocument();
      expect(screen.getByText(mockProduct.name)).toBeInTheDocument();
      expect(screen.getByText('₹250.00')).toBeInTheDocument();
    });

    it('should display item with variant name', () => {
      (useCartStore as any).mockReturnValue({
        items: [mockCartItemWithVariant],
        subtotal: 350,
        tax: 0,
        discount: 0,
        total: 350,
        updateQuantity: mockUpdateQuantity,
        removeItem: mockRemoveItem,
        clearCart: mockClearCart,
        getItemCount: mockGetItemCount.mockReturnValue(1),
      });

      render(<CartManager />);
      
      expect(screen.getByText(`${mockProduct.name} - ${mockVariant.name}`)).toBeInTheDocument();
      expect(screen.getAllByText('₹350.00')).toHaveLength(4); // Unit price, item total, subtotal, and total
    });

    it('should display cart totals', () => {
      render(<CartManager />);
      
      expect(screen.getByText('Subtotal')).toBeInTheDocument();
      expect(screen.getByText('Total')).toBeInTheDocument();
      expect(screen.getAllByText('₹500.00')).toHaveLength(3); // Unit price, subtotal, and total
    });

    it('should display tax when present', () => {
      (useCartStore as any).mockReturnValue({
        items: [mockCartItem],
        subtotal: 500,
        tax: 50,
        discount: 0,
        total: 550,
        updateQuantity: mockUpdateQuantity,
        removeItem: mockRemoveItem,
        clearCart: mockClearCart,
        getItemCount: mockGetItemCount.mockReturnValue(2),
      });

      render(<CartManager />);
      
      expect(screen.getByText('Tax')).toBeInTheDocument();
      expect(screen.getByText('₹50.00')).toBeInTheDocument();
    });

    it('should display discount when present', () => {
      (useCartStore as any).mockReturnValue({
        items: [mockCartItem],
        subtotal: 500,
        tax: 0,
        discount: 25,
        total: 475,
        updateQuantity: mockUpdateQuantity,
        removeItem: mockRemoveItem,
        clearCart: mockClearCart,
        getItemCount: mockGetItemCount.mockReturnValue(2),
      });

      render(<CartManager />);
      
      expect(screen.getByText('Discount')).toBeInTheDocument();
      expect(screen.getByText('-₹25.00')).toBeInTheDocument();
    });
  });

  describe('Quantity Controls', () => {
    beforeEach(() => {
      (useCartStore as any).mockReturnValue({
        items: [mockCartItem],
        subtotal: 500,
        tax: 0,
        discount: 0,
        total: 500,
        updateQuantity: mockUpdateQuantity,
        removeItem: mockRemoveItem,
        clearCart: mockClearCart,
        getItemCount: mockGetItemCount.mockReturnValue(2),
      });
    });

    it('should call updateQuantity when increasing quantity', () => {
      render(<CartManager />);
      
      const increaseButton = screen.getAllByRole('button').find(
        button => button.querySelector('svg path[d*="M12 6v6m0 0v6m0-6h6m-6 0H6"]')
      );
      
      fireEvent.click(increaseButton!);
      
      expect(mockUpdateQuantity).toHaveBeenCalledWith(
        mockCartItem.productId,
        undefined,
        3
      );
    });

    it('should call updateQuantity when decreasing quantity', () => {
      render(<CartManager />);
      
      const decreaseButton = screen.getAllByRole('button').find(
        button => button.querySelector('svg path[d*="M20 12H4"]')
      );
      
      fireEvent.click(decreaseButton!);
      
      expect(mockUpdateQuantity).toHaveBeenCalledWith(
        mockCartItem.productId,
        undefined,
        1
      );
    });

    it('should disable decrease button when quantity is 1', () => {
      (useCartStore as any).mockReturnValue({
        items: [{ ...mockCartItem, quantity: 1 }],
        subtotal: 250,
        tax: 0,
        discount: 0,
        total: 250,
        updateQuantity: mockUpdateQuantity,
        removeItem: mockRemoveItem,
        clearCart: mockClearCart,
        getItemCount: mockGetItemCount.mockReturnValue(1),
      });

      render(<CartManager />);
      
      const decreaseButton = screen.getAllByRole('button').find(
        button => button.querySelector('svg path[d*="M20 12H4"]')
      );
      
      expect(decreaseButton).toBeDisabled();
    });

    it('should disable increase button when at stock limit', () => {
      (useCartStore as any).mockReturnValue({
        items: [{ ...mockCartItemWithVariant, quantity: 10 }], // At stock limit
        subtotal: 3500,
        tax: 0,
        discount: 0,
        total: 3500,
        updateQuantity: mockUpdateQuantity,
        removeItem: mockRemoveItem,
        clearCart: mockClearCart,
        getItemCount: mockGetItemCount.mockReturnValue(10),
      });

      render(<CartManager />);
      
      const increaseButton = screen.getAllByRole('button').find(
        button => button.querySelector('svg path[d*="M12 6v6m0 0v6m0-6h6m-6 0H6"]')
      );
      
      expect(increaseButton).toBeDisabled();
    });
  });

  describe('Remove Item', () => {
    beforeEach(() => {
      (useCartStore as any).mockReturnValue({
        items: [mockCartItem],
        subtotal: 500,
        tax: 0,
        discount: 0,
        total: 500,
        updateQuantity: mockUpdateQuantity,
        removeItem: mockRemoveItem,
        clearCart: mockClearCart,
        getItemCount: mockGetItemCount.mockReturnValue(2),
      });
    });

    it('should call removeItem when remove button is clicked', () => {
      render(<CartManager />);
      
      const removeButton = screen.getByTitle('Remove item');
      fireEvent.click(removeButton);
      
      expect(mockRemoveItem).toHaveBeenCalledWith(
        mockCartItem.productId,
        undefined
      );
    });
  });

  describe('Clear Cart', () => {
    beforeEach(() => {
      (useCartStore as any).mockReturnValue({
        items: [mockCartItem],
        subtotal: 500,
        tax: 0,
        discount: 0,
        total: 500,
        updateQuantity: mockUpdateQuantity,
        removeItem: mockRemoveItem,
        clearCart: mockClearCart,
        getItemCount: mockGetItemCount.mockReturnValue(2),
      });
    });

    it('should show confirmation modal when clear cart is clicked', () => {
      render(<CartManager />);
      
      const clearButton = screen.getByText('Clear Cart');
      fireEvent.click(clearButton);
      
      expect(screen.getByText('Are you sure you want to remove all items from the cart?')).toBeInTheDocument();
    });

    it('should call clearCart when confirmed', async () => {
      render(<CartManager />);
      
      const clearButton = screen.getByText('Clear Cart');
      fireEvent.click(clearButton);
      
      // Find the confirm button in the modal by looking for all buttons and selecting the red one
      const buttons = screen.getAllByRole('button', { name: 'Clear Cart' });
      const modalConfirmButton = buttons.find(button => 
        button.className.includes('bg-red-600')
      );
      
      fireEvent.click(modalConfirmButton!);
      
      expect(mockClearCart).toHaveBeenCalled();
    });

    it('should close modal when cancelled', () => {
      render(<CartManager />);
      
      const clearButton = screen.getByText('Clear Cart');
      fireEvent.click(clearButton);
      
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);
      
      expect(screen.queryByText('Are you sure you want to remove all items from the cart?')).not.toBeInTheDocument();
    });
  });

  describe('Checkout', () => {
    beforeEach(() => {
      (useCartStore as any).mockReturnValue({
        items: [mockCartItem],
        subtotal: 500,
        tax: 0,
        discount: 0,
        total: 500,
        updateQuantity: mockUpdateQuantity,
        removeItem: mockRemoveItem,
        clearCart: mockClearCart,
        getItemCount: mockGetItemCount.mockReturnValue(2),
      });
    });

    it('should display checkout button when onCheckout is provided', () => {
      render(<CartManager onCheckout={mockOnCheckout} />);
      
      expect(screen.getByText('Proceed to Checkout')).toBeInTheDocument();
    });

    it('should call onCheckout when checkout button is clicked', () => {
      render(<CartManager onCheckout={mockOnCheckout} />);
      
      const checkoutButton = screen.getByText('Proceed to Checkout');
      fireEvent.click(checkoutButton);
      
      expect(mockOnCheckout).toHaveBeenCalled();
    });

    it('should not display checkout button when onCheckout is not provided', () => {
      render(<CartManager />);
      
      expect(screen.queryByText('Proceed to Checkout')).not.toBeInTheDocument();
    });
  });
});
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
  description: 'Sacred text of Hinduism',
  basePrice: 250,
  categoryId: 'books',
  keywords: ['gita', 'book', 'spiritual'],
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
  productId: 'product-1',
  variantId: undefined,
  quantity: 2,
  product: mockProduct,
  variant: undefined,
};

const mockCartItemWithVariant = {
  productId: 'product-1',
  variantId: 'variant-1',
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
    
    (useCartStore as any).mockReturnValue({
      items: [],
      total: 0,
      updateQuantity: mockUpdateQuantity,
      removeItem: mockRemoveItem,
      clearCart: mockClearCart,
      getItemCount: mockGetItemCount,
    });
  });

  it('renders empty cart message when no items', () => {
    mockGetItemCount.mockReturnValue(0);
    
    render(<CartManager onCheckout={mockOnCheckout} />);
    
    expect(screen.getByText('Cart is Empty')).toBeInTheDocument();
    expect(screen.getByText('Add products to start a transaction')).toBeInTheDocument();
  });

  it('displays cart items correctly', () => {
    (useCartStore as any).mockReturnValue({
      items: [mockCartItem],
      total: 500,
      updateQuantity: mockUpdateQuantity,
      removeItem: mockRemoveItem,
      clearCart: mockClearCart,
      getItemCount: mockGetItemCount.mockReturnValue(2),
    });

    render(<CartManager onCheckout={mockOnCheckout} />);
    
    expect(screen.getByText('Shopping Cart')).toBeInTheDocument();
    expect(screen.getByText('2 items')).toBeInTheDocument();
    expect(screen.getByText('Bhagavad Gita')).toBeInTheDocument();
    expect(screen.getByText('₹250.00')).toBeInTheDocument();
    expect(screen.getByText('₹500.00')).toBeInTheDocument();
  });

  it('displays variant information when item has variant', () => {
    (useCartStore as any).mockReturnValue({
      items: [mockCartItemWithVariant],
      total: 350,
      updateQuantity: mockUpdateQuantity,
      removeItem: mockRemoveItem,
      clearCart: mockClearCart,
      getItemCount: mockGetItemCount.mockReturnValue(1),
    });

    render(<CartManager onCheckout={mockOnCheckout} />);
    
    expect(screen.getByText('Bhagavad Gita - Hardcover')).toBeInTheDocument();
    expect(screen.getByText('₹350.00')).toBeInTheDocument();
  });

  it('handles quantity increase', () => {
    (useCartStore as any).mockReturnValue({
      items: [mockCartItem],
      total: 500,
      updateQuantity: mockUpdateQuantity,
      removeItem: mockRemoveItem,
      clearCart: mockClearCart,
      getItemCount: mockGetItemCount.mockReturnValue(2),
    });

    render(<CartManager onCheckout={mockOnCheckout} />);
    
    const increaseButton = screen.getAllByRole('button').find(btn => 
      btn.querySelector('svg path[d*="M12 6v6m0 0v6m0-6h6m-6 0H6"]')
    );
    
    fireEvent.click(increaseButton!);
    
    expect(mockUpdateQuantity).toHaveBeenCalledWith('product-1', undefined, 3);
  });

  it('handles quantity decrease', () => {
    (useCartStore as any).mockReturnValue({
      items: [mockCartItem],
      total: 500,
      updateQuantity: mockUpdateQuantity,
      removeItem: mockRemoveItem,
      clearCart: mockClearCart,
      getItemCount: mockGetItemCount.mockReturnValue(2),
    });

    render(<CartManager onCheckout={mockOnCheckout} />);
    
    const decreaseButton = screen.getAllByRole('button').find(btn => 
      btn.querySelector('svg path[d*="M20 12H4"]')
    );
    
    fireEvent.click(decreaseButton!);
    
    expect(mockUpdateQuantity).toHaveBeenCalledWith('product-1', undefined, 1);
  });

  it('prevents quantity decrease below 1', () => {
    const singleItemCart = {
      ...mockCartItem,
      quantity: 1,
    };

    (useCartStore as any).mockReturnValue({
      items: [singleItemCart],
      total: 250,
      updateQuantity: mockUpdateQuantity,
      removeItem: mockRemoveItem,
      clearCart: mockClearCart,
      getItemCount: mockGetItemCount.mockReturnValue(1),
    });

    render(<CartManager onCheckout={mockOnCheckout} />);
    
    const decreaseButton = screen.getAllByRole('button').find(btn => 
      btn.querySelector('svg path[d*="M20 12H4"]')
    );
    
    expect(decreaseButton).toBeDisabled();
  });

  it('handles item removal', () => {
    (useCartStore as any).mockReturnValue({
      items: [mockCartItem],
      total: 500,
      updateQuantity: mockUpdateQuantity,
      removeItem: mockRemoveItem,
      clearCart: mockClearCart,
      getItemCount: mockGetItemCount.mockReturnValue(2),
    });

    render(<CartManager onCheckout={mockOnCheckout} />);
    
    const removeButton = screen.getByTitle('Remove item');
    fireEvent.click(removeButton);
    
    expect(mockRemoveItem).toHaveBeenCalledWith('product-1', undefined);
  });

  it('handles clear cart with confirmation', async () => {
    (useCartStore as any).mockReturnValue({
      items: [mockCartItem],
      total: 500,
      updateQuantity: mockUpdateQuantity,
      removeItem: mockRemoveItem,
      clearCart: mockClearCart,
      getItemCount: mockGetItemCount.mockReturnValue(2),
    });

    render(<CartManager onCheckout={mockOnCheckout} />);
    
    const clearButton = screen.getByText('Clear Cart');
    fireEvent.click(clearButton);
    
    // Confirmation modal should appear
    expect(screen.getByText('Are you sure you want to remove all items from the cart?')).toBeInTheDocument();
    
    const confirmButton = screen.getByRole('button', { name: /clear cart/i });
    fireEvent.click(confirmButton);
    
    expect(mockClearCart).toHaveBeenCalled();
  });

  it('handles checkout button click', () => {
    (useCartStore as any).mockReturnValue({
      items: [mockCartItem],
      total: 500,
      updateQuantity: mockUpdateQuantity,
      removeItem: mockRemoveItem,
      clearCart: mockClearCart,
      getItemCount: mockGetItemCount.mockReturnValue(2),
    });

    render(<CartManager onCheckout={mockOnCheckout} />);
    
    const checkoutButton = screen.getByText('Proceed to Checkout');
    fireEvent.click(checkoutButton);
    
    expect(mockOnCheckout).toHaveBeenCalled();
  });

  it('prevents quantity increase beyond stock limit', () => {
    const itemWithLimitedStock = {
      ...mockCartItemWithVariant,
      quantity: 10, // At stock limit
    };

    (useCartStore as any).mockReturnValue({
      items: [itemWithLimitedStock],
      total: 3500,
      updateQuantity: mockUpdateQuantity,
      removeItem: mockRemoveItem,
      clearCart: mockClearCart,
      getItemCount: mockGetItemCount.mockReturnValue(10),
    });

    render(<CartManager onCheckout={mockOnCheckout} />);
    
    const increaseButton = screen.getAllByRole('button').find(btn => 
      btn.querySelector('svg path[d*="M12 6v6m0 0v6m0-6h6m-6 0H6"]')
    );
    
    expect(increaseButton).toBeDisabled();
  });

  it('calculates total correctly', () => {
    const multipleItems = [
      mockCartItem, // 2 × ₹250 = ₹500
      mockCartItemWithVariant, // 1 × ₹350 = ₹350
    ];

    (useCartStore as any).mockReturnValue({
      items: multipleItems,
      total: 850,
      updateQuantity: mockUpdateQuantity,
      removeItem: mockRemoveItem,
      clearCart: mockClearCart,
      getItemCount: mockGetItemCount.mockReturnValue(3),
    });

    render(<CartManager onCheckout={mockOnCheckout} />);
    
    expect(screen.getByText('₹850.00')).toBeInTheDocument();
  });
});
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ProductDetailModal } from '../ProductDetailModal';
import type { ProductSearchResult } from '@/types/search';

const mockProduct: ProductSearchResult = {
  id: '1',
  name: 'Bhagavad Gita',
  description: 'Sacred text of Hindu philosophy containing the dialogue between Prince Arjuna and Lord Krishna.',
  basePrice: 299,
  categoryId: 'books',
  categoryName: 'Books',
  keywords: ['gita', 'philosophy', 'hindu', 'krishna', 'arjuna'],
  metadata: {
    customAttributes: {
      author: 'Vyasa',
      language: 'English',
      publisher: 'Gita Press',
      pages: 700,
      isbn: '978-8129300000',
    },
  },
  variants: [
    {
      id: 'v1',
      name: 'Hardcover',
      price: 399,
      stockQuantity: 5,
      attributes: { binding: 'Hardcover', size: 'Large' },
      keywords: ['hardcover', 'premium'],
    },
    {
      id: 'v2',
      name: 'Paperback',
      price: 299,
      stockQuantity: 10,
      attributes: { binding: 'Paperback', size: 'Standard' },
      keywords: ['paperback', 'standard'],
    },
  ],
  relevanceScore: 95.5,
  isActive: true,
  stockQuantity: 15,
};

const mockProductWithoutVariants: ProductSearchResult = {
  ...mockProduct,
  variants: [],
  stockQuantity: 8,
};

describe('ProductDetailModal', () => {
  const mockOnClose = vi.fn();
  const mockOnAddToCart = vi.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
    mockOnAddToCart.mockClear();
  });

  it('renders modal when open', () => {
    render(
      <ProductDetailModal
        product={mockProduct}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Bhagavad Gita')).toBeInTheDocument();
    expect(screen.getByText('Books')).toBeInTheDocument();
    expect(screen.getByText('Score: 95.5')).toBeInTheDocument();
    expect(screen.getByText(/₹299/)).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <ProductDetailModal
        product={mockProduct}
        isOpen={false}
        onClose={mockOnClose}
      />
    );

    expect(screen.queryByText('Bhagavad Gita')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    render(
      <ProductDetailModal
        product={mockProduct}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    const closeButton = document.querySelector('button[class*="ml-4 p-2"]');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onClose when backdrop is clicked', () => {
    render(
      <ProductDetailModal
        product={mockProduct}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    const backdrop = document.querySelector('.bg-gray-500');
    fireEvent.click(backdrop!);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('displays product details in details tab', () => {
    render(
      <ProductDetailModal
        product={mockProduct}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText(mockProduct.description!)).toBeInTheDocument();
    expect(screen.getByText('Keywords')).toBeInTheDocument();
    expect(screen.getByText('gita')).toBeInTheDocument();
    expect(screen.getByText('philosophy')).toBeInTheDocument();
  });

  it('displays variants in variants tab', () => {
    render(
      <ProductDetailModal
        product={mockProduct}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    const variantsTab = screen.getByText('Variants (2)');
    fireEvent.click(variantsTab);

    expect(screen.getByText('Hardcover')).toBeInTheDocument();
    expect(screen.getByText('Paperback')).toBeInTheDocument();
    expect(screen.getAllByText('₹399.00').length).toBeGreaterThan(0);
    expect(screen.getAllByText('₹299.00').length).toBeGreaterThan(0);
    expect(screen.getAllByText('5 in stock').length).toBeGreaterThan(0);
    expect(screen.getAllByText('10 in stock').length).toBeGreaterThan(0);
  });

  it('displays metadata in metadata tab', () => {
    render(
      <ProductDetailModal
        product={mockProduct}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    const metadataTab = screen.getByText('Metadata');
    fireEvent.click(metadataTab);

    expect(screen.getByText(/Product ID:/)).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText(/Category ID:/)).toBeInTheDocument();
    expect(screen.getByText('books')).toBeInTheDocument();
    expect(screen.getByText(/Status:/)).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('selects first variant by default when variants exist', () => {
    render(
      <ProductDetailModal
        product={mockProduct}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    // Should show hardcover price (first variant)
    expect(screen.getByText('₹399.00')).toBeInTheDocument();
    expect(screen.getByText(/Base price: ₹299.00/)).toBeInTheDocument();
    expect(screen.getByText('5 in stock')).toBeInTheDocument();
  });

  it('allows variant selection', () => {
    render(
      <ProductDetailModal
        product={mockProduct}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    const variantsTab = screen.getByText('Variants (2)');
    fireEvent.click(variantsTab);

    const paperbackVariant = screen.getByText('Paperback').closest('.cursor-pointer');
    fireEvent.click(paperbackVariant!);

    // Price should update to paperback price - check the main price display
    expect(screen.getByText('₹299.00')).toBeInTheDocument();
    expect(screen.getAllByText('10 in stock').length).toBeGreaterThan(0);
  });

  it('handles quantity changes', () => {
    render(
      <ProductDetailModal
        product={mockProduct}
        isOpen={true}
        onClose={mockOnClose}
        onAddToCart={mockOnAddToCart}
      />
    );

    const quantityInput = screen.getByDisplayValue('1');
    fireEvent.change(quantityInput, { target: { value: '3' } });

    expect(quantityInput).toHaveValue(3);
    expect(screen.getByText('₹1,197.00')).toBeInTheDocument(); // 399 * 3
  });

  it('handles quantity increment and decrement buttons', () => {
    render(
      <ProductDetailModal
        product={mockProduct}
        isOpen={true}
        onClose={mockOnClose}
        onAddToCart={mockOnAddToCart}
      />
    );

    const incrementButton = screen.getByText('+');
    const decrementButton = screen.getByText('-');
    const quantityInput = screen.getByDisplayValue('1');

    // Increment
    fireEvent.click(incrementButton);
    expect(quantityInput).toHaveValue(2);

    // Decrement
    fireEvent.click(decrementButton);
    expect(quantityInput).toHaveValue(1);

    // Should not go below 1
    fireEvent.click(decrementButton);
    expect(quantityInput).toHaveValue(1);
  });

  it('limits quantity to available stock', () => {
    render(
      <ProductDetailModal
        product={mockProduct}
        isOpen={true}
        onClose={mockOnClose}
        onAddToCart={mockOnAddToCart}
      />
    );

    const quantityInput = screen.getByDisplayValue('1');
    
    // Try to set quantity higher than stock (5 for hardcover variant)
    fireEvent.change(quantityInput, { target: { value: '10' } });
    
    // Should be limited to max available (5) or max allowed (10), whichever is smaller
    expect(quantityInput).toHaveValue(5);
  });

  it('calls onAddToCart with correct parameters', () => {
    render(
      <ProductDetailModal
        product={mockProduct}
        isOpen={true}
        onClose={mockOnClose}
        onAddToCart={mockOnAddToCart}
      />
    );

    const quantityInput = screen.getByDisplayValue('1');
    fireEvent.change(quantityInput, { target: { value: '2' } });

    const addToCartButton = screen.getByText('Add to Cart');
    fireEvent.click(addToCartButton);

    expect(mockOnAddToCart).toHaveBeenCalledWith(
      mockProduct,
      mockProduct.variants[0], // First variant (Hardcover)
      2
    );
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('handles product without variants', () => {
    render(
      <ProductDetailModal
        product={mockProductWithoutVariants}
        isOpen={true}
        onClose={mockOnClose}
        onAddToCart={mockOnAddToCart}
      />
    );

    // Should show base price - check the main price display area
    expect(screen.getByText('₹299.00')).toBeInTheDocument();
    expect(screen.getByText('8 in stock')).toBeInTheDocument();

    const variantsTab = screen.getByText('Variants (0)');
    fireEvent.click(variantsTab);

    expect(screen.getByText('No variants available for this product')).toBeInTheDocument();
  });

  it('does not show add to cart section when onAddToCart is not provided', () => {
    render(
      <ProductDetailModal
        product={mockProduct}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    expect(screen.queryByText('Add to Cart')).not.toBeInTheDocument();
    expect(screen.queryByText('Quantity:')).not.toBeInTheDocument();
  });

  it('does not show add to cart section when product is out of stock', () => {
    const outOfStockProduct = {
      ...mockProduct,
      stockQuantity: 0,
      variants: [
        {
          ...mockProduct.variants[0],
          stockQuantity: 0,
        },
      ],
    };

    render(
      <ProductDetailModal
        product={outOfStockProduct}
        isOpen={true}
        onClose={mockOnClose}
        onAddToCart={mockOnAddToCart}
      />
    );

    expect(screen.queryByText('Add to Cart')).not.toBeInTheDocument();
    expect(screen.getByText('Out of stock')).toBeInTheDocument();
  });

  it('displays custom attributes correctly', () => {
    render(
      <ProductDetailModal
        product={mockProduct}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    // Custom attributes should be in the details tab
    expect(screen.getByText(/author:/i)).toBeInTheDocument();
    expect(screen.getByText('Vyasa')).toBeInTheDocument();
    expect(screen.getByText(/language:/i)).toBeInTheDocument();
    expect(screen.getByText('English')).toBeInTheDocument();
    expect(screen.getByText(/publisher:/i)).toBeInTheDocument();
    expect(screen.getByText('Gita Press')).toBeInTheDocument();
  });

  it('handles variant attributes display', () => {
    render(
      <ProductDetailModal
        product={mockProduct}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    const variantsTab = screen.getByText('Variants (2)');
    fireEvent.click(variantsTab);

    expect(screen.getByText(/binding.*Hardcover/)).toBeInTheDocument();
    expect(screen.getByText(/size.*Large/)).toBeInTheDocument();
    expect(screen.getByText(/binding.*Paperback/)).toBeInTheDocument();
    expect(screen.getByText(/size.*Standard/)).toBeInTheDocument();
  });

  it('shows low stock warning when stock is low', () => {
    const lowStockProduct = {
      ...mockProduct,
      variants: [
        {
          ...mockProduct.variants[0],
          stockQuantity: 3,
        },
      ],
    };

    render(
      <ProductDetailModal
        product={lowStockProduct}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('3 in stock')).toBeInTheDocument();
  });
});
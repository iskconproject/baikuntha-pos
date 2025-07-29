import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductGrid } from '@/components/ui/ProductGrid';
import type { Product } from '@/types';

const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Bhagavad Gita',
    description: 'Sacred text of Hindu philosophy',
    basePrice: 299,
    categoryId: 'books',
    keywords: ['gita', 'philosophy', 'hindu'],
    metadata: {
      customAttributes: {
        author: 'A.C. Bhaktivedanta Swami Prabhupada',
        language: 'English'
      }
    },
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    variants: []
  },
  {
    id: '2',
    name: 'Tulsi Mala',
    description: 'Sacred prayer beads',
    basePrice: 150,
    categoryId: 'accessories',
    keywords: ['mala', 'prayer', 'tulsi'],
    metadata: {
      customAttributes: {
        material: 'Tulsi wood',
        beads: '108'
      }
    },
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    variants: [
      {
        id: 'v1',
        productId: '2',
        name: 'Small',
        price: 150,
        stockQuantity: 10,
        attributes: { size: 'small' },
        keywords: []
      },
      {
        id: 'v2',
        productId: '2',
        name: 'Large',
        price: 200,
        stockQuantity: 0,
        attributes: { size: 'large' },
        keywords: []
      }
    ]
  }
];

describe('ProductGrid Component', () => {
  describe('Rendering', () => {
    it('renders products in a grid layout', () => {
      render(<ProductGrid products={mockProducts} />);
      
      expect(screen.getByRole('grid')).toBeInTheDocument();
      expect(screen.getByText('Bhagavad Gita')).toBeInTheDocument();
      expect(screen.getByText('Tulsi Mala')).toBeInTheDocument();
    });

    it('displays product information correctly', () => {
      render(<ProductGrid products={mockProducts} />);
      
      // Check product names
      expect(screen.getByText('Bhagavad Gita')).toBeInTheDocument();
      expect(screen.getByText('Tulsi Mala')).toBeInTheDocument();
      
      // Check descriptions
      expect(screen.getByText('Sacred text of Hindu philosophy')).toBeInTheDocument();
      expect(screen.getByText('Sacred prayer beads')).toBeInTheDocument();
      
      // Check prices
      expect(screen.getByText('₹299.00')).toBeInTheDocument();
      expect(screen.getByText('₹150.00 - ₹200.00')).toBeInTheDocument();
    });

    it('shows metadata attributes', () => {
      render(<ProductGrid products={mockProducts} />);
      
      expect(screen.getByText('A.C. Bhaktivedanta Swami Prabhupada')).toBeInTheDocument();
      expect(screen.getByText('Tulsi wood')).toBeInTheDocument();
    });

    it('displays variant information', () => {
      render(<ProductGrid products={mockProducts} />);
      
      expect(screen.getByText('2 variants')).toBeInTheDocument();
    });

    it('shows stock information', () => {
      render(<ProductGrid products={mockProducts} />);
      
      // Check that stock information is displayed
      const stockElements = screen.getAllByText(/Stock:/);
      expect(stockElements).toHaveLength(2);
      
      // Check for unlimited stock symbol
      expect(document.body.textContent).toContain('∞');
      
      // Check for specific stock number
      expect(document.body.textContent).toContain('10');
    });
  });

  describe('Stock Status', () => {
    it('shows out of stock indicator', () => {
      const outOfStockProduct: Product = {
        ...mockProducts[1],
        variants: [
          {
            id: 'v1',
            productId: '2',
            name: 'Out of Stock',
            price: 150,
            stockQuantity: 0,
            attributes: {},
            keywords: []
          }
        ]
      };

      render(<ProductGrid products={[outOfStockProduct]} />);
      
      expect(screen.getByText('Out of Stock')).toBeInTheDocument();
    });

    it('shows low stock indicator', () => {
      const lowStockProduct: Product = {
        ...mockProducts[1],
        variants: [
          {
            id: 'v1',
            productId: '2',
            name: 'Low Stock',
            price: 150,
            stockQuantity: 3,
            attributes: {},
            keywords: []
          }
        ]
      };

      render(<ProductGrid products={[lowStockProduct]} />);
      
      expect(screen.getByText('Low Stock')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows loading skeleton', () => {
      render(<ProductGrid products={[]} loading />);
      
      const skeletons = screen.getAllByRole('generic');
      expect(skeletons.length).toBeGreaterThan(0);
      
      // Check for loading animation
      const loadingElements = document.querySelectorAll('.animate-pulse');
      expect(loadingElements.length).toBeGreaterThan(0);
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no products', () => {
      render(<ProductGrid products={[]} />);
      
      expect(screen.getByText('No Products Found')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your search or filters to find products.')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('calls onProductSelect when product is clicked', async () => {
      const handleProductSelect = vi.fn();
      const user = userEvent.setup();
      
      render(
        <ProductGrid 
          products={mockProducts} 
          onProductSelect={handleProductSelect}
        />
      );
      
      const productCard = screen.getByLabelText('Product: Bhagavad Gita');
      await user.click(productCard);
      
      expect(handleProductSelect).toHaveBeenCalledWith(mockProducts[0]);
    });

    it('calls onAddToCart when add to cart button is clicked', async () => {
      const handleAddToCart = vi.fn();
      const user = userEvent.setup();
      
      render(
        <ProductGrid 
          products={mockProducts} 
          onAddToCart={handleAddToCart}
        />
      );
      
      const addToCartButtons = screen.getAllByText('Add to Cart');
      await user.click(addToCartButtons[0]);
      
      expect(handleAddToCart).toHaveBeenCalledWith(mockProducts[0]);
    });

    it('prevents add to cart when out of stock', async () => {
      const handleAddToCart = vi.fn();
      const user = userEvent.setup();
      
      const outOfStockProduct: Product = {
        ...mockProducts[0],
        variants: [
          {
            id: 'v1',
            productId: '1',
            name: 'Out of Stock',
            price: 299,
            stockQuantity: 0,
            attributes: {},
            keywords: []
          }
        ]
      };
      
      render(
        <ProductGrid 
          products={[outOfStockProduct]} 
          onAddToCart={handleAddToCart}
        />
      );
      
      const outOfStockButton = screen.getByRole('button', { name: /add.*to cart/i });
      expect(outOfStockButton).toBeDisabled();
      expect(outOfStockButton).toHaveTextContent('Out of Stock');
      
      await user.click(outOfStockButton);
      expect(handleAddToCart).not.toHaveBeenCalled();
    });
  });

  describe('Keyboard Navigation', () => {
    it('supports keyboard navigation for product selection', async () => {
      const handleProductSelect = vi.fn();
      const user = userEvent.setup();
      
      render(
        <ProductGrid 
          products={mockProducts} 
          onProductSelect={handleProductSelect}
        />
      );
      
      const productCard = screen.getByLabelText('Product: Bhagavad Gita');
      productCard.focus();
      
      await user.keyboard('{Enter}');
      expect(handleProductSelect).toHaveBeenCalledWith(mockProducts[0]);
      
      await user.keyboard(' ');
      expect(handleProductSelect).toHaveBeenCalledTimes(2);
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(<ProductGrid products={mockProducts} />);
      
      expect(screen.getByRole('grid')).toHaveAttribute('aria-label', 'Product grid');
      
      const productCards = screen.getAllByRole('gridcell');
      expect(productCards).toHaveLength(mockProducts.length);
      
      expect(screen.getByLabelText('Product: Bhagavad Gita')).toBeInTheDocument();
      expect(screen.getByLabelText('Product: Tulsi Mala')).toBeInTheDocument();
    });

    it('has proper button labels for add to cart', () => {
      render(<ProductGrid products={mockProducts} onAddToCart={vi.fn()} />);
      
      expect(screen.getByLabelText('Add Bhagavad Gita to cart')).toBeInTheDocument();
      expect(screen.getByLabelText('Add Tulsi Mala to cart')).toBeInTheDocument();
    });

    it('has minimum touch target sizes', () => {
      render(<ProductGrid products={mockProducts} onAddToCart={vi.fn()} />);
      
      const addToCartButtons = screen.getAllByText('Add to Cart');
      addToCartButtons.forEach(button => {
        expect(button).toHaveClass('min-h-[44px]');
      });
    });

    it('provides proper focus management', () => {
      render(<ProductGrid products={mockProducts} onProductSelect={vi.fn()} />);
      
      const productCard = screen.getByLabelText('Product: Bhagavad Gita');
      productCard.focus();
      
      expect(productCard).toHaveFocus();
      expect(productCard).toHaveAttribute('tabIndex', '0');
    });
  });

  describe('Responsive Design', () => {
    it('applies responsive grid classes', () => {
      render(<ProductGrid products={mockProducts} />);
      
      const grid = screen.getByRole('grid');
      expect(grid).toHaveClass('grid-cols-1');
      expect(grid).toHaveClass('xs:grid-cols-2');
      expect(grid).toHaveClass('sm:grid-cols-2');
      expect(grid).toHaveClass('md:grid-cols-3');
      expect(grid).toHaveClass('lg:grid-cols-3');
      expect(grid).toHaveClass('xl:grid-cols-4');
      expect(grid).toHaveClass('2xl:grid-cols-5');
    });

    it('has responsive spacing', () => {
      render(<ProductGrid products={mockProducts} />);
      
      const grid = screen.getByRole('grid');
      expect(grid).toHaveClass('gap-3');
      expect(grid).toHaveClass('sm:gap-4');
      expect(grid).toHaveClass('md:gap-5');
      expect(grid).toHaveClass('lg:gap-6');
    });
  });
});
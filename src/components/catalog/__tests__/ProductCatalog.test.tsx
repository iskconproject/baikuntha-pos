import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ProductCatalog } from '../ProductCatalog';
import type { ProductSearchResult } from '@/types/search';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockProducts: ProductSearchResult[] = [
  {
    id: '1',
    name: 'Bhagavad Gita',
    description: 'Sacred text of Hindu philosophy',
    basePrice: 299,
    categoryId: 'books',
    categoryName: 'Books',
    keywords: ['gita', 'philosophy', 'hindu'],
    metadata: { customAttributes: { author: 'Vyasa', language: 'English' } },
    variants: [],
    relevanceScore: 95.5,
    isActive: true,
    stockQuantity: 10,
  },
  {
    id: '2',
    name: 'Tulsi Mala',
    description: 'Sacred prayer beads',
    basePrice: 150,
    categoryId: 'accessories',
    categoryName: 'Accessories',
    keywords: ['mala', 'prayer', 'tulsi'],
    metadata: { customAttributes: { material: 'Tulsi wood', size: 'Standard' } },
    variants: [],
    relevanceScore: 87.2,
    isActive: true,
    stockQuantity: 15,
  },
];

const mockSearchResult = {
  products: mockProducts,
  totalCount: 2,
  suggestions: [],
  filters: {
    categories: [],
    priceRanges: [],
    attributes: {},
    languages: [],
  },
  searchTime: 45,
  query: '',
};

describe('ProductCatalog', () => {
  const mockOnProductSelect = vi.fn();
  const mockOnSearchFocus = vi.fn();

  beforeEach(() => {
    mockFetch.mockClear();
    mockOnProductSelect.mockClear();
    mockOnSearchFocus.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders product catalog with toolbar and products', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSearchResult),
    });

    render(
      <ProductCatalog
        selectedCategory=""
        onProductSelect={mockOnProductSelect}
      />
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Quick search in this category...')).toBeInTheDocument();
      expect(screen.getByText('Sort by:')).toBeInTheDocument();
      expect(screen.getByText('Showing 1-2 of 2 products')).toBeInTheDocument();
      expect(screen.getByText('Bhagavad Gita')).toBeInTheDocument();
      expect(screen.getByText('Tulsi Mala')).toBeInTheDocument();
    });
  });

  it('fetches products on mount', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSearchResult),
    });

    render(
      <ProductCatalog
        selectedCategory=""
        onProductSelect={mockOnProductSelect}
      />
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/search?q=&sort=name&limit=24&offset=0')
      );
    });
  });

  it('fetches products with category filter when category is selected', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSearchResult),
    });

    render(
      <ProductCatalog
        selectedCategory="books"
        onProductSelect={mockOnProductSelect}
      />
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/search?q=&sort=name&limit=24&offset=0&category=books')
      );
    });
  });

  it('handles sort option changes', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSearchResult),
    });

    render(
      <ProductCatalog
        selectedCategory=""
        onProductSelect={mockOnProductSelect}
      />
    );

    await waitFor(() => {
      const sortSelect = screen.getByDisplayValue('Name');
      fireEvent.change(sortSelect, { target: { value: 'price_asc' } });
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('sort=price_asc')
      );
    });
  });

  it('performs quick search when search button is clicked', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSearchResult),
    });

    render(
      <ProductCatalog
        selectedCategory=""
        onProductSelect={mockOnProductSelect}
      />
    );

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Quick search in this category...');
      const searchButton = screen.getByText('Search');

      fireEvent.change(searchInput, { target: { value: 'gita' } });
      fireEvent.click(searchButton);
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('q=gita')
      );
    });
  });

  it('performs quick search when Enter is pressed', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSearchResult),
    });

    render(
      <ProductCatalog
        selectedCategory=""
        onProductSelect={mockOnProductSelect}
      />
    );

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Quick search in this category...');
      fireEvent.change(searchInput, { target: { value: 'gita' } });
      fireEvent.keyPress(searchInput, { key: 'Enter', code: 'Enter' });
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('q=gita')
      );
    });
  });

  it('calls onSearchFocus when search input is focused', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSearchResult),
    });

    render(
      <ProductCatalog
        selectedCategory=""
        onProductSelect={mockOnProductSelect}
        onSearchFocus={mockOnSearchFocus}
      />
    );

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Quick search in this category...');
      fireEvent.focus(searchInput);
    });

    expect(mockOnSearchFocus).toHaveBeenCalled();
  });

  it('calls onProductSelect when product is clicked', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSearchResult),
    });

    render(
      <ProductCatalog
        selectedCategory=""
        onProductSelect={mockOnProductSelect}
      />
    );

    await waitFor(() => {
      const productCard = screen.getByText('Bhagavad Gita').closest('.cursor-pointer');
      fireEvent.click(productCard!);
    });

    expect(mockOnProductSelect).toHaveBeenCalledWith(mockProducts[0]);
  });

  it('displays loading spinner while fetching products', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(
      <ProductCatalog
        selectedCategory=""
        onProductSelect={mockOnProductSelect}
      />
    );

    expect(screen.getByText('Loading products...')).toBeInTheDocument();
  });

  it('displays no products message when no products are found', async () => {
    const emptyResult = {
      ...mockSearchResult,
      products: [],
      totalCount: 0,
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(emptyResult),
    });

    render(
      <ProductCatalog
        selectedCategory=""
        onProductSelect={mockOnProductSelect}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('No products found')).toBeInTheDocument();
      expect(screen.getByText('No products available in the catalog.')).toBeInTheDocument();
    });
  });

  it('displays category-specific no products message when category is selected', async () => {
    const emptyResult = {
      ...mockSearchResult,
      products: [],
      totalCount: 0,
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(emptyResult),
    });

    render(
      <ProductCatalog
        selectedCategory="books"
        onProductSelect={mockOnProductSelect}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('No products available in this category.')).toBeInTheDocument();
    });
  });

  it('shows clear search button when search query is active', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ...mockSearchResult, products: [], totalCount: 0 }),
    });

    render(
      <ProductCatalog
        selectedCategory=""
        onProductSelect={mockOnProductSelect}
      />
    );

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Quick search in this category...');
      const searchButton = screen.getByText('Search');

      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
      fireEvent.click(searchButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Clear Search')).toBeInTheDocument();
    });
  });

  it('clears search when clear search button is clicked', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ...mockSearchResult, products: [], totalCount: 0 }),
    });

    render(
      <ProductCatalog
        selectedCategory=""
        onProductSelect={mockOnProductSelect}
      />
    );

    // Perform search
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Quick search in this category...');
      const searchButton = screen.getByText('Search');

      fireEvent.change(searchInput, { target: { value: 'test' } });
      fireEvent.click(searchButton);
    });

    // Clear search
    await waitFor(() => {
      const clearButton = screen.getByText('Clear Search');
      fireEvent.click(clearButton);
    });

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Quick search in this category...');
      expect(searchInput).toHaveValue('');
    });
  });

  it('handles pagination correctly', async () => {
    const paginatedResult = {
      ...mockSearchResult,
      totalCount: 50,
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(paginatedResult),
    });

    render(
      <ProductCatalog
        selectedCategory=""
        onProductSelect={mockOnProductSelect}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Showing 1-24 of 50 products')).toBeInTheDocument();
      expect(screen.getByText('Next')).toBeInTheDocument();
    });

    // Click next page
    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('offset=24')
      );
    });
  });

  it('resets to page 1 when category changes', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSearchResult),
    });

    const { rerender } = render(
      <ProductCatalog
        selectedCategory=""
        onProductSelect={mockOnProductSelect}
      />
    );

    // Change category
    rerender(
      <ProductCatalog
        selectedCategory="books"
        onProductSelect={mockOnProductSelect}
      />
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('offset=0')
      );
    });
  });

  it('resets to page 1 when sort changes', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSearchResult),
    });

    render(
      <ProductCatalog
        selectedCategory=""
        onProductSelect={mockOnProductSelect}
      />
    );

    await waitFor(() => {
      const sortSelect = screen.getByDisplayValue('Name');
      fireEvent.change(sortSelect, { target: { value: 'price_desc' } });
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('sort=price_desc&limit=24&offset=0')
      );
    });
  });

  it('handles fetch errors gracefully', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    render(
      <ProductCatalog
        selectedCategory=""
        onProductSelect={mockOnProductSelect}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('No products found')).toBeInTheDocument();
    });
  });
});
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SearchInterface } from '../SearchInterface';
import type { SearchResult, ProductSearchResult } from '@/types/search';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock debounce hook
vi.mock('@/hooks/useDebounce', () => ({
  useDebounce: (value: any) => value,
}));

const mockSearchResult: SearchResult = {
  products: [
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
      variants: [
        {
          id: 'v1',
          name: 'Small',
          price: 120,
          stockQuantity: 5,
          attributes: { size: 'Small' },
          keywords: ['small'],
        },
      ],
      relevanceScore: 87.2,
      isActive: true,
      stockQuantity: 15,
    },
  ],
  totalCount: 2,
  suggestions: ['bhagavad gita', 'tulsi mala'],
  filters: {
    categories: [
      { value: 'books', label: 'Books', count: 1 },
      { value: 'accessories', label: 'Accessories', count: 1 },
    ],
    priceRanges: [
      { min: 0, max: 200, label: '₹0 - ₹200', count: 1 },
      { min: 200, max: 500, label: '₹200 - ₹500', count: 1 },
    ],
    attributes: {
      author: [{ value: 'Vyasa', label: 'Vyasa', count: 1 }],
      material: [{ value: 'Tulsi wood', label: 'Tulsi wood', count: 1 }],
    },
    languages: [
      { value: 'en', label: 'English', count: 2 },
      { value: 'hi', label: 'हिंदी', count: 0 },
      { value: 'bn', label: 'বাংলা', count: 0 },
    ],
  },
  searchTime: 45,
  query: 'gita',
};

const mockSuggestions = {
  suggestions: ['bhagavad gita', 'gita press', 'gita mahatmya'],
};

describe('SearchInterface', () => {
  const mockOnProductSelect = vi.fn();
  const mockOnAddToCart = vi.fn();

  beforeEach(() => {
    mockFetch.mockClear();
    mockOnProductSelect.mockClear();
    mockOnAddToCart.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders search interface with all components', () => {
    render(<SearchInterface onProductSelect={mockOnProductSelect} />);

    expect(screen.getByPlaceholderText('Search products, books, accessories...')).toBeInTheDocument();
    expect(screen.getByText('Language:')).toBeInTheDocument();
    expect(screen.getByText('Sort:')).toBeInTheDocument();
    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.getByText('Clear All')).toBeInTheDocument();
  });

  it('performs search when typing in search input', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSuggestions),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSearchResult),
      });

    render(<SearchInterface onProductSelect={mockOnProductSelect} />);

    const searchInput = screen.getByPlaceholderText('Search products, books, accessories...');
    fireEvent.change(searchInput, { target: { value: 'gita' } });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'gita',
          language: 'en',
          sortBy: 'relevance',
          limit: 20,
          offset: 0,
          filters: {
            attributes: {},
          },
        }),
      });
    });
  });

  it('displays search results correctly', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSearchResult),
    });

    render(<SearchInterface onProductSelect={mockOnProductSelect} />);

    const searchInput = screen.getByPlaceholderText('Search products, books, accessories...');
    fireEvent.change(searchInput, { target: { value: 'gita' } });

    await waitFor(() => {
      expect(screen.getByText('Bhagavad Gita')).toBeInTheDocument();
      expect(screen.getByText('Tulsi Mala')).toBeInTheDocument();
      expect(screen.getByText('₹299.00')).toBeInTheDocument();
      expect(screen.getByText('₹150.00')).toBeInTheDocument();
      expect(screen.getByText('10 in stock')).toBeInTheDocument();
      expect(screen.getByText('15 in stock')).toBeInTheDocument();
    });
  });

  it('shows suggestions when typing', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSuggestions),
    });

    render(<SearchInterface onProductSelect={mockOnProductSelect} />);

    const searchInput = screen.getByPlaceholderText('Search products, books, accessories...');
    fireEvent.change(searchInput, { target: { value: 'gi' } });
    fireEvent.focus(searchInput);

    await waitFor(() => {
      expect(screen.getByText('bhagavad gita')).toBeInTheDocument();
      expect(screen.getByText('gita press')).toBeInTheDocument();
      expect(screen.getByText('gita mahatmya')).toBeInTheDocument();
    });
  });

  it('handles language selection', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSearchResult),
    });

    render(<SearchInterface onProductSelect={mockOnProductSelect} />);

    const languageSelect = screen.getByDisplayValue('English');
    fireEvent.change(languageSelect, { target: { value: 'hi' } });

    const searchInput = screen.getByPlaceholderText('Search products, books, accessories...');
    fireEvent.change(searchInput, { target: { value: 'गीता' } });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'गीता',
          language: 'hi',
          sortBy: 'relevance',
          limit: 20,
          offset: 0,
          filters: {
            attributes: {},
          },
        }),
      });
    });
  });

  it('handles sort option changes', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSearchResult),
    });

    render(<SearchInterface onProductSelect={mockOnProductSelect} />);

    const sortSelect = screen.getByDisplayValue('Relevance');
    fireEvent.change(sortSelect, { target: { value: 'price_asc' } });

    const searchInput = screen.getByPlaceholderText('Search products, books, accessories...');
    fireEvent.change(searchInput, { target: { value: 'test' } });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'test',
          language: 'en',
          sortBy: 'price_asc',
          limit: 20,
          offset: 0,
          filters: {
            attributes: {},
          },
        }),
      });
    });
  });

  it('applies price range filters', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSearchResult),
    });

    render(<SearchInterface onProductSelect={mockOnProductSelect} />);

    // Set price range
    const minPriceInput = screen.getByPlaceholderText('Min');
    const maxPriceInput = screen.getByPlaceholderText('Max');
    
    fireEvent.change(minPriceInput, { target: { value: '100' } });
    fireEvent.change(maxPriceInput, { target: { value: '300' } });

    const searchInput = screen.getByPlaceholderText('Search products, books, accessories...');
    fireEvent.change(searchInput, { target: { value: 'test' } });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'test',
          language: 'en',
          sortBy: 'relevance',
          limit: 20,
          offset: 0,
          filters: {
            priceMin: 100,
            priceMax: 300,
            attributes: {},
          },
        }),
      });
    });
  });

  it('applies stock filter', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSearchResult),
    });

    render(<SearchInterface onProductSelect={mockOnProductSelect} />);

    const stockCheckbox = screen.getByLabelText('In Stock Only');
    fireEvent.click(stockCheckbox);

    const searchInput = screen.getByPlaceholderText('Search products, books, accessories...');
    fireEvent.change(searchInput, { target: { value: 'test' } });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'test',
          language: 'en',
          sortBy: 'relevance',
          limit: 20,
          offset: 0,
          filters: {
            inStock: true,
            attributes: {},
          },
        }),
      });
    });
  });

  it('calls onProductSelect when product is clicked', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSearchResult),
    });

    render(<SearchInterface onProductSelect={mockOnProductSelect} />);

    const searchInput = screen.getByPlaceholderText('Search products, books, accessories...');
    fireEvent.change(searchInput, { target: { value: 'gita' } });

    await waitFor(() => {
      const productCard = screen.getByText('Bhagavad Gita').closest('.cursor-pointer');
      fireEvent.click(productCard!);
    });

    expect(mockOnProductSelect).toHaveBeenCalledWith(mockSearchResult.products[0]);
  });

  it('calls onAddToCart when add to cart button is clicked', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSearchResult),
    });

    render(
      <SearchInterface 
        onProductSelect={mockOnProductSelect} 
        onAddToCart={mockOnAddToCart}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search products, books, accessories...');
    fireEvent.change(searchInput, { target: { value: 'gita' } });

    await waitFor(() => {
      const addToCartButtons = screen.getAllByText('Add to Cart');
      fireEvent.click(addToCartButtons[0]);
    });

    expect(mockOnAddToCart).toHaveBeenCalledWith(mockSearchResult.products[0]);
  });

  it('displays no results message when search returns empty', async () => {
    const emptyResult = {
      ...mockSearchResult,
      products: [],
      totalCount: 0,
      suggestions: ['try searching for books', 'try searching for accessories'],
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(emptyResult),
    });

    render(<SearchInterface onProductSelect={mockOnProductSelect} />);

    const searchInput = screen.getByPlaceholderText('Search products, books, accessories...');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

    await waitFor(() => {
      expect(screen.getByText('No products found')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your search terms or filters.')).toBeInTheDocument();
      expect(screen.getByText('Did you mean:')).toBeInTheDocument();
      expect(screen.getByText('try searching for books')).toBeInTheDocument();
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

    render(<SearchInterface onProductSelect={mockOnProductSelect} />);

    const searchInput = screen.getByPlaceholderText('Search products, books, accessories...');
    fireEvent.change(searchInput, { target: { value: 'test' } });

    await waitFor(() => {
      expect(screen.getByText(/Showing 1-20 of 50 results/)).toBeInTheDocument();
      expect(screen.getByText('Next')).toBeInTheDocument();
    });

    // Click next page
    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'test',
          language: 'en',
          sortBy: 'relevance',
          limit: 20,
          offset: 20,
          filters: {
            attributes: {},
          },
        }),
      });
    });
  });

  it('clears filters when clear all is clicked', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSearchResult),
    });

    render(<SearchInterface onProductSelect={mockOnProductSelect} />);

    // Set some filters
    const minPriceInput = screen.getByPlaceholderText('Min');
    const stockCheckbox = screen.getByLabelText('In Stock Only');
    
    fireEvent.change(minPriceInput, { target: { value: '100' } });
    fireEvent.click(stockCheckbox);

    // Clear filters
    const clearButton = screen.getByText('Clear All');
    fireEvent.click(clearButton);

    expect(minPriceInput.value).toBe('');
    expect(stockCheckbox).not.toBeChecked();
  });

  it('records analytics when search is performed', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSuggestions),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSearchResult),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

    render(<SearchInterface onProductSelect={mockOnProductSelect} />);

    const searchInput = screen.getByPlaceholderText('Search products, books, accessories...');
    fireEvent.change(searchInput, { target: { value: 'gita' } });

    await waitFor(() => {
      expect(screen.getByText('Bhagavad Gita')).toBeInTheDocument();
    });

    const productCard = screen.getByText('Bhagavad Gita').closest('.cursor-pointer');
    fireEvent.click(productCard!);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/search/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'gita',
          resultCount: 2,
          clickedProductId: '1',
        }),
      });
    });
  });
});
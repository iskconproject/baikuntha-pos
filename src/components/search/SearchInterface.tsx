'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import type { 
  SearchQuery, 
  SearchResult, 
  ProductSearchResult, 
  SearchLanguage,
  SearchSortOption,
  FilterOption 
} from '@/types/search';

interface SearchInterfaceProps {
  onProductSelect?: (product: ProductSearchResult) => void;
  onAddToCart?: (product: ProductSearchResult, variant?: any) => void;
  className?: string;
}

export function SearchInterface({ onProductSelect, onAddToCart, className = '' }: SearchInterfaceProps) {
  const [query, setQuery] = useState('');
  const [language, setLanguage] = useState<SearchLanguage>('en');
  const [sortBy, setSortBy] = useState<SearchSortOption>('relevance');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [priceRange, setPriceRange] = useState<{ min?: number; max?: number }>({});
  const [inStockOnly, setInStockOnly] = useState(false);
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string[]>>({});
  
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  
  const debouncedQuery = useDebounce(query, 300);
  const debouncedSuggestionQuery = useDebounce(query, 150);
  
  const itemsPerPage = 20;

  // Fetch search suggestions
  useEffect(() => {
    if (debouncedSuggestionQuery.length >= 2) {
      fetchSuggestions(debouncedSuggestionQuery);
    } else {
      setSuggestions([]);
    }
  }, [debouncedSuggestionQuery, language]);

  // Perform search
  useEffect(() => {
    if (debouncedQuery.trim() || selectedCategory || Object.keys(selectedAttributes).length > 0) {
      performSearch();
    } else {
      setSearchResults(null);
    }
  }, [
    debouncedQuery,
    language,
    sortBy,
    selectedCategory,
    priceRange,
    inStockOnly,
    selectedAttributes,
    currentPage
  ]);

  const fetchSuggestions = async (searchQuery: string) => {
    try {
      const response = await fetch(
        `/api/search/suggestions?q=${encodeURIComponent(searchQuery)}&lang=${language}&limit=8`
      );
      const data = await response.json();
      setSuggestions(data.suggestions || []);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
    }
  };

  const performSearch = async () => {
    setIsLoading(true);
    
    try {
      const searchQuery: SearchQuery = {
        query: query.trim(),
        categoryId: selectedCategory || undefined,
        language,
        sortBy,
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage,
        filters: {
          priceMin: priceRange.min,
          priceMax: priceRange.max,
          inStock: inStockOnly,
          attributes: selectedAttributes,
        },
      };

      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchQuery),
      });

      const data: SearchResult = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    setCurrentPage(1);
    
    // Record analytics for suggestion click
    recordAnalytics(suggestion, 0);
  };

  const handleProductClick = (product: ProductSearchResult) => {
    // Record analytics for product click
    recordAnalytics(query, searchResults?.totalCount || 0, product.id);
    
    if (onProductSelect) {
      onProductSelect(product);
    }
  };

  const recordAnalytics = async (searchQuery: string, resultCount: number, clickedProductId?: string) => {
    try {
      await fetch('/api/search/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: searchQuery,
          resultCount,
          clickedProductId,
        }),
      });
    } catch (error) {
      console.error('Error recording analytics:', error);
    }
  };

  const handleAttributeFilter = (attributeName: string, value: string, checked: boolean) => {
    setSelectedAttributes(prev => {
      const newAttributes = { ...prev };
      
      if (!newAttributes[attributeName]) {
        newAttributes[attributeName] = [];
      }
      
      if (checked) {
        newAttributes[attributeName] = [...newAttributes[attributeName], value];
      } else {
        newAttributes[attributeName] = newAttributes[attributeName].filter(v => v !== value);
        if (newAttributes[attributeName].length === 0) {
          delete newAttributes[attributeName];
        }
      }
      
      return newAttributes;
    });
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSelectedCategory('');
    setPriceRange({});
    setInStockOnly(false);
    setSelectedAttributes({});
    setCurrentPage(1);
  };

  const totalPages = searchResults ? Math.ceil(searchResults.totalCount / itemsPerPage) : 0;

  return (
    <div className={`search-interface ${className}`}>
      {/* Search Header */}
      <div className="search-header bg-white shadow-sm border-b border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search Input */}
          <div className="relative flex-1">
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="Search products, books, accessories..."
                className="w-full px-4 py-3 pl-12 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-lg"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              {isLoading && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <div className="animate-spin h-5 w-5 border-2 border-orange-500 border-t-transparent rounded-full"></div>
                </div>
              )}
            </div>
            
            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div
                ref={suggestionsRef}
                className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
              >
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none first:rounded-t-lg last:rounded-b-lg"
                  >
                    <span className="text-gray-900">{suggestion}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Language Selector */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Language:</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as SearchLanguage)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="en">English</option>
              <option value="hi">हिंदी</option>
              <option value="bn">বাংলা</option>
            </select>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Sort:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SearchSortOption)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="relevance">Relevance</option>
              <option value="name">Name</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="popularity">Popularity</option>
              <option value="newest">Newest</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row">
        {/* Filters Sidebar */}
        <div className="w-full lg:w-64 bg-gray-50 border-r border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
            <button
              onClick={clearFilters}
              className="text-sm text-orange-600 hover:text-orange-700 font-medium"
            >
              Clear All
            </button>
          </div>

          {/* Category Filter */}
          {searchResults?.filters.categories && searchResults.filters.categories.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Category</h4>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="category"
                    value=""
                    checked={selectedCategory === ''}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">All Categories</span>
                </label>
                {searchResults.filters.categories.map((category) => (
                  <label key={category.value} className="flex items-center">
                    <input
                      type="radio"
                      name="category"
                      value={category.value}
                      checked={selectedCategory === category.value}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      {category.label} ({category.count})
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Price Range Filter */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Price Range</h4>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Min"
                value={priceRange.min || ''}
                onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value ? Number(e.target.value) : undefined }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
              <input
                type="number"
                placeholder="Max"
                value={priceRange.max || ''}
                onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value ? Number(e.target.value) : undefined }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>

          {/* Stock Filter */}
          <div className="mb-6">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">In Stock Only</span>
            </label>
          </div>

          {/* Attribute Filters */}
          {searchResults?.filters.attributes && Object.entries(searchResults.filters.attributes).map(([attributeName, options]) => (
            options.length > 0 && (
              <div key={attributeName} className="mb-6">
                <h4 className="text-sm font-medium text-gray-900 mb-2 capitalize">
                  {attributeName.replace(/([A-Z])/g, ' $1').trim()}
                </h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {options.map((option) => (
                    <label key={option.value} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedAttributes[attributeName]?.includes(option.value) || false}
                        onChange={(e) => handleAttributeFilter(attributeName, option.value, e.target.checked)}
                        className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        {option.label} ({option.count})
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )
          ))}
        </div>

        {/* Search Results */}
        <div className="flex-1 p-4">
          {searchResults && (
            <>
              {/* Results Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-gray-600">
                  {searchResults.totalCount > 0 ? (
                    <>
                      Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, searchResults.totalCount)} of {searchResults.totalCount} results
                      {query && ` for "${query}"`}
                      <span className="ml-2 text-gray-400">({searchResults.searchTime}ms)</span>
                    </>
                  ) : (
                    <>No results found{query && ` for "${query}"`}</>
                  )}
                </div>
              </div>

              {/* Products Grid */}
              {searchResults.products.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                  {searchResults.products.map((product) => (
                    <div
                      key={product.id}
                      className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => handleProductClick(product)}
                    >
                      <div className="p-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                          {product.name}
                        </h3>
                        {product.description && (
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                            {product.description}
                          </p>
                        )}
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xl font-bold text-orange-600">
                            ₹{product.basePrice.toFixed(2)}
                          </span>
                          <span className="text-sm text-gray-500">
                            Score: {product.relevanceScore}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <span>{product.categoryName}</span>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            product.stockQuantity > 0 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {product.stockQuantity > 0 ? `${product.stockQuantity} in stock` : 'Out of stock'}
                          </span>
                        </div>
                        {product.keywords.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {product.keywords.slice(0, 3).map((keyword, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                              >
                                {keyword}
                              </span>
                            ))}
                          </div>
                        )}
                        {onAddToCart && product.stockQuantity > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddToCart(product);
                            }}
                            className="w-full mt-3 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors"
                          >
                            Add to Cart
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No products found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Try adjusting your search terms or filters.
                  </p>
                  {searchResults.suggestions.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm text-gray-600 mb-2">Did you mean:</p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {searchResults.suggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm hover:bg-orange-200 transition-colors"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-2 border rounded-md text-sm font-medium ${
                          currentPage === pageNum
                            ? 'bg-orange-600 text-white border-orange-600'
                            : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
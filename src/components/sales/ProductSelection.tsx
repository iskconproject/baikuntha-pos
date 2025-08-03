"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useCartStore } from "@/stores/cartStore";
import { useDebounce } from "@/hooks/useDebounce";
import { VariantSelector } from "./VariantSelector";
import type { Product, ProductVariant } from "@/types";
import type { ProductSearchResult } from "@/types/search";

interface ProductSelectionProps {
  className?: string;
}

export function ProductSelection({ className = "" }: ProductSelectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ProductSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [showVariantSelector, setShowVariantSelector] = useState<string | null>(
    null
  );
  const [productVariants, setProductVariants] = useState<
    Record<string, ProductVariant[]>
  >({});
  const [addedToCart, setAddedToCart] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(searchQuery, 300);

  const addItem = useCartStore((state) => state.addItem);

  // Focus search input on mount
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  // Quick access categories
  const quickCategories = [
    { id: "", name: "All", icon: "🏪", color: "bg-gray-100 text-gray-700" },
    { id: "1", name: "Books", icon: "📚", color: "bg-blue-100 text-blue-700" },
    {
      id: "2",
      name: "Accessories",
      icon: "📿",
      color: "bg-purple-100 text-purple-700",
    },
    {
      id: "3",
      name: "Incense",
      icon: "🕯️",
      color: "bg-yellow-100 text-yellow-700",
    },
    {
      id: "4",
      name: "Clothing",
      icon: "👕",
      color: "bg-green-100 text-green-700",
    },
    {
      id: "5",
      name: "Jewelry",
      icon: "💍",
      color: "bg-pink-100 text-pink-700",
    },
  ];

  const performSearch = useCallback(async () => {
    setIsLoading(true);
    try {
      const searchQuery = {
        query: debouncedQuery.trim(),
        categoryId: selectedCategory || undefined,
        limit: 20,
        sortBy: "relevance" as const,
        language: "en" as const,
      };

      const response = await fetch("/api/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(searchQuery),
      });

      const data = await response.json();

      if (response.ok && data.products) {
        setSearchResults(data.products || []);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedQuery, selectedCategory]);

  // Search products
  useEffect(() => {
    if (debouncedQuery.trim() || selectedCategory) {
      performSearch();
    } else {
      setSearchResults([]);
    }
  }, [debouncedQuery, selectedCategory, performSearch]);

  const handleQuickAdd = async (product: ProductSearchResult) => {
    try {
      const response = await fetch(`/api/products/${product.id}`);
      const result = await response.json();

      if (!result.success) {
        console.error("Error fetching product:", result.error);
        return;
      }

      const fullProduct = result.data;
      const productData: Product = {
        id: fullProduct.id,
        name: fullProduct.name,
        description: fullProduct.description,
        basePrice: fullProduct.basePrice,
        categoryId: fullProduct.categoryId,
        keywords: fullProduct.keywords || [],
        metadata: fullProduct.metadata || { customAttributes: {} },
        isActive: fullProduct.isActive,
        createdAt: new Date(fullProduct.createdAt),
        updatedAt: new Date(fullProduct.updatedAt),
        variants: fullProduct.variants || [],
      };

      // If product has variants, show inline variant selector
      if (productData.variants && productData.variants.length > 0) {
        setProductVariants((prev) => ({
          ...prev,
          [product.id]: productData.variants || [],
        }));
        setShowVariantSelector(product.id);
      } else {
        // Add product directly to cart
        addItem(productData, undefined, 1);
        setAddedToCart(product.id);
        setTimeout(() => setAddedToCart(null), 2000);
      }
    } catch (error) {
      console.error("Error adding product to cart:", error);
    }
  };

  const handleVariantSelect = async (
    productId: string,
    variant: ProductVariant
  ) => {
    try {
      const response = await fetch(`/api/products/${productId}`);
      const result = await response.json();

      if (!result.success) return;

      const fullProduct = result.data;
      const productData: Product = {
        id: fullProduct.id,
        name: fullProduct.name,
        description: fullProduct.description,
        basePrice: fullProduct.basePrice,
        categoryId: fullProduct.categoryId,
        keywords: fullProduct.keywords || [],
        metadata: fullProduct.metadata || { customAttributes: {} },
        isActive: fullProduct.isActive,
        createdAt: new Date(fullProduct.createdAt),
        updatedAt: new Date(fullProduct.updatedAt),
        variants: fullProduct.variants || [],
      };

      addItem(productData, variant, 1);
      setShowVariantSelector(null);
      setProductVariants((prev) => {
        const newVariants = { ...prev };
        delete newVariants[productId];
        return newVariants;
      });
      setAddedToCart(productId);
      setTimeout(() => setAddedToCart(null), 2000);
    } catch (error) {
      console.error("Error adding variant to cart:", error);
    }
  };

  const handleVariantCancel = (productId: string) => {
    setShowVariantSelector(null);
    setProductVariants((prev) => {
      const newVariants = { ...prev };
      delete newVariants[productId];
      return newVariants;
    });
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Quick Search Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="relative">
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products... (Press Enter to add first result)"
            className="w-full px-4 py-3 pl-12 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-lg"
            onKeyDown={(e) => {
              if (e.key === "Enter" && searchResults.length > 0) {
                e.preventDefault();
                handleQuickAdd(searchResults[0]);
              } else if (e.key === "Escape") {
                setSearchQuery("");
                setSearchResults([]);
              }
            }}
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              className="h-6 w-6 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          {isLoading && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <div className="animate-spin h-5 w-5 border-2 border-orange-500 border-t-transparent rounded-full"></div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Category Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap gap-2">
          {quickCategories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === category.id
                  ? "bg-orange-600 text-white"
                  : `${category.color} hover:opacity-80`
              }`}
            >
              <span className="mr-2">{category.icon}</span>
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              {searchQuery ? `Results for "${searchQuery}"` : "Products"}
              <span className="text-sm font-normal text-gray-600 ml-2">
                ({searchResults.length} found)
              </span>
            </h3>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {searchResults.map((product) => (
              <div
                key={product.id}
                className="p-4 border-b border-gray-100 last:border-b-0"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-lg font-medium text-gray-900 truncate">
                      {product.name}
                    </h4>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xl font-bold text-orange-600">
                        ₹{product.basePrice.toFixed(2)}
                      </span>
                      <span className="text-sm text-gray-500">
                        {product.categoryName}
                      </span>
                    </div>
                    {product.stockQuantity <= 5 &&
                      product.stockQuantity > 0 && (
                        <span className="text-xs text-amber-600 font-medium">
                          Only {product.stockQuantity} left
                        </span>
                      )}
                  </div>

                  <div className="ml-4 flex items-center space-x-2">
                    {showVariantSelector === product.id ? (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setShowVariantSelector(null)}
                          className="px-3 py-2 text-gray-600 hover:text-gray-800 text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleQuickAdd(product)}
                        disabled={product.stockQuantity === 0}
                        className={`px-6 py-2 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                          addedToCart === product.id
                            ? "bg-green-600 text-white"
                            : "bg-orange-600 text-white hover:bg-orange-700"
                        }`}
                      >
                        {addedToCart === product.id ? (
                          <div className="flex items-center space-x-2">
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                            <span>Added!</span>
                          </div>
                        ) : product.stockQuantity === 0 ? (
                          "Out of Stock"
                        ) : (
                          "Add"
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline Variant Selector */}
                {showVariantSelector === product.id &&
                  productVariants[product.id] && (
                    <div className="mt-4">
                      <VariantSelector
                        variants={productVariants[product.id]}
                        onSelect={(variant) =>
                          handleVariantSelect(product.id, variant)
                        }
                        onCancel={() => handleVariantCancel(product.id)}
                      />
                    </div>
                  )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && searchQuery && searchResults.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No products found
          </h3>
          <p className="text-gray-600">
            Try adjusting your search terms or browse by category.
          </p>
        </div>
      )}
    </div>
  );
}

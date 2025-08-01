"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Package } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { EnhancedProduct } from "@/services/database/products";
import type { CategoryHierarchy } from "@/services/database/categories";

interface ProductListProps {
  products: EnhancedProduct[];
  categories: CategoryHierarchy[];
  onProductSelect: (product: EnhancedProduct) => void;
  onProductEdit: (product: EnhancedProduct) => void;
  onProductDelete: (productId: string) => void;
  onCreateProduct: () => void;
  isLoading?: boolean;
}

export function ProductList({
  products,
  categories,
  onProductSelect,
  onProductEdit,
  onProductDelete,
  onCreateProduct,
  isLoading = false,
}: ProductListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });
  const [stockFilter, setStockFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let filtered = products.filter((product) => {
      // Text search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = product.name.toLowerCase().includes(query);
        const matchesDescription = product.description
          ?.toLowerCase()
          .includes(query);
        const matchesKeywords = product.keywords.some((keyword) =>
          keyword.toLowerCase().includes(query)
        );
        const matchesMetadata = Object.values(product.metadata).some(
          (value) =>
            typeof value === "string" && value.toLowerCase().includes(query)
        );

        if (
          !matchesName &&
          !matchesDescription &&
          !matchesKeywords &&
          !matchesMetadata
        ) {
          return false;
        }
      }

      // Category filter
      if (selectedCategory && product.category?.id !== selectedCategory) {
        return false;
      }

      // Price range filter
      if (priceRange.min && product.basePrice < parseFloat(priceRange.min)) {
        return false;
      }
      if (priceRange.max && product.basePrice > parseFloat(priceRange.max)) {
        return false;
      }

      // Stock filter
      if (stockFilter === "in-stock") {
        const hasStock =
          product.variants.length === 0 ||
          product.variants.some((variant) => (variant.stockQuantity || 0) > 0);
        if (!hasStock) return false;
      } else if (stockFilter === "low-stock") {
        const hasLowStock = product.variants.some(
          (variant) =>
            (variant.stockQuantity || 0) > 0 &&
            (variant.stockQuantity || 0) <= 5
        );
        if (!hasLowStock) return false;
      } else if (stockFilter === "out-of-stock") {
        const isOutOfStock =
          product.variants.length > 0 &&
          product.variants.every((variant) => variant.stockQuantity === 0);
        if (!isOutOfStock) return false;
      }

      return true;
    });

    // Sort products
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case "price":
          aValue = a.basePrice;
          bValue = b.basePrice;
          break;
        case "category":
          aValue = a.category?.name || "";
          bValue = b.category?.name || "";
          break;
        case "created":
          aValue = new Date(a.createdAt || 0);
          bValue = new Date(b.createdAt || 0);
          break;
        default: // name
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }

      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [
    products,
    searchQuery,
    selectedCategory,
    priceRange,
    stockFilter,
    sortBy,
    sortOrder,
  ]);

  const getTotalStock = (product: EnhancedProduct): number => {
    return product.variants.reduce(
      (total, variant) => total + (variant.stockQuantity || 0),
      0
    );
  };

  const getStockStatus = (
    product: EnhancedProduct
  ): { status: string; className: string } => {
    if (product.variants.length === 0) {
      return { status: "No variants", className: "text-gray-500" };
    }

    const totalStock = getTotalStock(product);
    if (totalStock === 0) {
      return { status: "Out of stock", className: "text-red-600" };
    } else if (totalStock <= 5) {
      return { status: "Low stock", className: "text-yellow-600" };
    } else {
      return { status: "In stock", className: "text-green-600" };
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("");
    setPriceRange({ min: "", max: "" });
    setStockFilter("all");
    setSortBy("name");
    setSortOrder("asc");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Products</h2>
          <p className="text-gray-600">
            {filteredProducts.length} of {products.length} products
          </p>
        </div>
        <Button
          onClick={onCreateProduct}
          className="bg-orange-600 hover:bg-orange-700"
        >
          Add Product
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <Select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              options={[
                { value: "", label: "All categories" },
                ...categories.map((cat) => ({
                  value: cat.id,
                  label: cat.name,
                })),
              ]}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Stock Status
            </label>
            <Select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              options={[
                { value: "all", label: "All products" },
                { value: "in-stock", label: "In stock" },
                { value: "low-stock", label: "Low stock" },
                { value: "out-of-stock", label: "Out of stock" },
              ]}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sort By
            </label>
            <div className="flex gap-2">
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                options={[
                  { value: "name", label: "Name" },
                  { value: "price", label: "Price" },
                  { value: "category", label: "Category" },
                  { value: "created", label: "Created" },
                ]}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                }
                className="px-3"
              >
                {sortOrder === "asc" ? "↑" : "↓"}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Price Range
            </label>
            <div className="flex gap-2">
              <Input
                type="number"
                value={priceRange.min}
                onChange={(e) =>
                  setPriceRange((prev) => ({ ...prev, min: e.target.value }))
                }
                placeholder="Min price"
                className="flex-1"
              />
              <Input
                type="number"
                value={priceRange.max}
                onChange={(e) =>
                  setPriceRange((prev) => ({ ...prev, max: e.target.value }))
                }
                placeholder="Max price"
                className="flex-1"
              />
            </div>
          </div>

          <div className="flex items-end">
            <Button
              type="button"
              variant="outline"
              onClick={clearFilters}
              className="w-full"
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Product Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-white p-6 rounded-lg border animate-pulse"
            >
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded mb-4"></div>
              <div className="h-6 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No products found</p>
          <p className="text-gray-400">
            Try adjusting your filters or create a new product
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => {
            const stockStatus = getStockStatus(product);
            const totalStock = getTotalStock(product);

            return (
              <div
                key={product.id}
                className="bg-white p-6 rounded-lg border hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => onProductSelect(product)}
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold text-gray-900 line-clamp-2">
                    {product.name}
                  </h3>
                  <div className="flex space-x-1 ml-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onProductEdit(product);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onProductDelete(product.id);
                      }}
                      className="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </Button>
                  </div>
                </div>

                {product.description && (
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                    {product.description}
                  </p>
                )}

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-900">
                      ₹{product.basePrice.toFixed(2)}
                    </span>
                    <span
                      className={`text-sm font-medium ${stockStatus.className}`}
                    >
                      {stockStatus.status}
                    </span>
                  </div>

                  {product.category && (
                    <div className="text-sm text-gray-500">
                      Category: {product.category.name}
                    </div>
                  )}

                  {/* Enhanced Variant Display */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 text-sm">
                      {product.variants.length > 0 ? (
                        <>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            <Package className="w-3 h-3 mr-1" />
                            {product.variants.length} variant{product.variants.length !== 1 ? "s" : ""}
                          </span>
                          <span className="text-gray-600 font-medium">
                            Total stock: {totalStock}
                          </span>
                        </>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          <Package className="w-3 h-3 mr-1" />
                          No variants
                        </span>
                      )}
                    </div>

                    {/* Show variant names preview */}
                    {product.variants.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {product.variants.slice(0, 3).map((variant, index) => (
                          <span
                            key={index}
                            className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                          >
                            {variant.name}
                          </span>
                        ))}
                        {product.variants.length > 3 && (
                          <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                            +{product.variants.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {product.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {product.keywords.slice(0, 3).map((keyword, index) => (
                        <span
                          key={index}
                          className="inline-block px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded"
                        >
                          {keyword}
                        </span>
                      ))}
                      {product.keywords.length > 3 && (
                        <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                          +{product.keywords.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

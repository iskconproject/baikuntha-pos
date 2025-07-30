'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import type { EnhancedProduct } from '@/services/database/products';

interface StockManagerProps {
  products: EnhancedProduct[];
  onStockUpdate: () => void;
  isLoading?: boolean;
}

interface StockUpdate {
  productId: string;
  variantId: string;
  newStock: number;
}

export function StockManager({ products, onStockUpdate, isLoading = false }: StockManagerProps) {
  const [stockUpdates, setStockUpdates] = useState<Record<string, number>>({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');

  // Filter products based on search and stock status
  const filteredProducts = products.filter(product => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!product.name.toLowerCase().includes(query) &&
          !product.keywords.some(k => k.toLowerCase().includes(query))) {
        return false;
      }
    }

    // Stock filter
    if (stockFilter !== 'all') {
      const totalStock = product.variants.reduce((sum, variant) => sum + (variant.stockQuantity || 0), 0);
      
      if (stockFilter === 'low' && totalStock > 10) return false;
      if (stockFilter === 'out' && totalStock > 0) return false;
    }

    return true;
  });

  const handleStockChange = (productId: string, variantId: string, value: string) => {
    const key = `${productId}-${variantId}`;
    const numValue = parseInt(value) || 0;
    
    setStockUpdates(prev => ({
      ...prev,
      [key]: numValue
    }));
  };

  const handleUpdateStock = async (productId: string, variantId: string) => {
    const key = `${productId}-${variantId}`;
    const newStock = stockUpdates[key];
    
    if (newStock === undefined) return;

    try {
      setIsUpdating(true);
      
      const response = await fetch(`/api/products/${productId}/variants/${variantId}/stock`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stockQuantity: newStock }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update stock');
      }

      // Remove from pending updates
      setStockUpdates(prev => {
        const updated = { ...prev };
        delete updated[key];
        return updated;
      });

      // Refresh data
      onStockUpdate();
    } catch (error) {
      console.error('Error updating stock:', error);
      alert('Failed to update stock. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBulkUpdate = async () => {
    if (Object.keys(stockUpdates).length === 0) return;

    try {
      setIsUpdating(true);
      
      const updates = Object.entries(stockUpdates).map(([key, stock]) => {
        const [productId, variantId] = key.split('-');
        return { productId, variantId, stockQuantity: stock };
      });

      const response = await fetch('/api/products/stock/bulk-update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ updates }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update stock');
      }

      // Clear all pending updates
      setStockUpdates({});
      
      // Refresh data
      onStockUpdate();
    } catch (error) {
      console.error('Error updating stock:', error);
      alert('Failed to update stock. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { label: 'Out of Stock', color: 'text-red-600 bg-red-50' };
    if (stock <= 5) return { label: 'Low Stock', color: 'text-yellow-600 bg-yellow-50' };
    if (stock <= 10) return { label: 'Medium Stock', color: 'text-orange-600 bg-orange-50' };
    return { label: 'In Stock', color: 'text-green-600 bg-green-50' };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Stock Management</h2>
          <p className="text-gray-600">Update product stock levels and monitor inventory</p>
        </div>
        {Object.keys(stockUpdates).length > 0 && (
          <Button
            onClick={handleBulkUpdate}
            disabled={isUpdating}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {isUpdating ? 'Updating...' : `Update ${Object.keys(stockUpdates).length} Items`}
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Products
            </label>
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or keywords..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Stock Status
            </label>
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as 'all' | 'low' | 'out')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="all">All Products</option>
              <option value="low">Low Stock (≤10)</option>
              <option value="out">Out of Stock</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stock List */}
      <div className="space-y-4">
        {filteredProducts.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-gray-500">No products found matching your criteria</p>
            </CardContent>
          </Card>
        ) : (
          filteredProducts.map(product => (
            <Card key={product.id} variant="outlined">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{product.name}</h3>
                    {product.description && (
                      <p className="text-sm text-gray-600 mt-1">{product.description}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Total Stock</p>
                    <p className="text-xl font-bold text-gray-900">
                      {product.variants.reduce((sum, variant) => sum + (variant.stockQuantity || 0), 0)}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {product.variants.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No variants configured</p>
                ) : (
                  <div className="space-y-3">
                    {product.variants.map(variant => {
                      const key = `${product.id}-${variant.id}`;
                      const currentStock = variant.stockQuantity || 0;
                      const pendingStock = stockUpdates[key];
                      const status = getStockStatus(currentStock);
                      
                      return (
                        <div key={variant.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <div>
                                <p className="font-medium text-gray-900">{variant.name}</p>
                                <p className="text-sm text-gray-600">₹{variant.price}</p>
                              </div>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${status.color}`}>
                                {status.label}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-3">
                            <div className="text-right">
                              <p className="text-sm text-gray-500">Current Stock</p>
                              <p className="font-semibold text-gray-900">{currentStock}</p>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <Input
                                type="number"
                                min="0"
                                value={pendingStock !== undefined ? pendingStock : currentStock}
                                onChange={(e) => handleStockChange(product.id, variant.id, e.target.value)}
                                className="w-20 text-center"
                              />
                              {pendingStock !== undefined && pendingStock !== currentStock && (
                                <Button
                                  size="sm"
                                  onClick={() => handleUpdateStock(product.id, variant.id)}
                                  disabled={isUpdating}
                                  className="bg-orange-600 hover:bg-orange-700"
                                >
                                  Update
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
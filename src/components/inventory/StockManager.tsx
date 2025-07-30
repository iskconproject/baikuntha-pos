'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';

interface Product {
  id: string;
  name: string;
  description?: string;
  basePrice: number;
  category?: {
    id: string;
    name: string;
  };
  variants: Array<{
    id: string;
    name: string;
    price: number;
    stockQuantity: number;
    attributes: Record<string, string>;
  }>;
  isActive: boolean;
}

interface StockManagerProps {
  products: Product[];
  onStockUpdate: () => void;
  isLoading?: boolean;
}

interface StockUpdateItem {
  variantId: string;
  productName: string;
  variantName: string;
  currentStock: number;
  newStock: number;
  operation: 'set' | 'add' | 'subtract';
  reason?: string;
}

export function StockManager({ products, onStockUpdate, isLoading = false }: StockManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out' | 'in'>('all');
  const [lowStockThreshold, setLowStockThreshold] = useState(5);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [bulkUpdateData, setBulkUpdateData] = useState<StockUpdateItem[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  // Flatten products into stock items
  const stockItems = useMemo(() => {
    const items: Array<{
      productId: string;
      productName: string;
      variantId: string;
      variantName: string;
      currentStock: number;
      price: number;
      category?: string;
      stockStatus: 'out' | 'low' | 'in';
    }> = [];

    products.forEach(product => {
      if (product.variants.length === 0) {
        // Product without variants
        items.push({
          productId: product.id,
          productName: product.name,
          variantId: `${product.id}-default`,
          variantName: 'Default',
          currentStock: 0, // Products without variants don't have stock tracking
          price: product.basePrice,
          category: product.category?.name,
          stockStatus: 'in', // Default status for products without variants
        });
      } else {
        // Product with variants
        product.variants.forEach(variant => {
          const stock = variant.stockQuantity || 0;
          let status: 'out' | 'low' | 'in' = 'in';
          
          if (stock === 0) {
            status = 'out';
          } else if (stock <= lowStockThreshold) {
            status = 'low';
          }

          items.push({
            productId: product.id,
            productName: product.name,
            variantId: variant.id,
            variantName: variant.name,
            currentStock: stock,
            price: variant.price,
            category: product.category?.name,
            stockStatus: status,
          });
        });
      }
    });

    return items;
  }, [products, lowStockThreshold]);

  // Filter stock items
  const filteredItems = useMemo(() => {
    let filtered = stockItems;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.productName.toLowerCase().includes(query) ||
        item.variantName.toLowerCase().includes(query) ||
        item.category?.toLowerCase().includes(query)
      );
    }

    // Apply stock status filter
    if (stockFilter !== 'all') {
      filtered = filtered.filter(item => item.stockStatus === stockFilter);
    }

    return filtered.sort((a, b) => {
      // Sort by stock status (out -> low -> in), then by stock quantity
      const statusOrder = { out: 0, low: 1, in: 2 };
      if (statusOrder[a.stockStatus] !== statusOrder[b.stockStatus]) {
        return statusOrder[a.stockStatus] - statusOrder[b.stockStatus];
      }
      return a.currentStock - b.currentStock;
    });
  }, [stockItems, searchQuery, stockFilter]);

  // Get stock statistics
  const stockStats = useMemo(() => {
    const stats = {
      total: stockItems.length,
      outOfStock: 0,
      lowStock: 0,
      inStock: 0,
      totalValue: 0,
    };

    stockItems.forEach(item => {
      stats[`${item.stockStatus}Stock` as keyof typeof stats]++;
      stats.totalValue += item.currentStock * item.price;
    });

    return stats;
  }, [stockItems]);

  const handleSelectItem = (variantId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(variantId)) {
      newSelected.delete(variantId);
    } else {
      newSelected.add(variantId);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredItems.map(item => item.variantId)));
    }
  };

  const handleBulkStockUpdate = () => {
    const selectedStockItems = filteredItems.filter(item => 
      selectedItems.has(item.variantId)
    );

    const updateItems: StockUpdateItem[] = selectedStockItems.map(item => ({
      variantId: item.variantId,
      productName: item.productName,
      variantName: item.variantName,
      currentStock: item.currentStock,
      newStock: item.currentStock,
      operation: 'set',
      reason: '',
    }));

    setBulkUpdateData(updateItems);
    setIsUpdateModalOpen(true);
  };

  const handleSingleStockUpdate = (item: typeof filteredItems[0]) => {
    const updateItem: StockUpdateItem = {
      variantId: item.variantId,
      productName: item.productName,
      variantName: item.variantName,
      currentStock: item.currentStock,
      newStock: item.currentStock,
      operation: 'set',
      reason: '',
    };

    setBulkUpdateData([updateItem]);
    setIsUpdateModalOpen(true);
  };

  const handleUpdateModalSubmit = async () => {
    try {
      setIsUpdating(true);

      const updates = bulkUpdateData.map(item => ({
        variantId: item.variantId,
        quantity: item.newStock,
        operation: item.operation,
        reason: item.reason,
      }));

      const response = await fetch('/api/products/stock', {
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

      // Reset state and reload data
      setIsUpdateModalOpen(false);
      setBulkUpdateData([]);
      setSelectedItems(new Set());
      onStockUpdate();
    } catch (error) {
      console.error('Error updating stock:', error);
      alert('Failed to update stock. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const updateBulkItem = (index: number, field: keyof StockUpdateItem, value: any) => {
    const newData = [...bulkUpdateData];
    newData[index] = { ...newData[index], [field]: value };

    // Recalculate newStock based on operation
    if (field === 'operation') {
      const item = newData[index];
      if (value === 'add') {
        item.newStock = item.currentStock + 1;
      } else if (value === 'subtract') {
        item.newStock = Math.max(0, item.currentStock - 1);
      } else {
        item.newStock = item.currentStock;
      }
    }

    setBulkUpdateData(newData);
  };

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case 'out':
        return 'text-red-600 bg-red-100';
      case 'low':
        return 'text-yellow-600 bg-yellow-100';
      case 'in':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStockStatusLabel = (status: string) => {
    switch (status) {
      case 'out':
        return 'Out of Stock';
      case 'low':
        return 'Low Stock';
      case 'in':
        return 'In Stock';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-gray-900">{stockStats.total}</div>
          <div className="text-sm text-gray-600">Total Items</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-red-600">{stockStats.outOfStock}</div>
          <div className="text-sm text-gray-600">Out of Stock</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-yellow-600">{stockStats.lowStock}</div>
          <div className="text-sm text-gray-600">Low Stock</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-green-600">{stockStats.inStock}</div>
          <div className="text-sm text-gray-600">In Stock</div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="bg-white p-4 rounded-lg border space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Items
            </label>
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products or variants..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Stock Status
            </label>
            <Select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as any)}
              options={[
                { value: 'all', label: 'All Items' },
                { value: 'out', label: 'Out of Stock' },
                { value: 'low', label: 'Low Stock' },
                { value: 'in', label: 'In Stock' },
              ]}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Low Stock Threshold
            </label>
            <Input
              type="number"
              value={lowStockThreshold}
              onChange={(e) => setLowStockThreshold(parseInt(e.target.value) || 5)}
              min="1"
              max="100"
            />
          </div>

          <div className="flex items-end">
            <Button
              onClick={handleBulkStockUpdate}
              disabled={selectedItems.size === 0}
              className="w-full bg-orange-600 hover:bg-orange-700"
            >
              Update Selected ({selectedItems.size})
            </Button>
          </div>
        </div>
      </div>

      {/* Stock Items Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              Stock Items ({filteredItems.length})
            </h3>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={selectedItems.size === filteredItems.length && filteredItems.length > 0}
                onChange={handleSelectAll}
                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
              <label className="text-sm text-gray-600">Select All</label>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading stock data...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">No stock items found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Select
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Variant
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current Stock
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredItems.map((item) => (
                  <tr key={item.variantId} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedItems.has(item.variantId)}
                        onChange={() => handleSelectItem(item.variantId)}
                        className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                      />
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {item.productName}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{item.variantName}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{item.category || 'Uncategorized'}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {item.currentStock}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStockStatusColor(item.stockStatus)}`}>
                        {getStockStatusLabel(item.stockStatus)}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">₹{item.price.toFixed(2)}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSingleStockUpdate(item)}
                      >
                        Update
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bulk Update Modal */}
      <Modal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        title="Update Stock Levels"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Update stock levels for {bulkUpdateData.length} item{bulkUpdateData.length !== 1 ? 's' : ''}
          </p>

          <div className="max-h-96 overflow-y-auto space-y-4">
            {bulkUpdateData.map((item, index) => (
              <div key={item.variantId} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-gray-900">{item.productName}</h4>
                    <p className="text-sm text-gray-600">{item.variantName}</p>
                    <p className="text-sm text-gray-500">Current: {item.currentStock}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Operation
                    </label>
                    <Select
                      value={item.operation}
                      onChange={(e) => updateBulkItem(index, 'operation', e.target.value)}
                      options={[
                        { value: 'set', label: 'Set to' },
                        { value: 'add', label: 'Add' },
                        { value: 'subtract', label: 'Subtract' },
                      ]}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {item.operation === 'set' ? 'New Stock' : 'Quantity'}
                    </label>
                    <Input
                      type="number"
                      value={item.operation === 'set' ? item.newStock : Math.abs(item.newStock - item.currentStock)}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 0;
                        let newStock = value;
                        
                        if (item.operation === 'add') {
                          newStock = item.currentStock + value;
                        } else if (item.operation === 'subtract') {
                          newStock = Math.max(0, item.currentStock - value);
                        }
                        
                        updateBulkItem(index, 'newStock', newStock);
                      }}
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Result
                    </label>
                    <div className="px-3 py-2 bg-gray-100 rounded-md text-sm font-medium">
                      {item.newStock}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason (Optional)
                  </label>
                  <Input
                    value={item.reason || ''}
                    onChange={(e) => updateBulkItem(index, 'reason', e.target.value)}
                    placeholder="Reason for stock update..."
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setIsUpdateModalOpen(false)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateModalSubmit}
              disabled={isUpdating}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isUpdating ? 'Updating...' : 'Update Stock'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
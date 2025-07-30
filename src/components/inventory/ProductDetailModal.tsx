'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';

interface Product {
  id: string;
  name: string;
  description?: string;
  basePrice: number;
  category?: {
    id: string;
    name: string;
  };
  keywords: string[];
  metadata: {
    author?: string;
    publisher?: string;
    language?: string;
    material?: string;
    customAttributes: Record<string, string>;
  };
  variants: Array<{
    id: string;
    name: string;
    price: number;
    stockQuantity: number;
    attributes: Record<string, string>;
  }>;
  isActive: boolean;
  createdAt: string;
}

interface ProductDetailModalProps {
  product: Product;
  onClose: () => void;
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
}

interface VariantStockUpdate {
  variantId: string;
  newStock: number;
}

export function ProductDetailModal({ product, onClose, onEdit, onDelete }: ProductDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'variants' | 'history'>('details');
  const [isUpdatingStock, setIsUpdatingStock] = useState(false);
  const [stockUpdates, setStockUpdates] = useState<Record<string, number>>({});

  const handleStockUpdate = (variantId: string, newStock: number) => {
    setStockUpdates(prev => ({
      ...prev,
      [variantId]: newStock,
    }));
  };

  const handleSaveStockUpdates = async () => {
    if (Object.keys(stockUpdates).length === 0) return;

    try {
      setIsUpdatingStock(true);

      const updates = Object.entries(stockUpdates).map(([variantId, quantity]) => ({
        variantId,
        quantity,
        operation: 'set' as const,
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

      // Reset stock updates and close modal
      setStockUpdates({});
      onClose();
    } catch (error) {
      console.error('Error updating stock:', error);
      alert('Failed to update stock. Please try again.');
    } finally {
      setIsUpdatingStock(false);
    }
  };

  const getTotalStock = () => {
    return product.variants.reduce((total, variant) => {
      const currentStock = stockUpdates[variant.id] ?? variant.stockQuantity;
      return total + currentStock;
    }, 0);
  };

  const getTotalValue = () => {
    return product.variants.reduce((total, variant) => {
      const currentStock = stockUpdates[variant.id] ?? variant.stockQuantity;
      return total + (currentStock * variant.price);
    }, 0);
  };

  const getStockStatus = (variant: typeof product.variants[0]) => {
    const stock = stockUpdates[variant.id] ?? variant.stockQuantity;
    if (stock === 0) return { label: 'Out of Stock', color: 'text-red-600 bg-red-100' };
    if (stock <= 5) return { label: 'Low Stock', color: 'text-yellow-600 bg-yellow-100' };
    return { label: 'In Stock', color: 'text-green-600 bg-green-100' };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const hasStockUpdates = Object.keys(stockUpdates).length > 0;

  const tabs = [
    { id: 'details', label: 'Details', icon: '📋' },
    { id: 'variants', label: 'Variants & Stock', icon: '📦' },
    { id: 'history', label: 'History', icon: '📈' },
  ] as const;

  return (
    <Modal isOpen={true} onClose={onClose} title={product.name} size="lg">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{product.name}</h2>
            <p className="text-gray-600">{product.category?.name || 'Uncategorized'}</p>
          </div>
          <div className="flex space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEdit(product)}
            >
              Edit Product
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (confirm('Are you sure you want to delete this product?')) {
                  onDelete(product.id);
                }
              }}
              className="text-red-600 hover:text-red-800"
            >
              Delete
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="text-lg font-bold text-blue-600">₹{product.basePrice.toFixed(2)}</div>
            <div className="text-sm text-blue-800">Base Price</div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg">
            <div className="text-lg font-bold text-green-600">{getTotalStock()}</div>
            <div className="text-sm text-green-800">Total Stock</div>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg">
            <div className="text-lg font-bold text-purple-600">₹{getTotalValue().toFixed(2)}</div>
            <div className="text-sm text-purple-800">Stock Value</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="min-h-[300px]">
          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Product Name</label>
                    <div className="mt-1 text-sm text-gray-900">{product.name}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Category</label>
                    <div className="mt-1 text-sm text-gray-900">{product.category?.name || 'Uncategorized'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Base Price</label>
                    <div className="mt-1 text-sm text-gray-900">₹{product.basePrice.toFixed(2)}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <div className="mt-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        product.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {product.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>

                {product.description && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <div className="mt-1 text-sm text-gray-900">{product.description}</div>
                  </div>
                )}
              </div>

              {/* Keywords */}
              {product.keywords.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Search Keywords</h3>
                  <div className="flex flex-wrap gap-2">
                    {product.keywords.map((keyword, index) => (
                      <span
                        key={index}
                        className="inline-flex px-3 py-1 rounded-full text-sm bg-orange-100 text-orange-800"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Product Metadata</h3>
                <div className="grid grid-cols-2 gap-4">
                  {product.metadata.author && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Author</label>
                      <div className="mt-1 text-sm text-gray-900">{product.metadata.author}</div>
                    </div>
                  )}
                  {product.metadata.publisher && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Publisher</label>
                      <div className="mt-1 text-sm text-gray-900">{product.metadata.publisher}</div>
                    </div>
                  )}
                  {product.metadata.language && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Language</label>
                      <div className="mt-1 text-sm text-gray-900">{product.metadata.language}</div>
                    </div>
                  )}
                  {product.metadata.material && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Material</label>
                      <div className="mt-1 text-sm text-gray-900">{product.metadata.material}</div>
                    </div>
                  )}
                </div>

                {/* Custom Attributes */}
                {Object.keys(product.metadata.customAttributes).length > 0 && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Custom Attributes</label>
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(product.metadata.customAttributes).map(([key, value]) => (
                        <div key={key}>
                          <label className="block text-sm font-medium text-gray-700">{key}</label>
                          <div className="mt-1 text-sm text-gray-900">{value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Variants Tab */}
          {activeTab === 'variants' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  Product Variants ({product.variants.length})
                </h3>
                {hasStockUpdates && (
                  <Button
                    onClick={handleSaveStockUpdates}
                    disabled={isUpdatingStock}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    {isUpdatingStock ? 'Saving...' : 'Save Stock Updates'}
                  </Button>
                )}
              </div>

              {product.variants.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No variants configured for this product</p>
                  <p className="text-sm text-gray-400">This product uses the base price for all sales</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {product.variants.map((variant) => {
                    const status = getStockStatus(variant);
                    const currentStock = stockUpdates[variant.id] ?? variant.stockQuantity;
                    const hasUpdate = stockUpdates[variant.id] !== undefined;

                    return (
                      <div key={variant.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium text-gray-900">{variant.name}</h4>
                            <p className="text-sm text-gray-600">Price: ₹{variant.price.toFixed(2)}</p>
                            {Object.keys(variant.attributes).length > 0 && (
                              <div className="mt-1">
                                {Object.entries(variant.attributes).map(([key, value]) => (
                                  <span key={key} className="inline-block mr-2 text-xs text-gray-500">
                                    {key}: {value}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${status.color}`}>
                            {status.label}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Current Stock
                            </label>
                            <div className="text-sm text-gray-900">{variant.stockQuantity}</div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Update Stock
                            </label>
                            <Input
                              type="number"
                              value={currentStock}
                              onChange={(e) => handleStockUpdate(variant.id, parseInt(e.target.value) || 0)}
                              min="0"
                              className={hasUpdate ? 'border-orange-500 bg-orange-50' : ''}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Stock Value
                            </label>
                            <div className="text-sm text-gray-900">
                              ₹{(currentStock * variant.price).toFixed(2)}
                            </div>
                          </div>
                        </div>

                        {hasUpdate && (
                          <div className="text-sm text-orange-600 bg-orange-50 p-2 rounded">
                            Stock will be updated from {variant.stockQuantity} to {currentStock}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Product History</h3>
              
              <div className="space-y-3">
                <div className="border-l-4 border-blue-500 pl-4 py-2">
                  <div className="font-medium text-gray-900">Product Created</div>
                  <div className="text-sm text-gray-600">{formatDate(product.createdAt)}</div>
                  <div className="text-sm text-gray-500">Initial product setup completed</div>
                </div>

                {product.variants.length > 0 && (
                  <div className="border-l-4 border-green-500 pl-4 py-2">
                    <div className="font-medium text-gray-900">Variants Configured</div>
                    <div className="text-sm text-gray-600">{product.variants.length} variant(s) added</div>
                    <div className="text-sm text-gray-500">
                      {product.variants.map(v => v.name).join(', ')}
                    </div>
                  </div>
                )}

                {!product.isActive && (
                  <div className="border-l-4 border-red-500 pl-4 py-2">
                    <div className="font-medium text-gray-900">Product Deactivated</div>
                    <div className="text-sm text-gray-600">Product marked as inactive</div>
                    <div className="text-sm text-gray-500">No longer available for sale</div>
                  </div>
                )}

                <div className="text-center py-4 text-gray-500 text-sm">
                  <p>Detailed transaction history and stock movements</p>
                  <p>will be available in future updates</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={onClose}
          >
            Close
          </Button>
          {hasStockUpdates && (
            <Button
              onClick={handleSaveStockUpdates}
              disabled={isUpdatingStock}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isUpdatingStock ? 'Saving...' : 'Save Changes'}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
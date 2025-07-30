'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import type { EnhancedProduct } from '@/services/database/products';

interface ProductDetailModalProps {
  product: EnhancedProduct;
  onClose: () => void;
  onEdit: (product: EnhancedProduct) => void;
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
      [variantId]: newStock
    }));
  };

  const handleSaveStockUpdates = async () => {
    if (Object.keys(stockUpdates).length === 0) return;

    try {
      setIsUpdatingStock(true);
      
      const updates = Object.entries(stockUpdates).map(([variantId, stock]) => ({
        variantId,
        stockQuantity: stock
      }));

      const response = await fetch(`/api/products/${product.id}/stock/bulk-update`, {
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

      // Clear updates and close modal
      setStockUpdates({});
      onClose();
    } catch (error) {
      console.error('Error updating stock:', error);
      alert('Failed to update stock. Please try again.');
    } finally {
      setIsUpdatingStock(false);
    }
  };

  const handleEdit = () => {
    onEdit(product);
    onClose();
  };

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete "${product.name}"? This action cannot be undone.`)) {
      onDelete(product.id);
      onClose();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTotalStock = () => {
    return product.variants.reduce((total, variant) => total + (variant.stockQuantity || 0), 0);
  };

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { label: 'Out of Stock', color: 'text-red-600 bg-red-50' };
    if (stock <= 5) return { label: 'Low Stock', color: 'text-yellow-600 bg-yellow-50' };
    if (stock <= 10) return { label: 'Medium Stock', color: 'text-orange-600 bg-orange-50' };
    return { label: 'In Stock', color: 'text-green-600 bg-green-50' };
  };

  const tabs = [
    { id: 'details', label: 'Details', icon: '📋' },
    { id: 'variants', label: 'Variants', icon: '🔧' },
    { id: 'history', label: 'History', icon: '📊' },
  ] as const;

  return (
    <Modal isOpen={true} onClose={onClose} title={product.name} size="xl">
      <div className="space-y-6">
        {/* Header with Actions */}
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{product.name}</h2>
            {product.description && (
              <p className="text-gray-600 mt-1">{product.description}</p>
            )}
            <div className="flex items-center space-x-4 mt-2">
              <span className="text-lg font-semibold text-gray-900">
                ₹{product.basePrice}
              </span>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                product.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {product.isActive ? 'Active' : 'Inactive'}
              </span>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStockStatus(getTotalStock()).color}`}>
                {getStockStatus(getTotalStock()).label}
              </span>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={handleEdit}>
              Edit Product
            </Button>
            <Button variant="outline" onClick={handleDelete} className="text-red-600 hover:text-red-800">
              Delete
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
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
        <div className="min-h-[400px]">
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Product Name</label>
                    <p className="mt-1 text-sm text-gray-900">{product.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Base Price</label>
                    <p className="mt-1 text-sm text-gray-900">₹{product.basePrice}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Total Stock</label>
                    <p className="mt-1 text-sm text-gray-900">{getTotalStock()} units</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <p className="mt-1 text-sm text-gray-900">{product.isActive ? 'Active' : 'Inactive'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Variants</label>
                    <p className="mt-1 text-sm text-gray-900">{product.variants.length} variants</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Created</label>
                    <p className="mt-1 text-sm text-gray-900">{product.createdAt ? formatDate(product.createdAt.toISOString()) : 'Unknown'}</p>
                  </div>
                </div>
              </div>

              {/* Description */}
              {product.description && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <p className="mt-1 text-sm text-gray-900">{product.description}</p>
                </div>
              )}

              {/* Keywords */}
              {product.keywords.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Keywords</label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {product.keywords.map((keyword, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Metadata */}
              {product.metadata && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Metadata</label>
                  <div className="mt-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {product.metadata.author && (
                      <div>
                        <span className="text-xs font-medium text-gray-500">Author:</span>
                        <p className="text-sm text-gray-900">{product.metadata.author}</p>
                      </div>
                    )}
                    {product.metadata.publisher && (
                      <div>
                        <span className="text-xs font-medium text-gray-500">Publisher:</span>
                        <p className="text-sm text-gray-900">{product.metadata.publisher}</p>
                      </div>
                    )}
                    {product.metadata.language && (
                      <div>
                        <span className="text-xs font-medium text-gray-500">Language:</span>
                        <p className="text-sm text-gray-900">{product.metadata.language}</p>
                      </div>
                    )}
                    {product.metadata.isbn && (
                      <div>
                        <span className="text-xs font-medium text-gray-500">ISBN:</span>
                        <p className="text-sm text-gray-900">{product.metadata.isbn}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'variants' && (
            <div className="space-y-4">
              {product.variants.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">No variants configured for this product</p>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900">Product Variants</h3>
                    {Object.keys(stockUpdates).length > 0 && (
                      <Button
                        onClick={handleSaveStockUpdates}
                        disabled={isUpdatingStock}
                        className="bg-orange-600 hover:bg-orange-700"
                      >
                        {isUpdatingStock ? 'Updating...' : 'Save Stock Changes'}
                      </Button>
                    )}
                  </div>
                  <div className="space-y-3">
                    {product.variants.map((variant) => {
                      const currentStock = variant.stockQuantity || 0;
                      const pendingStock = stockUpdates[variant.id];
                      const status = getStockStatus(currentStock);
                      
                      return (
                        <div key={variant.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">{variant.name}</h4>
                              <p className="text-sm text-gray-600">₹{variant.price}</p>
                              {variant.attributes && Object.keys(variant.attributes).length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {Object.entries(variant.attributes).map(([key, value]) => (
                                    <span
                                      key={key}
                                      className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800"
                                    >
                                      {key}: {value}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center space-x-4">
                              <div className="text-right">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${status.color}`}>
                                  {status.label}
                                </span>
                                <p className="text-sm text-gray-600 mt-1">Current: {currentStock}</p>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Input
                                  type="number"
                                  min="0"
                                  value={pendingStock !== undefined ? pendingStock : currentStock}
                                  onChange={(e) => handleStockUpdate(variant.id, parseInt(e.target.value) || 0)}
                                  className="w-20 text-center"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Product History</h3>
              <div className="space-y-3">
                <div className="border-l-4 border-blue-500 pl-4 py-2">
                  <div className="font-medium text-gray-900">Product Created</div>
                  <div className="text-sm text-gray-600">{product.createdAt ? formatDate(product.createdAt.toISOString()) : 'Unknown'}</div>
                  <div className="text-sm text-gray-500">Initial product setup completed</div>
                </div>

                {product.variants.length > 0 && (
                  <div className="border-l-4 border-green-500 pl-4 py-2">
                    <div className="font-medium text-gray-900">Variants Configured</div>
                    <div className="text-sm text-gray-600">{product.variants.length} variant(s) added</div>
                    <div className="text-sm text-gray-500">Product variants have been set up</div>
                  </div>
                )}

                {product.keywords.length > 0 && (
                  <div className="border-l-4 border-purple-500 pl-4 py-2">
                    <div className="font-medium text-gray-900">Keywords Added</div>
                    <div className="text-sm text-gray-600">{product.keywords.length} keyword(s) configured</div>
                    <div className="text-sm text-gray-500">Search optimization completed</div>
                  </div>
                )}

                <div className="border-l-4 border-gray-300 pl-4 py-2">
                  <div className="font-medium text-gray-900">Current Status</div>
                  <div className="text-sm text-gray-600">
                    {product.isActive ? 'Active and available for sale' : 'Inactive - not available for sale'}
                  </div>
                  <div className="text-sm text-gray-500">
                    Total stock: {getTotalStock()} units across {product.variants.length} variants
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 pt-6 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
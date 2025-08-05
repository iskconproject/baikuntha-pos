'use client';

import React, { useState, useRef } from 'react';
import { Edit } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import type { EnhancedProduct } from '@/services/database/products';
import type { CategoryHierarchy } from '@/services/database/categories';

interface BulkOperationsProps {
  products: EnhancedProduct[];
  categories: CategoryHierarchy[];
  onOperationComplete: () => void;
  isLoading?: boolean;
}

interface BulkEditData {
  categoryId?: string;
  priceAdjustment?: {
    type: 'percentage' | 'fixed';
    value: number;
    operation: 'increase' | 'decrease';
  };
  keywords?: string[];
  metadata?: Record<string, string>;
  isActive?: boolean;
}

export function BulkOperations({ 
  products, 
  categories, 
  onOperationComplete, 
  isLoading = false 
}: BulkOperationsProps) {
  const [activeOperation, setActiveOperation] = useState<'import' | 'export' | 'edit' | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [operationLog, setOperationLog] = useState<string[]>([]);
  
  // Import/Export state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importData, setImportData] = useState<any[]>([]);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');
  
  // Bulk edit state
  const [bulkEditData, setBulkEditData] = useState<BulkEditData>({});
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);

  const handleSelectProduct = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(products.map(p => p.id)));
    }
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        let data: any[] = [];
        
        if (file.type === 'application/json') {
          data = JSON.parse(e.target?.result as string);
        } else if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
          // Simple CSV parsing (for demo purposes)
          const csvText = e.target?.result as string;
          const lines = csvText.split('\n');
          const headers = lines[0].split(',').map(h => h.trim());
          
          data = lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim());
            const obj: any = {};
            headers.forEach((header, index) => {
              obj[header] = values[index] || '';
            });
            return obj;
          }).filter(obj => obj.name); // Filter out empty rows
        }

        setImportData(data);
        setImportPreview(data.slice(0, 10)); // Show first 10 items for preview
        setActiveOperation('import');
      } catch (error) {
        console.error('Error parsing file:', error);
        alert('Error parsing file. Please check the format and try again.');
      }
    };

    reader.readAsText(file);
  };

  const handleImportProducts = async () => {
    if (importData.length === 0) return;

    try {
      setIsProcessing(true);
      setProgress(0);
      setOperationLog(['Starting import...']);

      for (let i = 0; i < importData.length; i++) {
        const item = importData[i];
        
        try {
          // Transform import data to match API format
          const productData = {
            name: item.name,
            description: item.description || '',
            basePrice: parseFloat(item.basePrice || item.price || '0'),
            categoryId: item.categoryId || '',
            keywords: item.keywords ? item.keywords.split(',').map((k: string) => k.trim()) : [],
            metadata: {
              author: item.author || '',
              publisher: item.publisher || '',
              language: item.language || '',
              material: item.material || '',
              customAttributes: {},
            },
            isActive: item.isActive !== 'false',
            variants: item.variants ? (() => {
              try {
                // Parse variants JSON string
                const variantsData = JSON.parse(item.variants.replace(/""/g, '"'));
                return Array.isArray(variantsData) ? variantsData : [];
              } catch (error) {
                console.warn('Failed to parse variants for product:', item.name, error);
                return [];
              }
            })() : [],
          };

          const response = await fetch('/api/products', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(productData),
          });

          if (response.ok) {
            setOperationLog(prev => [...prev, `✓ Imported: ${item.name}`]);
          } else {
            const error = await response.json();
            setOperationLog(prev => [...prev, `✗ Failed: ${item.name} - ${error.error}`]);
          }
        } catch (error) {
          setOperationLog(prev => [...prev, `✗ Error: ${item.name} - ${error}`]);
        }

        setProgress(((i + 1) / importData.length) * 100);
      }

      setOperationLog(prev => [...prev, 'Import completed!']);
      onOperationComplete();
    } catch (error) {
      console.error('Import error:', error);
      setOperationLog(prev => [...prev, `Import failed: ${error}`]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportProducts = () => {
    const selectedProductsData = products.filter(p => selectedProducts.has(p.id));
    const dataToExport = selectedProductsData.length > 0 ? selectedProductsData : products;

    if (exportFormat === 'json') {
      const jsonData = JSON.stringify(dataToExport, null, 2);
      downloadFile(jsonData, 'products.json', 'application/json');
    } else {
      // CSV export
      const headers = [
        'id', 'name', 'description', 'basePrice', 'categoryId', 'categoryName',
        'keywords', 'author', 'publisher', 'language', 'material', 'isActive',
        'variantCount', 'variants'
      ];
      
      const csvRows = [
        headers.join(','),
        ...dataToExport.map(product => {
          // Format variants as JSON string for CSV
          const variantsData = product.variants.map(variant => ({
            id: variant.id,
            name: variant.name,
            price: variant.price,
            stockQuantity: variant.stockQuantity,
            attributes: variant.attributes,
            keywords: variant.keywords
          }));
          
          return [
            product.id,
            `"${product.name}"`,
            `"${product.description || ''}"`,
            product.basePrice,
            product.category?.id || '',
            `"${product.category?.name || ''}"`,
            `"${product.keywords.join(', ')}"`,
            `"${product.metadata.author || ''}"`,
            `"${product.metadata.publisher || ''}"`,
            `"${product.metadata.language || ''}"`,
            `"${product.metadata.material || ''}"`,
            product.isActive,
            product.variants.length,
            `"${JSON.stringify(variantsData).replace(/"/g, '""')}"` // Escape quotes for CSV
          ].join(',');
        })
      ];

      const csvData = csvRows.join('\n');
      downloadFile(csvData, 'products.csv', 'text/csv');
    }

    setActiveOperation(null);
  };

  const downloadFile = (data: string, filename: string, type: string) => {
    const blob = new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleBulkEdit = async () => {
    if (selectedProducts.size === 0) {
      alert('Please select products to edit');
      return;
    }

    try {
      setIsProcessing(true);
      setProgress(0);
      setOperationLog(['Starting bulk edit...']);

      const selectedProductIds = Array.from(selectedProducts);
      
      for (let i = 0; i < selectedProductIds.length; i++) {
        const productId = selectedProductIds[i];
        const product = products.find(p => p.id === productId);
        
        if (!product) continue;

        try {
          const updateData: any = {};

          // Update category
          if (bulkEditData.categoryId) {
            updateData.categoryId = bulkEditData.categoryId;
          }

          // Update price
          if (bulkEditData.priceAdjustment) {
            const { type, value, operation } = bulkEditData.priceAdjustment;
            let newPrice = product.basePrice;
            
            if (type === 'percentage') {
              const adjustment = (product.basePrice * value) / 100;
              newPrice = operation === 'increase' 
                ? product.basePrice + adjustment 
                : product.basePrice - adjustment;
            } else {
              newPrice = operation === 'increase' 
                ? product.basePrice + value 
                : product.basePrice - value;
            }
            
            updateData.basePrice = Math.max(0, newPrice);
          }

          // Update keywords
          if (bulkEditData.keywords && bulkEditData.keywords.length > 0) {
            updateData.keywords = [...product.keywords, ...bulkEditData.keywords];
          }

          // Update metadata
          if (bulkEditData.metadata) {
            updateData.metadata = {
              ...product.metadata,
              ...bulkEditData.metadata,
            };
          }

          // Update active status
          if (bulkEditData.isActive !== undefined) {
            updateData.isActive = bulkEditData.isActive;
          }

          const response = await fetch(`/api/products/${productId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateData),
          });

          if (response.ok) {
            setOperationLog(prev => [...prev, `✓ Updated: ${product.name}`]);
          } else {
            const error = await response.json();
            setOperationLog(prev => [...prev, `✗ Failed: ${product.name} - ${error.error}`]);
          }
        } catch (error) {
          setOperationLog(prev => [...prev, `✗ Error: ${product.name} - ${error}`]);
        }

        setProgress(((i + 1) / selectedProductIds.length) * 100);
      }

      setOperationLog(prev => [...prev, 'Bulk edit completed!']);
      onOperationComplete();
      setIsBulkEditModalOpen(false);
      setBulkEditData({});
    } catch (error) {
      console.error('Bulk edit error:', error);
      setOperationLog(prev => [...prev, `Bulk edit failed: ${error}`]);
    } finally {
      setIsProcessing(false);
    }
  };

  const flatCategories = categories.flatMap(function flatten(cat): CategoryHierarchy[] {
    return [cat, ...cat.children.flatMap(flatten)];
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Bulk Operations</h2>
        <p className="text-gray-600">Import, export, and bulk edit products</p>
      </div>

      {/* Operation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Import Products */}
        <div className="bg-white p-6 rounded-lg border h-full flex flex-col">
          <div className="flex items-start mb-4">
            <div className="text-2xl mr-3 mt-1">📥</div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Import Products</h3>
              <p className="text-sm text-gray-600 leading-relaxed">Import products from CSV or JSON file</p>
            </div>
          </div>
          
          <div className="mt-auto">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.json"
              onChange={handleFileImport}
              className="hidden"
            />
            
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={isProcessing}
            >
              Choose File
            </Button>
          </div>
        </div>

        {/* Export Products */}
        <div className="bg-white p-6 rounded-lg border h-full flex flex-col">
          <div className="flex items-start mb-4">
            <div className="text-2xl mr-3 mt-1">📤</div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Export Products</h3>
              <p className="text-sm text-gray-600 leading-relaxed">Export selected or all products</p>
            </div>
          </div>
          
          <div className="mt-auto space-y-3">
            <Select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as 'csv' | 'json')}
              options={[
                { value: 'csv', label: 'CSV Format' },
                { value: 'json', label: 'JSON Format' },
              ]}
            />
            
            <Button
              onClick={() => setActiveOperation('export')}
              className="w-full bg-green-600 hover:bg-green-700"
              disabled={isProcessing}
            >
              Export ({selectedProducts.size > 0 ? selectedProducts.size : products.length})
            </Button>
          </div>
        </div>

        {/* Bulk Edit */}
        <div className="bg-white p-6 rounded-lg border h-full flex flex-col">
          <div className="flex items-start mb-4">
            <div className="mr-3 mt-1">
              <Edit className="w-6 h-6 text-gray-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Bulk Edit</h3>
              <p className="text-sm text-gray-600 leading-relaxed">Edit multiple products at once</p>
            </div>
          </div>
          
          <div className="mt-auto">
            <Button
              onClick={() => setIsBulkEditModalOpen(true)}
              className="w-full bg-orange-600 hover:bg-orange-700"
              disabled={selectedProducts.size === 0 || isProcessing}
            >
              Edit Selected ({selectedProducts.size})
            </Button>
          </div>
        </div>
      </div>

      {/* Product Selection */}
      <div className="bg-white rounded-lg border">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              Select Products ({selectedProducts.size} selected)
            </h3>
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={selectedProducts.size === products.length && products.length > 0}
                onChange={handleSelectAll}
                className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
              <label className="text-sm font-medium text-gray-700 cursor-pointer" onClick={handleSelectAll}>
                Select All
              </label>
            </div>
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {products.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              No products available
            </div>
          ) : (
            products.map((product) => (
              <div
                key={product.id}
                className="flex items-center px-6 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedProducts.has(product.id)}
                  onChange={() => handleSelectProduct(product.id)}
                  className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500 mr-4"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">{product.name}</div>
                  <div className="text-sm text-gray-500 mt-1">
                    {product.category?.name && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 mr-2">
                        {product.category.name}
                      </span>
                    )}
                    <span className="font-semibold text-gray-900">₹{product.basePrice.toFixed(2)}</span>
                  </div>
                </div>
                <div className="text-sm text-gray-400 ml-4">
                  {product.variants.length} variant{product.variants.length !== 1 ? 's' : ''}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Import Preview Modal */}
      {activeOperation === 'import' && (
        <Modal
          isOpen={true}
          onClose={() => setActiveOperation(null)}
          title="Import Preview"
          size="lg"
        >
          <div className="space-y-4">
            <p className="text-gray-600">
              Found {importData.length} products to import. Preview of first 10:
            </p>

            <div className="max-h-64 overflow-y-auto border rounded">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Variants</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {importPreview.map((item, index) => (
                    <tr key={index}>
                      <td className="px-3 py-2 text-sm text-gray-900">{item.name}</td>
                      <td className="px-3 py-2 text-sm text-gray-900">₹{item.basePrice || item.price || '0'}</td>
                      <td className="px-3 py-2 text-sm text-gray-900">{item.categoryId || 'None'}</td>
                      <td className="px-3 py-2 text-sm text-gray-900">{item.variantCount || '0'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {isProcessing && (
              <div className="space-y-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <div className="text-sm text-gray-600">Progress: {Math.round(progress)}%</div>
              </div>
            )}

            {operationLog.length > 0 && (
              <div className="max-h-32 overflow-y-auto bg-gray-50 p-3 rounded text-sm font-mono">
                {operationLog.map((log, index) => (
                  <div key={index} className={log.startsWith('✓') ? 'text-green-600' : log.startsWith('✗') ? 'text-red-600' : 'text-gray-600'}>
                    {log}
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setActiveOperation(null)}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                onClick={handleImportProducts}
                disabled={isProcessing}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isProcessing ? 'Importing...' : 'Import Products'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Export Confirmation Modal */}
      {activeOperation === 'export' && (
        <Modal
          isOpen={true}
          onClose={() => setActiveOperation(null)}
          title="Export Products"
        >
          <div className="space-y-4">
            <p className="text-gray-600">
              Export {selectedProducts.size > 0 ? selectedProducts.size : products.length} products in {exportFormat.toUpperCase()} format?
            </p>

            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setActiveOperation(null)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleExportProducts}
                className="bg-green-600 hover:bg-green-700"
              >
                Export
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Bulk Edit Modal */}
      <Modal
        isOpen={isBulkEditModalOpen}
        onClose={() => setIsBulkEditModalOpen(false)}
        title="Bulk Edit Products"
        size="lg"
      >
        <div className="space-y-6">
          <p className="text-gray-600">
            Edit {selectedProducts.size} selected products
          </p>

          {/* Category Update */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Update Category
            </label>
            <Select
              value={bulkEditData.categoryId || ''}
              onChange={(e) => setBulkEditData(prev => ({ ...prev, categoryId: e.target.value || undefined }))}
              options={[
                { value: '', label: 'No change' },
                ...flatCategories.map(cat => ({ value: cat.id, label: cat.name })),
              ]}
            />
          </div>

          {/* Price Adjustment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Price Adjustment
            </label>
            <div className="grid grid-cols-3 gap-3">
              <Select
                value={bulkEditData.priceAdjustment?.operation || ''}
                onChange={(e) => setBulkEditData(prev => ({
                  ...prev,
                  priceAdjustment: {
                    ...prev.priceAdjustment,
                    operation: e.target.value as 'increase' | 'decrease',
                    type: prev.priceAdjustment?.type || 'percentage',
                    value: prev.priceAdjustment?.value || 0,
                  }
                }))}
                options={[
                  { value: '', label: 'No change' },
                  { value: 'increase', label: 'Increase' },
                  { value: 'decrease', label: 'Decrease' },
                ]}
              />
              <Select
                value={bulkEditData.priceAdjustment?.type || 'percentage'}
                onChange={(e) => setBulkEditData(prev => ({
                  ...prev,
                  priceAdjustment: {
                    ...prev.priceAdjustment,
                    type: e.target.value as 'percentage' | 'fixed',
                    operation: prev.priceAdjustment?.operation || 'increase',
                    value: prev.priceAdjustment?.value || 0,
                  }
                }))}
                options={[
                  { value: 'percentage', label: 'By %' },
                  { value: 'fixed', label: 'By Amount' },
                ]}
                disabled={!bulkEditData.priceAdjustment?.operation}
              />
              <Input
                type="number"
                value={bulkEditData.priceAdjustment?.value || ''}
                onChange={(e) => setBulkEditData(prev => ({
                  ...prev,
                  priceAdjustment: {
                    ...prev.priceAdjustment,
                    value: parseFloat(e.target.value) || 0,
                    operation: prev.priceAdjustment?.operation || 'increase',
                    type: prev.priceAdjustment?.type || 'percentage',
                  }
                }))}
                placeholder="Value"
                disabled={!bulkEditData.priceAdjustment?.operation}
              />
            </div>
          </div>

          {/* Add Keywords */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add Keywords (comma-separated)
            </label>
            <Input
              value={bulkEditData.keywords?.join(', ') || ''}
              onChange={(e) => setBulkEditData(prev => ({
                ...prev,
                keywords: e.target.value ? e.target.value.split(',').map(k => k.trim()) : undefined
              }))}
              placeholder="keyword1, keyword2, keyword3"
            />
          </div>

          {/* Active Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Active Status
            </label>
            <Select
              value={bulkEditData.isActive === undefined ? '' : bulkEditData.isActive.toString()}
              onChange={(e) => setBulkEditData(prev => ({
                ...prev,
                isActive: e.target.value === '' ? undefined : e.target.value === 'true'
              }))}
              options={[
                { value: '', label: 'No change' },
                { value: 'true', label: 'Active' },
                { value: 'false', label: 'Inactive' },
              ]}
            />
          </div>

          {isProcessing && (
            <div className="space-y-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-orange-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <div className="text-sm text-gray-600">Progress: {Math.round(progress)}%</div>
            </div>
          )}

          {operationLog.length > 0 && (
            <div className="max-h-32 overflow-y-auto bg-gray-50 p-3 rounded text-sm font-mono">
              {operationLog.map((log, index) => (
                <div key={index} className={log.startsWith('✓') ? 'text-green-600' : log.startsWith('✗') ? 'text-red-600' : 'text-gray-600'}>
                  {log}
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setIsBulkEditModalOpen(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkEdit}
              disabled={isProcessing}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isProcessing ? 'Processing...' : 'Apply Changes'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
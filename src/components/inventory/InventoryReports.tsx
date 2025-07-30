'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
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

interface Category {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  keywords: string[];
  isActive: boolean;
  productCount: number;
  children: Category[];
}

interface InventoryReportsProps {
  products: Product[];
  categories: Category[];
  isLoading?: boolean;
}

interface InventoryStats {
  totalProducts: number;
  activeProducts: number;
  totalVariants: number;
  totalStockValue: number;
  averagePrice: number;
  lowStockItems: number;
  outOfStockItems: number;
  categoriesWithProducts: number;
}

interface CategoryReport {
  categoryId: string;
  categoryName: string;
  productCount: number;
  totalStockValue: number;
  averagePrice: number;
  lowStockCount: number;
  outOfStockCount: number;
}

interface StockReport {
  productId: string;
  productName: string;
  variantId: string;
  variantName: string;
  currentStock: number;
  stockValue: number;
  category: string;
  status: 'out' | 'low' | 'in';
}

export function InventoryReports({ products, categories, isLoading = false }: InventoryReportsProps) {
  const [activeReport, setActiveReport] = useState<'overview' | 'category' | 'stock' | 'valuation'>('overview');
  const [lowStockThreshold, setLowStockThreshold] = useState(5);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // Calculate inventory statistics
  const inventoryStats = useMemo((): InventoryStats => {
    const stats: InventoryStats = {
      totalProducts: products.length,
      activeProducts: products.filter(p => p.isActive).length,
      totalVariants: 0,
      totalStockValue: 0,
      averagePrice: 0,
      lowStockItems: 0,
      outOfStockItems: 0,
      categoriesWithProducts: new Set(products.map(p => p.category?.id).filter(Boolean)).size,
    };

    let totalPrice = 0;
    let variantCount = 0;

    products.forEach(product => {
      if (product.variants.length === 0) {
        // Product without variants
        totalPrice += product.basePrice;
      } else {
        // Product with variants
        product.variants.forEach(variant => {
          variantCount++;
          totalPrice += variant.price;
          const stockValue = variant.stockQuantity * variant.price;
          stats.totalStockValue += stockValue;

          if (variant.stockQuantity === 0) {
            stats.outOfStockItems++;
          } else if (variant.stockQuantity <= lowStockThreshold) {
            stats.lowStockItems++;
          }
        });
      }
    });

    stats.totalVariants = variantCount;
    stats.averagePrice = totalPrice / Math.max(1, products.length + variantCount);

    return stats;
  }, [products, lowStockThreshold]);

  // Generate category report
  const categoryReport = useMemo((): CategoryReport[] => {
    const categoryMap = new Map<string, CategoryReport>();

    // Initialize categories
    categories.forEach(category => {
      categoryMap.set(category.id, {
        categoryId: category.id,
        categoryName: category.name,
        productCount: 0,
        totalStockValue: 0,
        averagePrice: 0,
        lowStockCount: 0,
        outOfStockCount: 0,
      });
    });

    // Add uncategorized
    categoryMap.set('uncategorized', {
      categoryId: 'uncategorized',
      categoryName: 'Uncategorized',
      productCount: 0,
      totalStockValue: 0,
      averagePrice: 0,
      lowStockCount: 0,
      outOfStockCount: 0,
    });

    // Calculate stats for each category
    products.forEach(product => {
      const categoryId = product.category?.id || 'uncategorized';
      const report = categoryMap.get(categoryId);
      
      if (report) {
        report.productCount++;
        
        if (product.variants.length === 0) {
          // Product without variants
          report.averagePrice += product.basePrice;
        } else {
          // Product with variants
          product.variants.forEach(variant => {
            const stockValue = variant.stockQuantity * variant.price;
            report.totalStockValue += stockValue;
            report.averagePrice += variant.price;

            if (variant.stockQuantity === 0) {
              report.outOfStockCount++;
            } else if (variant.stockQuantity <= lowStockThreshold) {
              report.lowStockCount++;
            }
          });
        }
      }
    });

    // Calculate average prices
    categoryMap.forEach(report => {
      const totalItems = products.filter(p => 
        (p.category?.id || 'uncategorized') === report.categoryId
      ).reduce((sum, p) => sum + Math.max(1, p.variants.length), 0);
      
      report.averagePrice = report.averagePrice / Math.max(1, totalItems);
    });

    return Array.from(categoryMap.values())
      .filter(report => report.productCount > 0)
      .sort((a, b) => b.productCount - a.productCount);
  }, [products, categories, lowStockThreshold]);

  // Generate stock report
  const stockReport = useMemo((): StockReport[] => {
    const stockItems: StockReport[] = [];

    products.forEach(product => {
      if (product.variants.length === 0) {
        // Product without variants
        stockItems.push({
          productId: product.id,
          productName: product.name,
          variantId: `${product.id}-default`,
          variantName: 'Default',
          currentStock: 0,
          stockValue: 0,
          category: product.category?.name || 'Uncategorized',
          status: 'in',
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

          stockItems.push({
            productId: product.id,
            productName: product.name,
            variantId: variant.id,
            variantName: variant.name,
            currentStock: stock,
            stockValue: stock * variant.price,
            category: product.category?.name || 'Uncategorized',
            status,
          });
        });
      }
    });

    // Filter by category if selected
    let filtered = stockItems;
    if (selectedCategory) {
      filtered = stockItems.filter(item => 
        selectedCategory === 'uncategorized' 
          ? item.category === 'Uncategorized'
          : item.category === categories.find(c => c.id === selectedCategory)?.name
      );
    }

    return filtered.sort((a, b) => {
      // Sort by status (out -> low -> in), then by stock value
      const statusOrder = { out: 0, low: 1, in: 2 };
      if (statusOrder[a.status] !== statusOrder[b.status]) {
        return statusOrder[a.status] - statusOrder[b.status];
      }
      return b.stockValue - a.stockValue;
    });
  }, [products, categories, selectedCategory, lowStockThreshold]);

  const handleExportReport = (reportType: string) => {
    let data: any[] = [];
    let filename = '';

    switch (reportType) {
      case 'overview':
        data = [inventoryStats];
        filename = 'inventory-overview.json';
        break;
      case 'category':
        data = categoryReport;
        filename = 'category-report.json';
        break;
      case 'stock':
        data = stockReport;
        filename = 'stock-report.json';
        break;
      default:
        return;
    }

    const jsonData = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const formatCurrency = (amount: number) => `₹${amount.toFixed(2)}`;

  const getStatusColor = (status: string) => {
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

  const reports = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'category', label: 'By Category', icon: '📁' },
    { id: 'stock', label: 'Stock Levels', icon: '📦' },
    { id: 'valuation', label: 'Valuation', icon: '💰' },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Inventory Reports</h2>
          <p className="text-gray-600">Analyze inventory performance and stock levels</p>
        </div>
        <Button
          onClick={() => handleExportReport(activeReport)}
          className="bg-green-600 hover:bg-green-700"
        >
          Export Report
        </Button>
      </div>

      {/* Report Navigation */}
      <div className="bg-white rounded-lg border">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Report tabs">
            {reports.map((report) => (
              <button
                key={report.id}
                onClick={() => setActiveReport(report.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeReport === report.id
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{report.icon}</span>
                {report.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Report Content */}
        <div className="p-6">
          {/* Filters */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
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

            {(activeReport === 'stock' || activeReport === 'category') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Filter by Category
                </label>
                <Select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  options={[
                    { value: '', label: 'All Categories' },
                    { value: 'uncategorized', label: 'Uncategorized' },
                    ...categories.map(cat => ({ value: cat.id, label: cat.name })),
                  ]}
                />
              </div>
            )}
          </div>

          {/* Overview Report */}
          {activeReport === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{inventoryStats.totalProducts}</div>
                  <div className="text-sm text-blue-800">Total Products</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{inventoryStats.activeProducts}</div>
                  <div className="text-sm text-green-800">Active Products</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{inventoryStats.totalVariants}</div>
                  <div className="text-sm text-purple-800">Total Variants</div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{inventoryStats.categoriesWithProducts}</div>
                  <div className="text-sm text-orange-800">Categories</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-xl font-bold text-gray-900">{formatCurrency(inventoryStats.totalStockValue)}</div>
                  <div className="text-sm text-gray-600">Total Stock Value</div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="text-xl font-bold text-yellow-600">{inventoryStats.lowStockItems}</div>
                  <div className="text-sm text-yellow-800">Low Stock Items</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="text-xl font-bold text-red-600">{inventoryStats.outOfStockItems}</div>
                  <div className="text-sm text-red-800">Out of Stock</div>
                </div>
              </div>

              <div className="bg-white border rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Key Metrics</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Average Product Price:</span>
                    <span className="font-medium">{formatCurrency(inventoryStats.averagePrice)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Stock Coverage:</span>
                    <span className="font-medium">
                      {((inventoryStats.totalVariants - inventoryStats.outOfStockItems) / Math.max(1, inventoryStats.totalVariants) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Products per Category:</span>
                    <span className="font-medium">
                      {(inventoryStats.totalProducts / Math.max(1, inventoryStats.categoriesWithProducts)).toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Category Report */}
          {activeReport === 'category' && (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Products</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock Value</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Price</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Low Stock</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Out of Stock</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {categoryReport.map((report) => (
                      <tr key={report.categoryId} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{report.categoryName}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {report.productCount}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(report.totalStockValue)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(report.averagePrice)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            {report.lowStockCount}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                            {report.outOfStockCount}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Stock Report */}
          {activeReport === 'stock' && (
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                Showing {stockReport.length} stock items
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Variant</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {stockReport.slice(0, 50).map((item) => (
                      <tr key={item.variantId} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{item.productName}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.variantName}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.category}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.currentStock}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(item.stockValue)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(item.status)}`}>
                            {item.status === 'out' ? 'Out of Stock' : 
                             item.status === 'low' ? 'Low Stock' : 'In Stock'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {stockReport.length > 50 && (
                <div className="text-center text-sm text-gray-500">
                  Showing first 50 items. Export report to see all {stockReport.length} items.
                </div>
              )}
            </div>
          )}

          {/* Valuation Report */}
          {activeReport === 'valuation' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Stock Valuation</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Stock Value:</span>
                      <span className="font-bold text-lg">{formatCurrency(inventoryStats.totalStockValue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Average Item Value:</span>
                      <span className="font-medium">
                        {formatCurrency(inventoryStats.totalStockValue / Math.max(1, inventoryStats.totalVariants))}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Highest Value Category:</span>
                      <span className="font-medium">
                        {categoryReport.length > 0 ? categoryReport[0].categoryName : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white border rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Stock Distribution</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">In Stock Items:</span>
                      <span className="font-medium text-green-600">
                        {inventoryStats.totalVariants - inventoryStats.lowStockItems - inventoryStats.outOfStockItems}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Low Stock Items:</span>
                      <span className="font-medium text-yellow-600">{inventoryStats.lowStockItems}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Out of Stock Items:</span>
                      <span className="font-medium text-red-600">{inventoryStats.outOfStockItems}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white border rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Categories by Value</h3>
                <div className="space-y-2">
                  {categoryReport.slice(0, 5).map((report, index) => (
                    <div key={report.categoryId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center">
                        <span className="w-6 h-6 bg-orange-100 text-orange-800 rounded-full flex items-center justify-center text-sm font-medium mr-3">
                          {index + 1}
                        </span>
                        <span className="font-medium">{report.categoryName}</span>
                      </div>
                      <span className="font-bold">{formatCurrency(report.totalStockValue)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import type { EnhancedProduct } from '@/services/database/products';
import type { CategoryHierarchy } from '@/services/database/categories';

interface InventoryReportsProps {
  products: EnhancedProduct[];
  categories: CategoryHierarchy[];
  isLoading?: boolean;
}

interface InventoryStats {
  totalProducts: number;
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

export function InventoryReports({ products, categories, isLoading = false }: InventoryReportsProps) {
  const [reportType, setReportType] = useState<'overview' | 'categories' | 'stock'>('overview');
  const [lowStockThreshold, setLowStockThreshold] = useState(10);

  // Calculate inventory statistics
  const inventoryStats = useMemo((): InventoryStats => {
    const stats: InventoryStats = {
      totalProducts: products.length,
      totalVariants: 0,
      totalStockValue: 0,
      averagePrice: 0,
      lowStockItems: 0,
      outOfStockItems: 0,
      categoriesWithProducts: 0,
    };

    let totalPrice = 0;
    let variantCount = 0;
    const categoriesWithProducts = new Set<string>();

    products.forEach(product => {
      if (product.categoryId) {
        categoriesWithProducts.add(product.categoryId);
      }

      if (product.variants.length === 0) {
        // Product without variants
        totalPrice += product.basePrice;
        variantCount++;
      } else {
        // Product with variants
        product.variants.forEach(variant => {
          variantCount++;
          totalPrice += variant.price;
          const stockQuantity = variant.stockQuantity || 0;
          const stockValue = stockQuantity * variant.price;
          stats.totalStockValue += stockValue;

          if (stockQuantity === 0) {
            stats.outOfStockItems++;
          } else if (stockQuantity <= lowStockThreshold) {
            stats.lowStockItems++;
          }
        });
      }
    });

    stats.totalVariants = variantCount;
    stats.averagePrice = variantCount > 0 ? totalPrice / variantCount : 0;
    stats.categoriesWithProducts = categoriesWithProducts.size;

    return stats;
  }, [products, lowStockThreshold]);

  // Calculate category reports
  const categoryReports = useMemo((): CategoryReport[] => {
    const categoryMap = new Map<string, CategoryReport>();

    // Initialize categories
    const flattenCategories = (cats: CategoryHierarchy[]) => {
      cats.forEach(cat => {
        categoryMap.set(cat.id, {
          categoryId: cat.id,
          categoryName: cat.name,
          productCount: 0,
          totalStockValue: 0,
          averagePrice: 0,
          lowStockCount: 0,
          outOfStockCount: 0,
        });
        if (cat.children) {
          flattenCategories(cat.children);
        }
      });
    };

    flattenCategories(categories);

    // Calculate stats for each category
    products.forEach(product => {
      if (!product.categoryId) return;

      const report = categoryMap.get(product.categoryId);
      if (!report) return;

      report.productCount++;

      if (product.variants.length === 0) {
        // Product without variants
        report.averagePrice += product.basePrice;
      } else {
        // Product with variants
        product.variants.forEach(variant => {
          const stockQuantity = variant.stockQuantity || 0;
          const stockValue = stockQuantity * variant.price;
          report.totalStockValue += stockValue;
          report.averagePrice += variant.price;

          if (stockQuantity === 0) {
            report.outOfStockCount++;
          } else if (stockQuantity <= lowStockThreshold) {
            report.lowStockCount++;
          }
        });
      }
    });

    // Calculate average prices
    categoryMap.forEach(report => {
      const totalVariants = products
        .filter(p => p.categoryId === report.categoryId)
        .reduce((sum, p) => sum + Math.max(1, p.variants.length), 0);
      
      if (totalVariants > 0) {
        report.averagePrice = report.averagePrice / totalVariants;
      }
    });

    return Array.from(categoryMap.values())
      .filter(report => report.productCount > 0)
      .sort((a, b) => b.productCount - a.productCount);
  }, [products, categories, lowStockThreshold]);

  const handleExportReport = async (format: 'csv' | 'pdf') => {
    try {
      const reportData = {
        type: reportType,
        stats: inventoryStats,
        categories: categoryReports,
        lowStockThreshold,
        generatedAt: new Date().toISOString(),
      };

      const response = await fetch('/api/reports/inventory/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ format, data: reportData }),
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      if (format === 'csv') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `inventory_report_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const htmlContent = await response.text();
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(htmlContent);
          printWindow.document.close();
          printWindow.focus();
          setTimeout(() => {
            printWindow.print();
            printWindow.close();
          }, 250);
        }
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export report');
    }
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
          <h2 className="text-2xl font-bold text-gray-900">Inventory Reports</h2>
          <p className="text-gray-600">Analyze inventory performance and stock levels</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExportReport('csv')}
          >
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExportReport('pdf')}
          >
            Export PDF
          </Button>
        </div>
      </div>

      {/* Report Type Selector */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Report Type:</label>
          <div className="flex space-x-2">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'categories', label: 'By Category' },
              { id: 'stock', label: 'Stock Analysis' },
            ].map(type => (
              <button
                key={type.id}
                onClick={() => setReportType(type.id as any)}
                className={`px-3 py-1 text-sm rounded-md ${
                  reportType === type.id
                    ? 'bg-orange-100 text-orange-700 border border-orange-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center space-x-2">
            <label className="text-sm text-gray-600">Low Stock Threshold:</label>
            <input
              type="number"
              min="1"
              max="100"
              value={lowStockThreshold}
              onChange={(e) => setLowStockThreshold(parseInt(e.target.value) || 10)}
              className="w-16 px-2 py-1 text-sm border border-gray-300 rounded"
            />
          </div>
        </div>
      </div>

      {/* Overview Report */}
      {reportType === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">Products</h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Products:</span>
                  <span className="font-semibold">{inventoryStats.totalProducts}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Variants:</span>
                  <span className="font-semibold">{inventoryStats.totalVariants}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Categories Used:</span>
                  <span className="font-semibold">{inventoryStats.categoriesWithProducts}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">Stock Status</h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Low Stock Items:</span>
                  <span className="font-semibold text-yellow-600">{inventoryStats.lowStockItems}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Out of Stock:</span>
                  <span className="font-semibold text-red-600">{inventoryStats.outOfStockItems}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Stock Value:</span>
                  <span className="font-semibold">₹{inventoryStats.totalStockValue.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">Pricing</h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Average Price:</span>
                  <span className="font-semibold">₹{Math.round(inventoryStats.averagePrice)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Category Report */}
      {reportType === 'categories' && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">Category Performance</h3>
          </CardHeader>
          <CardContent>
            {categoryReports.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No category data available</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Products
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Stock Value
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Avg Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Low Stock
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Out of Stock
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {categoryReports.map(report => (
                      <tr key={report.categoryId}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {report.categoryName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {report.productCount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          ₹{report.totalStockValue.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          ₹{Math.round(report.averagePrice)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600">
                          {report.lowStockCount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                          {report.outOfStockCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stock Analysis */}
      {reportType === 'stock' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-red-600">Out of Stock</h3>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600 mb-2">
                  {inventoryStats.outOfStockItems}
                </div>
                <p className="text-sm text-gray-600">Items need restocking</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-yellow-600">Low Stock</h3>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-600 mb-2">
                  {inventoryStats.lowStockItems}
                </div>
                <p className="text-sm text-gray-600">Items below threshold</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-green-600">Total Value</h3>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600 mb-2">
                  ₹{Math.round(inventoryStats.totalStockValue / 1000)}K
                </div>
                <p className="text-sm text-gray-600">Current stock value</p>
              </CardContent>
            </Card>
          </div>

          {/* Stock Status Distribution */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">Stock Status Distribution</h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {categoryReports.map(report => (
                  <div key={report.categoryId} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-900">{report.categoryName}</span>
                      <span className="text-sm text-gray-500">{report.productCount} products</span>
                    </div>
                    <div className="flex space-x-1 h-4 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="bg-green-500"
                        style={{
                          width: `${((report.productCount - report.lowStockCount - report.outOfStockCount) / report.productCount) * 100}%`
                        }}
                      />
                      <div
                        className="bg-yellow-500"
                        style={{
                          width: `${(report.lowStockCount / report.productCount) * 100}%`
                        }}
                      />
                      <div
                        className="bg-red-500"
                        style={{
                          width: `${(report.outOfStockCount / report.productCount) * 100}%`
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>In Stock: {report.productCount - report.lowStockCount - report.outOfStockCount}</span>
                      <span>Low: {report.lowStockCount}</span>
                      <span>Out: {report.outOfStockCount}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
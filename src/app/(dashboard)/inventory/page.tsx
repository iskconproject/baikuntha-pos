'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Package, 
  FolderOpen, 
  BarChart3, 
  Zap, 
  TrendingUp 
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ProductList } from '@/components/inventory/ProductList';

import { CategoryManager } from '@/components/inventory/CategoryManager';
import { StockManager } from '@/components/inventory/StockManager';
import { BulkOperations } from '@/components/inventory/BulkOperations';
import { InventoryReports } from '@/components/inventory/InventoryReports';
import { ProductDetailModal } from '@/components/inventory/ProductDetailModal';
import { useAuth } from '@/hooks/useAuth';
import type { CategoryHierarchy } from '@/services/database/categories';
import type { EnhancedProduct } from '@/services/database/products';

// Utility function to flatten category hierarchy
const flattenCategories = (categories: CategoryHierarchy[]): Array<{ id: string; name: string }> => {
  const result: Array<{ id: string; name: string }> = [];
  
  const flatten = (cats: CategoryHierarchy[], level: number = 0) => {
    cats.forEach(cat => {
      result.push({
        id: cat.id,
        name: '  '.repeat(level) + cat.name
      });
      if (cat.children && cat.children.length > 0) {
        flatten(cat.children, level + 1);
      }
    });
  };
  
  flatten(categories);
  return result;
};

export default function InventoryPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'stock' | 'bulk' | 'reports'>('products');
  const [products, setProducts] = useState<EnhancedProduct[]>([]);
  const [categories, setCategories] = useState<CategoryHierarchy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Product detail modal state
  const [selectedProduct, setSelectedProduct] = useState<EnhancedProduct | null>(null);

  // Check if user has manager or admin role
  const canManageInventory = user?.role === 'manager' || user?.role === 'admin';

  useEffect(() => {
    if (!canManageInventory) {
      setError('You do not have permission to access inventory management.');
      setIsLoading(false);
      return;
    }

    loadData();
  }, [canManageInventory]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('Starting to load inventory data...');

      // Load products first
      console.log('Fetching products...');
      const productsResponse = await fetch('/api/products?limit=1000');
      console.log('Products response status:', productsResponse.status);
      
      if (!productsResponse.ok) {
        throw new Error(`Products API failed with status: ${productsResponse.status}`);
      }

      const productsData = await productsResponse.json();
      console.log('Products data:', productsData);

      // Load categories
      console.log('Fetching categories...');
      const categoriesResponse = await fetch('/api/categories?hierarchy=true');
      console.log('Categories response status:', categoriesResponse.status);
      
      if (!categoriesResponse.ok) {
        throw new Error(`Categories API failed with status: ${categoriesResponse.status}`);
      }

      const categoriesData = await categoriesResponse.json();
      console.log('Categories data:', categoriesData);

      setProducts(productsData.data?.products || []);
      setCategories(categoriesData.categories || []);
      
      console.log('Data loaded successfully');
    } catch (error) {
      console.error('Error loading inventory data:', error);
      setError(`Failed to load inventory data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProduct = () => {
    router.push('/inventory/products/new');
  };

  const handleEditProduct = (product: EnhancedProduct) => {
    router.push(`/inventory/products/${product.id}/edit`);
  };

  const handleProductSelect = (product: EnhancedProduct) => {
    setSelectedProduct(product);
  };



  const handleProductDelete = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) {
      return;
    }

    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete product');
      }

      // Reload products
      await loadData();
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product. Please try again.');
    }
  };

  const handleCategoryCreate = async (categoryData: any) => {
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(categoryData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create category');
      }

      // Reload categories
      await loadData();
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  };

  const handleCategoryUpdate = async (categoryId: string, categoryData: any) => {
    try {
      const response = await fetch(`/api/categories/${categoryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(categoryData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update category');
      }

      // Reload categories
      await loadData();
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  };

  const handleCategoryDelete = async (categoryId: string) => {
    try {
      const response = await fetch(`/api/categories/${categoryId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete category');
      }

      // Reload categories
      await loadData();
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  };

  if (!canManageInventory) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You do not have permission to access inventory management.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={loadData} className="bg-orange-600 hover:bg-orange-700">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'products', label: 'Products', icon: Package },
    { id: 'categories', label: 'Categories', icon: FolderOpen },
    { id: 'stock', label: 'Stock Management', icon: BarChart3 },
    { id: 'bulk', label: 'Bulk Operations', icon: Zap },
    { id: 'reports', label: 'Reports', icon: TrendingUp },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-600 mt-2">
            Manage products, categories, stock levels, and inventory operations
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm border mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center ${
                    activeTab === tab.id
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'products' && (
              <ProductList
                products={products}
                categories={categories}
                onProductSelect={handleProductSelect}
                onProductEdit={handleEditProduct}
                onProductDelete={handleProductDelete}
                onCreateProduct={handleCreateProduct}
                isLoading={isLoading}
              />
            )}

            {activeTab === 'categories' && (
              <CategoryManager
                categories={categories}
                onCreateCategory={handleCategoryCreate}
                onUpdateCategory={handleCategoryUpdate}
                onDeleteCategory={handleCategoryDelete}
                isLoading={isLoading}
              />
            )}

            {activeTab === 'stock' && (
              <StockManager
                products={products}
                onStockUpdate={loadData}
                isLoading={isLoading}
              />
            )}

            {activeTab === 'bulk' && (
              <BulkOperations
                products={products}
                categories={categories}
                onOperationComplete={loadData}
                isLoading={isLoading}
              />
            )}

            {activeTab === 'reports' && (
              <InventoryReports
                products={products}
                categories={categories}
                isLoading={isLoading}
              />
            )}
          </div>
        </div>
      </div>



      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onEdit={handleEditProduct}
          onDelete={handleProductDelete}
        />
      )}
    </div>
  );
}
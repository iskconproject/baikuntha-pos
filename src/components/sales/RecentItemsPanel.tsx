'use client';

import { useState, useEffect } from 'react';
import { useCartStore } from '@/stores/cartStore';
import type { Product, ProductVariant } from '@/types';

interface RecentItem {
  product: Product;
  variant?: ProductVariant;
  lastUsed: Date;
  frequency: number;
}

interface RecentItemsPanelProps {
  onAddItem: (product: Product, variant?: ProductVariant) => void;
  className?: string;
}

export function RecentItemsPanel({ onAddItem, className = '' }: RecentItemsPanelProps) {
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRecentItems();
  }, []);

  const loadRecentItems = async () => {
    try {
      // In a real implementation, this would fetch from localStorage or API
      // For now, we'll use mock data
      const mockRecentItems: RecentItem[] = [
        {
          product: {
            id: '1',
            name: 'Bhagavad Gita As It Is',
            basePrice: 250,
            categoryId: '1',
            keywords: ['gita', 'book'],
            metadata: { customAttributes: {} },
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            variants: [],
          },
          lastUsed: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
          frequency: 15,
        },
        {
          product: {
            id: '2',
            name: 'Tulsi Mala',
            basePrice: 150,
            categoryId: '2',
            keywords: ['mala', 'beads'],
            metadata: { customAttributes: {} },
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            variants: [],
          },
          lastUsed: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
          frequency: 8,
        },
      ];
      
      setRecentItems(mockRecentItems);
    } catch (error) {
      console.error('Failed to load recent items:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffMins < 1440) {
      return `${Math.floor(diffMins / 60)}h ago`;
    } else {
      return `${Math.floor(diffMins / 1440)}d ago`;
    }
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-3"></div>
          <div className="space-y-2">
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (recentItems.length === 0) {
    return null;
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center">
          <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Recently Used
        </h3>
      </div>
      
      <div className="p-2">
        {recentItems.slice(0, 5).map((item) => (
          <button
            key={`${item.product.id}-${item.variant?.id || 'base'}`}
            onClick={() => onAddItem(item.product, item.variant)}
            className="w-full p-3 text-left hover:bg-gray-50 rounded-lg transition-colors group"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {item.product.name}
                  {item.variant && ` - ${item.variant.name}`}
                </p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm font-semibold text-orange-600">
                    ₹{(item.variant?.price || item.product.basePrice).toFixed(2)}
                  </span>
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <span>{formatTimeAgo(item.lastUsed)}</span>
                    <span>•</span>
                    <span>{item.frequency}x</span>
                  </div>
                </div>
              </div>
              
              <div className="ml-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
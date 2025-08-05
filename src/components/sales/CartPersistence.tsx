'use client';

import { useEffect, useState } from 'react';
import { useCartStore } from '@/stores/cartStore';
import type { CartItem } from '@/stores/cartStore';

interface SavedCart {
  id: string;
  items: CartItem[];
  total: number;
  savedAt: Date;
  customerName?: string;
}

export function CartPersistence() {
  const { items, total, clearCart } = useCartStore();
  const [savedCarts, setSavedCarts] = useState<SavedCart[]>([]);
  const [showSavedCarts, setShowSavedCarts] = useState(false);

  useEffect(() => {
    loadSavedCarts();
  }, []);

  const loadSavedCarts = () => {
    try {
      const saved = localStorage.getItem('savedCarts');
      if (saved) {
        const carts = JSON.parse(saved).map((cart: any) => ({
          ...cart,
          savedAt: new Date(cart.savedAt),
        }));
        setSavedCarts(carts);
      }
    } catch (error) {
      console.error('Failed to load saved carts:', error);
    }
  };

  const saveCurrentCart = (customerName?: string) => {
    if (items.length === 0) return;

    const savedCart: SavedCart = {
      id: `cart-${Date.now()}`,
      items: [...items],
      total,
      savedAt: new Date(),
      customerName,
    };

    const updatedCarts = [savedCart, ...savedCarts.slice(0, 4)]; // Keep only 5 most recent
    setSavedCarts(updatedCarts);
    
    try {
      localStorage.setItem('savedCarts', JSON.stringify(updatedCarts));
    } catch (error) {
      console.error('Failed to save cart:', error);
    }

    clearCart();
  };

  const loadSavedCart = (savedCart: SavedCart) => {
    // This would need to be implemented in the cart store
    // For now, we'll just show the concept
    console.log('Loading saved cart:', savedCart);
    setShowSavedCarts(false);
  };

  const deleteSavedCart = (cartId: string) => {
    const updatedCarts = savedCarts.filter(cart => cart.id !== cartId);
    setSavedCarts(updatedCarts);
    
    try {
      localStorage.setItem('savedCarts', JSON.stringify(updatedCarts));
    } catch (error) {
      console.error('Failed to delete saved cart:', error);
    }
  };

  if (items.length === 0 && savedCarts.length === 0) {
    return null;
  }

  return (
    <>
      {/* Save Cart Button */}
      {items.length > 0 && (
        <div className="mb-4">
          <button
            onClick={() => saveCurrentCart()}
            className="w-full px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            💾 Save Cart for Later
          </button>
        </div>
      )}

      {/* Saved Carts Button */}
      {savedCarts.length > 0 && (
        <div className="mb-4">
          <button
            onClick={() => setShowSavedCarts(true)}
            className="w-full px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
          >
            📋 Saved Carts ({savedCarts.length})
          </button>
        </div>
      )}

      {/* Saved Carts Modal */}
      {showSavedCarts && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-96 overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Saved Carts</h3>
                <button
                  onClick={() => setShowSavedCarts(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="max-h-80 overflow-y-auto">
              {savedCarts.map((cart) => (
                <div key={cart.id} className="p-4 border-b border-gray-100 last:border-b-0">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium text-gray-900">
                        {cart.customerName || `Cart ${cart.id.slice(-4)}`}
                      </p>
                      <p className="text-sm text-gray-600">
                        {cart.items.length} items • ₹{cart.total.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {cart.savedAt.toLocaleDateString()} at {cart.savedAt.toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => loadSavedCart(cart)}
                        className="px-3 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700"
                      >
                        Load
                      </button>
                      <button
                        onClick={() => deleteSavedCart(cart.id)}
                        className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-600">
                    {cart.items.slice(0, 2).map((item, index) => (
                      <div key={index}>
                        {item.product.name} × {item.quantity}
                      </div>
                    ))}
                    {cart.items.length > 2 && (
                      <div>... and {cart.items.length - 2} more</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
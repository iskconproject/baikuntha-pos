import { create } from 'zustand';
import type { Product, ProductVariant } from '@/types';
import { useNotificationStore } from './notificationStore';

export interface CartItem {
  productId: string;
  variantId?: string;
  quantity: number;
  product: Product;
  variant?: ProductVariant;
}

interface CartStore {
  items: CartItem[];
  total: number;
  addItem: (product: Product, variant?: ProductVariant, quantity?: number) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, variantId: string | undefined, quantity: number) => void;
  clearCart: () => void;
  getItemCount: () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  total: 0,

  addItem: (product: Product, variant?: ProductVariant, quantity = 1) => {
    const { items } = get();
    const existingItemIndex = items.findIndex(
      item => item.productId === product.id && item.variantId === variant?.id
    );

    let newItems: CartItem[];
    
    if (existingItemIndex >= 0) {
      // Update existing item
      newItems = [...items];
      newItems[existingItemIndex].quantity += quantity;
    } else {
      // Add new item
      const newItem: CartItem = {
        productId: product.id,
        variantId: variant?.id,
        quantity,
        product,
        variant,
      };
      newItems = [...items, newItem];
    }

    const total = newItems.reduce((sum, item) => {
      const price = item.variant?.price || item.product.basePrice;
      return sum + (price * item.quantity);
    }, 0);

    set({ items: newItems, total });

    // Show notification
    const productName = variant ? `${product.name} - ${variant.name}` : product.name;
    useNotificationStore.getState().addNotification({
      message: `${productName} added to cart`,
      type: 'success',
      duration: 2000,
    });
  },

  removeItem: (productId: string, variantId?: string) => {
    const { items } = get();
    const newItems = items.filter(
      item => !(item.productId === productId && item.variantId === variantId)
    );

    const total = newItems.reduce((sum, item) => {
      const price = item.variant?.price || item.product.basePrice;
      return sum + (price * item.quantity);
    }, 0);

    set({ items: newItems, total });
  },

  updateQuantity: (productId: string, variantId: string | undefined, quantity: number) => {
    if (quantity <= 0) {
      get().removeItem(productId, variantId);
      return;
    }

    const { items } = get();
    const newItems = items.map(item => {
      if (item.productId === productId && item.variantId === variantId) {
        return { ...item, quantity };
      }
      return item;
    });

    const total = newItems.reduce((sum, item) => {
      const price = item.variant?.price || item.product.basePrice;
      return sum + (price * item.quantity);
    }, 0);

    set({ items: newItems, total });
  },

  clearCart: () => {
    set({ items: [], total: 0 });
  },

  getItemCount: () => {
    const { items } = get();
    return items.reduce((count, item) => count + item.quantity, 0);
  },
}));
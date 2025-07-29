import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product, ProductVariant, CartItem, Cart } from '@/types';

interface CartStore extends Cart {
  // Actions
  addItem: (product: Product, variant?: ProductVariant, quantity?: number) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, variantId: string | undefined, quantity: number) => void;
  clearCart: () => void;
  
  // Calculations
  calculateTotals: () => void;
  
  // Getters
  getItemCount: () => number;
  getItem: (productId: string, variantId?: string) => CartItem | undefined;
}

const TAX_RATE = 0.0; // No tax for temple store
const DEFAULT_DISCOUNT = 0;

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      subtotal: 0,
      tax: 0,
      discount: 0,
      total: 0,

      addItem: (product: Product, variant?: ProductVariant, quantity = 1) => {
        const state = get();
        const existingItemIndex = state.items.findIndex(
          item => item.productId === product.id && item.variantId === variant?.id
        );

        let newItems: CartItem[];

        if (existingItemIndex >= 0) {
          // Update existing item quantity
          newItems = state.items.map((item, index) =>
            index === existingItemIndex
              ? { ...item, quantity: item.quantity + quantity }
              : item
          );
        } else {
          // Add new item
          const newItem: CartItem = {
            productId: product.id,
            variantId: variant?.id,
            quantity,
            product,
            variant,
          };
          newItems = [...state.items, newItem];
        }

        set({ items: newItems });
        get().calculateTotals();
      },

      removeItem: (productId: string, variantId?: string) => {
        const state = get();
        const newItems = state.items.filter(
          item => !(item.productId === productId && item.variantId === variantId)
        );
        
        set({ items: newItems });
        get().calculateTotals();
      },

      updateQuantity: (productId: string, variantId: string | undefined, quantity: number) => {
        if (quantity <= 0) {
          get().removeItem(productId, variantId);
          return;
        }

        const state = get();
        const newItems = state.items.map(item =>
          item.productId === productId && item.variantId === variantId
            ? { ...item, quantity }
            : item
        );

        set({ items: newItems });
        get().calculateTotals();
      },

      clearCart: () => {
        set({
          items: [],
          subtotal: 0,
          tax: 0,
          discount: 0,
          total: 0,
        });
      },

      calculateTotals: () => {
        const state = get();
        const subtotal = state.items.reduce((sum, item) => {
          const price = item.variant?.price || item.product.basePrice;
          return sum + (price * item.quantity);
        }, 0);

        const tax = subtotal * TAX_RATE;
        const discount = DEFAULT_DISCOUNT;
        const total = subtotal + tax - discount;

        set({
          subtotal: Math.round(subtotal * 100) / 100,
          tax: Math.round(tax * 100) / 100,
          discount: Math.round(discount * 100) / 100,
          total: Math.round(total * 100) / 100,
        });
      },

      getItemCount: () => {
        const state = get();
        return state.items.reduce((count, item) => count + item.quantity, 0);
      },

      getItem: (productId: string, variantId?: string) => {
        const state = get();
        return state.items.find(
          item => item.productId === productId && item.variantId === variantId
        );
      },
    }),
    {
      name: 'vaikunthapos-cart',
      partialize: (state) => ({
        items: state.items,
        subtotal: state.subtotal,
        tax: state.tax,
        discount: state.discount,
        total: state.total,
      }),
    }
  )
);
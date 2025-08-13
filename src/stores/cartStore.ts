import { create } from 'zustand';
import type { Product, ProductVariant, CustomVariantData } from '@/types';
import { useNotificationStore } from './notificationStore';

export interface CartItem {
  productId: string;
  variantId?: string;
  quantity: number;
  product: Product;
  variant?: ProductVariant;
  // Custom variant support
  isCustomVariant?: boolean;
  customVariantData?: CustomVariantData;
}

interface CartStore {
  items: CartItem[];
  total: number;
  addItem: (product: Product, variant?: ProductVariant, quantity?: number) => void;
  addCustomItem: (product: Product, customData: CustomVariantData, quantity?: number) => void;
  removeItem: (productId: string, variantId?: string, isCustom?: boolean) => void;
  updateQuantity: (productId: string, variantId: string | undefined, quantity: number, isCustom?: boolean) => void;
  clearCart: () => void;
  getItemCount: () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  total: 0,

  addItem: (product: Product, variant?: ProductVariant, quantity = 1) => {
    const { items } = get();
    const existingItemIndex = items.findIndex(
      item => item.productId === product.id && item.variantId === variant?.id && !item.isCustomVariant
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
        isCustomVariant: false,
      };
      newItems = [...items, newItem];
    }

    const total = newItems.reduce((sum, item) => {
      const price = item.isCustomVariant 
        ? item.customVariantData?.customPrice || item.product.basePrice
        : item.variant?.price || item.product.basePrice;
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

  addCustomItem: (product: Product, customData: CustomVariantData, quantity = 1) => {
    const { items } = get();
    
    // Custom variants are always treated as unique items (no merging)
    const newItem: CartItem = {
      productId: product.id,
      variantId: `custom-${Date.now()}`, // Unique ID for custom variants
      quantity,
      product,
      isCustomVariant: true,
      customVariantData: customData,
    };
    
    const newItems = [...items, newItem];

    const total = newItems.reduce((sum, item) => {
      const price = item.isCustomVariant 
        ? item.customVariantData?.customPrice || item.product.basePrice
        : item.variant?.price || item.product.basePrice;
      return sum + (price * item.quantity);
    }, 0);

    set({ items: newItems, total });

    // Show notification
    const customDescription = customData.customDescription ? ` (${customData.customDescription})` : '';
    const productName = `${product.name} - Custom Price${customDescription}`;
    useNotificationStore.getState().addNotification({
      message: `${productName} added to cart`,
      type: 'success',
      duration: 2000,
    });
  },

  removeItem: (productId: string, variantId?: string, isCustom?: boolean) => {
    const { items } = get();
    const newItems = items.filter(
      item => !(item.productId === productId && item.variantId === variantId)
    );

    const total = newItems.reduce((sum, item) => {
      const price = item.isCustomVariant 
        ? item.customVariantData?.customPrice || item.product.basePrice
        : item.variant?.price || item.product.basePrice;
      return sum + (price * item.quantity);
    }, 0);

    set({ items: newItems, total });
  },

  updateQuantity: (productId: string, variantId: string | undefined, quantity: number, isCustom?: boolean) => {
    if (quantity <= 0) {
      get().removeItem(productId, variantId, isCustom);
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
      const price = item.isCustomVariant 
        ? item.customVariantData?.customPrice || item.product.basePrice
        : item.variant?.price || item.product.basePrice;
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
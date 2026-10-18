// src/store/cartStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product } from '@/lib/types';

interface CartItem {
  product: Product;
  quantity: number;
}

interface CartStore {
  items: CartItem[];
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      
      addItem: (product) => set((state) => {
        const existingItem = state.items.find(item => item.product._id === product._id);
        if (existingItem) {
          // Agar item pehle se hai, toh quantity + 1 kar do
          return {
            items: state.items.map(item =>
              item.product._id === product._id ? { ...item, quantity: item.quantity + 1 } : item
            )
          };
        }
        // Naya item add karo
        return { items: [...state.items, { product, quantity: 1 }] };
      }),
      
      removeItem: (productId) => set((state) => ({
        items: state.items.filter(item => item.product._id !== productId)
      })),
      
      updateQuantity: (productId, quantity) => set((state) => ({
        items: state.items.map(item =>
          item.product._id === productId ? { ...item, quantity: Math.max(1, quantity) } : item
        )
      })),
      
      clearCart: () => set({ items: [] }),
      
      getTotalItems: () => get().items.reduce((total, item) => total + item.quantity, 0),
    }),
    {
      name: 'gmeds-cart', // LocalStorage mein is naam se save hoga
    }
  )
);
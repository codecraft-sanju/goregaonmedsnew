// src/store/cartStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
export interface MedicineItem {
  _id?: string;
  name: string;
  quantity: string;
  price?: number;
  isAvailable?: boolean;
}

export interface Product {
  _id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  imageUrl: string | null;
  isActive: boolean;
  inStock: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// =========================================================================
// STORE INTERFACES
// =========================================================================
interface CartItem {
  product: Product;
  quantity: number;
}

export interface PrescriptionData {
  url: string;
  previewUrl?: string;
  fileName: string;
}

interface CartStore {
  // 1. OTC Products
  items: CartItem[];
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;

  // 2. Manual Medicines
  medicines: MedicineItem[];
  addMedicine: () => void;
  removeMedicine: (id: string) => void;
  updateMedicine: (id: string, field: 'name' | 'quantity', value: string) => void;

  // 3. Prescription
  prescription: PrescriptionData | null;
  setPrescription: (data: PrescriptionData | null) => void;

  // Global Actions
  clearCart: () => void;
  getTotalItems: () => number;
}

// Generate random ID for manual medicines
const generateId = () => Math.random().toString(36).substring(2, 9);

// =========================================================================
// ZUSTAND STORE SETUP
// =========================================================================
export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      medicines: [],
      prescription: null,
      
      // -- PRODUCT ACTIONS --
      addItem: (product) => set((state) => {
        const existingItem = state.items.find(item => item.product._id === product._id);
        if (existingItem) {
          return {
            items: state.items.map(item =>
              item.product._id === product._id ? { ...item, quantity: item.quantity + 1 } : item
            )
          };
        }
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

      // -- MEDICINE ACTIONS --
      addMedicine: () => set((state) => ({
        medicines: [...state.medicines, { _id: generateId(), name: '', quantity: '1 Strip' }]
      })),

      removeMedicine: (id) => set((state) => ({
        medicines: state.medicines.filter(med => med._id !== id)
      })),

      updateMedicine: (id, field, value) => set((state) => ({
        medicines: state.medicines.map(med => 
          med._id === id ? { ...med, [field]: value } : med
        )
      })),

      // -- PRESCRIPTION ACTIONS --
      setPrescription: (data) => set({ prescription: data }),

      // -- GLOBAL ACTIONS --
      clearCart: () => set({ items: [], medicines: [], prescription: null }),
      
      getTotalItems: () => {
        const state = get();
        const productCount = state.items.reduce((total, item) => total + item.quantity, 0);
        const validMedicinesCount = state.medicines.filter(m => m.name.trim() !== '').length;
        const prescriptionCount = state.prescription ? 1 : 0;
        return productCount + validMedicinesCount + prescriptionCount;
      },
    }),
    {
      name: 'gmeds-cart', // Persists in LocalStorage
    }
  )
);
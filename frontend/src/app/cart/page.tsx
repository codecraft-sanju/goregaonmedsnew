// src/app/cart/page.tsx
import type { Metadata } from 'next';
import { Cart } from '@/components/cart/Cart';

export const metadata: Metadata = { 
  title: 'My Cart - GoregaonMeds',
  description: 'Review your medicines and products in the cart before placing the order.'
};

export default function CartPage() {
  return <Cart />;
}
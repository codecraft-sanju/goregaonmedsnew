// src/app/store/page.tsx
import type { Metadata } from 'next';
import { Store } from '@/components/store/Store';

export const metadata: Metadata = { 
  title: 'Store - GoregaonMeds',
  description: 'Browse everyday essentials, cosmetics, and OTC products with instant delivery.'
};

export default function StorePage() {
  return <Store />;
}
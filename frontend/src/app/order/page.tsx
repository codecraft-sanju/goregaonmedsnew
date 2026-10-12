// src/app/order/page.tsx
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Navbar } from '@/components/layout/Navbar';
import { BottomNav } from '@/components/layout/BottomNav';
import { OrderFlow } from '@/components/order/OrderFlow';
import { Skeleton } from '@/components/ui/Skeleton';

export const metadata: Metadata = { title: 'Order medicines' };

export default function OrderPage() {
  return (
    <>
      <Navbar />
      
      <main className="container-app pb-28 pt-0 sm:py-12 md:pb-12 bg-[#f8fbfb] min-h-[100dvh]">
        <Suspense fallback={<Skeleton className="mx-auto mt-6 h-[520px] max-w-2xl rounded-3xl bg-white shadow-sm" />}>
          <OrderFlow />
        </Suspense>
      </main>
      <BottomNav /> 
    </>
  );
}
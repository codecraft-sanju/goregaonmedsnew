// src/app/order/page.tsx
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Navbar } from '@/components/layout/Navbar';
import { OrderFlow } from '@/components/order/OrderFlow';
import { Skeleton } from '@/components/ui/Skeleton';

export const metadata: Metadata = { title: 'Order medicines' };

export default function OrderPage() {
  return (
    <>
      <Navbar />
      <main className="container-app pb-28 pt-6 sm:py-12 md:pb-12">
        <Suspense fallback={<Skeleton className="mx-auto h-[520px] max-w-2xl rounded-3xl" />}>
          <OrderFlow />
        </Suspense>
      </main>
    </>
  );
}
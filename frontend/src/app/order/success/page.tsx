// src/app/order/success/page.tsx
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Navbar } from '@/components/layout/Navbar';
import { BottomNav } from '@/components/layout/BottomNav';
import { OrderSuccess } from '@/components/order/OrderSuccess';
import { Skeleton } from '@/components/ui/Skeleton';

export const metadata: Metadata = { title: 'Order received', robots: { index: false } };

export default function OrderSuccessPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#fafcfa]">
      <Navbar />
      <main className="flex-1 container-app py-10 sm:py-16">
        <Suspense fallback={<Skeleton className="mx-auto h-96 max-w-md rounded-3xl" />}>
          <OrderSuccess />
        </Suspense>
      </main>
      <BottomNav />
    </div>
  );
}
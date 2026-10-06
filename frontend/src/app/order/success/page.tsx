//src/app/order/success/page.tsx
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Navbar } from '@/components/layout/Navbar';
import { OrderSuccess } from '@/components/order/OrderSuccess';
import { Skeleton } from '@/components/ui/Skeleton';

export const metadata: Metadata = { title: 'Order received', robots: { index: false } };

export default function OrderSuccessPage() {
  return (
    <>
      <Navbar />
      <main className="container-app py-10 sm:py-16">
        <Suspense fallback={<Skeleton className="mx-auto h-96 max-w-md rounded-3xl" />}>
          <OrderSuccess />
        </Suspense>
      </main>
    </>
  );
}

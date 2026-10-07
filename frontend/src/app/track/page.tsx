// src/app/track/page.tsx
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Navbar } from '@/components/layout/Navbar';
import { TrackOrder } from '@/components/track/TrackOrder';
import { Skeleton } from '@/components/ui/Skeleton';
import { BottomNav } from '@/components/layout/BottomNav';

export const metadata: Metadata = { title: 'Track your order' };

export default function TrackPage() {
  return (
    <>
      <Navbar />
      {/* Mobile ke liye padding adjust ki hai pb-28 taaki BottomNav mix na ho */}
      <main className="container-app pb-28 pt-6 sm:py-16 md:pb-16">
        <Suspense fallback={<Skeleton className="mx-auto h-80 max-w-md rounded-3xl" />}>
          <TrackOrder />
        </Suspense>
      </main>
      <BottomNav />
    </>
  );
}
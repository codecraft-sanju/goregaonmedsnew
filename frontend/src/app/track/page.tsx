//src/app/track/page.tsx
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Navbar } from '@/components/layout/Navbar';
import { TrackOrder } from '@/components/track/TrackOrder';
import { Skeleton } from '@/components/ui/Skeleton';

export const metadata: Metadata = { title: 'Track your order' };

export default function TrackPage() {
  return (
    <>
      <Navbar />
      <main className="container-app py-10 sm:py-16">
        <Suspense fallback={<Skeleton className="mx-auto h-80 max-w-md rounded-3xl" />}>
          <TrackOrder />
        </Suspense>
      </main>
    </>
  );
}

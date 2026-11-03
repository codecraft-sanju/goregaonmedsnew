//src/app/cart/page.tsx
import CartPage from '@/features/cart';
import { Suspense } from 'react';
import { PageHeading, CartSkeleton } from '@/components/ui';

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="container page">
          <PageHeading title="Your care bag.">
            A few essentials. A little peace of mind.
          </PageHeading>
          <CartSkeleton />
        </div>
      }
    >
      <CartPage />
    </Suspense>
  );
}
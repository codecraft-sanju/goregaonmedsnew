//src/app/order/page.tsx
import Orders from '@/features/orders';
import { Suspense } from 'react';
import { PageHeading, OrdersSkeleton } from '@/components/ui';

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="container page">
          <PageHeading title="Your orders, in good hands.">
            A clear view of what you ordered and where things stand.
          </PageHeading>
          <OrdersSkeleton />
        </div>
      }
    >
      <Orders />
    </Suspense>
  );
}
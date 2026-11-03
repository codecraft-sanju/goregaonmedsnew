//src/app/products/page.tsx
import Catalog from '@/features/catalog';
import { Suspense } from 'react';
import { PageHeading, Skeleton } from '@/components/ui';

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="container page">
          <PageHeading
            eyebrow="THE NEIGHBOURHOOD SHOP"
            title="A little care goes a long way."
          >
            Medicines, wellness, and everyday essentials. All in one place.
          </PageHeading>
          <Skeleton count={6} className="product-grid shop-grid" />
        </div>
      }
    >
      <Catalog />
    </Suspense>
  );
}

import Checkout from '@/features/checkout';
import { Suspense } from 'react';
import { PageHeading, CheckoutSkeleton } from '@/components/ui';

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="container page">
          <PageHeading
            eyebrow="THOUGHTFULLY TAKEN CARE OF"
            title="Let’s get your care home."
          >
            Tell us what you need. We’ll send it to your neighbourhood pharmacy.
          </PageHeading>
          <CheckoutSkeleton />
        </div>
      }
    >
      <Checkout />
    </Suspense>
  );
}
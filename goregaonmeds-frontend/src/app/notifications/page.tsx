//src/app/notifications/page.tsx
import { Notifications } from '@/features/orders';
import { Suspense } from 'react';
import { PageHeading, NotificationsSkeleton } from '@/components/ui';

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="container page">
          <PageHeading title="A little update for you." />
          <NotificationsSkeleton />
        </div>
      }
    >
      <Notifications />
    </Suspense>
  );
}

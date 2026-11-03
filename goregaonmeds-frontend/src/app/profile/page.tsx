//src/app/profile/page.tsx
import { Profile } from '@/features/orders';
import { Suspense } from 'react';
import { PageHeading, ProfileSkeleton } from '@/components/ui';

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="container page">
          <PageHeading title="A space for your everyday care." />
          <ProfileSkeleton />
        </div>
      }
    >
      <Profile />
    </Suspense>
  );
}
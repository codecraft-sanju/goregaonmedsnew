//src/app/profile/page.tsx
import type { Metadata } from 'next';
import { Navbar } from '@/components/layout/Navbar';
import { ProfileHistory } from '@/components/profile/ProfileHistory';

export const metadata: Metadata = { title: 'My Orders - History' };

export default function ProfilePage() {
  return (
    <>
      <Navbar />
      <main className="container-app py-10 sm:py-16">
        <ProfileHistory />
      </main>
    </>
  );
}
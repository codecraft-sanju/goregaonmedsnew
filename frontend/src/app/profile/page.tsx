// src/app/profile/page.tsx
import type { Metadata } from 'next';
import { Navbar } from '@/components/layout/Navbar';
import { UserProfile } from '@/components/profile/UserProfile';
import { BottomNav } from '@/components/layout/BottomNav';

export const metadata: Metadata = { title: 'My Profile - GoregaonMeds' };

export default function ProfilePage() {
  return (
    <>
      <Navbar />
      <main className="container-app pb-28 pt-6 sm:py-16 md:pb-16">
        <UserProfile />
      </main>
      <BottomNav />
    </>
  );
}
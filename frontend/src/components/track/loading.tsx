import { Navbar } from '@/components/layout/Navbar';
import { BottomNav } from '@/components/layout/BottomNav';
import Loader from '@/components/loader/Loader';

export default function TrackLoading() {
  return (
    <>
      <Navbar />
      <main className="container-app flex min-h-[70vh] items-center justify-center">
        <Loader />
      </main>
      <BottomNav />
    </>
  );
}
//src/app/not-found.tsx
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';

export default function NotFound() {
  return (
    <>
      <Navbar />
      <main className="container-app grid min-h-[60vh] place-items-center py-16 text-center">
        <div>
          <p className="font-display text-6xl font-extrabold text-brand-200">404</p>
          <h1 className="mt-2 font-display text-2xl font-bold">Page not found</h1>
          <p className="mt-2 text-ink-muted">The page you’re looking for doesn’t exist.</p>
          <Link href="/" className="mt-6 inline-flex h-11 items-center rounded-2xl bg-brand-700 px-5 font-semibold text-white">Back to Home</Link>
        </div>
      </main>
    </>
  );
}

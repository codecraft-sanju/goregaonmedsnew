// src/components/home/Hero.tsx
import Link from 'next/link';
import { Search } from 'lucide-react';

export function Hero() {
  return (
    <section className="container-app pt-6 pb-2 md:pt-10">
      <h1 className="font-display text-[2rem] font-extrabold leading-[1.15] tracking-tight text-ink sm:text-4xl">
        What do you need today?
      </h1>
      <p className="mt-2 text-sm text-ink-muted sm:text-base">
        Order your medicines quickly and easily.
      </p>

      {/* Fake Search Bar that acts as a button to the manual entry page */}
      <Link 
        href="/order?method=manual" 
        className="mt-6 flex h-14 w-full items-center gap-3 rounded-2xl border border-brand-100 bg-white px-4 shadow-sm transition-shadow hover:shadow-md"
      >
        <Search className="h-5 w-5 text-ink-muted" strokeWidth={2} />
        <span className="text-[15px] font-medium text-ink-muted">Enter medicine names</span>
      </Link>
    </section>
  );
}
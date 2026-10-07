// src/app/search/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, ArrowLeft, PackagePlus } from 'lucide-react';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/Button';

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  return (
    <div className="min-h-screen bg-surface">
      {/* Custom Header for Search Page */}
      <header className="sticky top-0 z-40 bg-white border-b border-brand-100 px-4 py-3 shadow-sm flex items-center gap-3">
        <button 
          onClick={() => router.back()} 
          className="p-2 -ml-2 text-ink-muted hover:bg-brand-50 rounded-full transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-soft" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for medicines..."
            className="w-full h-10 pl-9 pr-4 rounded-full bg-surface border border-brand-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-shadow text-ink placeholder:text-ink-soft"
          />
        </div>
      </header>

      <main className="container-app py-8 pb-24">
        {query.length > 0 ? (
          <div className="text-center p-6 bg-white rounded-2xl ring-1 ring-brand-100 shadow-sm mt-4">
            <PackagePlus className="h-10 w-10 text-[#156253] mx-auto mb-3 opacity-80" />
            <h2 className="text-lg font-bold text-ink mb-1">Order &quot;{query}&quot; Manually</h2>
            <p className="text-sm text-ink-muted mb-5">
              We don&apos;t display a full catalog yet, but we have almost everything in stock! You can directly send us this name.
            </p>
            <Link href={`/order?method=manual`} className="w-full inline-block">
              <Button className="w-full">Order via Text</Button>
            </Link>
          </div>
        ) : (
          <div className="text-center mt-12 px-4">
            <h3 className="text-sm font-bold text-ink-muted uppercase tracking-wide mb-2">Can&apos;t find something?</h3>
            <p className="text-sm text-ink-soft mb-6">
              Skip the search. Just upload your prescription or type the medicine names directly on our order page.
            </p>
            <div className="flex gap-3 justify-center">
              <Link href="/order?method=prescription">
                {/* Yahan variant="outline" ko variant="secondary" se replace kiya gaya hai */}
                <Button variant="secondary" className="text-xs">Upload Rx</Button>
              </Link>
              <Link href="/order?method=manual">
                <Button className="text-xs">Enter Manually</Button>
              </Link>
            </div>
          </div>
        )}
      </main>
      
      <BottomNav />
    </div>
  );
}
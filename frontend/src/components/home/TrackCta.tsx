'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { PackageSearch } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function TrackCta() {
  const router = useRouter();
  const [orderId, setOrderId] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const id = orderId.trim().toUpperCase();
    router.push(id ? `/track?id=${encodeURIComponent(id)}` : '/track');
  };

  return (
    <section id="track" className="container-app py-6" aria-labelledby="track-title">
      <div className="card flex flex-col gap-6 p-6 sm:p-8 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-700"><PackageSearch className="h-6 w-6" aria-hidden /></span>
          <div>
            <h2 id="track-title" className="font-display text-xl font-bold">Track your order</h2>
            <p className="mt-1 text-sm text-ink-muted">Enter your Order ID, then confirm with the last 4 digits of your mobile number.</p>
          </div>
        </div>
        <form onSubmit={submit} className="flex w-full gap-2 md:max-w-md">
          <label htmlFor="track-cta-id" className="sr-only">Order ID</label>
          <input
            id="track-cta-id"
            value={orderId}
            onChange={(event) => setOrderId(event.target.value)}
            placeholder="GMED-X8P2K7"
            maxLength={11}
            autoCapitalize="characters"
            className="h-12 flex-1 rounded-2xl bg-surface px-4 font-mono uppercase ring-1 ring-inset ring-brand-100 placeholder:normal-case placeholder:text-ink-soft focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <Button type="submit" size="md" className="h-12">Track</Button>
        </form>
      </div>
    </section>
  );
}

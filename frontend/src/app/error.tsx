'use client';

import { useEffect } from 'react';
import { SUPPORT_PHONE_DISPLAY, SUPPORT_PHONE_TEL } from '@/lib/constants';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="container-app grid min-h-[70vh] place-items-center py-16 text-center">
      <div className="max-w-sm">
        <h1 className="font-display text-2xl font-bold">Something went wrong</h1>
        <p className="mt-2 text-ink-muted">
          Please try again. If you were placing an order, call <a href={SUPPORT_PHONE_TEL} className="font-semibold text-brand-700">{SUPPORT_PHONE_DISPLAY}</a> before ordering again.
        </p>
        <button type="button" onClick={reset} className="mt-6 inline-flex h-11 items-center rounded-2xl bg-brand-700 px-5 font-semibold text-white">Try again</button>
      </div>
    </main>
  );
}

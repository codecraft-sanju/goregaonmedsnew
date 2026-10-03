'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { Gift } from 'lucide-react';
import { usePublicSettings } from '@/hooks/usePublicSettings';
import { GIFT } from '@/lib/constants';
import { formatRupees } from '@/lib/format';

const DISMISS_KEY = 'gmeds:offer-dismissed';

export function OfferBanner() {
  const { settings, loading } = usePublicSettings();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === '1');
    } catch {
      // Storage unavailable: just show the banner.
    }
  }, []);

  const dismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // ignore
    }
  };

  const threshold = formatRupees(settings.firstOrderMinimumMedicineAmount);
  const visible = !loading && settings.firstOrderOfferEnabled && !dismissed;

  return (
    <AnimatePresence>
      {visible && (
        <motion.section
          id="offer"
          aria-labelledby="offer-title"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="container-app my-6"
        >
          <div className="relative overflow-hidden rounded-4xl bg-gradient-to-br from-gift-50 via-white to-gift-100 p-6 ring-1 ring-gift-100 sm:p-10">
            <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-gift-400/20 blur-2xl" aria-hidden />
            <div className="relative grid gap-8 md:grid-cols-[auto_1fr] md:items-center">
              <motion.div
                className="grid h-20 w-20 place-items-center rounded-3xl bg-gift-500 text-white shadow-[0_18px_40px_-16px_rgba(239,148,21,0.8)]"
                animate={{ rotate: [0, -6, 6, -3, 0] }}
                transition={{ duration: 1.4, delay: 0.6, repeat: Infinity, repeatDelay: 5 }}
                aria-hidden
              >
                <Gift className="h-9 w-9" />
              </motion.div>
              <div>
                <p className="eyebrow !text-gift-600">First order gift 🎁</p>
                <h2 id="offer-title" className="mt-2 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
                  Get a FREE {GIFT.name}
                  <span className="ml-2 align-middle text-base font-semibold text-ink-soft line-through decoration-gift-500/70">MRP {formatRupees(GIFT.mrp)}</span>
                </h2>
                <p className="mt-3 max-w-2xl text-ink-muted">
                  Available on eligible first medicine orders with <strong className="text-ink">{threshold} or more in medicines</strong> after applicable discounts.
                </p>
                <p className="mt-2 max-w-2xl text-sm text-ink-muted">
                  Cosmetics, FMCG, general items and delivery charges do not count toward the {threshold} minimum. Eligibility is confirmed after pharmacy billing.
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Link href="/order?gift=1" className="inline-flex h-12 items-center justify-center rounded-2xl bg-gift-500 px-6 font-semibold text-white transition-colors hover:bg-gift-600">
                    Claim with My First Order
                  </Link>
                  <button type="button" onClick={dismiss} className="inline-flex h-12 items-center justify-center rounded-2xl px-5 font-semibold text-ink-muted hover:bg-white/70">
                    No Thanks, Continue
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}

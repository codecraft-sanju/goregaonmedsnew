//src/components/home/OfferPopup.tsx
'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import Image from 'next/image';
import { ArrowRight, Clock, Gift, Truck, Wallet, X } from 'lucide-react';
import { usePublicSettings } from '@/hooks/usePublicSettings';
import { GIFT, SERVICE_AREA } from '@/lib/constants';
import { formatRupees } from '@/lib/format';

const SEEN_KEY = 'gmeds:offer-popup-seen';
const OPEN_DELAY_MS = 0;

export function OfferPopup() {
  const { settings, loading } = usePublicSettings();
  const [open, setOpen] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const reduceMotion = useReducedMotion();

  const eligible = !loading && settings.firstOrderOfferEnabled;
  const threshold = formatRupees(settings.firstOrderMinimumMedicineAmount);

  // Open once per tab session, shortly after settings confirm the offer is live.
  useEffect(() => {
    if (!eligible) return;
    try {
      if (sessionStorage.getItem(SEEN_KEY) === '1') return;
    } catch {
      // Storage unavailable: show the popup anyway.
    }
    const timer = window.setTimeout(() => {
      setOpen(true);
      try {
        sessionStorage.setItem(SEEN_KEY, '1');
      } catch {
        // ignore
      }
    }, OPEN_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [eligible]);

  // Native modal: focus trap + Esc handling. We also lock page scroll and restore focus.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [open]);

  const close = () => setOpen(false);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        // Only the backdrop reports the dialog itself as the target.
        if (event.target === event.currentTarget) close();
      }}
      className="fixed inset-0 m-auto h-fit max-h-[calc(100dvh-1.5rem)] w-[min(880px,calc(100vw-1.5rem))] max-w-none overflow-y-auto overscroll-contain rounded-4xl border-0 bg-white p-0 text-ink shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="relative grid md:grid-cols-[0.9fr_1.1fr]"
      >
        <button
          type="button"
          onClick={close}
          aria-label="Close offer"
          className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-ink-muted shadow ring-1 ring-black/5 transition-colors hover:bg-white hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>

        {/* Art panel */}
        <div className="relative flex min-h-[220px] items-center justify-center overflow-hidden bg-gradient-to-br from-brand-50 via-white to-brand-100 px-6 pb-8 pt-12 md:min-h-[460px]">
          <div className="absolute -left-10 -top-10 h-44 w-44 rounded-full bg-brand-400/25 blur-3xl" aria-hidden />
          <div className="absolute -bottom-12 -right-8 h-48 w-48 rounded-full bg-brand-500/20 blur-3xl" aria-hidden />
          <span className="absolute left-6 top-5 text-[10px] font-bold uppercase tracking-[0.18em] text-brand-600">
            A little care. A little extra.
          </span>

          {imageFailed ? (
            <div className="relative flex flex-col items-center gap-3 text-brand-600">
              <Gift className="h-14 w-14" strokeWidth={1.3} aria-hidden />
              <span className="max-w-[12rem] text-center text-sm font-medium">{GIFT.name}</span>
            </div>
          ) : (
            <Image
              src={GIFT.image}
              alt={GIFT.name}
              width={360}
              height={300}
              priority 
              onError={() => setImageFailed(true)}
              className="relative h-44 w-full object-contain mix-blend-multiply drop-shadow-xl md:h-72"
            />
          )}

          <div className="absolute bottom-4 right-4 flex h-20 w-20 -rotate-12 flex-col items-center justify-center gap-1 rounded-full bg-brand-600 text-center text-[9px] font-bold uppercase leading-tight tracking-wider text-white shadow-lg md:bottom-6 md:right-6 md:h-24 md:w-24 md:text-[10px]">
            <Gift className="h-4 w-4" aria-hidden />
            Free gift
          </div>
        </div>

        {/* Content panel */}
        <div className="flex flex-col p-6 sm:p-8 md:p-10">
          <p className="eyebrow !text-brand-600">Welcome to Goregaonmeds 🎁</p>
          <h2 id={titleId} className="mt-3 font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
            Your first order comes with a <span className="text-brand-600">free gift</span>
          </h2>

          <p className="mt-5 text-base font-bold">{GIFT.name}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span className="rounded-lg bg-brand-100 px-3 py-1 text-xl font-extrabold tracking-wide text-brand-600">FREE</span>
            <span className="text-sm text-ink-soft">
              MRP <s className="decoration-brand-500/70 decoration-2">{formatRupees(GIFT.mrp)}</s>
            </span>
          </div>

          <ul className="mt-6 grid gap-3 text-sm">
            <li className="flex items-center gap-2.5">
              <Truck className="h-4 w-4 shrink-0 text-brand-600" aria-hidden />
              {settings.deliveryCharge === 0
                ? `FREE delivery in ${SERVICE_AREA}`
                : `Home delivery in ${SERVICE_AREA}`}
            </li>
            <li className="flex items-center gap-2.5">
              <Wallet className="h-4 w-4 shrink-0 text-brand-600" aria-hidden />
              Pay on delivery: cash or UPI / QR
            </li>
            <li className="flex items-center gap-2.5">
              <Clock className="h-4 w-4 shrink-0 text-brand-600" aria-hidden />
              Healthzone &amp; Cosmetic is open 24×7
            </li>
          </ul>

          <p className="mt-6 text-xs leading-relaxed text-ink-muted">
            Valid on your first order of <strong className="text-ink">{threshold} or more in medicines</strong> after
            discounts. Cosmetics, FMCG, general items and delivery charges do not count. Eligibility is confirmed
            after pharmacy billing. Tapping the button below starts your order; it does not redeem the gift.
          </p>

          <div className="mt-6 flex flex-col gap-2">
            <Link
              href="/order?gift=1"
              onClick={close}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-brand-500 px-6 font-semibold text-white transition-colors hover:bg-brand-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            >
              Claim with my first order
              <ArrowRight className="h-5 w-5" aria-hidden />
            </Link>
            <button
              type="button"
              onClick={close}
              className="inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-semibold text-ink-muted transition-colors hover:bg-brand-50 hover:text-ink"
            >
              No thanks, continue browsing
            </button>
          </div>
        </div>
      </motion.div>
    </dialog>
  );
}
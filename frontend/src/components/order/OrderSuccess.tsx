//src/components/order/OrderSuccess.tsx
'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Camera, Check, Copy, Home, PackageSearch, Phone } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { ORDER_ID_PATTERN, SUPPORT_PHONE_DISPLAY, SUPPORT_PHONE_TEL } from '@/lib/constants';

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    textarea.remove();
    return copied;
  }
}

export function OrderSuccess() {
  const params = useSearchParams();
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const rawId = (params.get('id') ?? '').toUpperCase();
  const orderId = ORDER_ID_PATTERN.test(rawId) ? rawId : null;
  const notificationDelayed = params.get('notified') === '0';

  // NEW: Auto-save Order ID to localStorage for seamless Profile History
  useEffect(() => {
    if (orderId) {
      try {
        const saved = JSON.parse(localStorage.getItem('gmed_orders') || '[]');
        if (!saved.includes(orderId)) {
          saved.unshift(orderId); // Add new order to the beginning
          localStorage.setItem('gmed_orders', JSON.stringify(saved.slice(0, 50))); // Keep last 50
        }
      } catch {
        console.error('Failed to save order ID to local storage');
      }
    }
  }, [orderId]);

  if (!orderId) {
    return (
      <div className="card mx-auto max-w-md p-8 text-center">
        <h1 className="font-display text-xl font-bold">Order not found</h1>
        <p className="mt-2 text-ink-muted">This page needs a valid Order ID. You can track an existing order instead.</p>
        <Link href="/track" className="mt-6 inline-flex h-11 items-center rounded-2xl bg-brand-700 px-5 font-semibold text-white">Track an order</Link>
      </div>
    );
  }

  const copy = async () => {
    if (await copyText(orderId)) {
      setCopied(true);
      toast.success('Order ID copied');
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error('Could not copy. Please note the Order ID down.');
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-4">
      {notificationDelayed && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3 rounded-3xl bg-gift-50 p-5 ring-1 ring-gift-400" role="alert">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-gift-600" aria-hidden />
          <div className="text-sm">
            <p className="font-semibold">⚠ Notification Delay</p>
            <p className="mt-1 text-ink-muted">Your order is saved, but our notification system is delayed.</p>
            <p className="mt-1 text-ink-muted">
              Please call us at{' '}
              <a href={SUPPORT_PHONE_TEL} className="font-semibold text-brand-700 underline underline-offset-2">{SUPPORT_PHONE_DISPLAY}</a> to confirm your order details.
            </p>
            <a href={SUPPORT_PHONE_TEL} className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl bg-gift-500 px-4 font-semibold text-white">
              <Phone className="h-4 w-4" aria-hidden /> Call now
            </a>
          </div>
        </motion.div>
      )}

      {/* NEW: Explicit Screenshot Alert Box */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex gap-3 rounded-3xl bg-amber-50 p-5 ring-1 ring-amber-200" role="alert">
        <Camera className="mt-0.5 h-6 w-6 shrink-0 text-amber-600" aria-hidden />
        <div className="text-sm">
          <p className="font-bold text-amber-900 text-base">Please take a screenshot!</p>
          <p className="mt-1 text-amber-800">Your Order ID is required to track this order and access your future order history. Keep it safe!</p>
        </div>
      </motion.div>

      <div className="card p-8 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
          className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-brand-700 text-white shadow-lift"
        >
          <motion.svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.35, duration: 0.45 }} />
          </motion.svg>
        </motion.div>
        <h1 className="mt-6 font-display text-2xl font-bold">Order Received Successfully ✓</h1>
        <p className="mt-2 text-sm text-ink-muted">The pharmacy will confirm availability and your final amount. Pay by cash or UPI when it arrives.</p>

        <div className="mt-6 rounded-2xl bg-surface p-4 ring-1 ring-brand-100">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Order ID</p>
          <p className="mt-1 font-mono text-2xl font-bold tracking-wider text-brand-800">{orderId}</p>
        </div>

        <div className="mt-6 grid gap-2">
          <Link href={`/track?id=${orderId}`} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-brand-700 font-semibold text-white shadow-lift hover:bg-brand-800">
            <PackageSearch className="h-4 w-4" aria-hidden /> Track Order
          </Link>
          <Button variant="secondary" size="md" className="h-12" onClick={copy} icon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}>
            {copied ? 'Copied' : 'Copy Order ID'}
          </Button>
          <Link href="/" className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl font-semibold text-brand-800 hover:bg-brand-50">
            <Home className="h-4 w-4" aria-hidden /> Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
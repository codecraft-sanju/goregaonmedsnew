// src/components/order/OrderSuccess.tsx
'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Camera, Check, Copy, Home, PackageSearch } from 'lucide-react';
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

  useEffect(() => {
    if (orderId) {
      try {
        const saved = JSON.parse(localStorage.getItem('gmed_orders') || '[]');
        if (!saved.includes(orderId)) {
          saved.unshift(orderId);
          localStorage.setItem('gmed_orders', JSON.stringify(saved.slice(0, 50)));
        }
      } catch {
        console.error('Failed to save order ID to local storage');
      }
    }
  }, [orderId]);

  if (!orderId) {
    return (
      <div className="card mx-auto max-w-md p-8 text-center bg-white shadow-sm">
        <h1 className="font-display text-xl font-bold text-ink">Order not found</h1>
        <p className="mt-2 text-sm font-medium text-ink-muted">This page needs a valid Order ID. You can track an existing order instead.</p>
        <Link href="/track" className="mt-6 inline-flex h-11 items-center rounded-2xl bg-[#156253] px-5 font-semibold text-white">Track an order</Link>
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
    <div className="mx-auto max-w-md space-y-6">
      
      {/* Animated Checkmark Bubble */}
      <div className="flex justify-center pt-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
          className="grid h-24 w-24 place-items-center rounded-full bg-[#156253] text-white shadow-lg shadow-brand-700/20"
        >
          <motion.svg viewBox="0 0 24 24" className="h-12 w-12" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.35, duration: 0.45 }} />
          </motion.svg>
        </motion.div>
      </div>

      <div className="text-center">
        <h1 className="font-display text-3xl font-extrabold text-ink">Order Received</h1>
        <p className="mt-2 text-[15px] font-medium text-ink-muted px-4">
          The pharmacy will confirm availability and your final bill. Pay by cash or UPI when it arrives.
        </p>
      </div>

      <div className="card p-6 sm:p-8 bg-white shadow-sm border border-brand-50">
        
        {notificationDelayed && (
          <div className="mb-6 rounded-2xl bg-[#fff5e6] p-4 ring-1 ring-[#dfa442]/30">
            <p className="font-bold text-[#b87c1c]">System Delay</p>
            <p className="mt-1 text-xs font-medium text-[#7a6441]">Your order is saved, but SMS notifications are delayed. Call us at <a href={SUPPORT_PHONE_TEL} className="font-bold underline">{SUPPORT_PHONE_DISPLAY}</a> to confirm.</p>
          </div>
        )}

        <div className="rounded-2xl border-2 border-dashed border-[#156253]/30 bg-brand-50/50 p-5 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-[#156253]">Order ID</p>
          <p className="mt-1.5 font-mono text-3xl font-extrabold tracking-tight text-ink">{orderId}</p>
        </div>

        <div className="mt-4 flex items-start gap-3 rounded-2xl bg-[#e5f7ed] p-4 text-left">
          <Camera className="mt-0.5 h-5 w-5 shrink-0 text-[#147a4a]" />
          <p className="text-xs font-semibold leading-relaxed text-[#147a4a]">
            Please take a screenshot of this page or copy your Order ID. You will need it to track your order.
          </p>
        </div>

        <div className="mt-8 grid gap-3">
          <Link href={`/track?id=${orderId}`} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#156253] font-bold text-white shadow-lift hover:bg-[#0f4b3f]">
            <PackageSearch className="h-4 w-4" /> Track My Order
          </Link>
          <Button variant="secondary" size="md" className="h-12 font-bold" onClick={copy} icon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}>
            {copied ? 'Copied to Clipboard' : 'Copy Order ID'}
          </Button>
          <Link href="/" className="mt-2 inline-flex h-12 items-center justify-center gap-2 rounded-2xl font-bold text-ink-muted hover:bg-surface">
            <Home className="h-4 w-4" /> Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
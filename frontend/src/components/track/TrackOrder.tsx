'use client';

import { useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { PackageSearch, SearchX } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Skeleton } from '@/components/ui/Skeleton';
import { ApiError, apiRequest } from '@/lib/api';
import { ORDER_ID_PATTERN, SUPPORT_PHONE_DISPLAY, SUPPORT_PHONE_TEL } from '@/lib/constants';
import { formatDateTime, formatRupees } from '@/lib/format';
import type { TrackedOrder } from '@/lib/types';

type Result = { kind: 'found'; order: TrackedOrder } | { kind: 'not-found'; message: string } | null;

export function TrackOrder() {
  const params = useSearchParams();
  const [orderId, setOrderId] = useState(() => (params.get('id') ?? '').toUpperCase().slice(0, 11));
  const [last4, setLast4] = useState('');
  const [errors, setErrors] = useState<{ orderId?: string; last4?: string }>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const id = orderId.trim().toUpperCase();
    const nextErrors: typeof errors = {};
    if (!ORDER_ID_PATTERN.test(id)) nextErrors.orderId = 'Enter a valid Order ID, e.g. GMED-X8P2K7';
    if (!/^\d{4}$/.test(last4)) nextErrors.last4 = 'Enter the last 4 digits of your mobile number';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    setResult(null);
    try {
      const res = await apiRequest<{ order: TrackedOrder }>('/orders/track', { method: 'POST', body: { orderId: id, mobileLast4: last4 } });
      setResult({ kind: 'found', order: res.order });
    } catch (error) {
      const message = error instanceof ApiError && error.status === 404 ? 'We could not find an order with that Order ID and mobile number.' : (error as Error).message;
      setResult({ kind: 'not-found', message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-5">
      <form onSubmit={submit} className="card space-y-4 p-6 sm:p-8" noValidate>
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-50 text-brand-700"><PackageSearch className="h-5 w-5" aria-hidden /></span>
          <h1 className="font-display text-2xl font-bold">Track your order</h1>
        </div>
        <Field
          label="Order ID"
          placeholder="GMED-X8P2K7"
          autoCapitalize="characters"
          autoComplete="off"
          maxLength={11}
          className="[&_input]:font-mono [&_input]:uppercase"
          value={orderId}
          onChange={(event) => setOrderId(event.target.value.toUpperCase())}
          error={errors.orderId}
        />
        <Field
          label="Last 4 digits of your mobile number"
          inputMode="numeric"
          autoComplete="off"
          maxLength={4}
          placeholder="8771"
          value={last4}
          onChange={(event) => setLast4(event.target.value.replace(/\D/g, '').slice(0, 4))}
          error={errors.last4}
        />
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          {loading ? 'Checking…' : 'Track Order'}
        </Button>
      </form>

      {loading && <Skeleton className="h-40 w-full rounded-3xl" />}

      <AnimatePresence mode="wait">
        {result?.kind === 'found' && (
          <motion.div key={result.order.orderId} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="card p-6" aria-live="polite">
            <p className="font-mono text-sm font-semibold text-ink-soft">{result.order.orderId}</p>
            <div className="mt-3 flex items-center gap-3">
              <span className="relative flex h-3.5 w-3.5">
                {result.order.status === 'Pending' && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-60" />}
                <span className={`relative inline-flex h-3.5 w-3.5 rounded-full ${result.order.status === 'Pending' ? 'bg-red-500' : 'bg-brand-500'}`} />
              </span>
              <p className="font-display text-xl font-bold">{result.order.status === 'Pending' ? 'Order Received & Processing' : 'Delivered'}</p>
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
              <div><dt className="text-ink-soft">Placed</dt><dd className="font-medium">{formatDateTime(result.order.placedAt)}</dd></div>
              {result.order.deliveredAt && <div><dt className="text-ink-soft">Delivered</dt><dd className="font-medium">{formatDateTime(result.order.deliveredAt)}</dd></div>}
              <div><dt className="text-ink-soft">Order type</dt><dd className="font-medium">{result.order.orderType === 'manual_text' ? `${result.order.itemCount} item(s)` : 'Prescription'}</dd></div>
              <div><dt className="text-ink-soft">Payment</dt><dd className="font-medium">Cash / UPI at delivery</dd></div>
              {result.order.finalAmount !== null && <div><dt className="text-ink-soft">Bill amount</dt><dd className="font-medium">{formatRupees(result.order.finalAmount)}</dd></div>}
            </dl>
            <p className="mt-5 text-xs text-ink-soft">Questions? Call <a href={SUPPORT_PHONE_TEL} className="font-semibold text-brand-700">{SUPPORT_PHONE_DISPLAY}</a></p>
          </motion.div>
        )}
        {result?.kind === 'not-found' && (
          <motion.div key="nf" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="card flex gap-3 p-6" role="alert">
            <SearchX className="h-6 w-6 shrink-0 text-ink-soft" aria-hidden />
            <div className="text-sm">
              <p className="font-semibold">{result.message}</p>
              <p className="mt-1 text-ink-muted">Check the Order ID on your confirmation, or call <a href={SUPPORT_PHONE_TEL} className="font-semibold text-brand-700">{SUPPORT_PHONE_DISPLAY}</a>.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

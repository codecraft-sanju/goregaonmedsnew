// //src/components/track/TrackOrder.tsx
// 'use client';

// import { useSearchParams } from 'next/navigation';
// import { useState, type FormEvent } from 'react';
// import { AnimatePresence, motion } from 'framer-motion';
// import { PackageSearch, SearchX, AlertCircle } from 'lucide-react';
// import { Button } from '@/components/ui/Button';
// import { Field } from '@/components/ui/Field';
// import { Skeleton } from '@/components/ui/Skeleton';
// import { ApiError, apiRequest } from '@/lib/api';
// import { ORDER_ID_PATTERN, SUPPORT_PHONE_DISPLAY, SUPPORT_PHONE_TEL } from '@/lib/constants';
// import { formatDateTime, formatRupees } from '@/lib/format';
// import type { TrackedOrder } from '@/lib/types';

// type Result = { kind: 'found'; order: TrackedOrder } | { kind: 'not-found'; message: string } | null;

// export function TrackOrder() {
//   const params = useSearchParams();
//   const [orderId, setOrderId] = useState(() => (params.get('id') ?? '').toUpperCase().slice(0, 11));
//   const [last4, setLast4] = useState('');
//   const [errors, setErrors] = useState<{ orderId?: string; last4?: string }>({});
//   const [loading, setLoading] = useState(false);
//   const [result, setResult] = useState<Result>(null);

//   const submit = async (event: FormEvent) => {
//     event.preventDefault();
//     const id = orderId.trim().toUpperCase();
//     const nextErrors: typeof errors = {};
//     if (!ORDER_ID_PATTERN.test(id)) nextErrors.orderId = 'Enter a valid Order ID, e.g. GMED-X8P2K7';
//     if (!/^\d{4}$/.test(last4)) nextErrors.last4 = 'Enter the last 4 digits of your mobile number';
//     setErrors(nextErrors);
//     if (Object.keys(nextErrors).length > 0) return;

//     setLoading(true);
//     setResult(null);
//     try {
//       const res = await apiRequest<{ order: TrackedOrder }>('/orders/track', { method: 'POST', body: { orderId: id, mobileLast4: last4 } });
//       setResult({ kind: 'found', order: res.order });
//     } catch (error) {
//       const message = error instanceof ApiError && error.status === 404 ? 'We could not find an order with that Order ID and mobile number.' : (error as Error).message;
//       setResult({ kind: 'not-found', message });
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="mx-auto max-w-md space-y-5">
//       <form onSubmit={submit} className="card space-y-4 p-6 sm:p-8" noValidate>
//         <div className="flex items-center gap-3">
//           <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-50 text-brand-700"><PackageSearch className="h-5 w-5" aria-hidden /></span>
//           <h1 className="font-display text-2xl font-bold">Track your order</h1>
//         </div>
//         <Field
//           label="Order ID"
//           placeholder="GMED-X8P2K7"
//           autoCapitalize="characters"
//           autoComplete="off"
//           maxLength={11}
//           className="[&_input]:font-mono [&_input]:uppercase"
//           value={orderId}
//           onChange={(event) => setOrderId(event.target.value.toUpperCase())}
//           error={errors.orderId}
//         />
//         <Field
//           label="Last 4 digits of your mobile number"
//           inputMode="numeric"
//           autoComplete="off"
//           maxLength={4}
//           placeholder="8771"
//           value={last4}
//           onChange={(event) => setLast4(event.target.value.replace(/\D/g, '').slice(0, 4))}
//           error={errors.last4}
//         />
//         <Button type="submit" size="lg" className="w-full" loading={loading}>
//           {loading ? 'Checking…' : 'Track Order'}
//         </Button>
//       </form>

//       {loading && <Skeleton className="h-40 w-full rounded-3xl" />}

//       <AnimatePresence mode="wait">
//         {result?.kind === 'found' && (
//           <motion.div key={result.order.orderId} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="card p-6" aria-live="polite">
//             <p className="font-mono text-sm font-semibold text-ink-soft">{result.order.orderId}</p>
//             <div className="mt-3 flex items-center gap-3">
//               <span className="relative flex h-3.5 w-3.5">
//                 {result.order.status === 'Pending' && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />}
//                 <span className={`relative inline-flex h-3.5 w-3.5 rounded-full ${result.order.status === 'Pending' ? 'bg-amber-500' : result.order.status === 'Cancelled' ? 'bg-red-500' : 'bg-brand-500'}`} />
//               </span>
//               <p className="font-display text-xl font-bold">
//                 {result.order.status === 'Pending' ? 'Processing' : result.order.status === 'Cancelled' ? 'Order Cancelled' : 'Delivered'}
//               </p>
//             </div>
            
//             {/* CANCELLED MESSAGE BOX FOR CUSTOMER */}
//             {result.order.status === 'Cancelled' && (
//               <div className="mt-4 rounded-2xl bg-red-50 p-4 ring-1 ring-red-100">
//                 <p className="flex items-center gap-1.5 text-sm font-bold text-red-800"><AlertCircle className="h-4 w-4" /> Cancellation Reason</p>
//                 <p className="mt-1 text-sm text-red-700">{result.order.cancelReason}</p>
//               </div>
//             )}

//             <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
//               <div><dt className="text-ink-soft">Placed</dt><dd className="font-medium">{formatDateTime(result.order.placedAt)}</dd></div>
//               {result.order.deliveredAt && <div><dt className="text-ink-soft">Delivered</dt><dd className="font-medium">{formatDateTime(result.order.deliveredAt)}</dd></div>}
//               <div><dt className="text-ink-soft">Order type</dt><dd className="font-medium">{result.order.orderType === 'manual_text' ? `${result.order.itemCount} item(s)` : 'Prescription'}</dd></div>
//               <div><dt className="text-ink-soft">Payment</dt><dd className="font-medium">Cash / UPI at delivery</dd></div>
//               {result.order.finalAmount !== null && result.order.status !== 'Cancelled' && <div><dt className="text-ink-soft">Bill amount</dt><dd className="font-medium">{formatRupees(result.order.finalAmount)}</dd></div>}
//             </dl>
//             <p className="mt-5 text-xs text-ink-soft">Questions? Call <a href={SUPPORT_PHONE_TEL} className="font-semibold text-brand-700">{SUPPORT_PHONE_DISPLAY}</a></p>
//           </motion.div>
//         )}
//         {result?.kind === 'not-found' && (
//           <motion.div key="nf" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="card flex gap-3 p-6" role="alert">
//             <SearchX className="h-6 w-6 shrink-0 text-ink-soft" aria-hidden />
//             <div className="text-sm">
//               <p className="font-semibold">{result.message}</p>
//               <p className="mt-1 text-ink-muted">Check the Order ID on your confirmation, or call <a href={SUPPORT_PHONE_TEL} className="font-semibold text-brand-700">{SUPPORT_PHONE_DISPLAY}</a>.</p>
//             </div>
//           </motion.div>
//         )}
//       </AnimatePresence>
//     </div>
//   );
// }

'use client';

import { useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { PackageSearch, SearchX, AlertCircle, ReceiptText } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Skeleton } from '@/components/ui/Skeleton';
import { ApiError, apiRequest } from '@/lib/api';
import { ORDER_ID_PATTERN, SUPPORT_PHONE_DISPLAY, SUPPORT_PHONE_TEL } from '@/lib/constants';
import { formatDateTime, formatRupees } from '@/lib/format';
import type { TrackedOrder } from '@/lib/types';
import { cn } from '@/lib/cn';

type Result = { kind: 'found'; order: TrackedOrder & { medicines?: any[], medicineSubtotal?: number, nonMedicineSubtotal?: number, deliveryCharge?: number, discount?: number } } | { kind: 'not-found'; message: string } | null;

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
      const res = await apiRequest<{ order: any }>('/orders/track', { method: 'POST', body: { orderId: id, mobileLast4: last4 } });
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
                {result.order.status === 'Pending' && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />}
                <span className={`relative inline-flex h-3.5 w-3.5 rounded-full ${result.order.status === 'Pending' ? 'bg-amber-500' : result.order.status === 'Cancelled' ? 'bg-red-500' : 'bg-brand-500'}`} />
              </span>
              <p className="font-display text-xl font-bold">
                {result.order.status === 'Pending' ? 'Processing' : result.order.status === 'Cancelled' ? 'Order Cancelled' : 'Delivered'}
              </p>
            </div>
            
            {/* CANCELLED MESSAGE BOX FOR CUSTOMER */}
            {result.order.status === 'Cancelled' && (
              <div className="mt-4 rounded-2xl bg-red-50 p-4 ring-1 ring-red-100">
                <p className="flex items-center gap-1.5 text-sm font-bold text-red-800"><AlertCircle className="h-4 w-4" /> Cancellation Reason</p>
                <p className="mt-1 text-sm text-red-700">{result.order.cancelReason}</p>
              </div>
            )}

            <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
              <div><dt className="text-ink-soft">Placed</dt><dd className="font-medium">{formatDateTime(result.order.placedAt)}</dd></div>
              {result.order.deliveredAt && <div><dt className="text-ink-soft">Delivered</dt><dd className="font-medium">{formatDateTime(result.order.deliveredAt)}</dd></div>}
              <div><dt className="text-ink-soft">Order type</dt><dd className="font-medium">{result.order.orderType === 'manual_text' ? `${result.order.itemCount} item(s)` : 'Prescription'}</dd></div>
              <div><dt className="text-ink-soft">Payment</dt><dd className="font-medium">Cash / UPI at delivery</dd></div>
            </dl>

            {/* NEW: Itemized Receipt Display */}
            {result.order.finalAmount !== null && result.order.status !== 'Cancelled' && (
              <div className="mt-6 rounded-2xl border border-brand-100 bg-surface overflow-hidden">
                <div className="bg-brand-50/50 px-4 py-3 flex items-center gap-2 border-b border-brand-100">
                  <ReceiptText className="w-4 h-4 text-brand-700" />
                  <h3 className="text-sm font-bold text-brand-900">Order Bill</h3>
                </div>
                
                {/* Medicines List */}
                {result.order.medicines && result.order.medicines.length > 0 && (
                  <ul className="divide-y divide-brand-100 px-4">
                    {result.order.medicines.map((med, idx) => (
                      <li key={idx} className="flex justify-between py-3 text-sm">
                        <div className={cn("pr-4", !med.isAvailable && "opacity-50 line-through")}>
                          <p className="font-semibold text-ink">{med.name}</p>
                          <p className="text-xs text-ink-muted">{med.quantity}</p>
                        </div>
                        <span className={cn("shrink-0 font-medium", !med.isAvailable ? "text-red-600 text-xs mt-0.5" : "text-ink")}>
                          {med.isAvailable ? formatRupees(med.price) : 'Out of Stock'}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Subtotals & Final Amount */}
                <div className="bg-white px-4 py-4 space-y-2 text-sm border-t border-brand-100">
                  <div className="flex justify-between">
                    <span className="text-ink-muted">Medicines</span>
                    <span className="font-medium">{formatRupees(result.order.medicineSubtotal ?? 0)}</span>
                  </div>
                  {Number(result.order.nonMedicineSubtotal) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-ink-muted">Other Items</span>
                      <span className="font-medium">{formatRupees(result.order.nonMedicineSubtotal ?? 0)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-ink-muted">Delivery</span>
                    <span className="font-medium">{result.order.deliveryCharge === 0 ? <span className="text-brand-700 font-bold">FREE</span> : formatRupees(result.order.deliveryCharge ?? 0)}</span>
                  </div>
                  {Number(result.order.discount) > 0 && (
                    <div className="flex justify-between text-brand-700">
                      <span className="font-medium">Discount</span>
                      <span className="font-bold">-{formatRupees(result.order.discount ?? 0)}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center pt-3 mt-3 border-t border-brand-100">
                    <span className="font-bold text-ink text-base">To Pay</span>
                    <span className="font-display font-bold text-brand-800 text-2xl">{formatRupees(result.order.finalAmount)}</span>
                  </div>
                </div>
              </div>
            )}

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
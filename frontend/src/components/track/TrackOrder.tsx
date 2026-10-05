//src/components/track/TrackOrder.tsx
'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useEffect, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { PackageSearch, AlertCircle, ReceiptText, ChevronDown, ChevronUp, History } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Skeleton } from '@/components/ui/Skeleton';
import { ApiError, apiRequest } from '@/lib/api';
import { ORDER_ID_PATTERN, SUPPORT_PHONE_DISPLAY, SUPPORT_PHONE_TEL } from '@/lib/constants';
import { formatDateTime, formatRupees } from '@/lib/format';
import { cn } from '@/lib/cn';

export function TrackOrder() {
  const params = useSearchParams();
  const urlId = (params.get('id') ?? '').toUpperCase().slice(0, 11);
  
  const [viewState, setViewState] = useState<'loading' | 'form' | 'list'>('loading');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [orders, setOrders] = useState<any[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form States
  const [orderId, setOrderId] = useState(urlId);
  const [phone, setPhone] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const savedIds = JSON.parse(localStorage.getItem('gmed_orders') || '[]');
    
    if (urlId && !savedIds.includes(urlId)) {
      setOrderId(urlId);
      setViewState('form');
    } else if (savedIds.length > 0) {
      fetchOrderDetails(savedIds);
    } else {
      setViewState('form');
    }
  }, [urlId]);

  const fetchOrderDetails = async (ids: string[]) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await apiRequest<{ orders: any[] }>('/orders/history', {
        method: 'POST',
        body: { orderIds: ids },
      });
      setOrders(res.orders);
      if (res.orders.length > 0 && !expandedId) {
        setExpandedId(res.orders[0].orderId);
      }
      setViewState('list');
    } catch {
      setViewState('form'); 
    }
  };

  const submitForm = async (event: FormEvent) => {
    event.preventDefault();
    const cleanId = orderId.trim().toUpperCase();
    const cleanPhone = phone.replace(/\D/g, '');
    
    if (!ORDER_ID_PATTERN.test(cleanId)) return setFormError('Enter a valid Order ID, e.g. GMED-X8P2K7');
    if (cleanPhone.length !== 10) return setFormError('Enter a valid 10-digit mobile number');
    
    setFormError('');
    setIsSubmitting(true);

    try {
      const res = await apiRequest<{ orderIds: string[] }>('/orders/recover', {
        method: 'POST',
        body: { mobileNumber: cleanPhone, orderId: cleanId },
      });

      localStorage.setItem('gmed_orders', JSON.stringify(res.orderIds));
      await fetchOrderDetails(res.orderIds);
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : 'Could not find history for these details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (viewState === 'loading') {
    return (
      <div className="mx-auto max-w-md space-y-5">
        <Skeleton className="h-40 w-full rounded-3xl" />
        <Skeleton className="h-40 w-full rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-5">
      
      {/* ---------------- STATE 1: THE FORM ---------------- */}
      {viewState === 'form' && (
        <form onSubmit={submitForm} className="card space-y-4 p-6 sm:p-8" noValidate>
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-50 text-brand-700">
              <PackageSearch className="h-5 w-5" aria-hidden />
            </span>
            <h1 className="font-display text-2xl font-bold">Track & Orders</h1>
          </div>
          
          <div className="rounded-xl bg-brand-50/50 p-4 text-sm text-ink-muted">
            Enter your mobile number and any past Order ID to track it and <strong>unlock your complete order history</strong>.
          </div>

          <Field
            label="10-digit Mobile Number"
            inputMode="numeric"
            maxLength={10}
            placeholder="e.g. 9876543210"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
          />
          <Field
            label="Order ID"
            placeholder="GMED-X8P2K7"
            autoCapitalize="characters"
            maxLength={11}
            className="[&_input]:font-mono [&_input]:uppercase"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value.toUpperCase())}
            error={formError}
          />
          
          <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
            {isSubmitting ? 'Verifying...' : 'Track & View History'}
          </Button>

          <p className="mt-4 text-center text-xs text-ink-soft leading-relaxed">
            Lost your Order ID? Don&apos;t worry! Place a new order when you need medicines. 
            Use your new Order ID here to automatically recover your entire past history!
          </p>
        </form>
      )}

      {/* ---------------- STATE 2: THE ORDER LIST ---------------- */}
      {viewState === 'list' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2 mb-2">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700">
                <History className="h-5 w-5" />
              </span>
              <h1 className="font-display text-xl font-bold">My Orders</h1>
            </div>
            <button 
              onClick={() => {
                localStorage.removeItem('gmed_orders');
                setViewState('form');
                setPhone('');
                setOrderId('');
              }} 
              className="text-xs font-semibold text-brand-700 hover:underline"
            >
              Track different number
            </button>
          </div>

          {orders.map((order) => {
            const isExpanded = expandedId === order.orderId;
            return (
              <div key={order.orderId} className="card overflow-hidden transition-all duration-200 border border-transparent hover:border-brand-100">
                
                {/* --- HEADER --- */}
                <button 
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : order.orderId)}
                  className="w-full text-left p-5 flex items-center justify-between bg-white"
                >
                  <div>
                    <p className="font-mono text-sm font-semibold text-ink-soft">{order.orderId}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${order.status === 'Pending' ? 'bg-amber-500' : order.status === 'Cancelled' ? 'bg-red-500' : 'bg-brand-500'}`} />
                      <p className="font-bold text-ink">
                        {order.status === 'Pending' ? 'Processing' : order.status}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-ink-muted">{formatDateTime(order.placedAt)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {order.finalAmount !== null && (
                      <span className="font-bold">{formatRupees(order.finalAmount)}</span>
                    )}
                    {isExpanded ? <ChevronUp className="h-5 w-5 text-ink-soft" /> : <ChevronDown className="h-5 w-5 text-ink-soft" />}
                  </div>
                </button>

                {/* --- EXPANDED DETAILS --- */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }} 
                      animate={{ height: 'auto', opacity: 1 }} 
                      exit={{ height: 0, opacity: 0 }} 
                      className="border-t border-brand-50 bg-brand-50/20"
                    >
                      <div className="p-5">
                        {order.status === 'Cancelled' && (
                          <div className="mb-4 rounded-2xl bg-red-50 p-4 ring-1 ring-red-100">
                            <p className="flex items-center gap-1.5 text-sm font-bold text-red-800"><AlertCircle className="h-4 w-4" /> Cancellation Reason</p>
                            <p className="mt-1 text-sm text-red-700">{order.cancelReason}</p>
                          </div>
                        )}

                        <dl className="grid grid-cols-2 gap-4 text-sm mb-5">
                          <div><dt className="text-ink-soft text-xs">Order Type</dt><dd className="font-medium mt-0.5">{order.orderType === 'manual_text' ? `${order.itemCount} item(s)` : 'Prescription'}</dd></div>
                          <div><dt className="text-ink-soft text-xs">Payment</dt><dd className="font-medium mt-0.5">Cash / UPI</dd></div>
                        </dl>

                        {order.finalAmount !== null && order.status !== 'Cancelled' && (
                          <div className="rounded-2xl border border-brand-100 bg-white overflow-hidden">
                            <div className="bg-brand-50/50 px-4 py-3 flex items-center gap-2 border-b border-brand-100">
                              <ReceiptText className="w-4 h-4 text-brand-700" />
                              <h3 className="text-sm font-bold text-brand-900">Order Bill</h3>
                            </div>
                            
                            {order.medicines?.length > 0 && (
                              <ul className="divide-y divide-brand-50 px-4">
                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                {order.medicines.map((med: any, idx: number) => (
                                  <li key={idx} className="flex justify-between py-3 text-sm">
                                    <div className={cn("pr-4", !med.isAvailable && "opacity-50 line-through")}>
                                      <p className="font-semibold text-ink leading-tight">{med.name}</p>
                                      <p className="text-xs text-ink-muted mt-0.5">{med.quantity}</p>
                                    </div>
                                    <span className={cn("shrink-0 font-medium", !med.isAvailable ? "text-red-600 text-xs mt-0.5" : "text-ink")}>
                                      {med.isAvailable ? formatRupees(med.price) : 'Out of Stock'}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            )}

                            <div className="bg-brand-50/10 px-4 py-4 space-y-2 text-sm border-t border-brand-100">
                              <div className="flex justify-between"><span className="text-ink-muted">Medicines</span><span className="font-medium">{formatRupees(order.medicineSubtotal ?? 0)}</span></div>
                              {Number(order.nonMedicineSubtotal) > 0 && (
                                <div className="flex justify-between"><span className="text-ink-muted">Other Items</span><span className="font-medium">{formatRupees(order.nonMedicineSubtotal ?? 0)}</span></div>
                              )}
                              <div className="flex justify-between"><span className="text-ink-muted">Delivery</span><span className="font-medium">{order.deliveryCharge === 0 ? <span className="text-brand-700 font-bold">FREE</span> : formatRupees(order.deliveryCharge ?? 0)}</span></div>
                              {Number(order.discount) > 0 && (
                                <div className="flex justify-between text-brand-700"><span className="font-medium">Discount</span><span className="font-bold">-{formatRupees(order.discount ?? 0)}</span></div>
                              )}
                              <div className="flex justify-between items-center pt-3 mt-3 border-t border-brand-100">
                                <span className="font-bold text-ink text-base">To Pay</span>
                                <span className="font-display font-bold text-brand-800 text-xl">{formatRupees(order.finalAmount)}</span>
                              </div>
                            </div>
                          </div>
                        )}
                        <p className="mt-5 text-xs text-center text-ink-soft">Need help? Call <a href={SUPPORT_PHONE_TEL} className="font-semibold text-brand-700">{SUPPORT_PHONE_DISPLAY}</a></p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
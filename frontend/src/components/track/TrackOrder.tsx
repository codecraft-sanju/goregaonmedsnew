//src/components/track/TrackOrder.tsx

'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { 
  ChevronLeft, HelpCircle, Smartphone, Hash, ArrowRight, FileText, 
  Check, CheckCircle2, CircleDashed, Pill, Wallet, ReceiptText, 
  Gift, FileImage, XCircle, AlertCircle, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { ApiError, apiRequest } from '@/lib/api';
import { ORDER_ID_PATTERN, SUPPORT_PHONE_TEL, GIFT } from '@/lib/constants';
import { formatDateTime, formatRupees } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { TrackedOrder } from '@/lib/types';

export function TrackOrder() {
  const params = useSearchParams();
  const urlId = (params.get('id') ?? '').toUpperCase().slice(0, 11);
  
  const [viewState, setViewState] = useState<'loading' | 'form' | 'list'>('loading');
  const [orders, setOrders] = useState<TrackedOrder[]>([]);
  // expandedId ab single order view dikhayega
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form States
  const [orderId, setOrderId] = useState(urlId);
  const [phone, setPhone] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchOrderDetails = useCallback(async (ids: string[]) => {
    try {
      const res = await apiRequest<{ orders: TrackedOrder[] }>('/orders/history', {
        method: 'POST',
        body: { orderIds: ids },
      });
      setOrders(res.orders);
      setViewState('list');
      
      // Agar URL me ID hai aur fetch ho gaya, toh direct wahi open karo
      if (urlId && res.orders.some(o => o.orderId === urlId)) {
        setExpandedId(urlId);
      }
    } catch {
      setViewState('form'); 
    }
  }, [urlId]);

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
  }, [urlId, fetchOrderDetails]);

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
      setFormError(error instanceof ApiError ? error.message : 'Could not find history.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const expandedOrder = orders.find(o => o.orderId === expandedId);

  // Loading State
  if (viewState === 'loading') {
    return (
      <div className="mx-auto max-w-md space-y-5">
        <Skeleton className="h-40 w-full rounded-3xl" />
      </div>
    );
  }

  // ==========================================
  // STATE 3: SINGLE ORDER DETAILS (Design 2)
  // ==========================================
  if (expandedOrder) {
    const order = expandedOrder;
    const isCancelled = order.status === 'Cancelled';
    const isDelivered = order.status === 'Delivered';
    const isBilled = order.finalAmount !== null;
    
    // Timeline logic
    const currentStep = isCancelled ? 0 : isDelivered ? 4 : isBilled ? 3 : 2;

    return (
      <div className="mx-auto max-w-md animate-in fade-in slide-in-from-right-4 duration-300">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <button onClick={() => setExpandedId(null)} className="grid h-10 w-10 place-items-center rounded-full bg-white shadow-sm hover:bg-brand-50">
            <ChevronLeft className="h-6 w-6 text-ink" />
          </button>
          <h2 className="text-lg font-bold">Track Order</h2>
          <a href={SUPPORT_PHONE_TEL} className="grid h-10 w-10 place-items-center rounded-full bg-white shadow-sm hover:bg-brand-50">
            <HelpCircle className="h-5 w-5 text-ink-muted" />
          </a>
        </div>

        {/* Top Info Card */}
        <div className="card relative overflow-hidden bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Order ID</p>
          <h1 className="mt-1 font-display text-2xl font-extrabold">{order.orderId}</h1>
          
          <div className="mt-3 flex items-center gap-2">
            <span className={cn(
              "inline-flex items-center rounded-full px-3 py-1 text-xs font-bold",
              isCancelled ? "bg-red-100 text-red-700" : "bg-[#e5f7ed] text-[#147a4a]"
            )}>
              {isCancelled ? 'Cancelled' : order.status === 'Pending' ? 'Order Received & Processing' : 'Delivered'}
            </span>
          </div>

          <div className="mt-4 flex items-center gap-4 text-xs font-medium text-ink-muted">
            <span className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> {order.orderType === 'manual_text' ? 'Text Order' : 'Prescription'}</span>
            <span className="flex items-center gap-1.5"><CircleDashed className="h-3.5 w-3.5" /> Placed {formatDateTime(order.placedAt)}</span>
          </div>

          {/* 3D Box Illustration (CSS Art) */}
          <div className="absolute right-0 top-0 h-28 w-28 opacity-40 md:opacity-100 pointer-events-none">
             <div className="absolute right-4 top-4 grid h-16 w-16 place-items-center rounded-xl bg-gradient-to-br from-brand-100 to-brand-50 shadow-sm border border-white">
                <div className="h-8 w-8 text-brand-600">📦</div>
             </div>
          </div>
        </div>

        {/* Timeline Progress */}
        {!isCancelled && (
          <div className="mt-8 px-4">
            <div className="relative flex justify-between">
              {/* Connecting Line */}
              <div className="absolute left-[10%] right-[10%] top-4 h-0.5 bg-brand-50 -z-10" />
              <div className="absolute left-[10%] top-4 h-0.5 bg-[#156253] transition-all duration-500 -z-10" style={{ width: `${(currentStep - 1) * 33.33}%` }} />
              
              {/* Steps */}
              {[
                { label: 'Order Received', step: 1 },
                { label: 'Pharmacy Processing', step: 2 },
                { label: 'Bill Prepared', step: 3 },
                { label: 'Delivered', step: 4 },
              ].map((s) => {
                const isActive = currentStep >= s.step;
                return (
                  <div key={s.step} className="flex flex-col items-center text-center w-1/4">
                    <div className={cn(
                      "grid h-8 w-8 place-items-center rounded-full border-[3px] transition-colors",
                      isActive ? "border-[#156253] bg-[#156253] text-white" : "border-white bg-brand-50 text-brand-200"
                    )}>
                      {isActive ? <Check className="h-4 w-4" strokeWidth={3} /> : <span className="h-2 w-2 rounded-full bg-brand-200" />}
                    </div>
                    <p className={cn("mt-2 text-[10px] font-semibold leading-tight px-1", isActive ? "text-ink" : "text-ink-soft")}>
                      {s.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Cancelled Banner */}
        {isCancelled && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl bg-red-50 p-4 ring-1 ring-inset ring-red-100">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <div>
              <p className="text-sm font-bold text-red-900">Order Cancelled</p>
              <p className="mt-1 text-xs text-red-700">{order.cancelReason || 'Your order has been cancelled.'}</p>
            </div>
          </div>
        )}

        {/* Order Summary & Bill */}
        {isBilled && !isCancelled && (
          <div className="card mt-8 overflow-hidden bg-white">
            <div className="flex items-center justify-between border-b border-brand-50 p-5">
              <h3 className="font-display text-lg font-bold">Order Summary</h3>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e5f7ed] px-3 py-1 text-xs font-bold text-[#147a4a]">
                <ReceiptText className="h-3.5 w-3.5" /> Bill ready
              </span>
            </div>
            
            <div className="p-5">
              {/* Medicine List */}
              <ul className="space-y-4">
                {(order.medicines || []).map((med, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-500 shadow-inner">
                      <Pill className="h-5 w-5" />
                    </div>
                    <div className="flex-1 pt-0.5">
                      <p className={cn("text-sm font-bold leading-tight", med.isAvailable === false && "text-ink-soft line-through")}>{med.name}</p>
                      <p className="mt-1 text-xs font-medium text-ink-muted">{med.quantity}</p>
                    </div>
                    <div className="pt-0.5">
                      {med.isAvailable === false ? (
                        <span className="rounded-md bg-red-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-red-600">Unavailable</span>
                      ) : (
                        <span className="text-sm font-bold">{formatRupees(med.price || 0)}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>

              {/* Bill Breakdown */}
              <div className="mt-6 space-y-2.5 border-t border-dashed border-brand-100 pt-5 text-sm font-medium text-ink-muted">
                <div className="flex justify-between"><p>Medicine subtotal</p><p className="text-ink">{formatRupees(order.medicineSubtotal || 0)}</p></div>
                {Number(order.nonMedicineSubtotal) > 0 && <div className="flex justify-between"><p>Other items</p><p className="text-ink">{formatRupees(order.nonMedicineSubtotal || 0)}</p></div>}
                <div className="flex justify-between"><p>Delivery charge</p><p className="text-ink">{order.deliveryCharge === 0 ? 'FREE' : formatRupees(order.deliveryCharge || 0)}</p></div>
                {Number(order.discount) > 0 && <div className="flex justify-between"><p>Discount</p><p className="text-brand-700">-{formatRupees(order.discount || 0)}</p></div>}
              </div>

              {/* Total */}
              <div className="mt-5 flex items-center justify-between border-t border-brand-100 pt-5">
                <p className="text-base font-extrabold text-ink">Total</p>
                <p className="text-xl font-extrabold text-ink">{formatRupees(order.finalAmount || 0)}</p>
              </div>

              {/* Payment Info */}
              <div className="mt-5 flex items-center gap-2 rounded-xl bg-[#eaf4f4] px-4 py-3 text-xs font-semibold text-[#1e786b]">
                <Wallet className="h-4 w-4" /> Pay at Delivery · Cash / UPI
              </div>
            </div>
          </div>
        )}

        {/* Free Gift Card */}
        {order.offerApplied && (
          <div className="card mt-4 flex items-center overflow-hidden bg-gradient-to-r from-[#fff5e6] to-[#ffebd6] p-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm p-1">
               {/* Small pure CSS gift replacement for img */}
               <Gift className="h-8 w-8 text-[#dfa442]" />
            </div>
            <div className="ml-3 flex-1">
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#b87c1c]">
                <Gift className="h-3 w-3" /> Free Gift
              </span>
              <h4 className="mt-1 text-sm font-bold text-ink">{GIFT.shortName}</h4>
              <p className="text-[11px] font-medium text-[#7a6441]">Included with this order</p>
            </div>
          </div>
        )}

        {/* Unbilled State Details Preview */}
        {!isBilled && !isCancelled && (
          <div className="card mt-8 flex items-center justify-between bg-surface p-5 ring-1 ring-inset ring-brand-50">
            <div className="flex items-center gap-3">
              <ReceiptText className="h-6 w-6 text-ink-muted" />
              <div>
                <p className="text-sm font-bold text-ink">Unbilled state (Preview)</p>
                <p className="text-xs font-medium text-ink-muted">Your order details will be updated soon.</p>
              </div>
            </div>
            <div className="flex flex-col items-end">
               <span className="text-[10px] font-semibold text-ink-soft">Total</span>
               <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-bold text-brand-800">Bill pending</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // STATE 1 & 2: RECOVER FORM & RECENT ORDERS
  // ==========================================
  return (
    <div className="mx-auto max-w-md space-y-10 animate-in fade-in duration-300">
      
      {/* --- FORM SECTION (Design 1 Top) --- */}
      <div>
        <h1 className="font-display text-[2rem] font-extrabold leading-[1.15] tracking-tight text-ink">Your Orders</h1>
        <p className="mt-1.5 text-sm text-ink-muted">Recover your previous GoregaonMeds orders</p>
        
        <form onSubmit={submitForm} className="card mt-6 space-y-4 bg-gradient-to-br from-[#e5f7ed] to-[#d3f0e0] p-6 shadow-sm" noValidate>
          <div>
            <h2 className="font-display text-lg font-bold text-ink">Recover Order History</h2>
            <p className="mt-1 text-xs text-[#4a6358] leading-relaxed">
              Enter your complete mobile number and one valid GoregaonMeds Order ID to view your orders.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-ink-muted"><Smartphone className="h-4 w-4" /></div>
              <input
                type="tel" inputMode="numeric" maxLength={10} placeholder="Mobile Number"
                value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                className="h-12 w-full rounded-2xl border-none bg-white py-0 pl-11 pr-4 text-[15px] font-medium placeholder:font-normal focus:ring-2 focus:ring-[#156253]"
              />
            </div>
            
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-ink-muted"><Hash className="h-4 w-4" /></div>
              <input
                type="text" placeholder="Order ID" maxLength={11}
                value={orderId} onChange={(e) => setOrderId(e.target.value.toUpperCase())}
                className="h-12 w-full rounded-2xl border-none bg-white py-0 pl-11 pr-4 text-[15px] font-medium uppercase placeholder:font-normal placeholder:normal-case focus:ring-2 focus:ring-[#156253]"
              />
            </div>
            <p className="text-[11px] text-[#4a6358] ml-1">Example: GMED-X8P2K7</p>
          </div>

          {formError && <p className="text-xs font-semibold text-red-600">{formError}</p>}
          
          <Button type="submit" size="lg" className="w-full bg-[#156253] hover:bg-[#0f4b3f]" loading={isSubmitting}>
            {isSubmitting ? 'Verifying...' : 'Recover Orders'} <ArrowRight className="h-4 w-4" />
          </Button>
        </form>
      </div>

      {/* --- LIST SECTION (Design 1 Bottom) --- */}
      {viewState === 'list' && orders.length > 0 && (
        <div className="pb-10">
          <h2 className="font-display text-xl font-bold text-ink">Recent Orders</h2>
          <div className="mt-4 space-y-3">
            {orders.map((order) => {
              const isPrescription = order.orderType === 'prescription_image';
              const isDelivered = order.status === 'Delivered';
              const isCancelled = order.status === 'Cancelled';

              return (
                <button 
                  key={order.orderId}
                  onClick={() => setExpandedId(order.orderId)}
                  className="card flex w-full items-center justify-between bg-white p-4 text-left transition-transform hover:scale-[1.01]"
                >
                  <div className="flex items-center gap-3">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#e5f7ed] text-[#147a4a]">
                      {isPrescription ? <FileImage className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                    </div>
                    <div>
                      <h3 className="font-mono text-sm font-bold text-ink">{order.orderId}</h3>
                      <p className="mt-0.5 text-xs text-ink-muted">{formatDateTime(order.placedAt).split(',')[0]} · {isPrescription ? 'Rx' : `${order.itemCount} items`}</p>
                      <div className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-surface px-1.5 py-0.5 text-[10px] font-medium text-ink-soft">
                        {isPrescription ? <FileImage className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                        {isPrescription ? 'Prescription' : 'Text Order'}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5">
                    {/* Status Pill */}
                    <span className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                      isCancelled ? "bg-red-50 text-red-600" : isDelivered ? "bg-[#e5f7ed] text-[#147a4a]" : "bg-amber-50 text-amber-700"
                    )}>
                      {isCancelled ? <XCircle className="h-3 w-3" /> : isDelivered ? <CheckCircle2 className="h-3 w-3" /> : <CircleDashed className="h-3 w-3" />}
                      {order.status}
                    </span>
                    
                    {/* Amount */}
                    <div className="text-right">
                      {order.finalAmount !== null ? (
                        <>
                          <p className="font-display text-sm font-bold text-ink">{formatRupees(order.finalAmount)}</p>
                          <p className="text-[9px] font-medium text-ink-soft">Pay at Delivery</p>
                        </>
                      ) : (
                        <p className="font-medium text-ink-soft text-xs mt-1">Bill pending</p>
                      )}
                    </div>
                  </div>
                  
                  <ChevronRight className="ml-2 h-4 w-4 shrink-0 text-ink-soft" />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
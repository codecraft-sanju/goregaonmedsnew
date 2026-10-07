'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { 
  ChevronLeft, HelpCircle, Smartphone, Hash, ArrowRight, FileText, 
  Check, CheckCircle2, CircleDashed, Pill, Wallet, ReceiptText, 
  Gift, FileImage, XCircle, AlertCircle, ChevronRight, Package
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
      <div className="mx-auto max-w-lg space-y-5 px-4 sm:px-0">
        <Skeleton className="h-[200px] w-full rounded-3xl" />
        <Skeleton className="h-[400px] w-full rounded-3xl" />
      </div>
    );
  }

  // ==========================================
  // STATE 3: SINGLE ORDER DETAILS
  // ==========================================
  if (expandedOrder) {
    const order = expandedOrder;
    const isCancelled = order.status === 'Cancelled';
    const isDelivered = order.status === 'Delivered';
    const isBilled = order.finalAmount !== null;
    
    // Timeline logic
    const currentStep = isCancelled ? 0 : isDelivered ? 4 : isBilled ? 3 : 2;
    // Mathematically locks the progress line exactly between the center of Step 1 and Step 4
    const progressWidth = `${((Math.max(1, currentStep) - 1) / 3) * 75}%`;

    return (
      <div className="mx-auto max-w-lg px-4 sm:px-0 animate-in fade-in slide-in-from-right-4 duration-300 pb-12">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <button 
            onClick={() => setExpandedId(null)} 
            className="grid h-11 w-11 place-items-center rounded-full bg-white shadow-sm border border-gray-100 text-ink transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#156253] focus:ring-offset-2"
            aria-label="Go back"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <h2 className="text-xl font-display font-bold tracking-tight text-ink">Track Order</h2>
          <a 
            href={SUPPORT_PHONE_TEL} 
            className="grid h-11 w-11 place-items-center rounded-full bg-white shadow-sm border border-gray-100 text-ink-muted transition-colors hover:bg-[#e5f7ed] hover:text-[#156253] focus:outline-none focus:ring-2 focus:ring-[#156253] focus:ring-offset-2"
            aria-label="Support"
          >
            <HelpCircle className="h-5 w-5" />
          </a>
        </div>

        {/* Top Info Card */}
        <div className="relative overflow-hidden rounded-3xl bg-white p-6 shadow-sm border border-brand-100/50">
          <p className="text-[11px] font-bold uppercase tracking-widest text-ink-soft">Order ID</p>
          <h1 className="mt-1.5 font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{order.orderId}</h1>
          
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className={cn(
              "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-bold shadow-sm",
              isCancelled ? "bg-red-50 text-red-700 border border-red-100" : 
              isDelivered ? "bg-[#e5f7ed] text-[#147a4a] border border-[#bce8cd]" : 
              "bg-brand-50 text-brand-700 border border-brand-100"
            )}>
              {isCancelled ? 'Cancelled' : order.status === 'Pending' ? 'Received & Processing' : order.status}
            </span>
          </div>

          <div className="mt-5 flex items-center gap-5 text-sm font-medium text-ink-muted">
            <span className="flex items-center gap-2">
              <FileText className="h-4 w-4 opacity-70" /> 
              {order.orderType === 'manual_text' ? 'Text Order' : 'Prescription'}
            </span>
            <span className="flex items-center gap-2">
              <CircleDashed className="h-4 w-4 opacity-70" /> 
              {formatDateTime(order.placedAt)}
            </span>
          </div>

          <div className="absolute -right-4 -top-4 h-32 w-32 opacity-20 pointer-events-none md:opacity-40">
            <div className="absolute right-8 top-8 grid h-20 w-20 rotate-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-200 to-brand-100 shadow-lg">
              <Package className="h-10 w-10 text-brand-700" />
            </div>
          </div>
        </div>

        {/* Timeline Progress */}
        {!isCancelled && (
          <div className="mt-8 rounded-3xl bg-white p-6 sm:p-8 shadow-sm border border-brand-100/50">
            <div className="relative flex justify-between items-start w-full">
              
              {/* Thick Background Line */}
              <div className="absolute left-[12.5%] right-[12.5%] top-5 h-1.5 -translate-y-1/2 rounded-full bg-gray-100" />
              
              {/* Thick Active Colored Line */}
              <div 
                className="absolute left-[12.5%] top-5 h-1.5 -translate-y-1/2 rounded-full bg-[#156253] transition-all duration-700 ease-in-out" 
                style={{ width: progressWidth }} 
              />
              
              {/* Timeline Steps */}
              {[
                { label: 'Received', step: 1 },
                { label: 'Processing', step: 2 },
                { label: 'Billed', step: 3 },
                { label: 'Delivered', step: 4 },
              ].map((s) => {
                const isActive = currentStep >= s.step;
                const isCurrent = currentStep === s.step;
                return (
                  <div key={s.step} className="relative z-10 flex w-1/4 flex-col items-center text-center">
                    <div className={cn(
                      "grid h-10 w-10 place-items-center rounded-full border-4 transition-all duration-500",
                      isActive ? "border-white bg-[#156253] text-white shadow-md shadow-[#156253]/20" : "border-white bg-gray-100 text-gray-400",
                      isCurrent && "ring-4 ring-brand-50"
                    )}>
                      {isActive ? <Check className="h-5 w-5" strokeWidth={3} /> : <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />}
                    </div>
                    <p className={cn(
                      "mt-3 text-[11px] sm:text-xs font-bold leading-tight tracking-tight transition-colors", 
                      isActive ? "text-ink" : "text-gray-400"
                    )}>
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
          <div className="mt-6 flex items-start gap-4 rounded-3xl bg-red-50 p-5 border border-red-100 shadow-sm">
            <AlertCircle className="mt-0.5 h-6 w-6 shrink-0 text-red-600" />
            <div>
              <p className="text-base font-bold text-red-900">Order Cancelled</p>
              <p className="mt-1.5 text-sm leading-relaxed text-red-700">{order.cancelReason || 'Your order has been cancelled by the system or upon request.'}</p>
            </div>
          </div>
        )}

        {/* Order Summary & Bill */}
        {isBilled && !isCancelled && (
          <div className="mt-8 overflow-hidden rounded-3xl bg-white shadow-sm border border-brand-100/50">
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 p-6">
              <h3 className="font-display text-lg font-bold text-ink">Order Summary</h3>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e5f7ed] px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#147a4a] border border-[#bce8cd]">
                <ReceiptText className="h-3.5 w-3.5" /> Bill ready
              </span>
            </div>
            
            <div className="p-6">
              {/* Medicine List */}
              <ul className="space-y-5">
                {(order.medicines || []).map((med, idx) => (
                  <li key={idx} className="flex items-start gap-4">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-[#156253]">
                      <Pill className="h-5 w-5" />
                    </div>
                    <div className="flex-1 pt-1">
                      <p className={cn("text-sm font-bold leading-tight text-ink", med.isAvailable === false && "text-ink-soft line-through decoration-2")}>{med.name}</p>
                      <p className="mt-1 text-xs font-medium text-ink-muted">Qty: {med.quantity}</p>
                    </div>
                    <div className="pt-1 text-right">
                      {med.isAvailable === false ? (
                        <span className="rounded-md bg-red-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-red-600 border border-red-100">Unavailable</span>
                      ) : (
                        <span className="text-sm font-extrabold text-ink">{formatRupees(med.price || 0)}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>

              {/* Bill Breakdown */}
              <div className="mt-8 space-y-3 border-t border-dashed border-gray-200 pt-6 text-sm font-medium text-ink-muted">
                <div className="flex justify-between items-center"><p>Medicine subtotal</p><p className="font-semibold text-ink">{formatRupees(order.medicineSubtotal || 0)}</p></div>
                {Number(order.nonMedicineSubtotal) > 0 && <div className="flex justify-between items-center"><p>Other items</p><p className="font-semibold text-ink">{formatRupees(order.nonMedicineSubtotal || 0)}</p></div>}
                <div className="flex justify-between items-center"><p>Delivery charge</p><p className="font-semibold text-ink">{order.deliveryCharge === 0 ? 'FREE' : formatRupees(order.deliveryCharge || 0)}</p></div>
                {Number(order.discount) > 0 && <div className="flex justify-between items-center"><p>Discount</p><p className="font-bold text-[#147a4a]">-{formatRupees(order.discount || 0)}</p></div>}
              </div>

              {/* Total */}
              <div className="mt-6 flex items-end justify-between border-t border-gray-100 pt-6">
                <div>
                  <p className="text-sm font-semibold text-ink-muted">Grand Total</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-ink-soft">Incl. of all taxes</p>
                </div>
                <p className="text-2xl font-display font-extrabold tracking-tight text-[#156253]">{formatRupees(order.finalAmount || 0)}</p>
              </div>

              {/* Payment Info */}
              <div className="mt-6 flex items-center justify-center gap-2 rounded-2xl bg-[#f4fbf9] p-4 text-xs font-bold text-[#156253] border border-[#e5f7ed]">
                <Wallet className="h-4 w-4" /> Pay at Delivery · Cash / UPI accepted
              </div>
            </div>
          </div>
        )}

        {/* Free Gift Card */}
        {order.offerApplied && (
          <div className="mt-4 flex items-center overflow-hidden rounded-3xl bg-gradient-to-r from-[#fff5e6] to-[#ffebd6] p-5 shadow-sm border border-[#fbe0c3]">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm p-1">
               <Gift className="h-8 w-8 text-[#dfa442]" />
            </div>
            <div className="ml-4 flex-1">
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#b87c1c]">
                <Gift className="h-3.5 w-3.5" /> Free Gift Unlocked
              </span>
              <h4 className="mt-1 text-sm font-extrabold text-ink">{GIFT.shortName}</h4>
              <p className="mt-0.5 text-xs font-medium text-[#7a6441]">Included safely with your delivery</p>
            </div>
          </div>
        )}

        {/* Unbilled State Details Preview */}
        {!isBilled && !isCancelled && (
          <div className="mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl bg-gray-50 p-6 border border-gray-200 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-white shadow-sm shrink-0">
                <ReceiptText className="h-5 w-5 text-ink-muted" />
              </div>
              <div>
                <p className="text-sm font-bold text-ink">Bill Verification Pending</p>
                <p className="mt-1 text-xs font-medium leading-relaxed text-ink-muted">Our pharmacists are reviewing your items. Pricing details will appear here shortly.</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center sm:flex-col sm:items-end gap-2">
               <span className="rounded-full bg-white border border-gray-200 px-4 py-2 text-xs font-bold text-ink-muted shadow-sm">Total pending</span>
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
    <div className="mx-auto max-w-lg space-y-12 px-4 sm:px-0 animate-in fade-in duration-300 pb-12">
      
      {/* --- FORM SECTION --- */}
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Your Orders</h1>
        <p className="mt-2 text-base text-ink-muted">Access and track your previous prescriptions</p>
        
        <form onSubmit={submitForm} className="mt-8 space-y-5 rounded-3xl bg-white p-6 shadow-sm border border-brand-100/60 sm:p-8" noValidate>
          <div>
            <h2 className="font-display text-lg font-bold text-ink">Recover History</h2>
            <p className="mt-1.5 text-sm text-ink-muted leading-relaxed">
              Enter your mobile number and any valid Order ID to sync your history.
            </p>
          </div>

          <div className="space-y-4 pt-2">
            <div className="relative group">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400 group-focus-within:text-[#156253] transition-colors"><Smartphone className="h-5 w-5" /></div>
              <input
                type="tel" inputMode="numeric" maxLength={10} placeholder="Mobile Number"
                value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                className="h-14 w-full rounded-2xl border border-gray-200 bg-gray-50/50 py-0 pl-12 pr-4 text-base font-semibold text-ink placeholder:font-normal focus:border-[#156253] focus:bg-white focus:ring-4 focus:ring-[#156253]/10 transition-all outline-none"
              />
            </div>
            
            <div className="relative group">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400 group-focus-within:text-[#156253] transition-colors"><Hash className="h-5 w-5" /></div>
              <input
                type="text" placeholder="Order ID (e.g. GMED-X8P2K7)" maxLength={11}
                value={orderId} onChange={(e) => setOrderId(e.target.value.toUpperCase())}
                className="h-14 w-full rounded-2xl border border-gray-200 bg-gray-50/50 py-0 pl-12 pr-4 text-base font-semibold uppercase text-ink placeholder:font-normal placeholder:normal-case focus:border-[#156253] focus:bg-white focus:ring-4 focus:ring-[#156253]/10 transition-all outline-none"
              />
            </div>
          </div>

          {formError && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-600">
              <AlertCircle className="h-4 w-4 shrink-0" /> {formError}
            </div>
          )}
          
          <Button type="submit" size="lg" className="h-14 w-full rounded-2xl bg-[#156253] text-base font-bold shadow-md shadow-[#156253]/20 hover:bg-[#0f4b3f] hover:shadow-lg hover:shadow-[#156253]/30 transition-all" loading={isSubmitting}>
            {isSubmitting ? 'Verifying...' : 'Find My Orders'} <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </form>
      </div>

      {/* --- LIST SECTION --- */}
      {viewState === 'list' && orders.length > 0 && (
        <div>
          <h2 className="font-display text-xl font-bold text-ink">Recent Deliveries</h2>
          <div className="mt-5 space-y-4">
            {orders.map((order) => {
              const isPrescription = order.orderType === 'prescription_image';
              const isDelivered = order.status === 'Delivered';
              const isCancelled = order.status === 'Cancelled';

              return (
                <button 
                  key={order.orderId}
                  onClick={() => setExpandedId(order.orderId)}
                  className="group flex w-full items-center justify-between rounded-3xl bg-white p-5 text-left shadow-sm border border-brand-100/50 transition-all hover:border-brand-300 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-brand-50"
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "grid h-14 w-14 shrink-0 place-items-center rounded-2xl transition-colors",
                      isDelivered ? "bg-[#e5f7ed] text-[#147a4a]" : isCancelled ? "bg-red-50 text-red-600" : "bg-brand-50 text-[#156253]"
                    )}>
                      {isPrescription ? <FileImage className="h-6 w-6" /> : <FileText className="h-6 w-6" />}
                    </div>
                    <div>
                      <h3 className="font-display text-base font-bold text-ink">{order.orderId}</h3>
                      <p className="mt-1 text-xs font-medium text-ink-muted">{formatDateTime(order.placedAt).split(',')[0]} · {isPrescription ? 'Prescription' : `${order.itemCount} items`}</p>
                      
                      <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-gray-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-ink-soft">
                        <span className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          isCancelled ? "bg-red-500" : isDelivered ? "bg-[#147a4a]" : "bg-amber-500 animate-pulse"
                        )} />
                        {order.status}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 text-right pl-2">
                    {order.finalAmount !== null ? (
                      <>
                        <p className="font-display text-base font-extrabold text-ink">{formatRupees(order.finalAmount)}</p>
                        <p className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">Total</p>
                      </>
                    ) : (
                       <p className="rounded-full bg-gray-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-ink-soft">Computing</p>
                    )}
                    <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-gray-300 transition-transform group-hover:translate-x-1 group-hover:text-[#156253]" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
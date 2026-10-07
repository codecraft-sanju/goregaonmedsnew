// src/components/profile/ProfileHistory.tsx
'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Smartphone, Hash, ArrowRight, FileText, FileImage, CheckCircle2, CircleDashed, XCircle, ChevronRight, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { apiRequest } from '@/lib/api';
import { formatDateTime, formatRupees } from '@/lib/format';
import { ORDER_ID_PATTERN } from '@/lib/constants';
import { cn } from '@/lib/cn';

type OrderHistoryItem = {
  orderId: string;
  status: string;
  orderType: string;
  itemCount: number;
  placedAt: string;
  finalAmount: number | null;
};

export function ProfileHistory() {
  const router = useRouter();
  const [view, setView] = useState<'loading' | 'history' | 'recovery'>('loading');
  const [orders, setOrders] = useState<OrderHistoryItem[]>([]);
  
  // Recovery Form State
  const [mobile, setMobile] = useState('');
  const [recoverId, setRecoverId] = useState('');
  const [recLoading, setRecLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setView('loading');
    try {
      const savedIds = JSON.parse(localStorage.getItem('gmed_orders') || '[]');
      if (!savedIds || savedIds.length === 0) {
        setView('recovery');
        return;
      }
      
      const res = await apiRequest<{ orders: OrderHistoryItem[] }>('/orders/history', {
        method: 'POST',
        body: { orderIds: savedIds }
      });
      
      if (res.orders && res.orders.length > 0) {
        setOrders(res.orders);
        setView('history');
      } else {
        setView('recovery');
      }
    } catch (err) {
      console.error(err);
      setView('recovery');
    }
  };

  const handleRecovery = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (mobile.length !== 10) return setError('Enter a valid 10-digit mobile number');
    if (!ORDER_ID_PATTERN.test(recoverId.toUpperCase())) return setError('Enter a valid Order ID (e.g. GMED-XXXXX)');

    setRecLoading(true);
    try {
      const res = await apiRequest<{ orderIds: string[] }>('/orders/recover', {
        method: 'POST',
        body: { mobileNumber: mobile, orderId: recoverId.toUpperCase() }
      });
      
      if (res.orderIds && res.orderIds.length > 0) {
        localStorage.setItem('gmed_orders', JSON.stringify(res.orderIds));
        await loadHistory();
      }
    } catch (err: any) {
      setError(err.message || 'Could not recover orders. Please check your details.');
    } finally {
      setRecLoading(false);
    }
  };

  // Loading Skeleton
  if (view === 'loading') {
    return (
      <div className="mx-auto max-w-md space-y-4">
        <Skeleton className="h-40 w-full rounded-3xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  // Helper component for the form (used in both states)
  const RecoveryForm = () => (
    <form onSubmit={handleRecovery} className="card mt-6 space-y-4 bg-gradient-to-br from-[#e5f7ed] to-[#d3f0e0] p-6 shadow-sm" noValidate>
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
            value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
            className="h-12 w-full rounded-2xl border-none bg-white py-0 pl-11 pr-4 text-[15px] font-medium placeholder:font-normal focus:ring-2 focus:ring-[#156253]"
          />
        </div>
        
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-ink-muted"><Hash className="h-4 w-4" /></div>
          <input
            type="text" placeholder="Order ID" maxLength={11}
            value={recoverId} onChange={(e) => setRecoverId(e.target.value.toUpperCase())}
            className="h-12 w-full rounded-2xl border-none bg-white py-0 pl-11 pr-4 text-[15px] font-medium uppercase placeholder:font-normal placeholder:normal-case focus:ring-2 focus:ring-[#156253]"
          />
        </div>
        <p className="text-[11px] text-[#4a6358] ml-1">Example: GMED-X8P2K7</p>
      </div>

      {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
      
      <Button type="submit" size="lg" className="w-full bg-[#156253] hover:bg-[#0f4b3f]" loading={recLoading}>
        {recLoading ? 'Recovering...' : 'Recover Orders'} <ArrowRight className="h-4 w-4" />
      </Button>
    </form>
  );

  return (
    <div className="mx-auto max-w-md space-y-10 animate-in fade-in duration-300">
      
      {/* Header Area */}
      <div>
        <h1 className="font-display text-[2rem] font-extrabold leading-[1.15] tracking-tight text-ink">Your Orders</h1>
        <p className="mt-1.5 text-sm text-ink-muted">Recover your previous GoregaonMeds orders</p>
        
        {/* Always show the form at the top */}
        <RecoveryForm />
      </div>

      {/* History List */}
      {view === 'history' && orders.length > 0 && (
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
                  onClick={() => router.push(`/track?id=${order.orderId}`)}
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

      {/* Fallback info when no history */}
      {view === 'recovery' && (
        <div className="mt-6 flex items-start gap-3 rounded-2xl bg-brand-50/50 p-4 ring-1 ring-inset ring-brand-100">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
          <div>
            <p className="text-sm font-bold text-brand-900">No orders found on this device</p>
            <p className="mt-1 text-xs text-ink-muted">Enter your details above to recover your past order history, or place a new order to get started.</p>
          </div>
        </div>
      )}
    </div>
  );
}
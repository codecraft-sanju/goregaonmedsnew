//src/components/profile/ProfileHistory.tsx 
'use client';

import { useState, useEffect, type FormEvent } from 'react';
import Link from 'next/link';
import { AlertCircle, History, RefreshCw, ShoppingBag, ReceiptText, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Skeleton } from '@/components/ui/Skeleton';
import { apiRequest } from '@/lib/api';
import { formatDateTime, formatRupees } from '@/lib/format';
import { ORDER_ID_PATTERN } from '@/lib/constants';
import { cn } from '@/lib/cn';

type OrderHistoryItem = {
  orderId: string;
  status: string;
  statusLabel: string;
  orderType: string;
  itemCount: number;
  placedAt: string;
  deliveredAt: string | null;
  finalAmount: number | null;
  // New fields for inline receipt
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  medicines?: any[];
  medicineSubtotal?: number;
  nonMedicineSubtotal?: number;
  deliveryCharge?: number;
  discount?: number;
  cancelReason?: string;
};

export function ProfileHistory() {
  const [view, setView] = useState<'loading' | 'history' | 'recovery'>('loading');
  const [orders, setOrders] = useState<OrderHistoryItem[]>([]);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message || 'Could not recover orders. Please check your details.');
    } finally {
      setRecLoading(false);
    }
  };

  const toggleOrder = (id: string) => {
    setExpandedOrderId(expandedOrderId === id ? null : id);
  };

  if (view === 'loading') {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="flex items-center gap-3 mb-6">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-50 text-brand-700"><History className="h-5 w-5" /></span>
          <h1 className="font-display text-2xl font-bold">My Orders</h1>
        </div>
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full rounded-3xl" />)}
      </div>
    );
  }

  if (view === 'history') {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-50 text-brand-700"><History className="h-5 w-5" /></span>
            <h1 className="font-display text-2xl font-bold">My Orders</h1>
          </div>
          <Link href="/order" className="rounded-xl bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-100">
            + New Order
          </Link>
        </div>

        <div className="space-y-4">
          {orders.map((order) => {
            const isExpanded = expandedOrderId === order.orderId;
            return (
              <div key={order.orderId} className="card p-0 transition hover:shadow-lift border border-transparent hover:border-brand-100 overflow-hidden">
                <div className="p-5 sm:p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-mono text-sm font-bold text-ink">{order.orderId}</p>
                      <p className="mt-1 text-xs text-ink-muted">{formatDateTime(order.placedAt)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        order.status === 'Pending' ? "bg-amber-100 text-amber-800" :
                        order.status === 'Delivered' ? "bg-green-100 text-green-800" :
                        "bg-red-100 text-red-800"
                      )}>
                        {order.statusLabel}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-brand-50 pt-4">
                    <div className="text-sm">
                      <p className="text-ink-soft">
                        {order.orderType === 'manual_text' ? `${order.itemCount} Items` : 'Prescription Order'}
                      </p>
                      {order.finalAmount !== null && order.status !== 'Cancelled' && (
                        <p className="mt-0.5 font-bold text-ink">{formatRupees(order.finalAmount)}</p>
                      )}
                    </div>
                    
                    <button 
                      onClick={() => toggleOrder(order.orderId)}
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-surface px-4 text-sm font-semibold text-brand-700 ring-1 ring-inset ring-brand-200 transition hover:bg-brand-50 hover:ring-brand-300"
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      {isExpanded ? 'Hide Details' : 'View Details'}
                    </button>
                  </div>
                </div>

                {/* INLINE RECEIPT DETAILS */}
                {isExpanded && (
                  <div className="border-t border-brand-100 bg-surface">
                    {order.status === 'Cancelled' && order.cancelReason && (
                      <div className="m-4 rounded-xl bg-red-50 p-4 ring-1 ring-red-100">
                        <p className="flex items-center gap-1.5 text-sm font-bold text-red-800"><AlertCircle className="h-4 w-4" /> Cancellation Reason</p>
                        <p className="mt-1 text-sm text-red-700">{order.cancelReason}</p>
                      </div>
                    )}

                    {order.finalAmount !== null && order.status !== 'Cancelled' && (
                      <div className="m-4 rounded-xl border border-brand-100 bg-white overflow-hidden">
                        <div className="bg-brand-50/50 px-4 py-3 flex items-center gap-2 border-b border-brand-100">
                          <ReceiptText className="w-4 h-4 text-brand-700" />
                          <h3 className="text-sm font-bold text-brand-900">Order Bill</h3>
                        </div>
                        
                        {order.medicines && order.medicines.length > 0 && (
                          <ul className="divide-y divide-brand-100 px-4">
                            {order.medicines.map((med, idx) => (
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

                        <div className="bg-brand-50/30 px-4 py-4 space-y-2 text-sm border-t border-brand-100">
                          <div className="flex justify-between">
                            <span className="text-ink-muted">Medicines</span>
                            <span className="font-medium">{formatRupees(order.medicineSubtotal ?? 0)}</span>
                          </div>
                          {Number(order.nonMedicineSubtotal) > 0 && (
                            <div className="flex justify-between">
                              <span className="text-ink-muted">Other Items</span>
                              <span className="font-medium">{formatRupees(order.nonMedicineSubtotal ?? 0)}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-ink-muted">Delivery</span>
                            <span className="font-medium">{order.deliveryCharge === 0 ? <span className="text-brand-700 font-bold">FREE</span> : formatRupees(order.deliveryCharge ?? 0)}</span>
                          </div>
                          {Number(order.discount) > 0 && (
                            <div className="flex justify-between text-brand-700">
                              <span className="font-medium">Discount</span>
                              <span className="font-bold">-{formatRupees(order.discount ?? 0)}</span>
                            </div>
                          )}
                          
                          <div className="flex justify-between items-center pt-3 mt-3 border-t border-brand-100">
                            <span className="font-bold text-ink text-base">Total Paid / To Pay</span>
                            <span className="font-display font-bold text-brand-800 text-xl">{formatRupees(order.finalAmount)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // RECOVERY VIEW (Zero-Friction Fallback)
  return (
    <div className="mx-auto max-w-md space-y-6">
      <form onSubmit={handleRecovery} className="card space-y-5 p-6 sm:p-8" noValidate>
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-50 text-brand-700"><RefreshCw className="h-5 w-5" /></span>
          <h1 className="font-display text-2xl font-bold">Recover History</h1>
        </div>
        
        <p className="text-sm text-ink-muted leading-relaxed">
          It looks like you are on a new device or cleared your browser. Enter any of your past Order IDs to restore your full order history instantly.
        </p>

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-inset ring-red-100">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <Field
            label="Mobile Number"
            inputMode="numeric"
            maxLength={10}
            placeholder="9876543210"
            value={mobile}
            onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
          />
          <Field
            label="Any Past Order ID"
            placeholder="GMED-X8P2K7"
            autoCapitalize="characters"
            maxLength={11}
            className="[&_input]:font-mono [&_input]:uppercase"
            value={recoverId}
            onChange={(e) => setRecoverId(e.target.value.toUpperCase())}
          />
        </div>

        <Button type="submit" size="lg" className="w-full" loading={recLoading}>
          {recLoading ? 'Recovering...' : 'Restore My History'}
        </Button>
      </form>

      <div className="card p-6 sm:p-8 bg-brand-50/50 border border-brand-100">
        <div className="flex items-start gap-3">
          <ShoppingBag className="h-5 w-5 shrink-0 text-brand-600 mt-0.5" />
          <div>
            <h3 className="font-bold text-brand-900">Lost your Order ID?</h3>
            <p className="mt-2 text-sm text-ink-muted leading-relaxed">
              Don&apos;t worry! Just place a new order when you need medicines. Once successful, you can use your <strong>new Order ID</strong> here to unlock your entire past order history!
            </p>
            <Link href="/order" className="mt-4 inline-flex h-10 items-center justify-center rounded-xl bg-brand-700 px-5 text-sm font-semibold text-white shadow-lift transition hover:bg-brand-800">
              Place a New Order
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
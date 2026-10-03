// OrderCard.tsx
'use client';

import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { BellOff, ExternalLink, Gift, MapPin, Phone, X, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { cloudinaryThumb, formatDateTime, formatMobile, formatRupees } from '@/lib/format';
import { cn } from '@/lib/cn';
import { apiRequest } from '@/lib/api';
import type { AdminOrder } from '@/lib/types';
import { BillingPanel } from './BillingPanel';
import { Button } from '@/components/ui/Button'; 
import { useToast } from '@/components/ui/Toast'; 

interface Props {
  order: AdminOrder;
  deliveryCharge: number;
  onUpdated: (order: AdminOrder) => void;
  onDelivered: (order: AdminOrder) => void;
}

const CANCEL_REASONS = [
  'Medicine Out of Stock',
  'Delivery partner unavailable right now',
  'Incomplete or Invalid Prescription',
  'Out of delivery coverage area',
  'Other (Custom Reason)'
];

export function OrderCard({ order, deliveryCharge, onUpdated, onDelivered }: Props) {
  const pending = order.status === 'Pending';
  const cancelled = order.status === 'Cancelled';
  const toast = useToast();
  
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReasonType, setCancelReasonType] = useState(CANCEL_REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  const handleCancelOrder = async () => {
    const finalReason = cancelReasonType === 'Other (Custom Reason)' ? customReason : cancelReasonType;
    if (!finalReason.trim()) {
      toast.error('Please provide a cancellation reason');
      return;
    }

    setIsCancelling(true);
    try {
      const res = await apiRequest<{ order: AdminOrder }>(`/admin/orders/${order.id}/cancel`, {
        method: 'PATCH',
        body: { cancelReason: finalReason.trim() }
      });
      onUpdated(res.order);
      setShowCancelModal(false);
      toast.success('Order cancelled successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not cancel order');
    } finally {
      setIsCancelling(false);
    }
  };

  // Pre-filled WhatsApp message for cancelled order
  const whatsappMessage = encodeURIComponent(
    `Hi ${order.customerName},\n\nUnfortunately, your GoregaonMeds order #${order.orderId} had to be cancelled.\n\nReason: ${order.cancelReason}\n\nWe apologize for the inconvenience.`
  );
  const whatsappLink = `https://wa.me/91${order.mobileNumber}?text=${whatsappMessage}`;

  return (
    <>
      <motion.article layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} className="card p-5" aria-labelledby={`${order.id}-title`}>
        <header className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 id={`${order.id}-title`} className="font-mono text-lg font-bold tracking-wide text-brand-800">{order.orderId}</h3>
            <p className="text-xs text-ink-soft">{formatDateTime(order.createdAt)}</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {!order.telegramNotificationSent && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gift-50 px-2.5 py-1 text-xs font-semibold text-gift-600" title="Telegram notification was not delivered">
                <BellOff className="h-3 w-3" aria-hidden /> Not notified
              </span>
            )}
            {order.offerOptIn && order.firstOrderAtCreation && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gift-100 px-2.5 py-1 text-xs font-semibold text-gift-600">
                <Gift className="h-3 w-3" aria-hidden /> Gift requested
              </span>
            )}
            <span className={cn('rounded-full px-2.5 py-1 text-xs font-bold', 
              pending ? 'bg-amber-50 text-amber-700' : 
              cancelled ? 'bg-red-50 text-red-700' : 
              'bg-brand-50 text-brand-700'
            )}>
              {order.status}
            </span>
          </div>
        </header>

        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="font-semibold">{order.customerName}</p>
            <a href={`tel:+91${order.mobileNumber}`} className="inline-flex items-center gap-1.5 text-brand-700 hover:underline">
              <Phone className="h-3.5 w-3.5" aria-hidden /> {formatMobile(order.mobileNumber)}
            </a>
            <p className="mt-2 flex gap-1.5 text-ink-muted">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              {[order.address.flat, order.address.area, order.address.landmark].filter(Boolean).join(', ')}
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-2 rounded-2xl bg-surface p-3 text-xs">
            <div><dt className="text-ink-soft">First Order</dt><dd className="font-bold">{order.firstOrderAtCreation ? 'Yes' : 'No'}</dd></div>
            <div><dt className="text-ink-soft">Previous Orders</dt><dd className="font-bold">{order.previousOrders}</dd></div>
            <div><dt className="text-ink-soft">Gift claimed before</dt><dd className="font-bold">{order.customer?.offerClaimed ? `Yes (${order.customer.offerClaimedOrderId})` : 'No'}</dd></div>
            <div><dt className="text-ink-soft">Delivered orders</dt><dd className="font-bold">{order.customer?.deliveredOrders ?? 0}</dd></div>
          </dl>
        </div>

        {/* CANCELLED MESSAGE BOX */}
        {cancelled && order.cancelReason && (
          <div className="mt-4 rounded-2xl bg-red-50 p-3 ring-1 ring-red-100">
            <p className="flex items-center gap-1.5 text-xs font-bold text-red-800"><AlertCircle className="h-4 w-4" /> Order Cancelled</p>
            <p className="mt-1 text-sm text-red-700">{order.cancelReason}</p>
            <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline">
              Notify Customer on WhatsApp <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}

        <div className="mt-4">
          {order.orderType === 'manual_text' ? (
            <ul className="divide-y divide-brand-100 rounded-2xl ring-1 ring-brand-100">
              {order.medicines.map((item, index) => (
                <li key={`${item.name}-${index}`} className="flex justify-between gap-3 px-3 py-2 text-sm">
                  <span className="font-medium">{item.name}</span>
                  <span className="text-ink-muted">{item.quantity}</span>
                </li>
              ))}
            </ul>
          ) : (
            order.prescriptionUrl && (
              <a href={order.prescriptionUrl} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-3 rounded-2xl p-2 ring-1 ring-brand-100 hover:ring-brand-300">
                <Image src={cloudinaryThumb(order.prescriptionUrl, 240)} alt={`Prescription for ${order.orderId}`} width={64} height={80} className="h-20 w-16 rounded-xl object-cover" unoptimized />
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700">View Prescription <ExternalLink className="h-3.5 w-3.5" aria-hidden /></span>
              </a>
            )
          )}
        </div>

        <div className="mt-5 border-t border-brand-100 pt-5">
          {pending ? (
            <div className="flex flex-col gap-4">
              <BillingPanel order={order} deliveryCharge={deliveryCharge} onUpdated={onUpdated} onDelivered={onDelivered} />
              
              {/* CANCEL BUTTON */}
              <div className="flex justify-end border-t border-brand-100 pt-3">
                <button type="button" onClick={() => setShowCancelModal(true)} className="text-xs font-semibold text-red-600 hover:underline">
                  Cancel Order
                </button>
              </div>
            </div>
          ) : (
            <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              <div><dt className="text-xs text-ink-soft">Medicines</dt><dd className="font-semibold">{formatRupees(order.medicineSubtotal)}</dd></div>
              <div><dt className="text-xs text-ink-soft">Other items</dt><dd className="font-semibold">{formatRupees(order.nonMedicineSubtotal)}</dd></div>
              <div><dt className="text-xs text-ink-soft">Delivery</dt><dd className="font-semibold">{formatRupees(order.deliveryCharge)}</dd></div>
              <div><dt className="text-xs text-ink-soft">Final</dt><dd className="font-bold">{formatRupees(order.finalAmount)}</dd></div>
              <div className="col-span-2 sm:col-span-4">
                <dt className="sr-only">Gift</dt>
                <dd className="text-xs text-ink-muted">
                  {order.offerApplied ? '🎁 Free GlucoOne included' : 'No gift included'}
                  {order.deliveredAt && ` · Delivered ${formatDateTime(order.deliveredAt)}`}
                </dd>
              </div>
            </dl>
          )}
        </div>
      </motion.article>

      {/* CANCEL ORDER MODAL */}
      <AnimatePresence>
        {showCancelModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-bold text-red-600">Cancel Order</h2>
                <button type="button" onClick={() => setShowCancelModal(false)} className="rounded-full p-1.5 hover:bg-surface">
                  <X className="h-5 w-5 text-ink-soft" />
                </button>
              </div>
              <div className="mt-5 space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Reason for Cancellation</label>
                  <select
                    value={cancelReasonType}
                    onChange={(e) => setCancelReasonType(e.target.value)}
                    className="h-11 w-full rounded-xl border-none bg-surface px-3 text-sm ring-1 ring-inset ring-brand-100 focus:ring-2 focus:ring-brand-500 outline-none"
                  >
                    {CANCEL_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                
                {cancelReasonType === 'Other (Custom Reason)' && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                    <label className="mb-1.5 block text-sm font-medium">Custom Reason</label>
                    <textarea
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      placeholder="Type the exact reason here..."
                      rows={3}
                      className="w-full resize-none rounded-xl border-none bg-surface p-3 text-sm ring-1 ring-inset ring-brand-100 focus:ring-2 focus:ring-brand-500 outline-none"
                    />
                  </motion.div>
                )}
                
                <div className="mt-6 flex justify-end gap-3">
                  <Button variant="secondary" onClick={() => setShowCancelModal(false)} disabled={isCancelling}>Keep Order</Button>
                  <Button className="bg-red-600 hover:bg-red-700" onClick={handleCancelOrder} loading={isCancelling}>Confirm Cancellation</Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
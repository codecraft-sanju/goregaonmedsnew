'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { BellOff, ExternalLink, Gift, MapPin, Phone } from 'lucide-react';
import { cloudinaryThumb, formatDateTime, formatMobile, formatRupees } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { AdminOrder } from '@/lib/types';
import { BillingPanel } from './BillingPanel';

interface Props {
  order: AdminOrder;
  deliveryCharge: number;
  onUpdated: (order: AdminOrder) => void;
  onDelivered: (order: AdminOrder) => void;
}

export function OrderCard({ order, deliveryCharge, onUpdated, onDelivered }: Props) {
  const pending = order.status === 'Pending';

  return (
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
          <span className={cn('rounded-full px-2.5 py-1 text-xs font-bold', pending ? 'bg-red-50 text-red-700' : 'bg-brand-50 text-brand-700')}>{order.status}</span>
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
          <BillingPanel order={order} deliveryCharge={deliveryCharge} onUpdated={onUpdated} onDelivered={onDelivered} />
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
  );
}

'use client';

import { memo } from 'react';
import { BellOff, ChevronRight, Gift } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatDateTime, formatMobile, formatRupees } from '@/lib/format';
import type { AdminOrder } from '@/lib/types';
import { OrderStatusBadge } from './OrderStatusBadge';

interface Props {
  order: AdminOrder;
  selected: boolean;
  /** The trigger element is passed up so the board can restore focus when the drawer closes. */
  onSelect: (id: string, trigger: HTMLElement) => void;
}

function buildSummary(order: AdminOrder) {
  const parts: string[] = [];
  if (order.orderType === 'manual_text') {
    const count = order.medicines.length;
    parts.push(`${count} ${count === 1 ? 'medicine' : 'medicines'} · Manual order`);
  } else {
    parts.push('Prescription upload');
  }
  if (order.status === 'Delivered') parts.push(formatRupees(order.finalAmount));
  if (order.status === 'Cancelled' && order.cancelReason) parts.push(order.cancelReason);
  return parts.join(' · ');
}

export const CompactOrderCard = memo(function CompactOrderCard({ order, selected, onSelect }: Props) {
  const giftRequested = order.offerOptIn && order.firstOrderAtCreation;
  const notNotified = !order.telegramNotificationSent;

  const label = [
    `Order ${order.orderId}`,
    order.customerName,
    order.status,
    giftRequested ? 'gift requested' : null,
    notNotified ? 'Telegram notification not delivered' : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <button
      type="button"
      onClick={(event) => onSelect(order.id, event.currentTarget)}
      aria-current={selected ? 'true' : undefined}
      aria-label={`${label}. View details`}
      className={cn(
        'group flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition duration-150',
        'hover:-translate-y-px hover:border-brand-300 hover:shadow-sm',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
        selected ? 'border-brand-500 bg-brand-50/60' : 'border-brand-100 bg-white',
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className="font-mono text-base font-bold tracking-wide text-brand-800">{order.orderId}</span>
          <span className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
            {notNotified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gift-50 px-2 py-1 text-xs font-semibold text-gift-600" title="Telegram notification was not delivered">
                <BellOff className="h-3 w-3" aria-hidden />
                <span className="sr-only sm:not-sr-only">Not notified</span>
              </span>
            )}
            {giftRequested && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gift-100 px-2 py-1 text-xs font-semibold text-gift-600" title="Gift requested">
                <Gift className="h-3 w-3" aria-hidden />
                <span className="sr-only sm:not-sr-only">Gift</span>
              </span>
            )}
            <OrderStatusBadge status={order.status} />
          </span>
        </span>

        <span className="mt-1 block truncate text-sm font-semibold text-ink">{order.customerName}</span>
        <span className="block text-xs text-ink-muted">{formatMobile(order.mobileNumber)}</span>

        <span className="mt-2 flex items-center justify-between gap-3 text-xs text-ink-soft">
          <span className="truncate">{buildSummary(order)}</span>
          <span className="shrink-0">{formatDateTime(order.createdAt)}</span>
        </span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-ink-soft transition-transform group-hover:translate-x-0.5" aria-hidden />
    </button>
  );
});
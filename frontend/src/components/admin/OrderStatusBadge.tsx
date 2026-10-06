//src/components/admin/OrderStatusBadge.tsx
import { cn } from '@/lib/cn';
import type { OrderStatus } from '@/lib/types';

const TONES: Record<OrderStatus, { pill: string; dot: string }> = {
  Pending: { pill: 'bg-amber-50 text-amber-800 ring-amber-200', dot: 'bg-amber-500' },
  Delivered: { pill: 'bg-brand-50 text-brand-800 ring-brand-200', dot: 'bg-brand-600' },
  Cancelled: { pill: 'bg-red-50 text-red-700 ring-red-200', dot: 'bg-red-500' },
};

interface Props {
  status: OrderStatus;
  className?: string;
}

/** The text label is always rendered, so status never depends on colour alone. */
export function OrderStatusBadge({ status, className }: Props) {
  const tone = TONES[status];
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset', tone.pill, className)}>
      <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', tone.dot)} />
      {status}
    </span>
  );
}
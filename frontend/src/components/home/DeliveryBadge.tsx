//src/components/home/DeliveryBadge.tsx
'use client';

import { usePublicSettings } from '@/hooks/usePublicSettings';
import { formatRupees } from '@/lib/format';

/** Shows "FREE Delivery" or the current charge set by the pharmacy. */
export function DeliveryBadge({ className }: { className?: string }) {
  const { settings, loading } = usePublicSettings();
  if (loading) return <span className={className}>Delivery</span>;
  return <span className={className}>{settings.deliveryCharge === 0 ? 'FREE Delivery' : `Delivery ${formatRupees(settings.deliveryCharge)}`}</span>;
}

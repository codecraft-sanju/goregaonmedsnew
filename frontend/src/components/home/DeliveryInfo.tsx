import { Banknote, MapPinned, Truck } from 'lucide-react';
import { SERVICE_AREA } from '@/lib/constants';
import { DeliveryBadge } from './DeliveryBadge';
import { Reveal } from './Reveal';

export function DeliveryInfo() {
  return (
    <section className="container-app py-14" aria-labelledby="delivery-title">
      <p className="eyebrow">Delivery information</p>
      <h2 id="delivery-title" className="section-title mt-2">Simple, local, no surprises</h2>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Reveal className="card p-6">
          <Truck className="h-6 w-6 text-brand-600" aria-hidden />
          <DeliveryBadge className="mt-4 block font-display text-xl font-bold" />
          <p className="mt-1.5 text-sm text-ink-muted">The current delivery fee is set by the pharmacy and shown before you order.</p>
        </Reveal>
        <Reveal delay={0.06} className="card p-6">
          <MapPinned className="h-6 w-6 text-brand-600" aria-hidden />
          <p className="mt-4 font-display text-xl font-bold">{SERVICE_AREA}</p>
          <p className="mt-1.5 text-sm text-ink-muted">We currently deliver within Goregaon East only.</p>
        </Reveal>
        <Reveal delay={0.12} className="card p-6">
          <Banknote className="h-6 w-6 text-brand-600" aria-hidden />
          <p className="mt-4 font-display text-xl font-bold">Cash or UPI at delivery</p>
          <p className="mt-1.5 text-sm text-ink-muted">The final amount is confirmed by the pharmacy after billing.</p>
        </Reveal>
      </div>
    </section>
  );
}

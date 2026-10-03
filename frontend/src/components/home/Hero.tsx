import Link from 'next/link';
import { Camera, ClipboardList, Clock3, MapPin, Wallet } from 'lucide-react';
import { DeliveryBadge } from './DeliveryBadge';
import { HeroVisual } from './HeroVisual';

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 -z-10 h-[520px] bg-[radial-gradient(60%_60%_at_20%_0%,#d8f3e8_0%,transparent_70%)]" />
      <div className="container-app grid items-center gap-14 pb-16 pt-10 md:grid-cols-[1.1fr_0.9fr] md:pt-16">
        <div>
          <p className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-brand-700 ring-1 ring-brand-100">
            <MapPin className="h-3.5 w-3.5" aria-hidden /> Delivering in Goregaon East, Mumbai
          </p>
          <h1 className="mt-5 font-display text-[2.6rem] font-extrabold leading-[1.05] tracking-tight text-ink sm:text-6xl">
            Your medicines,
            <br />
            <span className="text-brand-700">at your door.</span>
          </h1>
          <p className="mt-5 max-w-lg text-lg text-ink-muted">
            Type what you need or snap your prescription. Our neighbourhood pharmacists confirm, pack and deliver, and you pay when it arrives.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/order?method=manual" className="inline-flex h-14 items-center justify-center gap-2.5 rounded-2xl bg-brand-700 px-6 font-semibold text-white shadow-lift transition-colors hover:bg-brand-800">
              <ClipboardList className="h-5 w-5" aria-hidden /> Enter medicines
            </Link>
            <Link href="/order?method=prescription" className="inline-flex h-14 items-center justify-center gap-2.5 rounded-2xl bg-white px-6 font-semibold text-brand-800 ring-1 ring-inset ring-brand-200 transition-colors hover:bg-brand-50">
              <Camera className="h-5 w-5" aria-hidden /> Upload prescription
            </Link>
          </div>
          <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-ink-muted">
            <li className="flex items-center gap-1.5"><Wallet className="h-4 w-4 text-brand-600" aria-hidden /> Cash or UPI at delivery</li>
            <li className="flex items-center gap-1.5"><Clock3 className="h-4 w-4 text-brand-600" aria-hidden /> One branch open 24x7</li>
            <li className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" aria-hidden />
              <DeliveryBadge />
            </li>
          </ul>
        </div>
        <HeroVisual />
      </div>
    </section>
  );
}

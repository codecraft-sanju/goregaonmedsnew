import { ExternalLink, MapPin } from 'lucide-react';
import { BRANCHES } from '@/lib/constants';
import { Reveal } from './Reveal';

export function Locations() {
  return (
    <section id="locations" className="container-app scroll-mt-20 py-14" aria-labelledby="locations-title">
      <p className="eyebrow">Pharmacy locations</p>
      <h2 id="locations-title" className="section-title mt-2">Fulfilled by pharmacies you know</h2>
      <p className="mt-2 max-w-2xl text-ink-muted">You don’t need to pick a branch. We route your order to the right pharmacy for the fastest delivery.</p>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {BRANCHES.map((branch, index) => (
          <Reveal key={branch.name} delay={index * 0.06} className="card flex flex-col p-6">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-display text-lg font-bold">{branch.name}</h3>
              {branch.open24x7 && <span className="shrink-0 rounded-full bg-brand-700 px-2.5 py-1 text-xs font-bold text-white">OPEN 24x7</span>}
            </div>
            <p className="mt-3 flex flex-1 gap-2 text-sm text-ink-muted">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden /> {branch.address}
            </p>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${branch.name}, ${branch.address}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800"
            >
              Open in Maps <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

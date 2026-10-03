import { Moon } from 'lucide-react';
import { Reveal } from './Reveal';

export function Highlight24x7() {
  return (
    <section className="container-app py-6" aria-labelledby="open-title">
      <Reveal>
        <div className="relative overflow-hidden rounded-4xl bg-brand-950 p-8 text-white sm:p-12">
          <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-brand-500/30 blur-3xl" aria-hidden />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-200">
                <span className="h-2 w-2 animate-pulse-dot rounded-full bg-brand-300" aria-hidden /> Open now
              </p>
              <h2 id="open-title" className="mt-4 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Healthzone &amp; Cosmetic</h2>
              <p className="mt-2 max-w-md text-brand-100/80">Medicine emergencies don’t wait for business hours. Place your request any time, day or night.</p>
            </div>
            <div className="flex items-center gap-4">
              <Moon className="h-10 w-10 text-gift-400" aria-hidden />
              <p className="font-display text-5xl font-extrabold tracking-tight sm:text-6xl">24x7</p>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

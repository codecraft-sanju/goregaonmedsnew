import Link from 'next/link';
import { ArrowRight, Camera, ClipboardList, FolderOpen, Images } from 'lucide-react';
import { Reveal } from './Reveal';

export function OrderMethods() {
  return (
    <section id="order-methods" className="container-app py-14" aria-labelledby="methods-title">
      <p className="eyebrow">Two ways to order</p>
      <h2 id="methods-title" className="section-title mt-2">Order the way that suits you</h2>
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <Reveal>
          <Link href="/order?method=manual" className="card group flex h-full flex-col p-6 transition-shadow hover:shadow-lift sm:p-8">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-700"><ClipboardList className="h-6 w-6" aria-hidden /></span>
            <h3 className="mt-5 font-display text-xl font-bold">Enter medicines</h3>
            <p className="mt-2 text-ink-muted">Type each medicine and how much you need, like “Dolo 650 · 2 strips”. Add as many as you like.</p>
            <div className="mt-5 rounded-2xl bg-surface p-4 font-mono text-sm text-ink-muted">
              <p>Dolo 650</p>
              <p className="text-ink-soft">2 strips</p>
            </div>
            <span className="mt-6 inline-flex items-center gap-1.5 font-semibold text-brand-700">
              Start typing <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
            </span>
          </Link>
        </Reveal>
        <Reveal delay={0.08}>
          <Link href="/order?method=prescription" className="card group flex h-full flex-col p-6 transition-shadow hover:shadow-lift sm:p-8">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-700"><Camera className="h-6 w-6" aria-hidden /></span>
            <h3 className="mt-5 font-display text-xl font-bold">Upload prescription</h3>
            <p className="mt-2 text-ink-muted">Take a photo or pick one from your gallery or files. We compress it on your phone so it uploads fast and stays readable.</p>
            <ul className="mt-5 grid grid-cols-3 gap-2 text-center text-xs font-medium text-ink-muted">
              <li className="rounded-2xl bg-surface p-3"><Camera className="mx-auto mb-1 h-4 w-4" aria-hidden />Camera</li>
              <li className="rounded-2xl bg-surface p-3"><Images className="mx-auto mb-1 h-4 w-4" aria-hidden />Gallery</li>
              <li className="rounded-2xl bg-surface p-3"><FolderOpen className="mx-auto mb-1 h-4 w-4" aria-hidden />Files</li>
            </ul>
            <span className="mt-6 inline-flex items-center gap-1.5 font-semibold text-brand-700">
              Upload now <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
            </span>
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

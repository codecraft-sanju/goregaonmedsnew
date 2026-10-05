// src/components/layout/Footer.tsx

import Link from 'next/link';
import { SUPPORT_PHONE_DISPLAY, SUPPORT_PHONE_TEL } from '@/lib/constants';
import { Logo } from './Logo';

export function Footer() {
  return (
    <footer className="mt-20 border-t border-brand-100 bg-white">
      <div className="container-app grid gap-10 py-12 sm:grid-cols-3">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-xs text-sm text-ink-muted">Medicines delivered across Goregaon East, Mumbai. Pay when it arrives.</p>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-semibold text-ink">Quick links</p>
          <ul className="space-y-1.5 text-ink-muted">
            <li><Link href="/order" className="hover:text-brand-700">Order medicines</Link></li>
            <li><Link href="/order?method=prescription" className="hover:text-brand-700">Upload prescription</Link></li>
            <li><Link href="/track" className="hover:text-brand-700">Track your order</Link></li>
          </ul>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-semibold text-ink">Order support</p>
          <a href={SUPPORT_PHONE_TEL} className="block font-semibold text-brand-700">{SUPPORT_PHONE_DISPLAY}</a>
          <p className="text-ink-muted">Healthzone &amp; Cosmetic is open 24x7.</p>
        </div>
      </div>
      <div className="border-t border-brand-100">
        <div className="container-app flex flex-col sm:flex-row items-center justify-between gap-4 py-5 text-xs text-ink-soft">
          <p>
            Prescription medicines are supplied only against a valid prescription where required. © {new Date().getFullYear()} GoregaonMeds.
          </p>
          <Link href="/admin" className="font-semibold text-brand-700 hover:underline">
            Admin Login
          </Link>
        </div>
      </div>
    </footer>
  );
}
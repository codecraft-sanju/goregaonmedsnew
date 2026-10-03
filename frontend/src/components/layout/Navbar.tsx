import Link from 'next/link';
import { Phone } from 'lucide-react';
import { SUPPORT_PHONE_DISPLAY, SUPPORT_PHONE_TEL } from '@/lib/constants';
import { Logo } from './Logo';

const links = [
  { href: '/order', label: 'Order' },
  { href: '/track', label: 'Track' },
  { href: '/#locations', label: 'Pharmacies' },
  { href: '/#faq', label: 'FAQ' },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-brand-100/70 bg-surface/85 backdrop-blur-lg">
      <nav className="container-app flex h-16 items-center justify-between gap-4" aria-label="Main">
        <Logo />
        <div className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="rounded-xl px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-brand-50 hover:text-brand-800">
              {link.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <a href={SUPPORT_PHONE_TEL} className="hidden items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-brand-800 hover:bg-brand-50 sm:flex">
            <Phone className="h-4 w-4" aria-hidden /> {SUPPORT_PHONE_DISPLAY}
          </a>
          <Link href="/track" className="rounded-xl px-3 py-2 text-sm font-semibold text-brand-800 hover:bg-brand-50 md:hidden">
            Track
          </Link>
          <Link href="/order" className="whitespace-nowrap rounded-xl bg-brand-700 px-3.5 py-2 text-sm font-semibold text-white shadow-lift transition-colors hover:bg-brand-800 sm:px-4">
            Order now
          </Link>
        </div>
      </nav>
    </header>
  );
}

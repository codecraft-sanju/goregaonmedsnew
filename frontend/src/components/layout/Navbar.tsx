// src/components/layout/Navbar.tsx
import Link from 'next/link';
import { Phone, Bell, Search } from 'lucide-react'; 
import { SUPPORT_PHONE_DISPLAY, SUPPORT_PHONE_TEL } from '@/lib/constants';
import { Logo } from './Logo';

const links = [
  { href: '/order', label: 'Order' },
  { href: '/track', label: 'Track & Orders' }, 
  { href: '/#locations', label: 'Pharmacies' },
  { href: '/#faq', label: 'FAQ' },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-lg md:border-b md:border-brand-100/70">
      <nav className="container-app flex h-14 items-center justify-between gap-4 md:h-16" aria-label="Main">
        <Logo />
        
        {/* Desktop Links - Visible only on md and above */}
        <div className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="rounded-xl px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-brand-50 hover:text-brand-800">
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          
          {/* Search Icon - Visible on all screens */}
          <Link 
            href="/search" 
            className="grid h-10 w-10 place-items-center rounded-full text-ink transition-colors hover:bg-brand-50"
            aria-label="Search medicines"
          >
            <Search className="h-[22px] w-[22px]" strokeWidth={1.5} />
          </Link>

          {/* Desktop Phone */}
          <a href={SUPPORT_PHONE_TEL} className="hidden items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-brand-800 hover:bg-brand-50 sm:flex">
            <Phone className="h-4 w-4" aria-hidden /> {SUPPORT_PHONE_DISPLAY}
          </a>
          
          {/* Desktop Order Button */}
          <Link href="/order" className="hidden md:flex whitespace-nowrap rounded-xl bg-brand-700 px-3.5 py-2 text-sm font-semibold text-white shadow-lift transition-colors hover:bg-brand-800">
            Order now
          </Link>

          {/* Mobile Notification Bell */}
          <button 
            className="relative grid h-10 w-10 place-items-center rounded-full text-ink transition-colors hover:bg-brand-50 md:hidden"
            aria-label="Notifications"
          >
            <Bell className="h-6 w-6" strokeWidth={1.5} />
            {/* Red Dot */}
            <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-500"></span>
          </button>
        </div>
      </nav>
    </header>
  );
}
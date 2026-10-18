// src/components/layout/Navbar.tsx

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRight, Phone, ShoppingBag } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';

// Constants
const SUPPORT_PHONE_DISPLAY = '+91 84338 18771';
const SUPPORT_PHONE_TEL = 'tel:+918433818771';

const links = [
  { href: '/order', label: 'Order' },
  { href: '/track', label: 'Track & Orders' },
  { href: '/#locations', label: 'Pharmacies' },
  { href: '/#faq', label: 'FAQ' },
];

// Logo Component inline
function Logo({ href = '/' }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5" aria-label="GoregaonMeds home">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#156253] text-white shadow-[0_4px_10px_rgba(21,98,83,0.25)]">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
          <path d="M12 5v14M5 12h14" />
        </svg>
      </span>
      <span className="font-display text-lg font-extrabold tracking-tight text-[#0f1f1c]">
        Goregaon<span className="text-[#156253]">Meds</span>
      </span>
    </Link>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  
  // Cart state
  const [mounted, setMounted] = useState(false);
  const totalItems = useCartStore((state) => state.getTotalItems());

  useEffect(() => {
    setMounted(true);
    const update = () => setScrolled(window.scrollY > 12);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  return (
    <header
      className="sticky top-0 z-40 pt-[env(safe-area-inset-top)] bg-white/95 border-b border-transparent backdrop-blur-xl transition-all duration-200 data-[scrolled=true]:bg-white/90 data-[scrolled=true]:border-[#e4eee8] data-[scrolled=true]:shadow-[0_4px_18px_rgba(18,77,61,0.03)]"
      data-scrolled={scrolled}
    >
      <nav
      className="w-[min(100%-32px,1200px)] mx-auto min-h-[56px] md:min-h-[66px] flex items-center gap-2.5 md:gap-3"
        aria-label="Main navigation"
      >
        {/* Logo */}
        <div className="min-w-0 shrink-0 flex items-center [&>a]:max-w-full">
          <Logo />
        </div>

        {/* Desktop Links (Hidden on Mobile) */}
        <div className="hidden md:flex gap-0.5 ml-auto">
          {links.map(({ href, label }) => {
            const isActive =
              !href.includes('#') &&
              (pathname === href || pathname.startsWith(`${href}/`));

            return (
              <Link
                key={href}
                href={href}
                aria-current={isActive ? 'page' : undefined}
                className="text-[11px] lg:text-[13px] font-[650] whitespace-nowrap px-2 lg:px-3 py-2.5 rounded-xl text-[#52645b] hover:bg-[#eaf8f1] aria-[current=page]:text-[#156253] aria-[current=page]:bg-[#eaf8f1] transition-colors active:scale-[0.985]"
              >
                {label}
              </Link>
            );
          })}
        </div>

        {/* Action Buttons (Shifted completely to the right) */}
        <div className="flex items-center gap-0 min-[360px]:gap-[3px] shrink-0 ml-auto md:ml-0">
          
          {/* Call Support Button */}
          <a
            href={SUPPORT_PHONE_TEL}
            className="w-10 h-10 min-[360px]:w-11 min-[360px]:h-11 flex md:hidden lg:flex lg:w-auto lg:gap-1.5 lg:px-3 items-center justify-center rounded-full text-[#156253] hover:bg-[#eaf8f1] transition-colors lg:text-xs lg:whitespace-nowrap active:scale-[0.985]"
            aria-label={`Call support at ${SUPPORT_PHONE_DISPLAY}`}
          >
            <Phone size={19} aria-hidden />
            <span className="hidden lg:inline">{SUPPORT_PHONE_DISPLAY}</span>
          </a>

          {/* Cart Button */}
          <Link
            href="/order"
            className="relative w-10 h-10 min-[360px]:w-11 min-[360px]:h-11 flex items-center justify-center rounded-full text-[#156253] hover:bg-[#eaf8f1] transition-colors active:scale-[0.985]"
            aria-label="View Cart"
          >
            <ShoppingBag size={21} aria-hidden />
            {mounted && totalItems > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#dfa442] text-[9px] font-bold text-white shadow-sm">
                {totalItems}
              </span>
            )}
          </Link>

          {/* Order Now Button (Desktop Only) */}
          <Link
            href="/order"
            className="hidden md:inline-flex items-center gap-[7px] bg-[#156253] text-white px-[14px] py-3 rounded-full text-[11px] lg:text-[13px] font-[750] whitespace-nowrap hover:bg-[#0b7561] transition-colors active:scale-[0.985]"
          >
            Order now <ArrowRight size={16} aria-hidden />
          </Link>
        </div>
      </nav>
    </header>
  );
}
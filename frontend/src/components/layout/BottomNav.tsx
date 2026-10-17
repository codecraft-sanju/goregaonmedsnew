// src/components/layout/BottomNav.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGroup, motion, useReducedMotion } from 'framer-motion';
import { Home, MapPin, ShoppingBag, User } from 'lucide-react';

const items = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/order', label: 'Order', icon: ShoppingBag },
  { href: '/track', label: 'Track', icon: MapPin },
  { href: '/profile', label: 'Profile', icon: User },
];

export function BottomNav() {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  
  return (
    <div className="h-[calc(96px+env(safe-area-inset-bottom))] shrink-0 md:hidden block">
      <LayoutGroup id="gm-mobile-tabs">
        <nav 
          className="fixed z-50 left-[max(12px,env(safe-area-inset-left))] right-[max(12px,env(safe-area-inset-right))] bottom-[calc(10px+env(safe-area-inset-bottom))] max-w-[560px] mx-auto grid grid-cols-4 min-h-[72px] border border-[rgba(255,255,255,0.85)] rounded-[27px] p-[6px_8px] bg-[rgba(255,255,255,0.94)] backdrop-blur-[26px] shadow-[0_6px_35px_rgba(18,79,60,0.1),0_1px_3px_rgba(18,79,60,0.03)]" 
          aria-label="Primary mobile navigation"
        >
          {items.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== '/' && pathname.startsWith(`${href}/`));
            
            return (
              <Link 
                href={href} 
                key={href} 
                className="block rounded-[18px] text-[#687b74] text-[11px] font-[550] min-h-[56px] aria-[current=page]:text-[#0b6d58] aria-[current=page]:font-[750] transition-colors duration-200 hover:bg-[#edf8f37d] no-underline focus-visible:outline focus-visible:outline-3 focus-visible:outline-[#087a67] focus-visible:outline-offset-4" 
                aria-current={active ? 'page' : undefined}
              >
                <motion.span 
                  className="flex flex-col items-center justify-center gap-[3px] min-h-[56px]" 
                  whileTap={reduced ? undefined : { scale: 0.95 }}
                >
                  <span className="relative w-[56px] h-[30px] grid place-items-center isolate [&>svg]:z-10">
                    {active && (
                      <motion.span 
                        className="absolute inset-0 rounded-[20px] bg-[linear-gradient(120deg,#d7f4e7,#e9faf2)] z-0" 
                        layoutId="active-tab"
                        transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 450, damping: 36 }} 
                      />
                    )}
                    <Icon size={21} strokeWidth={active ? 2.3 : 1.7} aria-hidden />
                  </span>
                  <span>{label}</span>
                </motion.span>
              </Link>
            );
          })}
        </nav>
      </LayoutGroup>
    </div>
  );
}
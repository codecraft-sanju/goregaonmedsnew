// src/components/layout/BottomNav.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MapPin, User } from 'lucide-react';
import { cn } from '@/lib/cn';

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/track', label: 'Track', icon: MapPin },
  { href: '/profile', label: 'Profile', icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-20 items-center justify-around rounded-t-2xl bg-white px-2 shadow-[0_-4px_24px_rgba(0,0,0,0.04)] md:hidden">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;

        return (
          <Link 
            key={item.href} 
            href={item.href}
            className="flex w-20 flex-col items-center justify-center gap-1"
          >
            <div className={cn(
              "grid h-8 w-14 place-items-center rounded-full transition-colors",
              isActive ? "bg-brand-700 text-white" : "text-ink-muted hover:text-brand-700"
            )}>
              <Icon className="h-5 w-5" strokeWidth={isActive ? 2 : 1.5} />
            </div>
            <span className={cn(
              "text-[11px] font-medium transition-colors",
              isActive ? "text-brand-700 font-semibold" : "text-ink-muted"
            )}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
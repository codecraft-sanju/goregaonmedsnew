// src/components/layout/BottomNav.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
// ShoppingBag icon add kiya hai 'Order' ke liye
import { Home, MapPin, User, ShoppingBag } from 'lucide-react'; 
import { cn } from '@/lib/cn';

// Navbar items mein Order add kiya gaya hai
const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/order', label: 'Order', icon: ShoppingBag }, // Naya Order Button
  { href: '/track', label: 'Track', icon: MapPin },
  { href: '/profile', label: 'Profile', icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-4 left-0 right-0 z-50 px-4 md:hidden">
      <nav className="flex h-16 items-center justify-around rounded-full bg-white/80 backdrop-blur-xl border border-white/40 shadow-[0_8px_32px_rgba(0,0,0,0.08)] px-2">
        {navItems.map((item) => {
          // Check agar current page item ke href se match karta hai (order page pe active dikhane ke liye)
          const isActive = pathname === item.href || (item.href === '/order' && pathname.startsWith('/order')); 
          const Icon = item.icon;
          
          // 'Order' button ko thoda highlight karne ke liye hum ek special condition lagayenge
          const isOrderBtn = item.href === '/order';

          return (
            <Link 
              key={item.href} 
              href={item.href}
              className="flex w-16 flex-col items-center justify-center gap-1 active:scale-90 transition-transform duration-200"
            >
              <div className={cn(
                "relative grid h-8 w-12 place-items-center rounded-full transition-all duration-300",
                // Agar button 'Order' hai aur active nahi hai, toh thoda primary color hint do
                isActive ? "bg-brand-100 text-brand-700" : 
                isOrderBtn ? "bg-brand-50 text-brand-600 hover:text-brand-700" : 
                "text-ink-muted hover:text-brand-700"
              )}>
                <Icon className="h-5 w-5 z-10" strokeWidth={isActive || isOrderBtn ? 2.5 : 1.5} />
              </div>
              <span className={cn(
                "text-[10px] transition-colors",
                isActive ? "text-brand-700 font-bold" : 
                isOrderBtn ? "text-brand-700 font-bold" : 
                "text-ink-muted font-medium"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { ClipboardList, LogOut, Settings, Users } from 'lucide-react';
import { Logo } from '@/components/layout/Logo';
import { Skeleton } from '@/components/ui/Skeleton';
import { apiRequest } from '@/lib/api';
import { adminRequest } from '@/lib/adminApi';
import { cn } from '@/lib/cn';

const nav = [
  { href: '/admin', label: 'Orders', icon: ClipboardList },
  { href: '/admin/customers', label: 'Customers', icon: Users },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    adminRequest('/session')
      .then(() => setReady(true))
      .catch(() => undefined);
  }, []);

  const logout = async () => {
    await apiRequest('/admin/logout', { method: 'POST' }).catch(() => undefined);
    window.location.assign('/admin/login');
  };

  return (
    <div className="min-h-dvh pb-20 md:pb-0">
      <header className="sticky top-0 z-40 border-b border-brand-100 bg-white/90 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Logo href="/admin" />
          <nav className="hidden items-center gap-1 md:flex" aria-label="Admin">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={pathname === item.href ? 'page' : undefined}
                className={cn('flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold', pathname === item.href ? 'bg-brand-50 text-brand-800' : 'text-ink-muted hover:text-ink')}
              >
                <item.icon className="h-4 w-4" aria-hidden /> {item.label}
              </Link>
            ))}
          </nav>
          <button type="button" onClick={logout} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-ink-muted hover:bg-brand-50 hover:text-ink">
            <LogOut className="h-4 w-4" aria-hidden /> <span className="hidden sm:inline">Log out</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {ready ? children : (
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-72 rounded-3xl" />
            <Skeleton className="h-72 rounded-3xl" />
          </div>
        )}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-brand-100 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden" aria-label="Admin">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={pathname === item.href ? 'page' : undefined}
            className={cn('flex flex-col items-center gap-1 py-2.5 text-xs font-semibold', pathname === item.href ? 'text-brand-700' : 'text-ink-soft')}
          >
            <item.icon className="h-5 w-5" aria-hidden /> {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

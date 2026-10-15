//src/components/admin/AdminShell.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, LogOut, Settings, Users, ShoppingBag } from 'lucide-react';
export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export interface FieldIssue {
  path: string;
  message: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly fields: FieldIssue[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isNetworkError() {
    return this.status === 0;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
}

const NETWORK_MESSAGE = 'Could not reach GoregaonMeds. Check your connection and try again.';

export async function apiRequest<T>(path: string, { method = 'GET', body, signal }: RequestOptions = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      signal,
      credentials: 'same-origin',
      cache: 'no-store',
      headers: body === undefined ? { Accept: 'application/json' } : { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    if ((error as Error).name === 'AbortError') throw error;
    throw new ApiError(NETWORK_MESSAGE, 0, 'NETWORK_ERROR');
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = data?.error;
    throw new ApiError(
      typeof error?.message === 'string' ? error.message : 'Something went wrong. Please try again.',
      response.status,
      typeof error?.code === 'string' ? error.code : 'UNKNOWN',
      Array.isArray(error?.fields) ? error.fields : [],
    );
  }
  return data as T;
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

type AdminOptions = Parameters<typeof apiRequest>[1];

export async function adminRequest<T>(path: string, options?: AdminOptions): Promise<T> {
  try {
    return await apiRequest<T>(`/admin${path}`, options);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401 && typeof window !== 'undefined') {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.assign(`/admin/login?next=${next}`);
    }
    throw error;
  }
}

export function safeAdminRedirect(next: string | null) {
  return next && next.startsWith('/admin') && !next.startsWith('//') && !next.startsWith('/admin/login') ? next : '/admin';
}


export function Logo({ href = '/' }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5" aria-label="GoregaonMeds home">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-700 text-white shadow-lift">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
          <path d="M12 5v14M5 12h14" />
        </svg>
      </span>
      <span className="font-display text-lg font-extrabold tracking-tight text-ink">
        Goregaon<span className="text-brand-600">Meds</span>
      </span>
    </Link>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn('relative overflow-hidden rounded-xl bg-brand-100/60', className)}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/70 to-transparent" />
    </div>
  );
}


const nav = [
  { href: '/admin', label: 'Orders', icon: ClipboardList },
  { href: '/admin/customers', label: 'Customers', icon: Users },
  { href: '/admin/products', label: 'Products', icon: ShoppingBag }, 
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

const isActive = (pathname: string, href: string) => (href === '/admin' ? pathname === href : pathname.startsWith(href));

const focusRing = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500';

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '';
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
            {nav.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn('relative flex h-10 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold transition-colors', focusRing, active ? 'text-brand-800' : 'text-ink-muted hover:text-ink')}
                >
                  {active && <motion.span layoutId="admin-nav-desktop" className="absolute inset-0 rounded-xl bg-brand-50" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
                  <item.icon className="relative h-4 w-4" aria-hidden />
                  <span className="relative">{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <button
            type="button"
            onClick={logout}
            className={cn('flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-ink-muted hover:bg-brand-50 hover:text-ink', focusRing)}
          >
            <LogOut className="h-4 w-4" aria-hidden /> <span className="hidden sm:inline">Log out</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {ready ? (
          children
        ) : (
          <div className="mx-auto max-w-4xl space-y-2" aria-busy>
            <Skeleton className="mb-4 h-10 w-48" />
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-24 rounded-2xl" />
            ))}
          </div>
        )}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-brand-100 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden" aria-label="Admin">
        {nav.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn('relative flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors', focusRing, active ? 'text-brand-700' : 'text-ink-soft')}
            >
              {active && <motion.span layoutId="admin-nav-mobile" className="absolute inset-x-6 top-0 h-0.5 rounded-full bg-brand-600" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
              <item.icon className="h-5 w-5" aria-hidden /> {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
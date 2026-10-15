// src/components/admin/AdminShell.tsx
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
    <Link href={href} className="group flex items-center gap-3 transition-opacity hover:opacity-90 active:scale-[0.98]" aria-label="GoregaonMeds home">
      <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-[#156253] text-[#FFFFFF] shadow-[0_2px_8px_rgba(21,98,83,0.25)] ring-1 ring-inset ring-white/10 transition-transform duration-300 group-hover:scale-105">
        <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 5v14M5 12h14" />
        </svg>
      </span>
      <span className="font-display text-[19px] font-bold tracking-tight text-[#0F1F1C]">
        Goregaon<span className="text-[#156253] font-semibold">Meds</span>
      </span>
    </Link>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn('relative overflow-hidden bg-[#D8F3E8]/30', className)}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-[#FFFFFF]/60 to-transparent motion-reduce:animate-none" />
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

const focusRing = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#156253]';

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
    <div className="min-h-dvh bg-[#F6FAF8] pb-24 md:pb-0 selection:bg-[#D8F3E8] selection:text-[#0F1F1C]">
      {/* Desktop Navigation */}
      <header className="sticky top-0 z-40 border-b border-[#156253]/[0.06] bg-[#FFFFFF]/70 backdrop-blur-xl supports-[backdrop-filter]:bg-[#FFFFFF]/60">
        <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between gap-6 px-5 sm:px-8">
          <Logo href="/admin" />
          
          <nav className="hidden items-center gap-1.5 md:flex" aria-label="Admin">
            {nav.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'relative flex h-9 items-center gap-2.5 rounded-lg px-3.5 text-[14px] font-medium transition-colors duration-200 active:scale-[0.98]',
                    focusRing,
                    active ? 'text-[#156253]' : 'text-[#64748B] hover:text-[#0F1F1C]'
                  )}
                >
                  {active && (
                    <motion.span 
                      layoutId="admin-nav-desktop" 
                      className="absolute inset-0 rounded-lg bg-[#D8F3E8]/60 shadow-sm" 
                      transition={{ type: 'spring', stiffness: 450, damping: 35 }} 
                    />
                  )}
                  <item.icon className={cn("relative h-[18px] w-[18px]", active ? "text-[#156253]" : "opacity-80")} aria-hidden strokeWidth={active ? 2.5 : 2} />
                  <span className="relative tracking-wide">{item.label}</span>
                </Link>
              );
            })}
          </nav>
          
          <button
            type="button"
            onClick={logout}
            className={cn(
              'group flex h-9 items-center gap-2.5 rounded-lg px-3.5 text-[14px] font-medium text-[#64748B] transition-all duration-200 hover:bg-[#D8F3E8]/40 hover:text-[#0F1F1C] active:scale-[0.98]',
              focusRing
            )}
          >
            <LogOut className="h-[18px] w-[18px] opacity-80 group-hover:opacity-100" aria-hidden strokeWidth={2} /> 
            <span className="hidden sm:inline tracking-wide">Log out</span>
          </button>
        </div>
      </header>

      {/* Main Canvas */}
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-8 sm:py-10">
        {ready ? (
          children
        ) : (
          <div className="mx-auto max-w-5xl space-y-6" aria-busy>
            <div className="flex items-center gap-4">
              <Skeleton className="h-[42px] w-[180px] rounded-xl" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }, (_, index) => (
                <Skeleton key={index} className="h-[140px] w-full rounded-2xl border border-[#156253]/[0.03] bg-[#FFFFFF] shadow-sm" />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Premium Mobile Tab Bar */}
      <nav 
        className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-[#156253]/[0.06] bg-[#FFFFFF]/85 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur-xl supports-[backdrop-filter]:bg-[#FFFFFF]/75 md:hidden" 
        aria-label="Admin Mobile"
      >
        {nav.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex h-14 w-full flex-col items-center justify-center gap-1.5 transition-colors duration-200 active:scale-[0.96]',
                focusRing,
                active ? 'text-[#156253]' : 'text-[#64748B]'
              )}
            >
              <div className="relative flex h-8 w-14 items-center justify-center">
                {active && (
                  <motion.span 
                    layoutId="admin-nav-mobile" 
                    className="absolute inset-0 rounded-full bg-[#D8F3E8]" 
                    transition={{ type: 'spring', stiffness: 450, damping: 35 }} 
                  />
                )}
                <item.icon className={cn("relative z-10 h-5 w-5", active ? "text-[#156253]" : "opacity-80")} aria-hidden strokeWidth={active ? 2.5 : 2} />
              </div>
              <span className={cn("text-[10.5px] tracking-wide", active ? "font-semibold" : "font-medium")}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
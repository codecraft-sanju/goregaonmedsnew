// src/components/admin/AdminShell.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { motion, MotionConfig } from 'framer-motion';
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
      <style>{`@keyframes gmedShimmer { to { transform: translateX(100%); } }`}</style>
      <div className="absolute inset-0 -translate-x-full animate-[gmedShimmer_1.8s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-[#FFFFFF]/60 to-transparent motion-reduce:animate-none" />
    </div>
  );
}

const nav = [
  { href: '/admin', label: 'Orders', icon: ClipboardList },
  { href: '/admin/customers', label: 'Customers', icon: Users },
  { href: '/admin/products', label: 'Products', icon: ShoppingBag }, 
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

const isActive = (pathname: string, href: string) => pathname === href || (href !== '/admin' && pathname.startsWith(`${href}/`));

const focusRing = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#156253]';

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '';
  const [ready, setReady] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setSessionError(null);
    adminRequest('/session', { signal: controller.signal })
      .then(() => { if (!controller.signal.aborted) setReady(true); })
      .catch(error => { if (!controller.signal.aborted) setSessionError(errorMessage(error)); });
    return () => controller.abort();
  }, [attempt]);

  const logout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    await apiRequest('/admin/logout', { method: 'POST' }).catch(() => undefined);
    window.location.assign('/admin/login');
  };

  return (
    <MotionConfig reducedMotion="user"><div className="gmed-shell min-h-dvh bg-[#F6FAF8] pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-0 min-[1180px]:pl-[224px] selection:bg-[#D8F3E8] selection:text-[#0F1F1C]">
      <a href="#admin-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[300] focus:rounded-lg focus:bg-white focus:p-3">Skip to content</a>
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-[224px] flex-col border-r border-[#156253]/10 bg-white min-[1180px]:flex">
        <div className="flex h-[68px] items-center px-5"><Logo href="/admin" /></div>
        <div className="mx-4 mt-4 rounded-xl border border-[#156253]/10 bg-[#F6FAF8] p-3"><p className="text-[13px] font-semibold text-[#0F1F1C]">Pharmacy workspace</p><p className="mt-1 text-[11px] text-[#60756D]">Goregaon East · Mumbai</p></div>
        <p className="px-6 pb-2 pt-7 text-[10px] font-semibold uppercase tracking-[.16em] text-[#60756D]">Management</p>
        <nav aria-label="Workspace" className="space-y-1 px-3">{nav.map(item => { const active = isActive(pathname, item.href); return <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined} className={cn('relative flex h-11 items-center gap-3 rounded-xl px-3 text-[13px] font-medium', focusRing, active ? 'text-[#156253]' : 'text-[#52675F] hover:bg-[#F6FAF8]')}>
          {active && <motion.span layoutId="admin-rail" className="absolute inset-0 rounded-xl bg-[#D8F3E8]/60" transition={{ type: 'spring', stiffness: 450, damping: 38 }} />}
          <item.icon className="relative h-[18px] w-[18px]" aria-hidden /><span className="relative">{item.label}</span>
        </Link>; })}</nav>
        <div className="mt-auto border-t border-[#156253]/10 p-5"><p className="text-xs font-semibold text-[#0F1F1C]">GoregaonMeds Admin</p><p className="mt-1 text-[11px] text-[#60756D]">Orders, customers & care.</p></div>
      </aside>
      <style>{`.gmed-shell :where(button,a,input,select,textarea):focus-visible { outline:2px solid #156253;outline-offset:3px } .gmed-shell :where(button):disabled{cursor:not-allowed} @media(prefers-reduced-motion:reduce){.gmed-shell *, .gmed-shell *::before,.gmed-shell *::after{animation-duration:.01ms!important;transition-duration:.01ms!important}}`}</style>
      {/* Desktop Navigation */}
      <header className="sticky top-0 z-40 border-b border-[#156253]/[0.06] bg-[#FFFFFF]/70 backdrop-blur-xl supports-[backdrop-filter]:bg-[#FFFFFF]/60">
        <div className="mx-auto flex h-[68px] max-w-[1600px] items-center justify-between gap-6 px-5 sm:px-8">
          <div className="min-[1180px]:hidden"><Logo href="/admin" /></div>
          <div className="hidden min-[1180px]:block"><p className="text-xs text-[#60756D]">Workspace / <span className="font-semibold text-[#0F1F1C]">{nav.find(item => isActive(pathname, item.href))?.label ?? 'Admin'}</span></p></div>
          
          <nav className="hidden items-center gap-1.5 md:flex min-[1180px]:hidden" aria-label="Admin">
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
          disabled={loggingOut}
          aria-label="Log out"
            className={cn(
              'group flex h-9 items-center gap-2.5 rounded-lg px-3.5 text-[14px] font-medium text-[#64748B] transition-[color,background-color,box-shadow,transform] duration-200 motion-reduce:transition-none hover:bg-[#D8F3E8]/40 hover:text-[#0F1F1C] active:scale-[0.98]',
              focusRing
            )}
          >
            <LogOut className="h-[18px] w-[18px] opacity-80 group-hover:opacity-100" aria-hidden strokeWidth={2} /> 
            <span className="hidden sm:inline tracking-wide">Log out</span>
          </button>
        </div>
      </header>

      {/* Main Canvas */}
      <main id="admin-content" className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 sm:py-6">
        {ready ? (
          children
        ) : sessionError ? (
          <div role="alert" className="mx-auto my-16 max-w-md rounded-2xl border border-red-100 bg-white p-6 shadow-sm"><h1 className="font-semibold">Could not verify your session</h1><p className="mt-2 text-sm text-[#52675F]">{sessionError}</p><button type="button" onClick={() => setAttempt(v => v + 1)} className="mt-5 rounded-lg bg-[#156253] px-4 py-2 text-sm text-white">Try again</button></div>
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
    </div></MotionConfig>
  );
}

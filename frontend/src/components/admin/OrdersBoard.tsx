// src/components/admin/OrdersBoard.tsx
'use client';

import {
  createContext, forwardRef, memo, useCallback, useContext, useEffect,
  useId, useMemo, useRef, useState,
  type ButtonHTMLAttributes, type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import {
  AlertCircle, AlertTriangle, ArrowLeft, Ban, BellOff, CalendarDays,
  CheckCircle2, ChevronDown, ChevronRight, Clock3, CreditCard,
  ExternalLink, FileImage, Gift, Inbox, Info, LayoutPanelLeft, MapPin,
  PackageCheck, Phone, Plus, RefreshCw, Save, ShoppingBag,
  Trash2, TrendingUp, User, X, XCircle, Loader2, type LucideIcon,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Public API and existing domain contracts. Keep these exports stable.
// ---------------------------------------------------------------------------
export type OrderType = 'manual_text' | 'prescription_image';
export type OrderStatus = 'Pending' | 'Delivered' | 'Cancelled';
export interface MedicineItem { _id?: string; name: string; quantity: string; price?: number; isAvailable?: boolean; }
export interface Product {
  _id: string; name: string; category: string; description: string; price: number;
  imageUrl: string | null; isActive: boolean; inStock: boolean;
  createdAt?: string; updatedAt?: string;
}
export interface OrderProduct { _id?: string; productId?: string; name: string; price: number; quantity: number; }
export interface Address { flat: string; area: string; landmark: string; }
export interface PublicSettings { deliveryCharge: number; firstOrderOfferEnabled: boolean; firstOrderMinimumMedicineAmount: number; }
export interface AdminSettings extends PublicSettings { updatedAt?: string; }
export interface CreateOrderPayload {
  clientRequestId: string; customerName: string; mobileNumber: string; orderType: OrderType;
  medicines: MedicineItem[]; products?: OrderProduct[]; prescriptionUrl?: string;
  address: Address; offerOptIn: boolean;
}
export interface CreateOrderResponse { success: true; orderId: string; status: OrderStatus; telegramNotificationSent: boolean; }
export interface TrackedOrder {
  orderId: string; status: OrderStatus; statusLabel: string; orderType: OrderType;
  itemCount: number; placedAt: string; deliveredAt: string | null; paymentMethod: string;
  finalAmount: number | null; cancelReason: string | null; medicines?: MedicineItem[];
  products?: OrderProduct[]; medicineSubtotal?: number; nonMedicineSubtotal?: number;
  deliveryCharge?: number; discount?: number; offerApplied?: boolean;
}
export interface OfferEvaluation {
  eligible: boolean;
  checks: { offerEnabled: boolean; firstOrder: boolean; meetsMedicineThreshold: boolean; giftNotPreviouslyClaimed: boolean; };
  requiredMedicineAmount: number; eligibleMedicineSubtotal: number;
}
export interface CustomerSummary {
  fullName: string; mobileNumber: string; totalOrders: number; deliveredOrders: number;
  offerClaimed: boolean; offerClaimedOrderId: string | null; isFirstTimeCustomer?: boolean;
}
export interface AdminOrder {
  id: string; orderId: string; customerName: string; mobileNumber: string;
  orderType: OrderType; medicines: MedicineItem[]; products?: OrderProduct[];
  prescriptionUrl: string | null; address: Address; paymentMethod: string;
  medicineSubtotal: number; nonMedicineSubtotal: number; deliveryCharge: number;
  discount?: number; finalAmount: number; billedAt: string | null;
  offerOptIn: boolean; firstOrderAtCreation: boolean; previousOrders: number;
  offerEligible: boolean; offerApplied: boolean; offer: OfferEvaluation;
  status: OrderStatus; telegramNotificationSent: boolean; createdAt: string;
  deliveredAt: string | null; customer: CustomerSummary | null; cancelReason: string | null;
}
export interface Pagination { page: number; limit: number; total: number; totalPages: number; }
export const SUPPORT_PHONE_DISPLAY = '+91 84338 18771';
export const SUPPORT_PHONE_TEL = 'tel:+918433818771';
export const SERVICE_AREA = 'Goregaon East, Mumbai';
export const PAYMENT_LABEL = 'Pay when it arrives · Cash or UPI / QR at delivery';
export const GIFT = { name: 'Dr. Morepen GlucoOne BG-03', shortName: 'GlucoOne BG-03', mrp: 650, image: '/glucoone-bg03.png' } as const;
export const DEFAULT_PUBLIC_SETTINGS = { deliveryCharge: 0, firstOrderOfferEnabled: true, firstOrderMinimumMedicineAmount: 500 } as const;
export const BRANCHES = [
  { name: 'Apple Pharmacy', shortName: 'Apple Pharmacy', area: 'Aarey Road', address: 'Shop No. 9, Sheetal Krupa Building, Ground Floor, Aarey Road, Goregaon East, Mumbai', tone: 'apple', open24x7: false },
  { name: 'Lotus Pharmacy', shortName: 'Lotus Pharmacy', area: 'Jay Prakash Nagar', address: "Shop No. 10, Shreyas Bhavan, Jay Prakash Nagar Road No. 1, Opp. Domino's Pizza, Goregaon East, Mumbai", tone: 'lotus', open24x7: false },
  { name: 'Healthzone & Cosmetic', shortName: 'Healthzone', area: 'Aarey Road', address: 'Pednekar Chawl, Shop No. 3, Ground Floor, S.V. Aarey Road, Goregaon East, Mumbai', tone: 'health', open24x7: true },
] as const;
export const TONE_STYLES: Record<(typeof BRANCHES)[number]['tone'], { art: string; sign: string }> = {
  apple: { art: 'bg-[#e8eede]', sign: 'bg-[#315242]' },
  lotus: { art: 'bg-[#ece8dc]', sign: 'bg-[#78674d]' },
  health: { art: 'bg-[#e1ebe7]', sign: 'bg-[#4e7271]' },
};
export const ORDER_ID_PATTERN = /^GMED-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/;
export function cn(...classes: Array<string | false | null | undefined>) { return classes.filter(Boolean).join(' '); }

const rupees = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2, minimumFractionDigits: 0 });
const dateTime = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
const shortTime = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit' });
const shortDate = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', month: 'short', day: 'numeric' });
export const formatRupees = (amount: number) => rupees.format(amount);
export const formatDateTime = (iso: string) => dateTime.format(new Date(iso));
export const formatMobile = (mobile?: string | null) => (!mobile || typeof mobile !== 'string' ? 'N/A' : `+91 ${mobile.slice(0, 5)} ${mobile.slice(5)}`);
export function normalizeMobile(input: string): string | null {
  let digits = input.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}
export function cloudinaryThumb(url: string, width = 640) { return url.replace('/image/upload/', `/image/upload/c_limit,w_${width},q_auto,f_auto/`); }
export function isLateNightInMumbai(date = new Date()) {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', hour12: false }).format(date));
  return hour >= 22 || hour < 6;
}
export interface FieldIssue { path: string; message: string; }
export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly code: string, readonly fields: FieldIssue[] = []) {
    super(message); this.name = 'ApiError';
  }
  get isNetworkError() { return this.status === 0; }
}
interface RequestOptions { method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'; body?: unknown; signal?: AbortSignal; }
const NETWORK_MESSAGE = 'Could not reach GoregaonMeds. Check your connection and try again.';
export async function apiRequest<T>(path: string, { method = 'GET', body, signal }: RequestOptions = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method, signal, credentials: 'same-origin', cache: 'no-store',
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
    throw new ApiError(typeof error?.message === 'string' ? error.message : 'Something went wrong. Please try again.',
      response.status, typeof error?.code === 'string' ? error.code : 'UNKNOWN', Array.isArray(error?.fields) ? error.fields : []);
  }
  return data as T;
}
export function errorMessage(error: unknown) { return error instanceof Error ? error.message : 'Something went wrong. Please try again.'; }
type AdminOptions = Parameters<typeof apiRequest>[1];
export async function adminRequest<T>(path: string, options?: AdminOptions): Promise<T> {
  try { return await apiRequest<T>(`/admin${path}`, options); }
  catch (error) {
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

// ---------------------------------------------------------------------------
// Focused UI primitives and toast system (also exported for existing consumers)
// ---------------------------------------------------------------------------
type Variant = 'primary' | 'secondary' | 'ghost' | 'gift' | 'danger';
type Size = 'sm' | 'md' | 'lg';
const variants: Record<Variant, string> = {
  primary: 'bg-[#156253] text-white hover:bg-[#104c40] shadow-[0_2px_7px_rgba(21,98,83,.14)]',
  secondary: 'border border-[#dae6df] bg-white text-[#18322a] hover:bg-[#f3f9f5]',
  ghost: 'text-[#156253] hover:bg-[#ecf6f0]',
  gift: 'bg-amber-500 text-white hover:bg-amber-600',
  danger: 'bg-[#c73838] text-white hover:bg-[#a92828]',
};
const sizes: Record<Size, string> = {
  sm: 'min-h-9 rounded-lg px-3 text-xs gap-1.5',
  md: 'min-h-10 rounded-[10px] px-3.5 text-[13px] gap-2',
  lg: 'min-h-11 rounded-xl px-4 text-[13px] gap-2',
};
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> { variant?: Variant; size?: Size; loading?: boolean; icon?: ReactNode; }
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading = false, icon, className, children, disabled, type = 'button', ...props }, ref,
) {
  return <button {...props} ref={ref} type={type} disabled={disabled || loading} aria-busy={loading || undefined}
    className={cn('inline-flex shrink-0 select-none items-center justify-center font-semibold transition-[background-color,border-color,transform,box-shadow] duration-150',
      'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#156253] active:scale-[.985] motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-45 disabled:active:scale-100',
      variants[variant], sizes[size], className)}>
    {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : icon}{children}
  </button>;
});
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('relative overflow-hidden rounded-lg bg-[#e9f1eb]', className)}>
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent motion-reduce:animate-none" />
  </div>;
}
type ToastTone = 'success' | 'error' | 'info';
interface Toast { id: number; tone: ToastTone; message: string; }
interface ToastApi { success: (message: string) => void; error: (message: string) => void; info: (message: string) => void; }
const ToastContext = createContext<ToastApi | null>(null);
const toastIcons = { success: CheckCircle2, error: AlertTriangle, info: Info };
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const dismiss = useCallback((id: number) => setToasts(t => t.filter(item => item.id !== id)), []);
  const push = useCallback((tone: ToastTone, message: string) => {
    const id = ++nextId.current;
    setToasts(current => [...current.slice(-2), { id, tone, message }]);
    timers.current.push(setTimeout(() => dismiss(id), tone === 'error' ? 6000 : 3500));
  }, [dismiss]);
  const api = useMemo<ToastApi>(() => ({ success: m => push('success', m), error: m => push('error', m), info: m => push('info', m) }), [push]);
  return <ToastContext.Provider value={api}>
    {children}
    <div className="pointer-events-none fixed inset-x-3 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[150] flex flex-col items-end gap-2 sm:right-6 sm:left-auto">
      <AnimatePresence initial={false}>
        {toasts.map(toast => {
          const Icon = toastIcons[toast.tone];
          return <motion.div key={toast.id} role={toast.tone === 'error' ? 'alert' : 'status'}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            className="pointer-events-auto flex w-full max-w-[370px] items-start gap-3 rounded-xl border border-[#deebe3] bg-white px-4 py-3 shadow-[0_12px_40px_rgba(15,31,28,.13)]">
            <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', toast.tone === 'error' ? 'text-red-600' : 'text-[#156253]')} aria-hidden />
            <p className="flex-1 text-[13px] font-medium text-[#0f1f1c]">{toast.message}</p>
            <button type="button" className="rounded p-1 text-[#536961] hover:bg-[#f2f7f4]" aria-label="Dismiss notification" onClick={() => dismiss(toast.id)}><X className="h-4 w-4" /></button>
          </motion.div>;
        })}
      </AnimatePresence>
    </div>
  </ToastContext.Provider>;
}
export function useToast() { const context = useContext(ToastContext); if (!context) throw new Error('useToast must be used inside ToastProvider'); return context; }

const STATUS_TONES: Record<OrderStatus, { pill: string; dot: string }> = {
  Pending: { pill: 'bg-[#fff7e7] text-[#99630d] border-[#f8e4b8]', dot: 'bg-[#d69726]' },
  Delivered: { pill: 'bg-[#e9f7ee] text-[#156253] border-[#d2eadd]', dot: 'bg-[#16805d]' },
  Cancelled: { pill: 'bg-[#fff0ef] text-[#b43636] border-[#f4d3d0]', dot: 'bg-[#d65151]' },
};
export function OrderStatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  const tone = STATUS_TONES[status];
  return <span className={cn('inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-bold leading-none', tone.pill, className)}>
    <span className={cn('h-1.5 w-1.5 rounded-full', tone.dot)} aria-hidden />{status}
  </span>;
}
function formatOrderDay(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return `${shortDate.format(date)} · ${shortTime.format(date)}`;
}
function buildSummary(order: AdminOrder) {
  const count = order.medicines.length + (order.products?.length ?? 0);
  return order.orderType === 'prescription_image' ? 'Prescription uploaded' : `${count} ${count === 1 ? 'item' : 'items'}`;
}
export const CompactOrderCard = memo(function CompactOrderCard({ order, selected, onSelect }: {
  order: AdminOrder; selected: boolean; onSelect: (id: string, trigger: HTMLElement) => void;
}) {
  return <button type="button" onClick={event => onSelect(order.id, event.currentTarget)} aria-current={selected ? 'true' : undefined}
    className={cn('group relative flex w-full flex-col gap-1.5 border-b border-[#edf1ed] px-4 py-3.5 text-left outline-none transition-colors duration-150',
      'focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#156253] motion-reduce:transition-none',
      selected ? 'bg-[#edf7f0]' : 'bg-white hover:bg-[#f7faf8]')}>
    {selected && <span aria-hidden className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-[#156253]" />}
    <span className="flex min-w-0 items-center justify-between gap-2">
      <span className="truncate text-[14px] font-bold text-[#122a22]">{order.customerName}</span>
      <OrderStatusBadge status={order.status} />
    </span>
    <span className="flex min-w-0 items-center justify-between gap-2">
      <span className="shrink-0 font-mono text-[11px] font-semibold tracking-[.02em] text-[#156253]">{order.orderId}</span>
      <span className="truncate text-[11px] text-[#60736b]">{formatOrderDay(order.createdAt)}</span>
    </span>
    <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[#61746b]">
      {order.orderType === 'prescription_image' ? <FileImage className="h-3.5 w-3.5" aria-hidden /> : <ShoppingBag className="h-3.5 w-3.5" aria-hidden />}
      <span>{buildSummary(order)}</span><span aria-hidden>·</span>
      <span>{formatMobile(order.mobileNumber)}</span>
      {!order.telegramNotificationSent && <span title="Telegram notification failed" className="inline-flex items-center gap-1 text-amber-700"><BellOff className="h-3 w-3" />Alert failed</span>}
      {order.offerOptIn && order.firstOrderAtCreation && <span title="Gift requested" className="inline-flex items-center gap-1 text-[#986014]"><Gift className="h-3 w-3" />Gift</span>}
    </span>
  </button>;
});

// ---------------------------------------------------------------------------
// Analytics (all metrics sourced from the original overview endpoint)
// ---------------------------------------------------------------------------
interface AnalyticsData { totalSales: number; totalOrders: number; breakdown: { pending: number; delivered: number }; }
type RangeKind = 'today' | 'yesterday' | 'custom' | 'all-time';
function mumbaiDay(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const part = (type: string) => parts.find(p => p.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}
function shiftISODate(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}
export function AnalyticsOverview({ refreshKey = 0 }: { refreshKey?: number }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<RangeKind>('today');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [today, setToday] = useState('');
  const requestSeq = useRef(0);
  const lastRange = useRef('');

  useEffect(() => {
    const tick = () => setToday(current => {
      const next = mumbaiDay(); return current === next ? current : next;
    });
    tick();
    const timer = setInterval(tick, 60_000);
    return () => clearInterval(timer);
  }, []);
  const startDate = range === 'custom' ? from : range === 'today' ? today : today ? shiftISODate(today, -1) : '';
  const endDate = range === 'custom' ? to : startDate;
  const invalidRange = range === 'custom' && Boolean(from && to && from > to);
  const ready = range === 'all-time' || Boolean(startDate && endDate && !invalidRange);
  useEffect(() => {
    if (!ready) { setData(null); setLoading(false); return; }
    const id = ++requestSeq.current;
    const abort = new AbortController();
    const nextRange = `${range}|${startDate}|${endDate}`;
    if (nextRange !== lastRange.current) setData(null);
    lastRange.current = nextRange;
    setLoading(true); setError(null);
    adminRequest<{ success: boolean } & AnalyticsData>(range === 'all-time' ? '/analytics/overview?allTime=true' : `/analytics/overview?startDate=${startDate}&endDate=${endDate}`, { signal: abort.signal })
      .then(response => {
        if (abort.signal.aborted || id !== requestSeq.current) return;
        if (!response.success) throw new Error('Analytics endpoint returned an unsuccessful response.');
        setData({ totalSales: response.totalSales, totalOrders: response.totalOrders, breakdown: response.breakdown });
      })
      .catch(err => { if (id !== requestSeq.current || (err as Error).name === 'AbortError') return; setData(null); setError(errorMessage(err)); })
      .finally(() => { if (!abort.signal.aborted && id === requestSeq.current) setLoading(false); });
    return () => { abort.abort(); };
  }, [startDate, endDate, ready, refreshKey, range]);

  const cards: Array<{ title: string; value: string; icon: LucideIcon; detail: string; accent: string }> = [
    { title: 'Total sales', value: data ? formatRupees(data.totalSales) : '—', icon: TrendingUp, detail: 'Delivered revenue', accent: 'text-[#156253] bg-[#e8f5ee]' },
    { title: 'Total orders', value: data ? String(data.totalOrders) : '—', icon: ShoppingBag, detail: 'Orders placed', accent: 'text-[#456f93] bg-[#eaf3fb]' },
    { title: 'Pending', value: data ? String(data.breakdown.pending) : '—', icon: Clock3, detail: 'Awaiting completion', accent: 'text-[#a57220] bg-[#fff5e4]' },
    { title: 'Delivered', value: data ? String(data.breakdown.delivered) : '—', icon: PackageCheck, detail: 'Completed orders', accent: 'text-[#156253] bg-[#e8f5ee]' },
  ];
  return <section aria-label="Sales analytics" className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2"><span className="text-[12px] font-bold text-[#283e35]">Overview</span><span className="text-[11px] text-[#7b8e83]">· Selected period</span></div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative flex items-center">
          <CalendarDays className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-[#687d71]" aria-hidden />
          <span className="sr-only">Analytics date range</span>
          <select value={range} onChange={e => setRange(e.target.value as RangeKind)}
            className="h-9 appearance-none rounded-lg border border-[#dfe8e1] bg-white pl-9 pr-8 text-[12px] font-semibold text-[#284238] outline-none hover:bg-[#f9fbf9] focus-visible:ring-2 focus-visible:ring-[#156253]">
            <option value="today">Today</option><option value="yesterday">Yesterday</option><option value="custom">Custom range</option><option value="all-time">All time</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-[#63796b]" aria-hidden />
        </label>
        {range === 'custom' && <div className="flex min-w-0 flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-[11px] text-[#566e60]">From
            <input type="date" value={from} max={to || undefined} onChange={e => setFrom(e.target.value)} className="h-9 max-w-[145px] rounded-lg border border-[#dfe8e1] bg-white px-2 text-[12px] text-[#20372d] focus-visible:outline-[#156253]" />
          </label>
          <label className="flex items-center gap-1.5 text-[11px] text-[#566e60]">To
            <input type="date" value={to} min={from || undefined} onChange={e => setTo(e.target.value)} className="h-9 max-w-[145px] rounded-lg border border-[#dfe8e1] bg-white px-2 text-[12px] text-[#20372d] focus-visible:outline-[#156253]" />
          </label>
        </div>}
      </div>
    </div>
    {invalidRange && <p role="alert" className="text-xs text-red-700">End date must be on or after start date.</p>}
    {range === 'custom' && !from && <p className="text-xs text-[#718477]">Choose a start and end date to see results.</p>}
    {error && <p role="alert" className="flex flex-wrap items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700"><AlertTriangle className="h-4 w-4" />{error}</p>}
    <div className="grid grid-cols-2 gap-2.5 min-[760px]:grid-cols-4 min-[1180px]:gap-3">
      {cards.map(card => <div key={card.title} className="group flex min-h-[100px] min-w-0 flex-col justify-between rounded-[14px] border border-[#e5ece6] bg-white p-3.5 shadow-[0_1px_3px_rgba(15,31,28,.025)] transition-[border-color,box-shadow] hover:border-[#cddfd2] hover:shadow-[0_4px_14px_rgba(15,31,28,.035)] motion-reduce:transition-none">
        <div className="flex items-center gap-2.5">
          <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-[9px]', card.accent)}><card.icon className="h-4 w-4" aria-hidden /></span>
          <span className="truncate text-[12px] font-semibold text-[#52695e]">{card.title}</span>
        </div>
        {loading && !data ? <Skeleton className="mt-3 h-7 w-28" /> : <div className="truncate font-display text-[clamp(20px,2.1vw,28px)] font-bold leading-8 tracking-tight tabular-nums text-[#142b21]" title={card.value}>{card.value}</div>}
        <span className="truncate text-[10px] text-[#74867a]">{card.detail}</span>
      </div>)}
    </div>
  </section>;
}

// ---------------------------------------------------------------------------
// POS-style billing editor. Individual prices are line totals: do not multiply
// them by quantity. Product prices are entered line totals, matching the existing API.
// ---------------------------------------------------------------------------
const AMOUNT_PATTERN = /^\d{1,7}(\.\d{1,2})?$/;
const parseAmount = (value: string): number | null => AMOUNT_PATTERN.test(value.trim()) ? Number(value) : null;
const toInput = (value: number, billed: boolean) => billed ? String(value) : '';
const CHECK_LABELS: Record<keyof OfferEvaluation['checks'], string> = {
  offerEnabled: 'Offer enabled', firstOrder: 'First order',
  meetsMedicineThreshold: 'Medicine threshold', giftNotPreviouslyClaimed: 'Gift not previously claimed',
};
interface BillingPanelProps {
  order: AdminOrder; deliveryCharge: number; onUpdated: (order: AdminOrder) => void;
  onDelivered: (order: AdminOrder) => void; actionsTarget?: HTMLElement | null;
  onDirtyChange?: (dirty: boolean) => void;
  billingEnabled?: boolean;
}
interface MedicineInput { key: string; _id?: string; name: string; quantity: string; price: string; isAvailable: boolean; }
interface ProductInput { key: string; _id?: string; productId?: string; name: string; quantity: string; price: string; }
interface BillingDraft { medicines: MedicineInput[]; products: ProductInput[]; misc: string; discount: string; giftIncluded: boolean; }
function draftFromOrder(order: AdminOrder): BillingDraft {
  const billed = Boolean(order.billedAt);
  const miscellaneous = order.nonMedicineSubtotal;
  return {
    medicines: order.medicines.map((m, i) => ({ key: m._id ?? `initial-m-${i}`, _id: m._id, name: m.name, quantity: m.quantity,
      price: toInput(m.price ?? 0, billed), isAvailable: m.isAvailable ?? true })),
    products: (order.products ?? []).map((p, i) => ({ key: p._id ?? `initial-p-${i}`, _id: p._id, productId: p.productId,
      name: p.name, quantity: String(p.quantity ?? 1), price: toInput(p.price ?? 0, billed) })),
    misc: toInput(miscellaneous, billed), discount: toInput(order.discount ?? 0, billed), giftIncluded: order.offerApplied,
  };
}
function AmountInput({ id, label, value, onChange, disabled = false }: {
  id: string; label: string; value: string; onChange: (value: string) => void; disabled?: boolean;
}) {
  const invalid = value.trim() !== '' && parseAmount(value) === null;
  return <label htmlFor={id} className="block min-w-0">
    <span className="mb-1 block text-[11px] font-semibold text-[#53695e]">{label}</span>
    <span className={cn('flex h-9 min-w-0 items-center overflow-hidden rounded-lg border bg-white focus-within:ring-2 focus-within:ring-[#156253]/25', invalid ? 'border-red-400' : 'border-[#dce8df]', disabled && 'opacity-50')}>
      <span className="pl-2.5 text-[12px] font-semibold text-[#658072]">₹</span>
      <input id={id} type="text" inputMode="decimal" autoComplete="off" disabled={disabled} value={value}
        onChange={e => onChange(e.target.value.replace(/[^\d.]/g, ''))} placeholder="0.00" aria-invalid={invalid || undefined}
        className="h-full min-w-0 w-full bg-transparent px-2 text-right text-[13px] font-semibold tabular-nums text-[#173127] outline-none placeholder:text-[#a6b6ac]" />
    </span>
  </label>;
}
const fieldClass = 'min-h-9 min-w-0 w-full rounded-lg border border-[#dce8df] bg-white px-2.5 text-[12px] font-medium text-[#173127] outline-none placeholder:text-[#9bad9f] focus:border-[#156253] focus:ring-2 focus:ring-[#156253]/15';
const isWholeQuantity = (value: string) => value.trim() !== '' && parseInt(value) > 0;
export function BillingPanel({ order, deliveryCharge, onUpdated, onDelivered, actionsTarget, onDirtyChange, billingEnabled = true }: BillingPanelProps) {
  const toast = useToast();
  const instanceId = useId().replace(/:/g, '');
  const counter = useRef(0);
  const [draft, setDraft] = useState<BillingDraft>(() => draftFromOrder(order));
  const [baseline, setBaseline] = useState<BillingDraft>(() => draftFromOrder(order));
  const [saving, setSaving] = useState(false);
  const [delivering, setDelivering] = useState(false);
  const [confirmDelivery, setConfirmDelivery] = useState(false);
  const [expandedGift, setExpandedGift] = useState(false);
  const inFlight = useRef(false);

  useEffect(() => {
    const next = draftFromOrder(order);
    setDraft(next); setBaseline(next); setConfirmDelivery(false);
  }, [order]);
  const updateMedicine = <K extends keyof MedicineInput>(index: number, field: K, value: MedicineInput[K]) =>
    setDraft(prev => ({ ...prev, medicines: prev.medicines.map((m, i) => i === index ? { ...m, [field]: value } : m) }));
  const updateProduct = <K extends keyof ProductInput>(index: number, field: K, value: ProductInput[K]) =>
    setDraft(prev => ({ ...prev, products: prev.products.map((p, i) => i === index ? { ...p, [field]: value } : p) }));
  const addMedicine = () => setDraft(prev => ({ ...prev, medicines: [...prev.medicines, { key: `new-m-${++counter.current}`, name: '', quantity: '1', price: '', isAvailable: true }] }));
  const removeMedicine = (index: number) => setDraft(prev => ({ ...prev, medicines: prev.medicines.filter((_, i) => i !== index) }));
  const addProduct = () => setDraft(prev => ({ ...prev, products: [...prev.products, { key: `new-p-${++counter.current}`, name: '', quantity: '1', price: '' }] }));
  const removeProduct = (index: number) => setDraft(prev => ({ ...prev, products: prev.products.filter((_, i) => i !== index) }));
  const setMisc = (value: string) => setDraft(prev => ({ ...prev, misc: value }));
  const setDiscount = (value: string) => setDraft(prev => ({ ...prev, discount: value }));
  const setGift = (value: boolean) => setDraft(prev => ({ ...prev, giftIncluded: value }));

  const medicineSubtotal = draft.medicines.reduce((sum, m) => sum + (m.isAvailable ? (parseAmount(m.price) ?? 0) : 0), 0);
  const productSubtotal = draft.products.reduce((sum, p) => sum + (parseAmount(p.price) ?? 0), 0);
  const miscAmount = draft.misc.trim() === '' ? 0 : parseAmount(draft.misc);
  const discountAmount = draft.discount.trim() === '' ? 0 : parseAmount(draft.discount);
  const nonMedicineSubtotal = productSubtotal + (miscAmount ?? 0);
  const gross = medicineSubtotal + nonMedicineSubtotal + deliveryCharge;
  const appliedDiscount = Math.min(discountAmount ?? 0, gross);
  const finalAmount = Math.round((gross - appliedDiscount) * 100) / 100;
  const medicineValid = draft.medicines.every(m => m.name.trim() && m.quantity.trim() && (!m.isAvailable || (m.price.trim() !== '' && parseAmount(m.price) !== null)));
  const productsValid = draft.products.every(p => p.name.trim() && isWholeQuantity(p.quantity) && p.price.trim() !== '' && parseAmount(p.price) !== null);
  const valid = Boolean(medicineValid && productsValid && miscAmount !== null && discountAmount !== null &&
    Number.isFinite(deliveryCharge) && deliveryCharge >= 0);
  const checks = { ...order.offer.checks, meetsMedicineThreshold: medicineSubtotal >= order.offer.requiredMedicineAmount };
  const eligible = Object.values(checks).every(Boolean);
  const effectiveGift = eligible && draft.giftIncluded;
  const baselineGift = baseline.giftIncluded;
  const changed = JSON.stringify({ ...draft, giftIncluded: effectiveGift }) !== JSON.stringify({ ...baseline, giftIncluded: baselineGift });
  const requiresSave = !order.billedAt || changed || deliveryCharge !== order.deliveryCharge;
  useEffect(() => { onDirtyChange?.(changed || saving || delivering); }, [changed, saving, delivering, onDirtyChange]);
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);

  const saveBill = async () => {
    if (inFlight.current || !billingEnabled) return;
    if (!valid) { toast.error('Check item names, quantities, prices, discount and miscellaneous charges.'); return; }
    inFlight.current = true; setSaving(true);
    try {
      const payload = {
        medicines: draft.medicines.map(m => ({ _id: m._id, name: m.name.trim(), quantity: m.quantity.trim(), price: m.isAvailable ? parseAmount(m.price) ?? 0 : 0, isAvailable: m.isAvailable })),
        products: draft.products.map(p => ({ _id: p._id, productId: p.productId, name: p.name.trim(), quantity: parseInt(p.quantity) || 1, price: parseAmount(p.price) ?? 0 })),
        nonMedicineSubtotal, discount: discountAmount, offerApplied: effectiveGift,
      };
      const res = await adminRequest<{ order: AdminOrder }>(`/orders/${order.id}/billing`, { method: 'PATCH', body: payload });
      const next = draftFromOrder(res.order);
      setDraft(next); setBaseline(next); onUpdated(res.order);
      toast.success(res.order.offerEligible ? 'Bill saved · Gift eligible' : 'Bill saved successfully');
    } catch (err) { toast.error(errorMessage(err)); }
    finally { inFlight.current = false; setSaving(false); }
  };
  const deliver = async () => {
    if (inFlight.current || requiresSave || !valid || !billingEnabled) return;
    inFlight.current = true; setDelivering(true);
    try {
      const res = await adminRequest<{ order: AdminOrder }>(`/orders/${order.id}/deliver`, { method: 'PATCH' });
      toast.success(`${res.order.orderId} marked as delivered`);
      onDelivered(res.order);
    } catch (err) { toast.error(errorMessage(err)); setConfirmDelivery(false); }
    finally { inFlight.current = false; setDelivering(false); }
  };
  const actions = <div className="space-y-2">
    <div className="grid grid-cols-2 gap-2.5">
      <Button variant="secondary" size="lg" onClick={() => void saveBill()} loading={saving} disabled={!valid || delivering || !billingEnabled} icon={<Save className="h-4 w-4" />} className="min-w-0">Save bill</Button>
      {confirmDelivery ? <div className="flex min-w-0 gap-1.5">
        <Button variant="secondary" size="sm" onClick={() => setConfirmDelivery(false)} disabled={delivering} className="min-w-0 flex-1 px-1.5">Back</Button>
        <Button size="sm" onClick={() => void deliver()} loading={delivering} disabled={requiresSave || !valid || !billingEnabled} className="min-w-0 flex-1 px-1.5">Confirm</Button>
      </div> : <Button size="lg" onClick={() => setConfirmDelivery(true)} disabled={requiresSave || !valid || saving || delivering || !billingEnabled} icon={<PackageCheck className="h-4 w-4" />} className="min-w-0">Mark delivered</Button>}
    </div>
    {confirmDelivery ? <p role="status" className="rounded-lg bg-[#eef7f1] p-2 text-[11px] text-[#245a43]">Confirm that payment has been collected{order.offerApplied ? ` and the free ${GIFT.shortName} was handed over` : ''}.</p>
      : requiresSave ? <p className="text-center text-[11px] text-[#788a7c]">Save the bill before marking the order delivered.</p> : null}
  </div>;

  return <div className="space-y-5">
    <section aria-label="Medicine billing" className="space-y-2.5">
      <div className="flex items-center justify-between gap-3"><h4 className="text-[13px] font-bold text-[#233c30]">Medicines <span className="font-medium text-[#83948a]">({draft.medicines.length})</span></h4>
        <Button variant="ghost" size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={addMedicine}>Add medicine</Button></div>
      {draft.medicines.length === 0 && <p className="rounded-lg border border-dashed border-[#dce8df] px-3 py-4 text-center text-xs text-[#728579]">No medicines added. Add an item to bill it.</p>}
      <div className="space-y-2">
        {draft.medicines.map((m, i) => <div key={m.key} className={cn('rounded-xl border p-2.5 transition-colors', m.isAvailable ? 'border-[#e3eae4] bg-[#fbfdfb]' : 'border-[#e9ece9] bg-[#f6f7f5]')}>
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
            <label className="min-w-0"><span className="sr-only">Medicine name {i + 1}</span>
              <input value={m.name} onChange={e => updateMedicine(i, 'name', e.target.value)} placeholder="Medicine name" className={cn(fieldClass, 'font-semibold', !m.isAvailable && 'text-[#77877c] line-through')} />
            </label>
            {!m._id && <button type="button" onClick={() => removeMedicine(i)} aria-label={`Remove medicine ${i + 1}`} title="Remove medicine" className="grid h-9 w-9 place-items-center rounded-lg text-[#a25a5a] hover:bg-red-50 focus-visible:outline-[#156253]"><Trash2 className="h-4 w-4" /></button>}
          </div>
          <div className="mt-2 grid grid-cols-[minmax(0,1fr)_minmax(96px,.65fr)_auto] items-end gap-2">
            <label className="min-w-0"><span className="mb-1 block text-[11px] font-semibold text-[#53695e]">Quantity</span>
              <input value={m.quantity} onChange={e => updateMedicine(i, 'quantity', e.target.value)} className={fieldClass} placeholder="1 strip" />
            </label>
            <AmountInput id={`${instanceId}-med-${m.key}`} label="Line price" value={m.price} disabled={!m.isAvailable} onChange={value => updateMedicine(i, 'price', value)} />
            <label className="flex h-9 cursor-pointer items-center gap-1.5 rounded-lg px-1 text-[11px] text-[#53695e]" title="Medicine available">
              <input type="checkbox" checked={m.isAvailable} onChange={e => updateMedicine(i, 'isAvailable', e.target.checked)} className="h-4 w-4 accent-[#156253]" />
              <span className="sr-only min-[720px]:not-sr-only">Stock</span>
            </label>
          </div>
        </div>)}
      </div>
    </section>
    <section aria-label="Other product billing" className="space-y-2.5">
      <div className="flex items-center justify-between gap-3"><h4 className="text-[13px] font-bold text-[#233c30]">Other products <span className="font-medium text-[#83948a]">({draft.products.length})</span></h4>
        <Button variant="ghost" size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={addProduct}>Add product</Button></div>
      {draft.products.length === 0 && <p className="text-[11px] text-[#788a7e]">No other products on this order.</p>}
      <div className="space-y-2">
        {draft.products.map((p, i) => <div key={p.key} className="rounded-xl border border-[#e3eae4] bg-[#fbfdfb] p-2.5">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <label className="min-w-0"><span className="sr-only">Product name {i + 1}</span><input className={cn(fieldClass, 'font-semibold')} value={p.name} placeholder="Product name" onChange={e => updateProduct(i, 'name', e.target.value)} /></label>
            <button type="button" aria-label={`Remove product ${i + 1}`} onClick={() => removeProduct(i)} className="grid h-9 w-9 place-items-center rounded-lg text-[#a25a5a] hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <label><span className="mb-1 block text-[11px] font-semibold text-[#53695e]">Quantity</span>
              <input type="text" inputMode="numeric" className={fieldClass} value={p.quantity} onChange={e => updateProduct(i, 'quantity', e.target.value.replace(/\D/g, ''))} aria-invalid={!isWholeQuantity(p.quantity)} /></label>
            <AmountInput id={`${instanceId}-prod-${p.key}`} label="Line price" value={p.price} onChange={value => updateProduct(i, 'price', value)} />
          </div>
        </div>)}
      </div>
    </section>
    <section aria-label="Financial summary" className="overflow-hidden rounded-xl border border-[#dce8df] bg-white">
      <div className="grid grid-cols-2 gap-2.5 border-b border-[#edf1ec] p-3.5">
        <AmountInput id={`${instanceId}-misc`} label="Misc. charges" value={draft.misc} onChange={setMisc} />
        <AmountInput id={`${instanceId}-discount`} label="Discount" value={draft.discount} onChange={setDiscount} />
      </div>
      <dl className="space-y-2.5 p-3.5 text-[12px]">
        <div className="flex items-center justify-between gap-3"><dt className="text-[#667a6d]">Medicines</dt><dd className="font-semibold tabular-nums">{formatRupees(medicineSubtotal)}</dd></div>
        <div className="flex items-center justify-between gap-3"><dt className="text-[#667a6d]">Products & misc.</dt><dd className="font-semibold tabular-nums">{formatRupees(nonMedicineSubtotal)}</dd></div>
        <div className="flex items-center justify-between gap-3"><dt className="text-[#667a6d]">Delivery fee</dt><dd className="font-semibold tabular-nums">{deliveryCharge === 0 ? 'Free' : formatRupees(deliveryCharge)}</dd></div>
        <div className="flex items-center justify-between gap-3"><dt className="text-[#667a6d]">Discount</dt><dd className="font-semibold tabular-nums text-[#156253]">−{formatRupees(appliedDiscount)}</dd></div>
        <div className="flex items-center justify-between gap-3 border-t border-[#e9f0e9] pt-3"><dt className="text-[13px] font-bold text-[#223f30]">Amount payable</dt><dd className="font-display text-[23px] font-bold tracking-tight tabular-nums text-[#156253]">{valid ? formatRupees(finalAmount) : '—'}</dd></div>
        {discountAmount !== null && discountAmount > gross && <p role="alert" className="text-[11px] text-red-700">Discount preview is capped at the order total.</p>}
        <p className="text-[10px] text-[#859589]">Payment collected at delivery · Cash or UPI</p>
      </dl>
    </section>
    <section className="overflow-hidden rounded-xl border border-[#dfebe2] bg-[#f9fcf9]">
      <button type="button" onClick={() => setExpandedGift(v => !v)} aria-expanded={expandedGift}
        className="flex w-full items-center justify-between gap-3 p-3.5 text-left focus-visible:outline-[#156253]">
        <span className="flex min-w-0 items-center gap-2"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#e7f4e8] text-[#156253]"><Gift className="h-4 w-4" /></span>
          <span className="min-w-0"><span className="block truncate text-[12px] font-bold text-[#183e2d]">First-order gift</span><span className="block truncate text-[11px] text-[#688274]">{GIFT.shortName}</span></span>
        </span>
        <span className="flex shrink-0 items-center gap-2"><span className={cn('rounded-md px-2 py-1 text-[10px] font-bold', eligible ? 'bg-[#dff4e7] text-[#176044]' : 'bg-[#ecefeb] text-[#68786e]')}>{eligible ? 'Eligible' : 'Not eligible'}</span>
          <ChevronDown className={cn('h-4 w-4 text-[#779083] transition-transform', expandedGift && 'rotate-180')} />
        </span>
      </button>
      {expandedGift && <div className="space-y-2 border-t border-[#e5eee6] px-3.5 pb-3.5 pt-3">
        <p className="text-[11px] text-[#667d6c]">Requires {formatRupees(order.offer.requiredMedicineAmount)} in eligible medicines.</p>
        <div className="grid grid-cols-1 gap-1.5 min-[500px]:grid-cols-2">
          {(Object.keys(CHECK_LABELS) as Array<keyof OfferEvaluation['checks']>).map(key => <span key={key} className="flex items-center gap-1.5 text-[11px] text-[#52675a]">
            {checks[key] ? <CheckCircle2 className="h-3.5 w-3.5 text-[#156253]" /> : <XCircle className="h-3.5 w-3.5 text-[#a7b3a8]" />}{CHECK_LABELS[key]}
          </span>)}
        </div>
      </div>}
      <label className={cn('flex min-h-11 items-center gap-2.5 border-t border-[#e5eee6] px-3.5 text-[12px] font-semibold text-[#274537]', !eligible && 'cursor-not-allowed opacity-55')}>
        <input type="checkbox" className="h-4 w-4 accent-[#156253]" checked={effectiveGift} disabled={!eligible} onChange={e => setGift(e.target.checked)} />
        Include free gift with delivery
      </label>
    </section>
    {actionsTarget === undefined ? actions : actionsTarget ? createPortal(actions, actionsTarget) : null}
  </div>;
}

// ---------------------------------------------------------------------------
// Detail inspector: one DOM subtree, inline on wide screens / modal on small.
// The billing form never gets duplicated across breakpoint transitions.
// ---------------------------------------------------------------------------
const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
function trapTab(event: ReactKeyboardEvent<HTMLElement>) {
  if (event.key !== 'Tab') return;
  const nodes = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(el => el.getClientRects().length > 0);
  if (!nodes.length) return;
  const first = nodes[0], last = nodes[nodes.length - 1], active = document.activeElement;
  if (event.shiftKey && (active === first || !event.currentTarget.contains(active))) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && (active === last || !event.currentTarget.contains(active))) { event.preventDefault(); first.focus(); }
}
function useDesktopBreakpoint() {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(min-width: 1180px)');
    const update = () => setDesktop(media.matches);
    update(); media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return desktop;
}
function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const oldOverflow = document.body.style.overflow;
    const oldPadding = document.body.style.paddingRight;
    const width = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (width > 0) document.body.style.paddingRight = `${width}px`;
    return () => { document.body.style.overflow = oldOverflow; document.body.style.paddingRight = oldPadding; };
  }, [locked]);
}
function safePrescriptionURL(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' && (url.hostname === 'res.cloudinary.com' || url.hostname.endsWith('.cloudinary.com')) ? url.href : null;
  } catch { return null; }
}
function buildWhatsappLink(order: AdminOrder): string | null {
  const mobile = normalizeMobile(order.mobileNumber);
  if (!order.cancelReason || !mobile) return null;
  const message = encodeURIComponent(`Hi ${order.customerName},\n\nUnfortunately, your GoregaonMeds order #${order.orderId} had to be cancelled.\n\nReason: ${order.cancelReason}\n\nWe apologize for the inconvenience.`);
  return `https://wa.me/91${mobile}?text=${message}`;
}
function Section({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) {
  const id = useId();
  return <section aria-labelledby={id} className="min-w-0 rounded-xl border border-[#e5ece6] bg-white p-3.5 sm:p-4">
    <h3 id={id} className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.07em] text-[#688072]">{icon}{title}</h3>
    {children}
  </section>;
}
function Stat({ label, children }: { label: string; children: ReactNode }) {
  return <div className="min-w-0 rounded-lg bg-[#f4f8f5] p-2.5"><dt className="text-[10px] text-[#6b8274]">{label}</dt><dd className="mt-1 truncate text-[13px] font-bold tabular-nums text-[#223e30]">{children}</dd></div>;
}
function SummaryRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <div className={cn('flex items-center justify-between gap-3', strong && 'border-t border-[#e8ede7] pt-3')}>
    <dt className={cn(strong ? 'text-[13px] font-bold text-[#243c30]' : 'text-[12px] text-[#627768]')}>{label}</dt>
    <dd className={cn('text-right tabular-nums', strong ? 'text-[21px] font-bold text-[#156253]' : 'text-[12px] font-semibold text-[#263c31]')}>{value}</dd>
  </div>;
}
function BillSummary({ order }: { order: AdminOrder }) {
  if (order.status !== 'Delivered' && !order.billedAt) return <Section title="Final bill" icon={<CreditCard className="h-4 w-4" />}><p className="text-xs text-[#75867c]">No bill was saved before cancellation.</p></Section>;
  return <Section title={order.status === 'Delivered' ? 'Final bill' : 'Saved bill'} icon={<CreditCard className="h-4 w-4" />}>
    <dl className="space-y-2.5">
      <SummaryRow label="Medicines" value={formatRupees(order.medicineSubtotal)} />
      <SummaryRow label="Products & misc." value={formatRupees(order.nonMedicineSubtotal)} />
      <SummaryRow label="Delivery fee" value={formatRupees(order.deliveryCharge)} />
      <SummaryRow label="Discount" value={`−${formatRupees(order.discount ?? 0)}`} />
      <SummaryRow label="Final amount" value={formatRupees(order.finalAmount)} strong />
    </dl>
    <p className="mt-3 flex items-center gap-2 rounded-lg bg-[#f1f7f2] px-3 py-2 text-[11px] text-[#587566]"><Gift className="h-3.5 w-3.5" />{order.offerApplied ? `Free ${GIFT.shortName} included` : 'No gift applied'}</p>
    {order.deliveredAt && <p className="mt-2 text-[11px] text-[#668070]">Delivered: {formatDateTime(order.deliveredAt)}</p>}
  </Section>;
}
const CUSTOM_REASON = 'Other (Custom Reason)';
const CANCEL_REASONS = ['Medicine Out of Stock', 'Delivery partner unavailable right now', 'Incomplete or Invalid Prescription', 'Out of delivery coverage area', CUSTOM_REASON] as const;
interface CancelDialogProps { order: AdminOrder; onClose: () => void; onCancelled: (order: AdminOrder) => void; }
function CancelOrderDialog({ order, onClose, onCancelled }: CancelDialogProps) {
  const toast = useToast();
  const titleId = useId();
  const descriptionId = useId();
  const customId = useId();
  const groupId = useId();
  const firstRef = useRef<HTMLInputElement>(null);
  const customRef = useRef<HTMLTextAreaElement>(null);
  const sending = useRef(false);
  const [reason, setReason] = useState<string | null>(null);
  const [custom, setCustom] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const finalReason = reason === CUSTOM_REASON ? custom.trim() : reason ?? '';
  const canSubmit = finalReason.length > 0 && finalReason.length <= 500;
  useBodyScrollLock(true);
  useEffect(() => { firstRef.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => { if (reason === CUSTOM_REASON) customRef.current?.focus({ preventScroll: true }); }, [reason]);
  const submit = async () => {
    if (!canSubmit || sending.current) return;
    sending.current = true; setSubmitting(true);
    try {
      const res = await adminRequest<{ order: AdminOrder }>(`/orders/${order.id}/cancel`, { method: 'PATCH', body: { cancelReason: finalReason } });
      toast.success('Order cancelled'); onCancelled(res.order);
    } catch (err) { toast.error(errorMessage(err)); }
    finally { sending.current = false; setSubmitting(false); }
  };
  const onKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); if (!submitting) onClose(); }
    else trapTab(event);
  };
  const content = <div className="fixed inset-0 z-[130] grid place-items-center overflow-y-auto p-3 sm:p-6">
    <motion.div aria-hidden initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={submitting ? undefined : onClose} className="absolute inset-0 bg-[#0e241b]/50 backdrop-blur-[3px]" />
    <motion.div role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} onKeyDown={onKeyDown}
      initial={{ opacity: 0, y: 14, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: .98 }}
      transition={{ duration: .18 }} className="relative my-auto max-h-[min(90dvh,760px)] w-full max-w-[490px] overflow-y-auto rounded-[20px] bg-white p-5 shadow-2xl sm:p-7">
      <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-[#fcebea] text-[#b83c39]"><AlertTriangle className="h-5 w-5" /></div>
      <h2 id={titleId} className="text-[19px] font-bold tracking-tight text-[#1b3126]">Cancel {order.orderId}?</h2>
      <p id={descriptionId} className="mt-1.5 text-[12px] leading-relaxed text-[#64756a]">This action will permanently mark the order as cancelled. The reason will be visible to {order.customerName}. Unsaved billing edits will not be applied.</p>
      <fieldset disabled={submitting} className="mt-5 space-y-2"><legend className="mb-2 text-xs font-bold text-[#3d5747]">Cancellation reason</legend>
        {CANCEL_REASONS.map((option, i) => <label key={option} className={cn('flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-[12px] font-medium transition-colors', reason === option ? 'border-[#156253] bg-[#ecf6ef] text-[#183c2c]' : 'border-[#e4eae5] text-[#405749] hover:bg-[#f7faf8]')}>
          <input ref={i === 0 ? firstRef : undefined} type="radio" name={groupId} value={option} checked={reason === option} onChange={() => setReason(option)} className="h-4 w-4 accent-[#156253]" />{option}
        </label>)}
      </fieldset>
      {reason === CUSTOM_REASON && <label htmlFor={customId} className="mt-3 block text-[11px] font-bold text-[#405749]">Custom reason
        <textarea id={customId} ref={customRef} value={custom} onChange={e => setCustom(e.target.value)} maxLength={500} rows={3} placeholder="Explain the reason…" className={cn(fieldClass, 'mt-1.5 w-full resize-none py-2.5')} />
      </label>}
      <div className="mt-6 grid grid-cols-2 gap-2.5">
        <Button variant="secondary" size="lg" disabled={submitting} onClick={onClose}>Keep order</Button>
        <Button variant="danger" size="lg" loading={submitting} disabled={!canSubmit} onClick={() => void submit()}>Cancel order</Button>
      </div>
    </motion.div>
  </div>;
  return typeof document === 'undefined' ? null : createPortal(content, document.body);
}
interface OrderSidePanelProps {
  order: AdminOrder | null; deliveryCharge: number; open: boolean; onClose: () => void;
  onUpdated: (order: AdminOrder) => void; onDelivered: (order: AdminOrder) => void;
  onCancelled: (order: AdminOrder) => void;
  /** Optional: render inline at >=1180px, and as an overlay below that width. */
  inline?: boolean;
  /** True when the current order has unsaved edits or a mutation in flight. */
  onDirtyChange?: (dirty: boolean) => void;
  billingEnabled?: boolean;
}
export function OrderSidePanel({ order, deliveryCharge, open, onClose, onUpdated, onDelivered, onCancelled, inline = true, onDirtyChange, billingEnabled = true }: OrderSidePanelProps) {
  const desktop = useDesktopBreakpoint();
  const inlineDesktop = inline && desktop;
  const modalOpen = open && !inlineDesktop;
  const headerId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const lastOrder = useRef<AdminOrder | null>(null);
  if (order) lastOrder.current = order;
  const shown = order ?? lastOrder.current;
  const [cancelOpen, setCancelOpen] = useState(false);
  const [actionsTarget, setActionsTarget] = useState<HTMLDivElement | null>(null);
  useBodyScrollLock(modalOpen);
  useEffect(() => { if (!open) setCancelOpen(false); }, [open]);
  useEffect(() => { if (modalOpen) closeRef.current?.focus({ preventScroll: true }); }, [modalOpen]);
  useEffect(() => {
    if (!modalOpen || cancelOpen) return;
    const onEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) { event.preventDefault(); onClose(); }
    };
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [modalOpen, cancelOpen, onClose]);
  useEffect(() => { if (order?.id) panelRef.current?.querySelector('[data-detail-scroll]')?.scrollTo({ top: 0 }); }, [order?.id]);
  const closeCancel = () => { setCancelOpen(false); requestAnimationFrame(() => cancelRef.current?.focus({ preventScroll: true })); };
  const finishCancel = (updated: AdminOrder) => { setCancelOpen(false); onCancelled(updated); };
  const safeImage = shown ? safePrescriptionURL(shown.prescriptionUrl) : null;
  const whatsapp = shown ? buildWhatsappLink(shown) : null;

  return <>
    {modalOpen && <div aria-hidden className="fixed inset-0 z-[78] bg-[#0b2119]/40 backdrop-blur-[2px]" onClick={onClose} />}
    <div ref={panelRef} role={modalOpen ? 'dialog' : undefined} aria-modal={modalOpen ? true : undefined} aria-labelledby={shown && open ? headerId : undefined}
      onKeyDown={event => { if (modalOpen && !cancelOpen) trapTab(event); }}
      className={cn('flex min-h-0 flex-col overflow-hidden bg-[#f9fbf9]',
        inline ? 'fixed inset-0 z-[80] h-[100dvh] w-full border-l border-[#e5ece5] shadow-2xl transition-transform duration-300 ease-out min-[1180px]:relative min-[1180px]:inset-auto min-[1180px]:z-auto min-[1180px]:h-full min-[1180px]:shadow-none min-[1180px]:transition-none' :
          'fixed inset-y-0 right-0 z-[80] h-[100dvh] w-full border-l border-[#e5ece5] shadow-2xl transition-transform duration-300 ease-out sm:max-w-[640px]',
        !open && !inlineDesktop ? 'translate-x-full pointer-events-none' : 'translate-x-0',
        'motion-reduce:transition-none')}
      inert={!open && !inlineDesktop}>
      {shown && (open || !inlineDesktop) ? <>
        <header className="z-10 flex shrink-0 items-start justify-between gap-3 border-b border-[#e4ece5] bg-white px-4 py-3.5 sm:px-5">
          <div className="min-w-0 space-y-1.5">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h2 id={headerId} className="font-mono text-[16px] font-bold tracking-tight text-[#156253] sm:text-[17px]">{shown.orderId}</h2>
              <OrderStatusBadge status={shown.status} />
            </div>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[#728577]">
              <span className="flex items-center gap-1">{shown.orderType === 'manual_text' ? <ShoppingBag className="h-3.5 w-3.5" /> : <FileImage className="h-3.5 w-3.5" />}{shown.orderType === 'manual_text' ? 'Manual order' : 'Prescription order'}</span>
              <span aria-hidden>·</span>{formatDateTime(shown.createdAt)}
            </p>
          </div>
          <button type="button" ref={closeRef} onClick={onClose} aria-label={inlineDesktop ? 'Clear selected order' : 'Back to order list'}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[#e6eee7] bg-[#f8fbf8] text-[#52685a] transition-colors hover:bg-[#eaf4ed] focus-visible:outline-[#156253]">
            {inlineDesktop ? <X className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4 min-[1180px]:hidden" />}
            {!inlineDesktop && <X className="hidden h-4 w-4 min-[1180px]:block" />}
          </button>
        </header>
        <div data-detail-scroll className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-3.5 pb-6 sm:p-4">
          {shown.status === 'Cancelled' && <div className="rounded-xl border border-[#f1d7d2] bg-[#fff8f6] p-3.5">
            <p className="flex items-center gap-2 text-[12px] font-bold text-[#a43d33]"><AlertCircle className="h-4 w-4" />Order cancelled</p>
            <p className="mt-1.5 break-words text-[12px] text-[#864e48]">{shown.cancelReason || 'No reason provided.'}</p>
            {whatsapp && <a target="_blank" rel="noopener noreferrer" href={whatsapp} className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#a43d33] underline underline-offset-2">Notify customer via WhatsApp <ExternalLink className="h-3 w-3" /></a>}
          </div>}
          <Section title="Customer & delivery" icon={<User className="h-4 w-4" />}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0"><p className="break-words text-[16px] font-bold text-[#193327]">{shown.customerName}</p>
                <a className="mt-0.5 inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#156253] hover:underline" href={`tel:+91${shown.mobileNumber}`}><Phone className="h-3.5 w-3.5" />{formatMobile(shown.mobileNumber)}</a>
              </div>
              <span className="rounded-md bg-[#f0f6f1] px-2.5 py-1.5 text-[10px] font-bold text-[#43614e]">{shown.firstOrderAtCreation ? 'New customer' : 'Returning customer'}</span>
            </div>
            <div className="mt-3 flex items-start gap-2 border-t border-[#eef1ee] pt-3"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#156253]" />
              <p className="min-w-0 break-words text-[12px] leading-relaxed text-[#506659]">{[shown.address.flat, shown.address.area, shown.address.landmark].filter(Boolean).join(', ') || 'Address unavailable'}</p>
            </div>
          </Section>
          <Section title="Customer history" icon={<TrendingUp className="h-4 w-4" />}>
            <dl className="grid grid-cols-2 gap-2 min-[460px]:grid-cols-4">
              <Stat label="Previous orders">{shown.previousOrders}</Stat>
              <Stat label="Completed">{shown.customer?.deliveredOrders ?? 0}</Stat>
              <Stat label="First order">{shown.firstOrderAtCreation ? 'Yes' : 'No'}</Stat>
              <Stat label="Gift claimed">{shown.customer?.offerClaimed ? 'Yes' : 'No'}</Stat>
            </dl>
          </Section>
          <Section title="Requested items" icon={<ShoppingBag className="h-4 w-4" />}>
            {shown.orderType === 'prescription_image' && (safeImage ? <a href={safeImage} target="_blank" rel="noopener noreferrer"
              className="mb-3 flex min-w-0 items-center gap-3 overflow-hidden rounded-lg border border-[#e5ece6] bg-[#f6faf7] transition-colors hover:bg-[#eef7f1]">
              <Image src={cloudinaryThumb(safeImage, 240)} alt={`Prescription for order ${shown.orderId}`} width={74} height={88} unoptimized className="h-[88px] w-[74px] shrink-0 object-cover" />
              <span className="min-w-0 flex-1"><span className="block text-[12px] font-bold text-[#2c4a38]">Prescription image</span><span className="mt-1 block text-[11px] text-[#71877a]">Open original image</span></span>
              <ExternalLink className="mr-3 h-4 w-4 text-[#156253]" />
            </a> : <p className="mb-2 text-[11px] text-[#8a7364]">No valid secure prescription image is available.</p>)}
            {shown.medicines.length ? <ul className="divide-y divide-[#ebf0ea]">
              {shown.medicines.map((m, i) => <li key={m._id ?? `${m.name}-${i}`} className="flex min-w-0 items-center justify-between gap-3 py-2 text-[12px]">
                <span className="min-w-0 break-words font-semibold text-[#2d4638]">{m.name}</span><span className="shrink-0 rounded-md bg-[#f0f6f1] px-2 py-1 text-[11px] text-[#42664f]">{m.quantity}</span>
              </li>)}
            </ul> : shown.orderType === 'manual_text' ? <p className="text-[11px] text-[#84948a]">No medicines listed.</p> : null}
            {(shown.products?.length ?? 0) > 0 && <div className="mt-3 border-t border-[#ebf0ea] pt-3">
              <p className="mb-1 text-[11px] font-bold text-[#586f5f]">Other products</p>
              {shown.products?.map((p, i) => <div key={p._id ?? `${p.name}-${i}`} className="flex justify-between gap-3 py-1.5 text-[12px]"><span className="break-words text-[#2d4638]">{p.name}</span><span className="shrink-0 text-[#5a7461]">×{p.quantity}</span></div>)}
            </div>}
          </Section>
          {!shown.telegramNotificationSent && <div className="flex gap-2.5 rounded-xl border border-[#f2e2bc] bg-[#fff9ed] p-3 text-[11px] leading-relaxed text-[#806021]">
            <BellOff className="h-4 w-4 shrink-0" /><span><strong className="block">Telegram notification failed</strong>Ensure the pharmacy team is aware of this order.</span>
          </div>}
          {shown.status === 'Pending' ? <Section title="Billing workspace" icon={<CreditCard className="h-4 w-4" />}>
            <BillingPanel key={shown.id} order={shown} deliveryCharge={deliveryCharge} onUpdated={onUpdated} onDelivered={onDelivered} actionsTarget={actionsTarget} onDirtyChange={onDirtyChange} billingEnabled={billingEnabled} />
          </Section> : <BillSummary order={shown} />}
        </div>
        {shown.status === 'Pending' && <footer className="z-10 shrink-0 border-t border-[#e1ebe2] bg-white px-3.5 py-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:px-4">
          <div ref={setActionsTarget} />
          <div className="mt-2 flex justify-center"><button type="button" ref={cancelRef} onClick={() => setCancelOpen(true)} className="rounded-md px-3 py-1 text-[11px] font-semibold text-[#bb4d49] transition-colors hover:bg-red-50 focus-visible:outline-[#156253]">Cancel order…</button></div>
        </footer>}
      </> : <div className="flex h-full min-h-[350px] flex-col items-center justify-center px-5 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-2xl border border-[#daebe0] bg-[#eef6f0] text-[#156253]"><LayoutPanelLeft className="h-6 w-6" /></span>
        <h3 className="mt-4 text-[15px] font-bold text-[#294534]">Select an order</h3>
        <p className="mt-1.5 max-w-[235px] text-[12px] leading-relaxed text-[#789082]">Choose an order from the inbox to review its details and manage billing.</p>
      </div>}
    </div>
    <AnimatePresence>{cancelOpen && shown && <CancelOrderDialog key={`cancel-${shown.id}`} order={shown} onClose={closeCancel} onCancelled={finishCancel} />}</AnimatePresence>
  </>;
}

// ---------------------------------------------------------------------------
// Inbox data cache and command center
// ---------------------------------------------------------------------------
const PAGE_SIZE = 20;
const POLL_MS = 30_000;
interface TabConfig { status: OrderStatus; label: string; icon: LucideIcon; emptyTitle: string; emptyHint: string; }
const PENDING_TAB: TabConfig = { status: 'Pending', label: 'Pending', icon: Inbox, emptyTitle: 'Inbox clear', emptyHint: 'New orders will appear here automatically.' };
const TABS: TabConfig[] = [
  PENDING_TAB,
  { status: 'Delivered', label: 'Delivered', icon: PackageCheck, emptyTitle: 'No deliveries yet', emptyHint: 'Completed orders will appear here.' },
  { status: 'Cancelled', label: 'Cancelled', icon: Ban, emptyTitle: 'No cancellations', emptyHint: 'Cancelled orders will appear here.' },
];
interface ListState { orders: AdminOrder[]; pagination: Pagination | null; loading: boolean; loadingMore: boolean; error: string | null; updatedAt: number | null; }
const initialList: ListState = { orders: [], pagination: null, loading: true, loadingMore: false, error: null, updatedAt: null };
function useOrderList(status: OrderStatus) {
  const [state, setState] = useState<ListState>(initialList);
  const requestId = useRef(0);
  const requestAbort = useRef<AbortController | null>(null);
  useEffect(() => () => { requestAbort.current?.abort(); }, []);
  const load = useCallback(async (page = 1, { silent = false }: { silent?: boolean } = {}) => {
    const id = ++requestId.current;
    requestAbort.current?.abort();
    const controller = new AbortController();
    requestAbort.current = controller;
    setState(current => ({ ...current, loading: page === 1 && !silent, loadingMore: page > 1, error: null }));
    try {
      const res = await adminRequest<{ orders: AdminOrder[]; pagination: Pagination }>(`/orders?status=${status}&page=${page}&limit=${PAGE_SIZE}`, { signal: controller.signal });
      if (requestId.current !== id) return;
      setState(current => {
        let orders: AdminOrder[];
        let pagination = res.pagination;
        if (page > 1) {
          const existing = new Set(current.orders.map(o => o.id));
          orders = [...current.orders, ...res.orders.filter(o => !existing.has(o.id))];
        } else if (silent && current.orders.length) {
          // Preserve older loaded pages on polling, and never replace the editor's
          // pinned snapshot; current selection lives outside this list cache.
          const fetched = new Set(res.orders.map(o => o.id));
          orders = [...res.orders, ...current.orders.filter(o => !fetched.has(o.id) && o.status === status)];
          pagination = { ...res.pagination, page: Math.max(1, current.pagination?.page ?? 1) };
        } else {
          orders = res.orders;
        }
        return { orders, pagination, loading: false, loadingMore: false, error: null, updatedAt: Date.now() };
      });
    } catch (error) {
      if (requestId.current !== id || (error as Error).name === 'AbortError') return;
      setState(current => ({ ...current, loading: false, loadingMore: false, error: errorMessage(error) }));
    }
  }, [status]);
  const replace = useCallback((order: AdminOrder) => setState(current => ({ ...current, orders: current.orders.map(item => item.id === order.id ? order : item) })), []);
  const remove = useCallback((id: string) => setState(current => {
    if (!current.orders.some(item => item.id === id)) return current;
    const total = Math.max(0, (current.pagination?.total ?? 1) - 1);
    return { ...current, orders: current.orders.filter(item => item.id !== id), pagination: current.pagination ? { ...current.pagination, total, totalPages: Math.ceil(total / current.pagination.limit) } : null };
  }), []);
  const prepend = useCallback((order: AdminOrder) => setState(current => {
    const already = current.orders.some(item => item.id === order.id);
    const total = (current.pagination?.total ?? 0) + (already ? 0 : 1);
    return { ...current, orders: [order, ...current.orders.filter(item => item.id !== order.id)],
      pagination: current.pagination ? { ...current.pagination, total, totalPages: Math.ceil(total / current.pagination.limit) } : null };
  }), []);
  return { ...state, load, replace, remove, prepend };
}

function DiscardEditsDialog({ onStay, onDiscard }: { onStay: () => void; onDiscard: () => void }) {
  const id = useId();
  const stayRef = useRef<HTMLButtonElement>(null);
  useBodyScrollLock(true);
  useEffect(() => { stayRef.current?.focus({ preventScroll: true }); }, []);
  const content = <div className="fixed inset-0 z-[125] grid place-items-center p-4">
    <div aria-hidden className="absolute inset-0 bg-[#12271e]/50 backdrop-blur-[3px]" />
    <div role="dialog" aria-modal="true" aria-labelledby={id} onKeyDown={event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onStay(); } else trapTab(event);
    }} className="relative w-full max-w-[420px] rounded-[18px] bg-white p-5 shadow-2xl sm:p-6">
      <span className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-[#fff3e1] text-[#a86c21]"><AlertTriangle className="h-5 w-5" /></span>
      <h2 id={id} className="text-[18px] font-bold text-[#183329]">Discard unsaved changes?</h2>
      <p className="mt-2 text-[12px] leading-relaxed text-[#65786b]">You have unsaved billing edits. Switching or closing this order will lose those edits.</p>
      <div className="mt-6 grid grid-cols-2 gap-2.5">
        <Button ref={stayRef} variant="secondary" size="lg" onClick={onStay}>Keep editing</Button>
        <Button variant="danger" size="lg" onClick={onDiscard}>Discard edits</Button>
      </div>
    </div>
  </div>;
  return typeof document === 'undefined' ? null : createPortal(content, document.body);
}
function OrdersBoardContent() {
  const pending = useOrderList('Pending');
  const delivered = useOrderList('Delivered');
  const cancelled = useOrderList('Cancelled');
  const [tab, setTab] = useState<OrderStatus>('Pending');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<AdminOrder | null>(null);
  const [retainMobilePanel, setRetainMobilePanel] = useState(false);
  const [deliveryCharge, setDeliveryCharge] = useState(0);
  const [settingsReady, setSettingsReady] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [, setHasUnsavedEdits] = useState(false);
  const dirtyRef = useRef(false);
  const [pendingNavigation, setPendingNavigation] = useState<{ run: () => void } | null>(null);
  const selectedTrigger = useRef<HTMLElement | null>(null);
  const tabId = useId();
  const toast = useToast();
  useEffect(() => {
    if (selected) { setRetainMobilePanel(true); return; }
    const timer = setTimeout(() => setRetainMobilePanel(false), 320);
    return () => clearTimeout(timer);
  }, [selected]);
  const { load: loadPending, replace: replacePending, remove: removePending } = pending;
  const { load: loadDelivered, replace: replaceDelivered, prepend: prependDelivered } = delivered;
  const { load: loadCancelled, replace: replaceCancelled, prepend: prependCancelled } = cancelled;
  const loadSettings = useCallback(async () => {
    try {
      const res = await adminRequest<{ settings: AdminSettings }>('/settings');
      setDeliveryCharge(res.settings.deliveryCharge); setSettingsReady(true); setSettingsError(null);
    } catch (error) { setSettingsError(errorMessage(error)); setSettingsReady(false); }
  }, []);
  useEffect(() => {
    void loadPending(); void loadDelivered(); void loadCancelled(); void loadSettings();
  }, [loadPending, loadDelivered, loadCancelled, loadSettings]);
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible' && !dirtyRef.current) void loadPending(1, { silent: true });
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [loadPending]);
  const onDirtyChange = useCallback((value: boolean) => { dirtyRef.current = value; setHasUnsavedEdits(value); }, []);
  const requestNavigation = useCallback((run: () => void) => {
    if (dirtyRef.current) setPendingNavigation({ run });
    else run();
  }, []);
  const select = useCallback((id: string, trigger: HTMLElement) => {
    if (selected?.id === id) return;
    const order = [...pending.orders, ...delivered.orders, ...cancelled.orders].find(item => item.id === id);
    if (!order) return;
    requestNavigation(() => { selectedTrigger.current = trigger; setSelected(order); });
  }, [selected?.id, pending.orders, delivered.orders, cancelled.orders, requestNavigation]);
  const closeDetails = useCallback(() => requestNavigation(() => {
    setSelected(null);
    const delay = typeof window !== 'undefined' && window.matchMedia('(min-width: 1180px)').matches ? 0 : 320;
    window.setTimeout(() => { if (selectedTrigger.current?.isConnected) selectedTrigger.current.focus({ preventScroll: true }); }, delay);
  }), [requestNavigation]);
  const chooseTab = useCallback((status: OrderStatus) => {
    if (status === tab) return;
    requestNavigation(() => { setTab(status); setSelected(null); });
  }, [tab, requestNavigation]);
  const onUpdated = useCallback((order: AdminOrder) => {
    setSelected(order); replacePending(order); replaceDelivered(order); replaceCancelled(order);
    setRefreshKey(v => v + 1);
  }, [replacePending, replaceDelivered, replaceCancelled]);
  const onDelivered = useCallback((order: AdminOrder) => {
    onDirtyChange(false); removePending(order.id); prependDelivered(order);
    setSelected(null); setTab('Delivered'); setRefreshKey(v => v + 1);
  }, [removePending, prependDelivered, onDirtyChange]);
  const onCancelled = useCallback((order: AdminOrder) => {
    onDirtyChange(false); removePending(order.id); prependCancelled(order);
    setSelected(null); setTab('Cancelled'); setRefreshKey(v => v + 1);
  }, [removePending, prependCancelled, onDirtyChange]);
  const refresh = () => {
    void loadPending(); void loadDelivered(); void loadCancelled(); void loadSettings();
    setRefreshKey(v => v + 1);
    toast.info('Refreshing order queues and overview');
  };
  const lists = { Pending: pending, Delivered: delivered, Cancelled: cancelled };
  const list = lists[tab];
  const visibleOrders = list.orders.filter(order => `${order.orderId} ${order.customerName} ${order.mobileNumber}`.toLowerCase().includes(query.trim().toLowerCase()));
  const activeTab = TABS.find(item => item.status === tab) ?? PENDING_TAB;
  const refreshing = pending.loading || delivered.loading || cancelled.loading;
  const tabKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const index = TABS.findIndex(item => item.status === tab);
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % TABS.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + TABS.length) % TABS.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = TABS.length - 1;
    else return;
    event.preventDefault();
    const nextTab = TABS[next];
    if (nextTab) { chooseTab(nextTab.status); document.getElementById(`${tabId}-${nextTab.status}`)?.focus(); }
  };
  const listPanelId = `${tabId}-content`;
  return <MotionConfig reducedMotion="user">
    <div className="min-w-0 w-full space-y-4 bg-[#f6faf8] pb-4 text-[#0f1f1c]">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#dbe8df] bg-white text-[#156253]"><LayoutPanelLeft className="h-[18px] w-[18px]" /></div>
          <div><h1 className="font-display text-[22px] font-bold leading-6 tracking-tight text-[#152d22]">Order command center</h1>
            <p className="mt-0.5 text-[12px] text-[#728578]">Pharmacy operations · {SERVICE_AREA}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d6e8db] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#32634b]"><span className="h-1.5 w-1.5 rounded-full bg-[#24a470]" />Auto-refresh on</span>
          {pending.updatedAt && <span className="hidden text-[11px] text-[#7b8d80] sm:inline">Updated {shortTime.format(new Date(pending.updatedAt))}</span>}
          <Button variant="secondary" size="sm" onClick={() => requestNavigation(refresh)} icon={<RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />}>Refresh</Button>
        </div>
      </header>
      <AnalyticsOverview refreshKey={refreshKey} />
      {settingsError && <div role="alert" className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-[#8a5d22]">
        <AlertTriangle className="h-4 w-4" />Delivery settings unavailable. Billing actions remain unavailable until settings load.
        <button type="button" className="font-bold underline" onClick={() => void loadSettings()}>Retry</button>
      </div>}
      <section aria-label="Orders workspace" className="grid min-w-0 overflow-hidden rounded-[16px] border border-[#dce8df] bg-white shadow-[0_4px_20px_rgba(15,31,28,.035)] min-[1180px]:h-[max(560px,calc(100dvh-290px))] min-[1180px]:grid-cols-[minmax(330px,42%)_minmax(0,1fr)]">
        <div className="flex min-h-[420px] min-w-0 flex-col min-[1180px]:min-h-0">
          <div className="shrink-0 border-b border-[#e6ede6] bg-white px-3.5 py-3.5 sm:px-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-[13px] font-bold text-[#223d2e]">Orders inbox</h2>
              <span className="rounded-md bg-[#f2f7f3] px-2 py-1 text-[10px] font-bold text-[#6c8171]">All-time queues</span>
            </div>
            <label className="mb-3 block"><span className="sr-only">Search loaded orders</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search loaded orders by name, ID or phone…" className="h-10 w-full rounded-lg border border-[#dce8df] bg-[#F6FAF8] px-3 text-xs outline-none focus:border-[#156253] focus:ring-2 focus:ring-[#156253]/10" /></label>
            <div role="tablist" aria-label="Filter orders by status" onKeyDown={tabKeyDown} className="flex min-w-0 gap-1 rounded-[10px] border border-[#e3eae4] bg-[#f4f7f4] p-1">
              {TABS.map(item => {
                const active = tab === item.status;
                const count = lists[item.status].pagination?.total;
                return <button type="button" role="tab" key={item.status} id={`${tabId}-${item.status}`} aria-selected={active} aria-controls={listPanelId} tabIndex={active ? 0 : -1}
                  onClick={() => chooseTab(item.status)} className={cn('relative flex min-h-9 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-[8px] px-1.5 text-[11px] font-bold transition-colors focus-visible:z-10 focus-visible:outline-[#156253]', active ? 'text-[#204331]' : 'text-[#718477] hover:text-[#344f3c]')}>
                  {active && <motion.span layoutId={`${tabId}-selected`} transition={{ type: 'spring', stiffness: 500, damping: 40 }} aria-hidden className="absolute inset-0 rounded-[7px] border border-[#dbe6dd] bg-white shadow-[0_1px_4px_rgba(15,31,28,.045)]" />}
                  <span className="relative z-10 hidden min-[360px]:inline">{item.label}</span>
                  <item.icon className="relative z-10 h-3.5 w-3.5 min-[360px]:hidden" aria-hidden />
                  {count !== undefined && <span className={cn('relative z-10 rounded px-1.5 py-0.5 text-[10px] tabular-nums', active ? 'bg-[#e6f4e9] text-[#156253]' : 'bg-[#e9efeb] text-[#788a7c]')}>{count}</span>}
                </button>;
              })}
            </div>
          </div>
          <div id={listPanelId} role="tabpanel" aria-labelledby={`${tabId}-${tab}`} className="min-h-0 flex-1 overflow-y-auto overscroll-contain" aria-busy={list.loading || list.loadingMore}>
            {list.error && <div role="alert" className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f3d9d4] bg-red-50 p-3 text-[11px] text-red-700">
              <span>{list.error}</span><button type="button" className="font-bold underline" onClick={() => void list.load()}>Retry</button>
            </div>}
            {list.loading && !list.orders.length ? <div className="space-y-3 p-3.5">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-[85px] rounded-lg" />)}</div>
              : list.orders.length === 0 ? <div className="flex min-h-[300px] flex-col items-center justify-center px-5 text-center">
                  <span className="grid h-12 w-12 place-items-center rounded-xl bg-[#eff6f0] text-[#6a9a7e]"><activeTab.icon className="h-5 w-5" /></span>
                  <h3 className="mt-3 text-[13px] font-bold text-[#2d4c38]">{activeTab.emptyTitle}</h3>
                  <p className="mt-1 max-w-[240px] text-[11px] leading-relaxed text-[#7c8e81]">{activeTab.emptyHint}</p>
                </div>
              : <>
                  <div aria-live="polite">{query && <p className="px-4 py-2 text-xs text-[#52675F]">{visibleOrders.length} matches in {list.orders.length} loaded orders</p>}</div><ul className="divide-y-0">{visibleOrders.map(order => <li key={order.id}><CompactOrderCard order={order} selected={selected?.id === order.id} onSelect={select} /></li>)}</ul>
                  {list.pagination && list.pagination.page < list.pagination.totalPages && <div className="p-3">
                    <Button variant="secondary" size="sm" loading={list.loadingMore} onClick={() => void list.load(list.pagination!.page + 1)} className="w-full">Load older orders <ChevronRight className="h-3.5 w-3.5 rotate-90" /></Button>
                  </div>}
                </>}
          </div>
          <div className="shrink-0 border-t border-[#e6ede6] bg-[#fbfcfb] px-4 py-2.5 text-[10px] text-[#84958a]">Updates every 30 seconds while active · 20 per page</div>
        </div>
        <div className={cn('min-w-0 overflow-hidden border-l border-[#e1eae2] min-[1180px]:block', selected || retainMobilePanel ? 'block' : 'hidden')}>
          <OrderSidePanel inline open={selected !== null} order={selected} deliveryCharge={deliveryCharge} onClose={closeDetails}
            onDirtyChange={onDirtyChange} onUpdated={onUpdated} onDelivered={onDelivered} onCancelled={onCancelled} billingEnabled={settingsReady} />
          {!settingsReady && selected?.status === 'Pending' && <div className="sr-only" role="status">Delivery settings have not loaded yet.</div>}
        </div>

      </section>
    </div>
    {pendingNavigation && <DiscardEditsDialog onStay={() => setPendingNavigation(null)} onDiscard={() => {
      const run = pendingNavigation.run; setPendingNavigation(null); onDirtyChange(false); run();
    }} />}
  </MotionConfig>;
}

// Preserve the original self-contained toast provider behavior.
export function OrdersBoard() {
  return <ToastProvider><OrdersBoardContent /></ToastProvider>;
}

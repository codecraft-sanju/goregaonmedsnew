// src/components/admin/OrdersBoard.tsx
'use client';

import React, {
  forwardRef,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  Fragment,
  memo,
  useId,
  type ButtonHTMLAttributes,
  type ReactNode,
  type KeyboardEvent as ReactKeyboardEvent
} from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import {
  AlertCircle, AlertTriangle, Ban, BellOff, CheckCircle2, ChevronRight,
  ExternalLink, Gift, Inbox, Info, MapPin, PackageCheck, Phone, Plus,
  RefreshCw, Save, ShoppingBag, Trash2, TrendingUp, User, X, XCircle, Loader2, type LucideIcon
} from 'lucide-react';


export type OrderType = 'manual_text' | 'prescription_image';
export type OrderStatus = 'Pending' | 'Delivered' | 'Cancelled';

export interface MedicineItem {
  _id?: string;
  name: string;
  quantity: string;
  price?: number;
  isAvailable?: boolean;
}

export interface Product {
  _id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  imageUrl: string | null;
  isActive: boolean;
  inStock: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrderProduct {
  _id?: string;
  productId?: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Address {
  flat: string;
  area: string;
  landmark: string;
}

export interface PublicSettings {
  deliveryCharge: number;
  firstOrderOfferEnabled: boolean;
  firstOrderMinimumMedicineAmount: number;
}

export interface AdminSettings extends PublicSettings {
  updatedAt?: string;
}

export interface CreateOrderPayload {
  clientRequestId: string;
  customerName: string;
  mobileNumber: string;
  orderType: OrderType;
  medicines: MedicineItem[];
  products?: OrderProduct[]; 
  prescriptionUrl?: string;
  address: Address;
  offerOptIn: boolean;
}

export interface CreateOrderResponse {
  success: true;
  orderId: string;
  status: OrderStatus;
  telegramNotificationSent: boolean;
}

export interface TrackedOrder {
  orderId: string;
  status: OrderStatus;
  statusLabel: string;
  orderType: OrderType;
  itemCount: number;
  placedAt: string;
  deliveredAt: string | null;
  paymentMethod: string;
  finalAmount: number | null;
  cancelReason: string | null;
  medicines?: MedicineItem[];
  products?: OrderProduct[]; 
  medicineSubtotal?: number;
  nonMedicineSubtotal?: number;
  deliveryCharge?: number;
  discount?: number;
  offerApplied?: boolean;
}

export interface OfferEvaluation {
  eligible: boolean;
  checks: {
    offerEnabled: boolean;
    firstOrder: boolean;
    meetsMedicineThreshold: boolean;
    giftNotPreviouslyClaimed: boolean;
  };
  requiredMedicineAmount: number;
  eligibleMedicineSubtotal: number;
}

export interface CustomerSummary {
  fullName: string;
  mobileNumber: string;
  totalOrders: number;
  deliveredOrders: number;
  offerClaimed: boolean;
  offerClaimedOrderId: string | null;
  isFirstTimeCustomer?: boolean;
}

export interface AdminOrder {
  id: string;
  orderId: string;
  customerName: string;
  mobileNumber: string;
  orderType: OrderType;
  medicines: MedicineItem[];
  products?: OrderProduct[]; 
  prescriptionUrl: string | null;
  address: Address;
  paymentMethod: string;
  medicineSubtotal: number;
  nonMedicineSubtotal: number;
  deliveryCharge: number;
  discount?: number;
  finalAmount: number;
  billedAt: string | null;
  offerOptIn: boolean;
  firstOrderAtCreation: boolean;
  previousOrders: number;
  offerEligible: boolean;
  offerApplied: boolean;
  offer: OfferEvaluation;
  status: OrderStatus;
  telegramNotificationSent: boolean;
  createdAt: string;
  deliveredAt: string | null;
  customer: CustomerSummary | null;
  cancelReason: string | null;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}


export const SUPPORT_PHONE_DISPLAY = '+91 84338 18771';
export const SUPPORT_PHONE_TEL = 'tel:+918433818771';
export const SERVICE_AREA = 'Goregaon East, Mumbai';
export const PAYMENT_LABEL = 'Pay when it arrives · Cash or UPI / QR at delivery';

export const GIFT = {
  name: 'Dr. Morepen GlucoOne BG-03',
  shortName: 'GlucoOne BG-03',
  mrp: 650,
  image: '/glucoone-bg03.png',
} as const;

export const DEFAULT_PUBLIC_SETTINGS = {
  deliveryCharge: 0,
  firstOrderOfferEnabled: true,
  firstOrderMinimumMedicineAmount: 500,
} as const;

export const BRANCHES = [
  {
    name: 'Apple Pharmacy',
    shortName: 'Apple Pharmacy',
    area: 'Aarey Road',
    address: 'Shop No. 9, Sheetal Krupa Building, Ground Floor, Aarey Road, Goregaon East, Mumbai',
    tone: 'apple',
    open24x7: false,
  },
  {
    name: 'Lotus Pharmacy',
    shortName: 'Lotus Pharmacy',
    area: 'Jay Prakash Nagar',
    address: "Shop No. 10, Shreyas Bhavan, Jay Prakash Nagar Road No. 1, Opp. Domino's Pizza, Goregaon East, Mumbai",
    tone: 'lotus',
    open24x7: false,
  },
  {
    name: 'Healthzone & Cosmetic',
    shortName: 'Healthzone',
    area: 'Aarey Road',
    address: 'Pednekar Chawl, Shop No. 3, Ground Floor, S.V. Aarey Road, Goregaon East, Mumbai',
    tone: 'health',
    open24x7: true,
  },
] as const;

export const TONE_STYLES: Record<(typeof BRANCHES)[number]['tone'], { art: string; sign: string }> = {
  apple: { art: 'bg-[#e8eede]', sign: 'bg-[#315242]' },
  lotus: { art: 'bg-[#ece8dc]', sign: 'bg-[#78674d]' },
  health: { art: 'bg-[#e1ebe7]', sign: 'bg-[#4e7271]' },
};

export const ORDER_ID_PATTERN = /^GMED-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/;

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

const rupees = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2, minimumFractionDigits: 0 });
const dateTime = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
const timeFormatter = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' });

export const formatRupees = (amount: number) => rupees.format(amount);
export const formatDateTime = (iso: string) => dateTime.format(new Date(iso));

export const formatMobile = (mobile?: string | null) => {
  if (!mobile || typeof mobile !== 'string') return 'N/A';
  return `+91 ${mobile.slice(0, 5)} ${mobile.slice(5)}`;
};

export function normalizeMobile(input: string): string | null {
  let digits = input.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

export function cloudinaryThumb(url: string, width = 640) {
  return url.replace('/image/upload/', `/image/upload/c_limit,w_${width},q_auto,f_auto/`);
}

export function isLateNightInMumbai(date = new Date()) {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', hour12: false }).format(date));
  return hour >= 22 || hour < 6;
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

// ============================================================================
// UI COMPONENTS (Button, Skeleton, Toast)
// ============================================================================
type Variant = 'primary' | 'secondary' | 'ghost' | 'gift' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const variants: Record<Variant, string> = {
  primary: 'bg-brand-700 text-white hover:bg-brand-800 shadow-lift disabled:bg-brand-700/60',
  secondary: 'bg-white text-brand-800 ring-1 ring-inset ring-brand-200 hover:bg-brand-50 disabled:text-brand-800/50',
  ghost: 'text-brand-800 hover:bg-brand-50 disabled:text-brand-800/50',
  gift: 'bg-gift-500 text-white hover:bg-gift-600 shadow-[0_12px_30px_-12px_rgba(239,148,21,0.7)] disabled:bg-gift-500/60',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-600/60',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-sm gap-1.5 rounded-xl',
  md: 'h-11 px-5 text-[15px] gap-2 rounded-2xl',
  lg: 'h-14 px-6 text-base gap-2.5 rounded-2xl',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading = false, icon, className, children, disabled, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex select-none items-center justify-center font-semibold transition-[background-color,transform,box-shadow] duration-150',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
        'active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
});

export function Skeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn('relative overflow-hidden rounded-xl bg-brand-100/60', className)}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/70 to-transparent" />
    </div>
  );
}

type ToastTone = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const toastIcons = { success: CheckCircle2, error: AlertTriangle, info: Info };
const toastTones = {
  success: 'text-brand-700',
  error: 'text-red-600',
  info: 'text-ink-muted',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => setToasts((current) => current.filter((toast) => toast.id !== id)), []);

  const push = useCallback(
    (tone: ToastTone, message: string) => {
      const id = ++nextId.current;
      setToasts((current) => [...current.slice(-2), { id, tone, message }]);
      setTimeout(() => dismiss(id), tone === 'error' ? 6000 : 3500);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (message) => push('success', message),
      error: (message) => push('error', message),
      info: (message) => push('info', message),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6">
        <AnimatePresence initial={false}>
          {toasts.map((toast) => {
            const Icon = toastIcons[toast.tone];
            return (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                role={toast.tone === 'error' ? 'alert' : 'status'}
                className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl bg-white px-4 py-3 shadow-lift ring-1 ring-brand-100"
              >
                <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', toastTones[toast.tone])} aria-hidden />
                <p className="flex-1 text-sm text-ink">{toast.message}</p>
                <button type="button" onClick={() => dismiss(toast.id)} className="text-ink-soft hover:text-ink" aria-label="Dismiss">
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider');
  return context;
}

// ============================================================================
// DOMAIN COMPONENTS
// ============================================================================

const STATUS_TONES: Record<OrderStatus, { pill: string; dot: string }> = {
  Pending: { pill: 'bg-amber-50 text-amber-800 ring-amber-200', dot: 'bg-amber-500' },
  Delivered: { pill: 'bg-brand-50 text-brand-800 ring-brand-200', dot: 'bg-brand-600' },
  Cancelled: { pill: 'bg-red-50 text-red-700 ring-red-200', dot: 'bg-red-500' },
};

export function OrderStatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  const tone = STATUS_TONES[status];
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset', tone.pill, className)}>
      <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', tone.dot)} />
      {status}
    </span>
  );
}

function buildSummary(order: AdminOrder) {
  const parts: string[] = [];
  if (order.orderType === 'manual_text') {
    const count = order.medicines.length;
    parts.push(`${count} ${count === 1 ? 'medicine' : 'medicines'} · Manual order`);
  } else {
    parts.push('Prescription upload');
  }
  if (order.status === 'Delivered') parts.push(formatRupees(order.finalAmount));
  if (order.status === 'Cancelled' && order.cancelReason) parts.push(order.cancelReason);
  return parts.join(' · ');
}

export const CompactOrderCard = memo(function CompactOrderCard({ 
  order, selected, onSelect 
}: { 
  order: AdminOrder; selected: boolean; onSelect: (id: string, trigger: HTMLElement) => void;
}) {
  const giftRequested = order.offerOptIn && order.firstOrderAtCreation;
  const notNotified = !order.telegramNotificationSent;

  const label = [
    `Order ${order.orderId}`,
    order.customerName,
    order.status,
    giftRequested ? 'gift requested' : null,
    notNotified ? 'Telegram notification not delivered' : null,
  ].filter(Boolean).join(', ');

  return (
    <button
      type="button"
      onClick={(event) => onSelect(order.id, event.currentTarget)}
      aria-current={selected ? 'true' : undefined}
      aria-label={`${label}. View details`}
      className={cn(
        'group flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition duration-150',
        'hover:-translate-y-px hover:border-brand-300 hover:shadow-sm',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
        selected ? 'border-brand-500 bg-brand-50/60' : 'border-brand-100 bg-white',
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className="font-mono text-base font-bold tracking-wide text-brand-800">{order.orderId}</span>
          <span className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
            {notNotified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gift-50 px-2 py-1 text-xs font-semibold text-gift-600" title="Telegram notification was not delivered">
                <BellOff className="h-3 w-3" aria-hidden />
                <span className="sr-only sm:not-sr-only">Not notified</span>
              </span>
            )}
            {giftRequested && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gift-100 px-2 py-1 text-xs font-semibold text-gift-600" title="Gift requested">
                <Gift className="h-3 w-3" aria-hidden />
                <span className="sr-only sm:not-sr-only">Gift</span>
              </span>
            )}
            <OrderStatusBadge status={order.status} />
          </span>
        </span>

        <span className="mt-1 block truncate text-sm font-semibold text-ink">{order.customerName}</span>
        <span className="block text-xs text-ink-muted">{formatMobile(order.mobileNumber)}</span>

        <span className="mt-2 flex items-center justify-between gap-3 text-xs text-ink-soft">
          <span className="truncate">{buildSummary(order)}</span>
          <span className="shrink-0">{formatDateTime(order.createdAt)}</span>
        </span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-ink-soft transition-transform group-hover:translate-x-0.5" aria-hidden />
    </button>
  );
});

// ============================================================================
// ANALYTICS OVERVIEW COMPONENT
// ============================================================================
interface AnalyticsData {
  totalSales: number;
  totalOrders: number;
  breakdown: {
    pending: number;
    delivered: number;
  };
}

export function AnalyticsOverview() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dateRangeType, setDateRangeType] = useState<'today' | 'yesterday' | 'custom'>('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const { startDate, endDate } = useMemo(() => {
    const today = new Date();
    if (dateRangeType === 'today') {
      return { startDate: today, endDate: today };
    }
    if (dateRangeType === 'yesterday') {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return { startDate: yesterday, endDate: yesterday };
    }
    if (dateRangeType === 'custom' && customStartDate && customEndDate) {
      return {
        startDate: new Date(customStartDate),
        endDate: new Date(customEndDate),
      };
    }
    return { startDate: today, endDate: today };
  }, [dateRangeType, customStartDate, customEndDate]);

  const dateRangeLabel = 
    dateRangeType === 'today' ? "Today's" : 
    dateRangeType === 'yesterday' ? "Yesterday's" : "Selected Date's";

  useEffect(() => {
    if (dateRangeType === 'custom' && (!customStartDate || !customEndDate)) return;

    const fetchAnalytics = async () => {
      setLoading(true);
      setError(null);
      try {
        const startString = startDate.toISOString().split('T')[0];
        const endString = endDate.toISOString().split('T')[0];
        
        const response = await adminRequest<{ success: boolean; totalSales: number; totalOrders: number; breakdown: { pending: number; delivered: number } }>(
          `/analytics/overview?startDate=${startString}&endDate=${endString}`
        );
        
        if (response.success) {
           setData({
             totalSales: response.totalSales,
             totalOrders: response.totalOrders,
             breakdown: response.breakdown
           });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [startDate, endDate, dateRangeType, customStartDate, customEndDate]);

  return (
    <div className="space-y-6 mb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">Sales & Analytics</h2>
          <p className="mt-1 text-sm text-ink-muted">Track revenue and order volume.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <select 
            className="h-10 rounded-xl bg-white px-3 text-sm font-medium ring-1 ring-brand-100 outline-none focus:ring-2 focus:ring-brand-500"
            value={dateRangeType}
            onChange={(e) => setDateRangeType(e.target.value as 'today' | 'yesterday' | 'custom')}
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="custom">Custom Date Range</option>
          </select>

          {dateRangeType === 'custom' && (
            <div className="flex items-center gap-2">
              <input 
                type="date" 
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="h-10 rounded-xl bg-white px-3 text-sm ring-1 ring-brand-100 outline-none focus:ring-2 focus:ring-brand-500"
              />
              <span className="text-ink-soft">to</span>
              <input 
                type="date" 
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="h-10 rounded-xl bg-white px-3 text-sm ring-1 ring-brand-100 outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          )}
        </div>
      </div>

      {error && (
         <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
           {error}
         </div>
      )}

      {loading && !data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="h-28 rounded-2xl bg-brand-50/50 animate-pulse border border-brand-100" />
          <div className="h-28 rounded-2xl bg-brand-50/50 animate-pulse border border-brand-100" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-brand-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-ink-soft">
              <TrendingUp className="h-4 w-4 text-brand-600" />
              {dateRangeLabel} Sales
            </div>
            <div className="mt-2 text-3xl font-display font-bold text-brand-900">
              {formatRupees(data?.totalSales ?? 0)}
            </div>
            <p className="mt-1 text-xs text-ink-muted">From delivered orders only</p>
          </div>

          <div className="rounded-2xl border border-brand-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-ink-soft">
              <ShoppingBag className="h-4 w-4 text-brand-600" />
              {dateRangeLabel} Orders
            </div>
            <div className="mt-2 flex items-baseline gap-3">
              <span className="text-3xl font-display font-bold text-brand-900">{data?.totalOrders ?? 0}</span>
              <div className="flex gap-2 text-xs font-medium">
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-800 ring-1 ring-inset ring-amber-200">
                  {data?.breakdown.pending ?? 0} Pending
                </span>
                <span className="rounded-full bg-brand-50 px-2 py-0.5 text-brand-800 ring-1 ring-inset ring-brand-200">
                  {data?.breakdown.delivered ?? 0} Delivered
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// BILLING PANEL COMPONENT
// ============================================================================
const AMOUNT_PATTERN = /^\d{1,7}(\.\d{1,2})?$/;
const parseAmount = (value: string) => (AMOUNT_PATTERN.test(value.trim()) ? Number(value) : null);
const toInput = (amount: number, billed: boolean) => (billed ? String(amount) : '');

const CHECK_LABELS: Record<keyof AdminOrder['offer']['checks'], string> = {
  offerEnabled: 'Offer enabled',
  firstOrder: 'First order',
  meetsMedicineThreshold: 'Medicine subtotal eligible',
  giftNotPreviouslyClaimed: 'Gift not previously claimed',
};

interface BillingPanelProps {
  order: AdminOrder;
  deliveryCharge: number;
  onUpdated: (order: AdminOrder) => void;
  onDelivered: (order: AdminOrder) => void;
  actionsTarget?: HTMLElement | null;
}

interface MedicineInput {
  _id?: string;
  name: string;
  quantity: string;
  price: string;
  isAvailable: boolean;
}

interface ProductInput {
  _id?: string;
  productId?: string;
  name: string;
  quantity: string;
  price: string;
}

function AmountInput({ id, label, hint, value, onChange }: { id: string; label?: string; hint?: string; value: string; onChange: (value: string) => void }) {
  const invalid = value.trim() !== '' && !AMOUNT_PATTERN.test(value.trim());
  return (
    <div>
      {label && <label htmlFor={id} className="block text-xs font-semibold text-ink">{label}</label>}
      <div className={cn('flex items-center rounded-xl bg-white ring-1 ring-inset focus-within:ring-2 transition-shadow', label && 'mt-1', invalid ? 'ring-red-300 focus-within:ring-red-500' : 'ring-brand-100 focus-within:ring-brand-500')}>
        <span className="pl-3 text-sm text-ink-muted">₹</span>
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          value={value}
          onChange={(event) => onChange(event.target.value.replace(/[^\d.]/g, ''))}
          placeholder="0"
          aria-invalid={invalid || undefined}
          className="h-11 w-full rounded-xl bg-transparent px-2 font-semibold tabular-nums focus:outline-none"
        />
      </div>
      {hint && <p className="mt-1 text-[11px] text-ink-soft">{hint}</p>}
    </div>
  );
}

export function BillingPanel({ order, deliveryCharge, onUpdated, onDelivered, actionsTarget }: BillingPanelProps) {
  const toast = useToast();
  const billed = Boolean(order.billedAt);
  
  const [medicinesData, setMedicinesData] = useState<MedicineInput[]>(() => 
    order.medicines.map((m) => ({
      _id: m._id,
      name: m.name,
      quantity: m.quantity,
      price: toInput(m.price ?? 0, billed),
      isAvailable: m.isAvailable ?? true
    }))
  );

  const [productsData, setProductsData] = useState<ProductInput[]>(() => 
    (order.products || []).map((p) => ({
      _id: p._id,
      productId: p.productId,
      name: p.name,
      quantity: String(p.quantity ?? 1),
      price: toInput(p.price ?? 0, billed),
    }))
  );

  const [other, setOther] = useState(toInput(order.nonMedicineSubtotal, billed));
  const [discount, setDiscount] = useState(toInput(order.discount ?? 0, billed));
  const [giftIncluded, setGiftIncluded] = useState(order.offerApplied);
  const [saving, setSaving] = useState(false);
  const [confirmDelivery, setConfirmDelivery] = useState(false);
  const [delivering, setDelivering] = useState(false);

  const medicineValue = useMemo(() => {
    return medicinesData.reduce((total, item) => {
      if (item.isAvailable) {
        const val = parseAmount(item.price);
        return total + (val ?? 0);
      }
      return total;
    }, 0);
  }, [medicinesData]);

  const productValue = useMemo(() => {
    return productsData.reduce((total, item) => {
      const val = parseAmount(item.price);
      return total + (val ?? 0);
    }, 0);
  }, [productsData]);

  const otherValue = other.trim() === '' ? 0 : parseAmount(other);
  const discountValue = discount.trim() === '' ? 0 : parseAmount(discount);
  
  const combinedNonMedicineSubtotal = (otherValue ?? 0) + productValue;
  
  const medicinesValid = medicinesData.every(m => 
    (!m.isAvailable || (m.price.trim() !== '' && parseAmount(m.price) !== null)) && 
    m.name.trim() !== '' && 
    m.quantity.trim() !== ''
  );
  
  const productsValid = productsData.every(p => 
    p.price.trim() !== '' && parseAmount(p.price) !== null && 
    p.name.trim() !== '' && 
    p.quantity.trim() !== '' && parseInt(p.quantity) > 0
  );

  const valid = medicinesValid && productsValid && otherValue !== null && discountValue !== null;

  const preview = useMemo(() => {
    const checks = {
      ...order.offer.checks,
      meetsMedicineThreshold: medicineValue !== null && medicineValue >= order.offer.requiredMedicineAmount,
    };
    
    const gross = (medicineValue ?? 0) + combinedNonMedicineSubtotal + deliveryCharge;
    const safeDiscount = (discountValue ?? 0) > gross ? gross : (discountValue ?? 0);
    
    return {
      checks,
      eligible: Object.values(checks).every(Boolean),
      finalAmount: valid ? Math.round((gross - safeDiscount) * 100) / 100 : null,
      appliedDiscount: safeDiscount
    };
  }, [order.offer, medicineValue, combinedNonMedicineSubtotal, discountValue, valid, deliveryCharge]);

  const dirty =
    !billed ||
    medicineValue !== order.medicineSubtotal ||
    (otherValue ?? -1) !== order.nonMedicineSubtotal ||
    (discountValue ?? -1) !== (order.discount ?? 0) ||
    giftIncluded !== order.offerApplied ||
    deliveryCharge !== order.deliveryCharge ||
    medicinesData.length !== order.medicines.length ||
    productsData.length !== (order.products?.length || 0) ||
    medicinesData.some((m, i) => 
      m.isAvailable !== (order.medicines[i]?.isAvailable ?? true) || 
      m.name !== order.medicines[i]?.name ||
      m.quantity !== order.medicines[i]?.quantity
    ) ||
    productsData.some((p, i) => 
      p.name !== order.products?.[i]?.name ||
      p.price !== String(order.products?.[i]?.price || '')
    );

  useEffect(() => {
    if (!preview.eligible) setGiftIncluded(false);
  }, [preview.eligible]);

  const updateMedicine = <K extends keyof MedicineInput>(index: number, field: K, value: MedicineInput[K]) => {
    setMedicinesData(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value } as MedicineInput;
      return copy;
    });
  };

  const updateProduct = <K extends keyof ProductInput>(index: number, field: K, value: ProductInput[K]) => {
    setProductsData(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value } as ProductInput;
      return copy;
    });
  };

  const addMedicine = () => {
    setMedicinesData(prev => [...prev, { name: '', quantity: '1', price: '', isAvailable: true }]);
  };

  const removeMedicine = (index: number) => {
    setMedicinesData(prev => prev.filter((_, i) => i !== index));
  };

  const addProduct = () => {
    setProductsData(prev => [...prev, { name: '', quantity: '1', price: '' }]);
  };

  const removeProduct = (index: number) => {
    setProductsData(prev => prev.filter((_, i) => i !== index));
  };

  const saveBill = async () => {
    if (!valid) {
      toast.error('Enter valid amounts, names, and quantities for all items.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        medicines: medicinesData.map(m => ({
          _id: m._id,
          name: m.name.trim(), 
          quantity: m.quantity.trim(),
          price: parseAmount(m.price) ?? 0,
          isAvailable: m.isAvailable
        })),
        products: productsData.map(p => ({
          _id: p._id,
          productId: p.productId,
          name: p.name.trim(),
          quantity: parseInt(p.quantity) || 1,
          price: parseAmount(p.price) ?? 0,
        })),
        nonMedicineSubtotal: combinedNonMedicineSubtotal,
        discount: discountValue,
        offerApplied: giftIncluded
      };

      const res = await adminRequest<{ order: AdminOrder }>(`/orders/${order.id}/billing`, {
        method: 'PATCH',
        body: payload,
      });
      onUpdated(res.order);
      setGiftIncluded(res.order.offerApplied);
      toast.success(res.order.offerEligible ? 'Bill saved · Eligible for the free gift' : 'Bill saved');
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const deliver = async () => {
    setDelivering(true);
    try {
      const res = await adminRequest<{ order: AdminOrder }>(`/orders/${order.id}/deliver`, { method: 'PATCH' });
      toast.success(`${order.orderId} marked as delivered`);
      onDelivered(res.order);
    } catch (error) {
      toast.error((error as Error).message);
      setDelivering(false);
      setConfirmDelivery(false);
    }
  };

  const status = billed && !dirty ? { eligible: order.offerEligible, checks: order.offer.checks, saved: true } : { ...preview, saved: false };

  const actions = (
    <div className="space-y-2">
      <div className="grid gap-2 min-[400px]:grid-cols-2">
        <Button variant="secondary" onClick={saveBill} loading={saving} disabled={!valid || delivering} icon={<Save className="h-4 w-4" />}>
          Save Bill
        </Button>
        <AnimatePresence mode="wait" initial={false}>
          {confirmDelivery ? (
            <motion.div key="confirm" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={() => setConfirmDelivery(false)} disabled={delivering}>
                Back
              </Button>
              <Button className="flex-1" onClick={deliver} loading={delivering}>
                Confirm
              </Button>
            </motion.div>
          ) : (
            <motion.div key="deliver" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Button
                className="w-full"
                onClick={() => setConfirmDelivery(true)}
                disabled={!billed || dirty || saving}
                title={!billed || dirty ? 'Save the bill first' : undefined}
                icon={<PackageCheck className="h-4 w-4" />}
              >
                Mark as Delivered
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {confirmDelivery && (
        <p className="text-xs text-ink-muted">
          Confirm payment was collected{order.offerApplied ? ` and the free ${GIFT.shortName} was handed over. The gift will be recorded as claimed.` : '.'}
        </p>
      )}
      {(!billed || dirty) && !confirmDelivery && <p className="text-xs text-ink-soft">Save the bill before marking the order as delivered.</p>}
    </div>
  );

  return (
    <div className="space-y-4">
      
      {/* MEDICINES SECTION */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-ink">Medicines ({medicinesData.length})</h4>
        
        <AnimatePresence initial={false}>
          {medicinesData.map((med, index) => (
            <motion.div 
              key={med._id || `new-med-${index}`} 
              layout
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={cn("p-3 rounded-xl border transition-colors relative group", med.isAvailable ? "bg-white border-brand-100" : "bg-surface border-transparent opacity-80")}
            >
              {!med._id && (
                <button 
                  onClick={() => removeMedicine(index)} 
                  className="absolute -top-2.5 -right-2.5 bg-red-100 text-red-600 p-1.5 rounded-full hover:bg-red-200 transition-transform scale-0 group-hover:scale-100 opacity-0 group-hover:opacity-100 shadow-sm"
                  title="Remove Medicine"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}

              <div className="flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0 space-y-1">
                  <input
                    value={med.name}
                    onChange={(e) => updateMedicine(index, 'name', e.target.value)}
                    placeholder="Medicine Name"
                    className={cn(
                      "w-full bg-transparent text-sm font-semibold focus:outline-none placeholder:text-ink-muted/50 transition-colors rounded px-1 -mx-1 focus:bg-brand-50/50",
                      !med.isAvailable && "line-through text-ink-muted"
                    )}
                  />
                  <input
                    value={med.quantity}
                    onChange={(e) => updateMedicine(index, 'quantity', e.target.value)}
                    placeholder="Quantity (e.g. 1 strip)"
                    className="w-full bg-transparent text-xs text-ink-soft focus:outline-none placeholder:text-ink-muted/50 transition-colors rounded px-1 -mx-1 focus:bg-brand-50/50"
                  />
                </div>
                <label className="flex items-center gap-1.5 cursor-pointer shrink-0 mt-1">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 accent-brand-600 rounded" 
                    checked={med.isAvailable} 
                    onChange={(e) => {
                      updateMedicine(index, 'isAvailable', e.target.checked);
                      if (!e.target.checked) updateMedicine(index, 'price', '0');
                    }} 
                  />
                  <span className="text-xs font-medium text-ink-muted">In Stock</span>
                </label>
              </div>
              
              <AnimatePresence>
                {med.isAvailable && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }} 
                    animate={{ height: 'auto', opacity: 1 }} 
                    exit={{ height: 0, opacity: 0 }} 
                    className="mt-3 overflow-hidden"
                  >
                    <AmountInput 
                      id={`price-${index}`} 
                      label="" 
                      hint="" 
                      value={med.price} 
                      onChange={(val) => updateMedicine(index, 'price', val)} 
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>

        <Button 
          variant="ghost" 
          onClick={addMedicine} 
          className="w-full border border-dashed border-brand-200 text-brand-700 bg-brand-50/30 hover:bg-brand-50 hover:border-brand-300 transition-colors" 
          icon={<Plus className="w-4 h-4" />}
        >
          Add Medicine
        </Button>
      </div>

      {/* PRODUCTS SECTION */}
      <div className="space-y-3 mt-6">
        <h4 className="text-xs font-semibold text-ink">Other Products ({productsData.length})</h4>
        
        <AnimatePresence initial={false}>
          {productsData.map((prod, index) => (
            <motion.div 
              key={prod._id || `new-prod-${index}`} 
              layout
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-3 rounded-xl border bg-white border-brand-100 transition-colors relative group"
            >
              <button 
                onClick={() => removeProduct(index)} 
                className="absolute -top-2.5 -right-2.5 bg-red-100 text-red-600 p-1.5 rounded-full hover:bg-red-200 transition-transform scale-0 group-hover:scale-100 opacity-0 group-hover:opacity-100 shadow-sm"
                title="Remove Product"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              <div className="flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0 space-y-1">
                  <input
                    value={prod.name}
                    onChange={(e) => updateProduct(index, 'name', e.target.value)}
                    placeholder="Product Name"
                    className="w-full bg-transparent text-sm font-semibold focus:outline-none placeholder:text-ink-muted/50 transition-colors rounded px-1 -mx-1 focus:bg-brand-50/50"
                  />
                  <div className="flex items-center text-xs text-ink-soft mt-1">
                    <span>Qty:</span>
                    <input
                      type="number"
                      min="1"
                      value={prod.quantity}
                      onChange={(e) => updateProduct(index, 'quantity', e.target.value)}
                      className="ml-1 w-12 bg-transparent focus:outline-none focus:bg-brand-50/50 rounded px-1"
                    />
                  </div>
                </div>
              </div>
              
              <div className="mt-3">
                <AmountInput 
                  id={`prod-price-${index}`} 
                  label="" 
                  hint="" 
                  value={prod.price} 
                  onChange={(val) => updateProduct(index, 'price', val)} 
                />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        <Button 
          variant="ghost" 
          onClick={addProduct} 
          className="w-full border border-dashed border-brand-200 text-brand-700 bg-brand-50/30 hover:bg-brand-50 hover:border-brand-300 transition-colors" 
          icon={<ShoppingBag className="w-4 h-4" />}
        >
          Add Product
        </Button>
      </div>

      {/* OTHER CHARGES & DISCOUNTS */}
      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-brand-100 mt-6">
        <AmountInput id={`${order.id}-other`} label="Misc Charges" hint="Extra non-product charges" value={other} onChange={setOther} />
        <AmountInput id={`${order.id}-discount`} label="Discount" hint="Global order discount" value={discount} onChange={setDiscount} />
      </div>

      <dl className="space-y-2 rounded-xl bg-surface p-3.5 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-ink-muted">Medicine subtotal</dt>
          <dd className="font-medium tabular-nums">{medicineValue === null ? '—' : formatRupees(medicineValue)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-ink-muted">Products & Other Items</dt>
          <dd className="font-medium tabular-nums">{combinedNonMedicineSubtotal === null ? '—' : formatRupees(combinedNonMedicineSubtotal)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-ink-muted">Delivery</dt>
          <dd className="font-medium tabular-nums">{formatRupees(deliveryCharge)}</dd>
        </div>
        <div className="flex justify-between gap-3 text-brand-700">
          <dt className="font-medium">Discount</dt>
          <dd className="font-medium tabular-nums">-{preview.appliedDiscount === null ? '—' : formatRupees(preview.appliedDiscount)}</dd>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-brand-100 pt-3">
          <dt className="text-sm font-semibold">Final Amount</dt>
          <dd className="text-2xl font-bold tabular-nums text-brand-800">{preview.finalAmount === null ? '—' : formatRupees(preview.finalAmount)}</dd>
        </div>
      </dl>

      <div className={cn('rounded-xl p-3.5 ring-1 transition-colors duration-300', status.eligible ? 'bg-brand-50 ring-brand-300' : 'bg-white ring-brand-100')}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">First Order Gift Eligibility</p>
            <p className="mt-0.5 text-sm font-semibold">{formatRupees(order.offer.requiredMedicineAmount)} Medicine Minimum</p>
            <p className="mt-0.5 text-xs text-ink-soft">Medicine subtotal only. Delivery and other items never count.</p>
          </div>
          <span className={cn('shrink-0 rounded-full px-3 py-1 text-xs font-bold transition-colors', status.eligible ? 'bg-brand-700 text-white' : 'bg-red-50 text-red-700')}>
            {status.eligible ? 'ELIGIBLE' : 'NOT ELIGIBLE'}
          </span>
        </div>
        <p className="mt-2 text-xs text-ink-soft">
          Eligible medicine subtotal: <strong className="text-ink">{medicineValue === null ? '—' : formatRupees(medicineValue)}</strong>
          {!status.saved && ' · preview, confirmed on save'}
        </p>
        <ul className="mt-3 grid gap-1.5 text-xs sm:grid-cols-2">
          {(Object.keys(CHECK_LABELS) as Array<keyof typeof CHECK_LABELS>).map((key) => (
            <li key={key} className="flex items-center gap-1.5">
              {status.checks[key] ? <CheckCircle2 className="h-3.5 w-3.5 text-brand-600" aria-hidden /> : <XCircle className="h-3.5 w-3.5 text-red-500" aria-hidden />}
              <span className={status.checks[key] ? 'text-ink-muted' : 'text-ink'}>{CHECK_LABELS[key]}</span>
            </li>
          ))}
        </ul>
        <label
          className={cn(
            'mt-3 flex min-h-11 items-center gap-2.5 rounded-xl bg-white px-3 text-sm font-semibold ring-1 ring-brand-100 transition-opacity',
            preview.eligible ? 'cursor-pointer' : 'cursor-not-allowed opacity-50',
          )}
        >
          <input type="checkbox" className="h-5 w-5 accent-brand-700 rounded" checked={giftIncluded} disabled={!preview.eligible} onChange={(event) => setGiftIncluded(event.target.checked)} />
          <Gift className="h-4 w-4 text-gift-500" aria-hidden /> FREE {GIFT.shortName} Included
        </label>
      </div>

      {actionsTarget === undefined ? actions : actionsTarget ? createPortal(actions, actionsTarget) : null}
    </div>
  );
}

// ============================================================================
// ORDER SIDE PANEL & SUBCOMPONENTS
// ============================================================================
const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function trapTab(event: ReactKeyboardEvent<HTMLElement>) {
  if (event.key !== 'Tab') return;
  const container = event.currentTarget;
  const nodes = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((node) => node.getClientRects().length > 0);
  if (nodes.length === 0) return;
  const first = nodes[0];
  const last = nodes[nodes.length - 1];
  const active = document.activeElement;
  const outside = !container.contains(active);
  if (event.shiftKey && (active === first || outside)) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && (active === last || outside)) {
    event.preventDefault();
    first?.focus();
  }
}

function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const { overflow, paddingRight } = document.body.style;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
    return () => {
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
    };
  }, [locked]);
}

function buildWhatsappLink(order: AdminOrder): string | null {
  if (!order.cancelReason) return null;
  const message = encodeURIComponent(
    `Hi ${order.customerName},\n\nUnfortunately, your GoregaonMeds order #${order.orderId} had to be cancelled.\n\nReason: ${order.cancelReason}\n\nWe apologize for the inconvenience.`,
  );
  return `https://wa.me/91${order.mobileNumber}?text=${message}`;
}

function Section({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="rounded-2xl border border-brand-100 bg-white p-4">
      <h3 id={id} className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink-soft">
        {icon}
        {title}
      </h3>
      {children}
    </section>
  );
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-ink-soft">{label}</dt>
      <dd className="mt-0.5 text-sm font-bold text-ink">{children}</dd>
    </div>
  );
}

function SummaryRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn('flex items-center justify-between gap-3', strong && 'border-t border-brand-100 pt-3')}>
      <dt className={strong ? 'text-sm font-semibold' : 'text-ink-muted'}>{label}</dt>
      <dd className={cn('tabular-nums', strong ? 'text-xl font-bold text-brand-800' : 'font-medium')}>{value}</dd>
    </div>
  );
}

function BillSummary({ order }: { order: AdminOrder }) {
  const delivered = order.status === 'Delivered';
  if (!delivered && !order.billedAt) {
    return (
      <Section title="Bill">
        <p className="text-sm text-ink-muted">No bill was saved before this order was cancelled.</p>
      </Section>
    );
  }
  return (
    <Section title={delivered ? 'Bill' : 'Bill (order not delivered)'}>
      <dl className="space-y-2 text-sm">
        <SummaryRow label="Medicine subtotal" value={formatRupees(order.medicineSubtotal)} />
        <SummaryRow label="Other items subtotal" value={formatRupees(order.nonMedicineSubtotal)} />
        <SummaryRow label="Delivery charge" value={formatRupees(order.deliveryCharge)} />
        <SummaryRow label="Final amount" value={formatRupees(order.finalAmount)} strong />
      </dl>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-muted">
        <Gift className="h-3.5 w-3.5 text-gift-500" aria-hidden />
        {order.offerApplied ? `Free ${GIFT.shortName} included` : 'No gift included'}
      </p>
      {order.deliveredAt && <p className="mt-1 text-xs text-ink-muted">Delivered {formatDateTime(order.deliveredAt)}</p>}
    </Section>
  );
}

const CUSTOM_REASON = 'Other (Custom Reason)';
const CANCEL_REASONS = [
  'Medicine Out of Stock',
  'Delivery partner unavailable right now',
  'Incomplete or Invalid Prescription',
  'Out of delivery coverage area',
  CUSTOM_REASON,
] as const;

interface CancelDialogProps {
  order: AdminOrder;
  onClose: () => void;
  onCancelled: (order: AdminOrder) => void;
}

function CancelOrderDialog({ order, onClose, onCancelled }: CancelDialogProps) {
  const toast = useToast();
  const titleId = useId();
  const descriptionId = useId();
  const customId = useId();
  const groupName = useId();
  const [reason, setReason] = useState<string | null>(null);
  const [customReason, setCustomReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const firstOptionRef = useRef<HTMLInputElement>(null);
  const customRef = useRef<HTMLTextAreaElement>(null);

  const finalReason = reason === CUSTOM_REASON ? customReason.trim() : (reason ?? '');
  const canSubmit = finalReason.length > 0;

  useEffect(() => {
    firstOptionRef.current?.focus();
  }, []);

  useEffect(() => {
    if (reason === CUSTOM_REASON) customRef.current?.focus();
  }, [reason]);

  const submit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      const res = await adminRequest<{ order: AdminOrder }>(`/orders/${order.id}/cancel`, {
        method: 'PATCH',
        body: { cancelReason: finalReason },
      });
      toast.success('Order cancelled successfully');
      onCancelled(res.order);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not cancel order');
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      if (!submitting) onClose();
      return;
    }
    trapTab(event);
  };

  return (
    <div className="fixed inset-0 z-[55] grid place-items-center p-4">
      <motion.div
        aria-hidden
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={submitting ? undefined : onClose}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onKeyDown={handleKeyDown}
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        transition={{ duration: 0.18 }}
        className="relative max-h-full w-full max-w-md overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-6"
      >
        <h2 id={titleId} className="font-display text-xl font-bold text-ink">
          Cancel this order?
        </h2>
        <p id={descriptionId} className="mt-1 text-sm text-ink-muted">
          {order.orderId} for {order.customerName} will move to Cancelled. The reason is saved with the order and shown to the customer when they track it.
        </p>

        <fieldset className="mt-4 space-y-2" disabled={submitting}>
          <legend className="mb-2 text-sm font-medium text-ink">Reason for cancellation</legend>
          {CANCEL_REASONS.map((option, index) => (
            <label
              key={option}
              className={cn(
                'flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 text-sm',
                reason === option ? 'border-brand-500 bg-brand-50' : 'border-brand-100 hover:bg-surface',
              )}
            >
              <input
                ref={index === 0 ? firstOptionRef : undefined}
                type="radio"
                name={groupName}
                value={option}
                checked={reason === option}
                onChange={() => setReason(option)}
                className="h-4 w-4 accent-brand-700"
              />
              {option}
            </label>
          ))}
        </fieldset>

        {reason === CUSTOM_REASON && (
          <div className="mt-3">
            <label htmlFor={customId} className="mb-1.5 block text-sm font-medium text-ink">
              Custom reason
            </label>
            <textarea
              id={customId}
              ref={customRef}
              value={customReason}
              onChange={(event) => setCustomReason(event.target.value)}
              disabled={submitting}
              placeholder="Type the exact reason here..."
              rows={3}
              aria-required
              className="w-full resize-none rounded-xl border-0 bg-surface p-3 text-sm outline-none ring-1 ring-inset ring-brand-100 focus:ring-2 focus:ring-brand-500"
            />
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Keep Order
          </Button>
          <Button variant="danger" onClick={submit} loading={submitting} disabled={!canSubmit}>
            Confirm Cancellation
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

interface OrderSidePanelProps {
  order: AdminOrder | null;
  deliveryCharge: number;
  open: boolean;
  onClose: () => void;
  onUpdated: (order: AdminOrder) => void;
  onDelivered: (order: AdminOrder) => void;
  onCancelled: (order: AdminOrder) => void;
}

export function OrderSidePanel({ order, deliveryCharge, open, onClose, onUpdated, onDelivered, onCancelled }: OrderSidePanelProps) {
  const lastOrder = useRef<AdminOrder | null>(null);
  if (order) lastOrder.current = order;
  const shown = order ?? lastOrder.current;

  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const cancelTriggerRef = useRef<HTMLButtonElement>(null);
  const [actionsTarget, setActionsTarget] = useState<HTMLDivElement | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);

  useBodyScrollLock(open);

  useEffect(() => {
    if (open) closeRef.current?.focus({ preventScroll: true });
    else setCancelOpen(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented && !cancelOpen) onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, cancelOpen, onClose]);

  const closeCancelDialog = useCallback(() => {
    setCancelOpen(false);
    requestAnimationFrame(() => (cancelTriggerRef.current ?? closeRef.current)?.focus({ preventScroll: true }));
  }, []);

  const handleCancelled = useCallback(
    (updated: AdminOrder) => {
      setCancelOpen(false);
      onCancelled(updated);
      requestAnimationFrame(() => closeRef.current?.focus({ preventScroll: true }));
    },
    [onCancelled],
  );

  const whatsappLink = shown ? buildWhatsappLink(shown) : null;

  return (
    <>
      <AnimatePresence>
        {open && shown && (
          <div key="order-panel" className="fixed inset-0 z-50">
            <motion.div
              aria-hidden
              className="absolute inset-0 bg-black/25 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onClose}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              onKeyDown={trapTab}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
              className="absolute inset-y-0 right-0 flex w-full flex-col bg-surface shadow-2xl sm:max-w-xl lg:max-w-2xl"
            >
              <header className="flex shrink-0 items-start justify-between gap-3 border-b border-brand-100 bg-white px-4 py-4 sm:px-6">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 id={titleId} className="font-mono text-xl font-bold tracking-wide text-brand-800">
                      {shown.orderId}
                    </h2>
                    <OrderStatusBadge status={shown.status} />
                  </div>
                  <p className="mt-1 text-xs text-ink-soft">
                    {shown.orderType === 'manual_text' ? 'Manual order' : 'Prescription order'} · {formatDateTime(shown.createdAt)}
                  </p>
                </div>
                <button
                  ref={closeRef}
                  type="button"
                  onClick={onClose}
                  aria-label="Close order details"
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-ink-muted hover:bg-brand-50 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                >
                  <X className="h-5 w-5" aria-hidden />
                </button>
              </header>

              <div className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
                {shown.status === 'Cancelled' && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                    <p className="flex items-center gap-2 text-sm font-bold text-red-800">
                      <AlertCircle className="h-4 w-4" aria-hidden /> Order cancelled
                    </p>
                    <p className="mt-1 text-sm text-red-700">{shown.cancelReason ?? 'No reason recorded.'}</p>
                    {whatsappLink && (
                      <a
                        href={whatsappLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"
                      >
                        Notify customer on WhatsApp <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                      </a>
                    )}
                  </div>
                )}

                <Section title="Customer" icon={<User className="h-3.5 w-3.5" aria-hidden />}>
                  <p className="text-base font-semibold text-ink">{shown.customerName}</p>
                  <a
                    href={`tel:+91${shown.mobileNumber}`}
                    className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-700 hover:underline"
                  >
                    <Phone className="h-4 w-4" aria-hidden /> {formatMobile(shown.mobileNumber)}
                  </a>
                  <div className="mt-2 flex gap-2 border-t border-brand-100 pt-3 text-sm">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-soft" aria-hidden />
                    <dl className="grid min-w-0 flex-1 grid-cols-[auto,1fr] gap-x-3 gap-y-1">
                      <dt className="text-ink-soft">Address</dt>
                      <dd className="break-words text-ink">{shown.address.flat || '—'}</dd>
                      <dt className="text-ink-soft">Area</dt>
                      <dd className="break-words text-ink">{shown.address.area || '—'}</dd>
                      {shown.address.landmark && (
                        <Fragment>
                          <dt className="text-ink-soft">Landmark</dt>
                          <dd className="break-words text-ink">{shown.address.landmark}</dd>
                        </Fragment>
                      )}
                    </dl>
                  </div>
                </Section>

                <Section title="Customer history">
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
                    <Stat label="First order">{shown.firstOrderAtCreation ? 'Yes' : 'No'}</Stat>
                    <Stat label="Previous orders">{shown.previousOrders}</Stat>
                    <Stat label="Delivered">{shown.customer?.deliveredOrders ?? 0}</Stat>
                    <Stat label="Gift claimed before">
                      {shown.customer?.offerClaimed ? `Yes${shown.customer.offerClaimedOrderId ? ` (${shown.customer.offerClaimedOrderId})` : ''}` : 'No'}
                    </Stat>
                  </dl>
                </Section>

                <Section title="Order details">
                  {shown.orderType === 'manual_text' ? (
                    <ul className="divide-y divide-brand-100 overflow-hidden rounded-xl ring-1 ring-brand-100">
                      {shown.medicines.map((item, index) => (
                        <li key={`${item.name}-${index}`} className="flex justify-between gap-3 px-3 py-2.5 text-sm">
                          <span className="min-w-0 break-words font-medium">{item.name}</span>
                          <span className="shrink-0 text-ink-muted">{item.quantity}</span>
                        </li>
                      ))}
                    </ul>
                  ) : shown.prescriptionUrl ? (
                    <a
                      href={shown.prescriptionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-4 rounded-xl p-2 ring-1 ring-brand-100 hover:ring-brand-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                    >
                      <Image
                        src={cloudinaryThumb(shown.prescriptionUrl, 240)}
                        alt={`Prescription for ${shown.orderId}`}
                        width={72}
                        height={96}
                        className="h-24 w-[72px] shrink-0 rounded-lg object-cover"
                        unoptimized
                      />
                      <span className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-brand-700 group-hover:underline">
                        View Prescription <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                      </span>
                    </a>
                  ) : (
                    <p className="text-sm text-ink-muted">No prescription image is attached to this order.</p>
                  )}
                </Section>

                {!shown.telegramNotificationSent && (
                  <div role="status" className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
                    <BellOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    <div className="text-sm">
                      <p className="font-semibold">Telegram notification was not delivered.</p>
                      <p className="mt-0.5 text-xs text-amber-800">Make sure this order has been seen by the team.</p>
                    </div>
                  </div>
                )}

                {shown.status === 'Pending' ? (
                  <Section title="Billing">
                    <BillingPanel
                      key={shown.id}
                      order={shown}
                      deliveryCharge={deliveryCharge}
                      onUpdated={onUpdated}
                      onDelivered={onDelivered}
                      actionsTarget={actionsTarget}
                    />
                  </Section>
                ) : (
                  <BillSummary order={shown} />
                )}
              </div>

              {shown.status === 'Pending' && (
                <footer className="shrink-0 space-y-1 border-t border-brand-100 bg-white px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-6">
                  {/* BillingPanel portals Save Bill / Mark as Delivered here so they stay visible while the body scrolls. */}
                  <div ref={setActionsTarget} />
                  <button
                    ref={cancelTriggerRef}
                    type="button"
                    onClick={() => setCancelOpen(true)}
                    className="flex min-h-11 w-full items-center justify-center rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
                  >
                    Cancel Order
                  </button>
                </footer>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {cancelOpen && shown && <CancelOrderDialog key="cancel-dialog" order={shown} onClose={closeCancelDialog} onCancelled={handleCancelled} />}
      </AnimatePresence>
    </>
  );
}

// ============================================================================
// MAIN COMPONENT (OrdersBoard)
// ============================================================================
const PAGE_SIZE = 20;
const POLL_MS = 30_000;

interface TabConfig {
  status: OrderStatus;
  label: string;
  icon: LucideIcon;
  emptyTitle: string;
  emptyHint: string;
}

const PENDING_TAB: TabConfig = {
  status: 'Pending',
  label: 'Pending',
  icon: Inbox,
  emptyTitle: 'No pending orders',
  emptyHint: 'New orders will appear here automatically.',
};

const TABS: TabConfig[] = [
  PENDING_TAB,
  { status: 'Delivered', label: 'Delivered', icon: PackageCheck, emptyTitle: 'No delivered orders yet.', emptyHint: 'Delivered orders will show up here.' },
  { status: 'Cancelled', label: 'Cancelled', icon: Ban, emptyTitle: 'No cancelled orders.', emptyHint: 'Cancelled orders and their reasons will show up here.' },
];

interface ListState {
  orders: AdminOrder[];
  pagination: Pagination | null;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  updatedAt: number | null;
}

const initialList: ListState = { orders: [], pagination: null, loading: true, loadingMore: false, error: null, updatedAt: null };

function useOrderList(status: OrderStatus) {
  const [state, setState] = useState<ListState>(initialList);
  const requestId = useRef(0);

  const load = useCallback(
    async (page = 1, { silent = false } = {}) => {
      const id = ++requestId.current;
      setState((current) => ({ ...current, loading: page === 1 && !silent, loadingMore: page > 1, error: null }));
      try {
        const res = await adminRequest<{ orders: AdminOrder[]; pagination: Pagination }>(`/orders?status=${status}&page=${page}&limit=${PAGE_SIZE}`);
        if (id !== requestId.current) return;
        setState((current) => {
          const known = new Set(current.orders.map((order) => order.id));
          return {
            orders: page === 1 ? res.orders : [...current.orders, ...res.orders.filter((order) => !known.has(order.id))],
            pagination: res.pagination,
            loading: false,
            loadingMore: false,
            error: null,
            updatedAt: Date.now(),
          };
        });
      } catch (error) {
        if (id !== requestId.current) return;
        setState((current) => ({ ...current, loading: false, loadingMore: false, error: (error as Error).message }));
      }
    },
    [status],
  );

  const replace = useCallback(
    (order: AdminOrder) =>
      setState((current) =>
        current.orders.some((item) => item.id === order.id) ? { ...current, orders: current.orders.map((item) => (item.id === order.id ? order : item)) } : current,
      ),
    [],
  );

  const remove = useCallback(
    (id: string) =>
      setState((current) => {
        if (!current.orders.some((item) => item.id === id)) return current;
        return {
          ...current,
          orders: current.orders.filter((item) => item.id !== id),
          pagination: current.pagination && { ...current.pagination, total: Math.max(0, current.pagination.total - 1) },
        };
      }),
    [],
  );

  const prepend = useCallback(
    (order: AdminOrder) =>
      setState((current) => {
        const existed = current.orders.some((item) => item.id === order.id);
        return {
          ...current,
          orders: [order, ...current.orders.filter((item) => item.id !== order.id)],
          pagination: existed ? current.pagination : current.pagination && { ...current.pagination, total: current.pagination.total + 1 },
        };
      }),
    [],
  );

  return { ...state, load, replace, remove, prepend };
}

export function OrdersBoard() {
  const pending = useOrderList('Pending');
  const delivered = useOrderList('Delivered');
  const cancelled = useOrderList('Cancelled');

  const [activeTab, setActiveTab] = useState<OrderStatus>('Pending');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [deliveryCharge, setDeliveryCharge] = useState(0);
  const triggerRef = useRef<HTMLElement | null>(null);
  const tabsId = useId();

  const { load: loadPending, replace: replacePending, remove: removePending } = pending;
  const { load: loadDelivered, replace: replaceDelivered, prepend: prependDelivered } = delivered;
  const { load: loadCancelled, replace: replaceCancelled, prepend: prependCancelled } = cancelled;

  const loadSettings = useCallback(() => {
    adminRequest<{ settings: AdminSettings }>('/settings')
      .then((res) => setDeliveryCharge(res.settings.deliveryCharge))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    void loadPending();
    void loadDelivered();
    void loadCancelled();
    loadSettings();
  }, [loadPending, loadDelivered, loadCancelled, loadSettings]);

  const pendingPage = pending.pagination?.page ?? 1;
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible' && pendingPage === 1) void loadPending(1, { silent: true });
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [loadPending, pendingPage]);

  const refresh = () => {
    void loadPending();
    void loadDelivered();
    void loadCancelled();
    loadSettings();
  };

  const selectedOrder = useMemo(() => {
    if (selectedOrderId === null) return null;
    const match = (order: AdminOrder) => order.id === selectedOrderId;
    return pending.orders.find(match) ?? delivered.orders.find(match) ?? cancelled.orders.find(match) ?? null;
  }, [selectedOrderId, pending.orders, delivered.orders, cancelled.orders]);

  useEffect(() => {
    if (selectedOrderId !== null && selectedOrder === null) setSelectedOrderId(null);
  }, [selectedOrderId, selectedOrder]);

  useEffect(() => {
    if (selectedOrderId !== null) return;
    const trigger = triggerRef.current;
    triggerRef.current = null;
    if (trigger?.isConnected) trigger.focus({ preventScroll: true });
  }, [selectedOrderId]);

  const handleSelect = useCallback((id: string, trigger: HTMLElement) => {
    triggerRef.current = trigger;
    setSelectedOrderId(id);
  }, []);

  const handleClose = useCallback(() => setSelectedOrderId(null), []);

  const handleUpdated = useCallback(
    (order: AdminOrder) => {
      replacePending(order);
      replaceDelivered(order);
      replaceCancelled(order);
    },
    [replacePending, replaceDelivered, replaceCancelled],
  );

  const handleDelivered = useCallback(
    (order: AdminOrder) => {
      removePending(order.id);
      prependDelivered(order);
    },
    [removePending, prependDelivered],
  );

  const handleCancelled = useCallback(
    (order: AdminOrder) => {
      removePending(order.id);
      prependCancelled(order);
    },
    [removePending, prependCancelled],
  );

  const handleTabKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const index = TABS.findIndex((tab) => tab.status === activeTab);
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % TABS.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + TABS.length) % TABS.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = TABS.length - 1;
    else return;

    const nextTab = TABS[next];
    if (!nextTab) return;

    event.preventDefault();
    setActiveTab(nextTab.status);
    document.getElementById(`${tabsId}-tab-${nextTab.status}`)?.focus();
  };

  const lists = { Pending: pending, Delivered: delivered, Cancelled: cancelled } as const;
  const list = lists[activeTab];
  
  const activeMeta = TABS.find((tab) => tab.status === activeTab) ?? PENDING_TAB;
  
  const refreshing = pending.loading || delivered.loading || cancelled.loading;
  const pagination = list.pagination;

  return (
    <ToastProvider>
      <MotionConfig reducedMotion="user">
        <div className="mx-auto max-w-4xl">
          
          <AnalyticsOverview />

          <div className="mt-8 flex flex-wrap items-start justify-between gap-3 border-t border-brand-100 pt-8">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-2xl font-bold">Orders</h2>
                <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-semibold text-ink-muted ring-1 ring-inset ring-brand-100">
                  All-Time
                </span>
              </div>
              <p className="mt-1 text-sm text-ink-muted">Manage all incoming, delivered and cancelled pharmacy orders across all dates.</p>
            </div>
            <div className="flex items-center gap-3">
              {pending.updatedAt && <span className="hidden text-xs text-ink-soft sm:inline">Updated {timeFormatter.format(pending.updatedAt)}</span>}
              <Button variant="secondary" onClick={refresh} icon={<RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />}>
                Refresh
              </Button>
            </div>
          </div>

          <dl className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
            {TABS.map((tab) => (
              <div key={tab.status} className="rounded-2xl border border-brand-100 bg-white px-3 py-3 sm:px-4">
                <dt className="flex items-center gap-1.5 text-xs font-semibold text-ink-soft">
                  <tab.icon className="h-3.5 w-3.5" aria-hidden /> {tab.label}
                </dt>
                <dd className="mt-1 text-2xl font-bold tabular-nums">{lists[tab.status].pagination?.total ?? '—'}</dd>
              </div>
            ))}
          </dl>

          <div
            role="tablist"
            aria-label="Order status"
            onKeyDown={handleTabKeyDown}
            className="mt-5 grid grid-cols-3 gap-1 rounded-2xl bg-white p-1 ring-1 ring-brand-100 sm:inline-grid sm:grid-cols-[repeat(3,minmax(8rem,1fr))]"
          >
            {TABS.map((tab) => {
              const active = activeTab === tab.status;
              const total = lists[tab.status].pagination?.total;
              return (
                <button
                  key={tab.status}
                  id={`${tabsId}-tab-${tab.status}`}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-controls={`${tabsId}-panel`}
                  tabIndex={active ? 0 : -1}
                  onClick={() => setActiveTab(tab.status)}
                  className={cn(
                    'relative flex h-11 items-center justify-center gap-1.5 rounded-xl px-2 text-sm font-semibold transition-colors',
                    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
                    active ? 'text-white' : 'text-ink-muted hover:text-ink',
                  )}
                >
                  {active && (
                    <motion.span layoutId={`${tabsId}-indicator`} className="absolute inset-0 rounded-xl bg-brand-700" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />
                  )}
                  <span className="relative">{tab.label}</span>
                  {total !== undefined && (
                    <span className={cn('relative rounded-full px-1.5 text-xs tabular-nums', active ? 'bg-white/20' : 'bg-brand-50 text-brand-700')}>{total}</span>
                  )}
                </button>
              );
            })}
          </div>

          <div role="tabpanel" id={`${tabsId}-panel`} aria-labelledby={`${tabsId}-tab-${activeTab}`} className="mt-4">
            {list.loading && list.orders.length === 0 ? (
              <div className="space-y-2" aria-busy>
                {Array.from({ length: 5 }, (_, index) => (
                  <Skeleton key={index} className="h-24 rounded-2xl" />
                ))}
              </div>
            ) : list.error && list.orders.length === 0 ? (
              <div className="card p-6 text-center" role="alert">
                <p className="font-semibold">Could not load orders</p>
                <p className="mt-1 text-sm text-ink-muted">{list.error}</p>
                <Button variant="secondary" size="sm" className="mt-4" onClick={() => void list.load()}>
                  Try again
                </Button>
              </div>
            ) : list.orders.length === 0 ? (
              <div className="card grid place-items-center p-10 text-center">
                <activeMeta.icon className="h-10 w-10 text-brand-200" aria-hidden />
                <p className="mt-3 text-sm font-semibold text-ink">{activeMeta.emptyTitle}</p>
                <p className="mt-1 text-sm text-ink-muted">{activeMeta.emptyHint}</p>
              </div>
            ) : (
              <>
                {list.error && (
                  <div role="alert" className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                    <span className="min-w-0">{list.error}</span>
                    <button type="button" onClick={() => void list.load()} className="min-h-11 shrink-0 px-2 font-semibold underline">
                      Try again
                    </button>
                  </div>
                )}
                <ul className={cn('space-y-2 transition-opacity', list.loading && 'opacity-60')}>
                  {list.orders.map((order) => (
                    <li key={order.id}>
                      <CompactOrderCard order={order} selected={order.id === selectedOrderId} onSelect={handleSelect} />
                    </li>
                  ))}
                </ul>
                {pagination && pagination.page < pagination.totalPages && (
                  <Button variant="secondary" className="mt-4 w-full" loading={list.loadingMore} onClick={() => void list.load(pagination.page + 1)}>
                    Load more
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        <OrderSidePanel
          order={selectedOrder}
          open={selectedOrder !== null}
          deliveryCharge={deliveryCharge}
          onClose={handleClose}
          onUpdated={handleUpdated}
          onDelivered={handleDelivered}
          onCancelled={handleCancelled}
        />
      </MotionConfig>
    </ToastProvider>
  );
}
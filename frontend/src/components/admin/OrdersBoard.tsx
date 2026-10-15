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
  RefreshCw, Save, ShoppingBag, Trash2, TrendingUp, User, X, XCircle, Loader2, type LucideIcon,
  CalendarDays
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
// UI COMPONENTS (Premium Design System)
// ============================================================================
type Variant = 'primary' | 'secondary' | 'ghost' | 'gift' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const variants: Record<Variant, string> = {
  primary: 'bg-[#156253] text-[#FFFFFF] hover:bg-[#0F1F1C] shadow-[0_2px_8px_rgba(21,98,83,0.15)] disabled:opacity-50',
  secondary: 'bg-[#FFFFFF] text-[#0F1F1C] ring-1 ring-inset ring-[#156253]/15 hover:bg-[#F6FAF8] shadow-sm disabled:opacity-50',
  ghost: 'text-[#156253] hover:bg-[#156253]/5 disabled:opacity-50',
  gift: 'bg-gradient-to-br from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 shadow-md disabled:opacity-50',
  danger: 'bg-[#DC2626] text-white hover:bg-[#B91C1C] shadow-sm disabled:opacity-50',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-[14px] gap-2 rounded-xl',
  lg: 'h-12 px-6 text-[15px] gap-2.5 rounded-xl',
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
        'inline-flex select-none items-center justify-center font-semibold tracking-wide transition-all duration-200',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#156253]',
        'active:scale-[0.97] disabled:cursor-not-allowed disabled:active:scale-100',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin text-current" aria-hidden /> : icon}
      {children}
    </button>
  );
});

export function Skeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn('relative overflow-hidden rounded-xl bg-[#156253]/5', className)}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
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
  success: 'text-[#156253]',
  error: 'text-[#DC2626]',
  info: 'text-[#0F1F1C]/70',
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
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:items-end sm:px-6">
        <AnimatePresence initial={false}>
          {toasts.map((toast) => {
            const Icon = toastIcons[toast.tone];
            return (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, y: 16, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                role={toast.tone === 'error' ? 'alert' : 'status'}
                className="pointer-events-auto flex w-full max-w-[360px] items-start gap-3 rounded-2xl bg-[#FFFFFF]/95 px-4 py-3.5 shadow-[0_8px_30px_rgba(0,0,0,0.08)] ring-1 ring-[#156253]/10 backdrop-blur-md"
              >
                <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', toastTones[toast.tone])} aria-hidden />
                <p className="flex-1 text-[14px] font-medium text-[#0F1F1C]">{toast.message}</p>
                <button type="button" onClick={() => dismiss(toast.id)} className="text-[#0F1F1C]/40 hover:text-[#0F1F1C] transition-colors" aria-label="Dismiss">
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
  Pending: { pill: 'bg-amber-50 text-amber-700 ring-amber-200/50', dot: 'bg-amber-500' },
  Delivered: { pill: 'bg-[#D8F3E8]/50 text-[#156253] ring-[#156253]/10', dot: 'bg-[#156253]' },
  Cancelled: { pill: 'bg-red-50 text-red-700 ring-red-100', dot: 'bg-red-500' },
};

export function OrderStatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  const tone = STATUS_TONES[status];
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase ring-1 ring-inset', tone.pill, className)}>
      <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', tone.dot)} />
      {status}
    </span>
  );
}

function buildSummary(order: AdminOrder) {
  const parts: string[] = [];
  if (order.orderType === 'manual_text') {
    const count = order.medicines.length;
    parts.push(`${count} ${count === 1 ? 'item' : 'items'}`);
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

  return (
    <button
      type="button"
      onClick={(event) => onSelect(order.id, event.currentTarget)}
      aria-current={selected ? 'true' : undefined}
      className={cn(
        'group relative flex w-full flex-col sm:flex-row sm:items-center justify-between gap-4 overflow-hidden rounded-2xl p-4 text-left transition-all duration-300',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#156253]',
        selected 
          ? 'bg-[#FFFFFF] ring-2 ring-[#156253] shadow-[0_4px_16px_rgba(21,98,83,0.08)] z-10' 
          : 'bg-[#FFFFFF] ring-1 ring-[#156253]/10 hover:ring-[#156253]/30 hover:shadow-sm hover:-translate-y-[1px]'
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="font-mono text-[13px] font-bold tracking-wider text-[#156253] bg-[#D8F3E8]/40 px-2 py-0.5 rounded-md">
            {order.orderId}
          </span>
          <OrderStatusBadge status={order.status} />
          {notNotified && (
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700" title="Notification failed">
              <BellOff className="h-3 w-3" /> <span className="hidden sm:inline">No Alert</span>
            </span>
          )}
          {giftRequested && (
            <span className="inline-flex items-center gap-1 rounded-md bg-gradient-to-r from-orange-50 to-amber-50 px-1.5 py-0.5 text-[11px] font-semibold text-orange-600 ring-1 ring-inset ring-orange-200/50" title="Gift requested">
              <Gift className="h-3 w-3" /> <span className="hidden sm:inline">Gift</span>
            </span>
          )}
        </div>
        
        <div className="flex items-baseline justify-between gap-4">
          <span className="truncate text-[15px] font-bold text-[#0F1F1C]">{order.customerName}</span>
          <span className="shrink-0 text-[12px] font-medium text-[#0F1F1C]/60 sm:hidden">{formatDateTime(order.createdAt).split(',')[1]}</span>
        </div>
        
        <div className="flex items-center gap-2 text-[13px] font-medium text-[#0F1F1C]/60">
          <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{formatMobile(order.mobileNumber)}</span>
          <span className="text-[#156253]/30">•</span>
          <span className="truncate">{buildSummary(order)}</span>
        </div>
      </div>

      <div className="hidden shrink-0 flex-col items-end justify-between sm:flex">
        <span className="text-[12px] font-medium text-[#0F1F1C]/50">{formatDateTime(order.createdAt)}</span>
        <ChevronRight className={cn("mt-4 h-5 w-5 text-[#0F1F1C]/30 transition-transform duration-300", selected ? "translate-x-1 text-[#156253]" : "group-hover:translate-x-1 group-hover:text-[#156253]/60")} />
      </div>
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
    dateRangeType === 'yesterday' ? "Yesterday's" : "Custom Range";

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
    <section className="mb-10 space-y-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end justify-between border-b border-[#156253]/10 pb-6">
        <div>
          <h2 className="font-display text-[26px] font-bold text-[#0F1F1C] tracking-tight">Sales & Analytics</h2>
          <p className="mt-1 text-[14px] text-[#0F1F1C]/60">Track revenue and order volume in real-time.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex items-center">
            <CalendarDays className="absolute left-3.5 h-4 w-4 text-[#156253]/60" />
            <select 
              className="h-10 cursor-pointer appearance-none rounded-xl border-none bg-[#FFFFFF] pl-10 pr-10 text-[13px] font-semibold text-[#0F1F1C] shadow-sm ring-1 ring-inset ring-[#156253]/15 transition-all hover:bg-[#F6FAF8] focus:ring-2 focus:ring-[#156253]"
              value={dateRangeType}
              onChange={(e) => setDateRangeType(e.target.value as 'today' | 'yesterday' | 'custom')}
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="custom">Custom Range</option>
            </select>
            <ChevronRight className="pointer-events-none absolute right-3 h-4 w-4 rotate-90 text-[#0F1F1C]/40" />
          </div>

          <AnimatePresence>
            {dateRangeType === 'custom' && (
              <motion.div 
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="flex items-center gap-2 overflow-hidden"
              >
                <input 
                  type="date" 
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="h-10 rounded-xl border-none bg-[#FFFFFF] px-3.5 text-[13px] font-medium text-[#0F1F1C] shadow-sm ring-1 ring-inset ring-[#156253]/15 focus:ring-2 focus:ring-[#156253]"
                />
                <span className="text-[13px] font-medium text-[#0F1F1C]/40">to</span>
                <input 
                  type="date" 
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="h-10 rounded-xl border-none bg-[#FFFFFF] px-3.5 text-[13px] font-medium text-[#0F1F1C] shadow-sm ring-1 ring-inset ring-[#156253]/15 focus:ring-2 focus:ring-[#156253]"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {error && (
         <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl bg-red-50 p-4 text-[13px] font-medium text-red-700 ring-1 ring-inset ring-red-200">
           {error}
         </motion.div>
      )}

      {loading && !data ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-6">
          <Skeleton className="h-[132px] rounded-2xl" />
          <Skeleton className="h-[132px] rounded-2xl" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-6">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="group relative overflow-hidden rounded-2xl bg-[#FFFFFF] p-6 shadow-sm ring-1 ring-inset ring-[#156253]/10 transition-all hover:shadow-md hover:ring-[#156253]/20"
          >
            <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-gradient-to-br from-[#D8F3E8]/50 to-transparent opacity-50 blur-2xl group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="flex items-center gap-2.5 text-[12px] font-bold uppercase tracking-widest text-[#0F1F1C]/60">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#D8F3E8] text-[#156253]">
                  <TrendingUp className="h-4 w-4" />
                </span>
                {dateRangeLabel} Sales
              </div>
              <div className="mt-4 flex items-end gap-3">
                <span className="font-display text-[40px] font-bold tracking-tight text-[#0F1F1C] tabular-nums leading-none">
                  {formatRupees(data?.totalSales ?? 0)}
                </span>
              </div>
              <p className="mt-2 text-[13px] font-medium text-[#156253]/60">Based strictly on delivered orders.</p>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="group relative overflow-hidden rounded-2xl bg-[#FFFFFF] p-6 shadow-sm ring-1 ring-inset ring-[#156253]/10 transition-all hover:shadow-md hover:ring-[#156253]/20"
          >
            <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-gradient-to-br from-amber-100/50 to-transparent opacity-50 blur-2xl group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="flex items-center gap-2.5 text-[12px] font-bold uppercase tracking-widest text-[#0F1F1C]/60">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0F1F1C]/5 text-[#0F1F1C]">
                  <ShoppingBag className="h-4 w-4" />
                </span>
                {dateRangeLabel} Volume
              </div>
              <div className="mt-4 flex items-center justify-between gap-4">
                <span className="font-display text-[40px] font-bold tracking-tight text-[#0F1F1C] tabular-nums leading-none">
                  {data?.totalOrders ?? 0}
                </span>
                <div className="flex flex-col gap-1.5 text-[12px] font-bold uppercase tracking-wide">
                  <span className="flex items-center gap-2 text-amber-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> {data?.breakdown.pending ?? 0} Pending
                  </span>
                  <span className="flex items-center gap-2 text-[#156253]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#156253]" /> {data?.breakdown.delivered ?? 0} Delivered
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </section>
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
      {label && <label htmlFor={id} className="mb-1.5 block text-[13px] font-semibold text-[#0F1F1C]">{label}</label>}
      <div className={cn(
        'group flex h-11 items-center rounded-xl bg-[#FFFFFF] shadow-sm ring-1 ring-inset transition-all', 
        invalid ? 'ring-red-300 focus-within:ring-2 focus-within:ring-red-500' : 'ring-[#156253]/15 focus-within:ring-2 focus-within:ring-[#156253]'
      )}>
        <span className="pl-3.5 pr-2 text-[14px] font-medium text-[#0F1F1C]/40 transition-colors group-focus-within:text-[#156253]">₹</span>
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          value={value}
          onChange={(event) => onChange(event.target.value.replace(/[^\d.]/g, ''))}
          placeholder="0.00"
          aria-invalid={invalid || undefined}
          className="h-full w-full rounded-r-xl bg-transparent pr-3.5 text-[15px] font-semibold tabular-nums text-[#0F1F1C] placeholder:text-[#0F1F1C]/30 focus:outline-none"
        />
      </div>
      {hint && <p className="mt-1.5 text-[11px] font-medium text-[#0F1F1C]/50">{hint}</p>}
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
      toast.success(res.order.offerEligible ? 'Bill saved · Eligible for free gift' : 'Bill saved successfully');
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
    <div className="space-y-3 pb-safe-offset-2">
      <div className="grid gap-3 min-[400px]:grid-cols-2">
        <Button variant="secondary" size="lg" onClick={saveBill} loading={saving} disabled={!valid || delivering} icon={<Save className="h-[18px] w-[18px]" />}>
          Save Bill
        </Button>
        <AnimatePresence mode="wait" initial={false}>
          {confirmDelivery ? (
            <motion.div key="confirm" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex gap-2">
              <Button variant="ghost" size="lg" className="flex-1 bg-[#F6FAF8]" onClick={() => setConfirmDelivery(false)} disabled={delivering}>
                Cancel
              </Button>
              <Button variant="primary" size="lg" className="flex-1" onClick={deliver} loading={delivering}>
                Confirm
              </Button>
            </motion.div>
          ) : (
            <motion.div key="deliver" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex">
              <Button
                variant="primary"
                size="lg"
                className="w-full shadow-[0_4px_12px_rgba(21,98,83,0.2)]"
                onClick={() => setConfirmDelivery(true)}
                disabled={!billed || dirty || saving}
                title={!billed || dirty ? 'Save the bill first' : undefined}
                icon={<PackageCheck className="h-[18px] w-[18px]" />}
              >
                Mark Delivered
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {confirmDelivery && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <p className="text-[12px] font-medium text-[#156253] bg-[#D8F3E8]/50 p-2.5 rounded-lg border border-[#156253]/10">
              Confirm payment collected{order.offerApplied ? ` & free ${GIFT.shortName} handed over.` : '.'}
            </p>
          </motion.div>
        )}
        {(!billed || dirty) && !confirmDelivery && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center text-[12px] font-medium text-[#0F1F1C]/50">
            Unsaved changes. Save bill to enable delivery.
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* MEDICINES SECTION */}
      <section className="space-y-4">
        <header className="flex items-center justify-between border-b border-[#156253]/10 pb-2">
          <h4 className="text-[14px] font-bold text-[#0F1F1C]">Medicines <span className="ml-1 text-[#0F1F1C]/40 font-normal">({medicinesData.length})</span></h4>
          <Button variant="ghost" size="sm" onClick={addMedicine} className="h-7 px-2 text-[#156253]" icon={<Plus className="w-4 h-4" />}>Add</Button>
        </header>
        
        <div className="grid gap-3">
          <AnimatePresence initial={false}>
            {medicinesData.map((med, index) => (
              <motion.div 
                key={med._id || `new-med-${index}`} 
                layout
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                className={cn(
                  "group relative overflow-hidden rounded-xl border p-4 transition-all duration-300", 
                  med.isAvailable ? "bg-[#FFFFFF] border-[#156253]/15 shadow-sm focus-within:ring-2 focus-within:ring-[#156253]" : "bg-[#F6FAF8] border-transparent opacity-75"
                )}
              >
                {!med._id && (
                  <button 
                    onClick={() => removeMedicine(index)} 
                    className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-lg bg-red-50 text-red-600 opacity-0 transition-all hover:bg-red-100 group-hover:opacity-100 sm:focus:opacity-100 sm:active:opacity-100"
                    title="Remove Medicine"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}

                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3 min-w-0">
                    <div>
                      <input
                        value={med.name}
                        onChange={(e) => updateMedicine(index, 'name', e.target.value)}
                        placeholder="Medicine Name"
                        className={cn(
                          "w-full bg-transparent text-[15px] font-semibold text-[#0F1F1C] placeholder:text-[#0F1F1C]/30 focus:outline-none",
                          !med.isAvailable && "line-through text-[#0F1F1C]/40"
                        )}
                      />
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="flex-1 relative">
                        <label className="sr-only">Quantity</label>
                        <input
                          value={med.quantity}
                          onChange={(e) => updateMedicine(index, 'quantity', e.target.value)}
                          placeholder="e.g. 1 strip, 10 tabs"
                          className="w-full bg-transparent text-[13px] font-medium text-[#0F1F1C]/70 placeholder:text-[#0F1F1C]/30 focus:outline-none"
                        />
                      </div>
                      
                      <label className="flex cursor-pointer items-center gap-2 rounded-md p-1 hover:bg-[#F6FAF8] transition-colors">
                        <div className={cn("flex h-4 w-8 items-center rounded-full p-0.5 transition-colors", med.isAvailable ? "bg-[#156253]" : "bg-[#0F1F1C]/20")}>
                          <motion.div layout className="h-3 w-3 rounded-full bg-white shadow-sm" animate={{ x: med.isAvailable ? 16 : 0 }} transition={{ type: "spring", stiffness: 700, damping: 30 }} />
                        </div>
                        <input 
                          type="checkbox" 
                          className="sr-only" 
                          checked={med.isAvailable} 
                          onChange={(e) => {
                            updateMedicine(index, 'isAvailable', e.target.checked);
                            if (!e.target.checked) updateMedicine(index, 'price', '0');
                          }} 
                        />
                        <span className="text-[12px] font-bold tracking-wide uppercase text-[#0F1F1C]/60">Stock</span>
                      </label>
                    </div>
                  </div>
                </div>
                
                <AnimatePresence>
                  {med.isAvailable && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }} 
                      animate={{ height: 'auto', opacity: 1 }} 
                      exit={{ height: 0, opacity: 0 }} 
                      className="overflow-hidden"
                    >
                      <div className="mt-4 border-t border-[#156253]/10 pt-4">
                        <AmountInput 
                          id={`price-${index}`} 
                          label="Medicine Price" 
                          value={med.price} 
                          onChange={(val) => updateMedicine(index, 'price', val)} 
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </section>

      {/* PRODUCTS SECTION */}
      <section className="space-y-4">
        <header className="flex items-center justify-between border-b border-[#156253]/10 pb-2">
          <h4 className="text-[14px] font-bold text-[#0F1F1C]">Other Products <span className="ml-1 text-[#0F1F1C]/40 font-normal">({productsData.length})</span></h4>
          <Button variant="ghost" size="sm" onClick={addProduct} className="h-7 px-2 text-[#156253]" icon={<Plus className="w-4 h-4" />}>Add</Button>
        </header>
        
        <div className="grid gap-3">
          <AnimatePresence initial={false}>
            {productsData.map((prod, index) => (
              <motion.div 
                key={prod._id || `new-prod-${index}`} 
                layout
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                className="group relative overflow-hidden rounded-xl border border-[#156253]/15 bg-[#FFFFFF] p-4 shadow-sm transition-all focus-within:ring-2 focus-within:ring-[#156253]"
              >
                <button 
                  onClick={() => removeProduct(index)} 
                  className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-lg bg-red-50 text-red-600 opacity-0 transition-all hover:bg-red-100 group-hover:opacity-100 sm:focus:opacity-100 sm:active:opacity-100"
                  title="Remove Product"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>

                <div className="flex-1 space-y-4 min-w-0 pr-6">
                  <input
                    value={prod.name}
                    onChange={(e) => updateProduct(index, 'name', e.target.value)}
                    placeholder="Product Name (e.g. Shampoo)"
                    className="w-full bg-transparent text-[15px] font-semibold text-[#0F1F1C] placeholder:text-[#0F1F1C]/30 focus:outline-none"
                  />
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 rounded-lg bg-[#F6FAF8] p-1 ring-1 ring-inset ring-[#156253]/10">
                      <span className="pl-2 text-[11px] font-bold uppercase tracking-wider text-[#0F1F1C]/50">Qty</span>
                      <input
                        type="number"
                        min="1"
                        value={prod.quantity}
                        onChange={(e) => updateProduct(index, 'quantity', e.target.value)}
                        className="w-12 bg-transparent py-1 text-center text-[14px] font-semibold text-[#0F1F1C] focus:outline-none"
                      />
                    </div>
                    
                    <div className="flex-1">
                      <AmountInput 
                        id={`prod-price-${index}`} 
                        value={prod.price} 
                        onChange={(val) => updateProduct(index, 'price', val)} 
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </section>

      {/* FINANCIAL SUMMARY */}
      <section className="rounded-2xl border border-[#156253]/10 bg-[#FFFFFF] shadow-sm">
        <div className="grid grid-cols-2 gap-4 border-b border-[#156253]/10 p-5">
          <AmountInput id={`${order.id}-other`} label="Misc Charges" hint="Extra non-product fees" value={other} onChange={setOther} />
          <AmountInput id={`${order.id}-discount`} label="Discount" hint="Total order discount" value={discount} onChange={setDiscount} />
        </div>

        <dl className="p-5 text-[14px]">
          <div className="flex justify-between gap-4 py-2">
            <dt className="font-medium text-[#0F1F1C]/60">Medicines Subtotal</dt>
            <dd className="font-semibold tabular-nums text-[#0F1F1C]">{medicineValue === null ? '—' : formatRupees(medicineValue)}</dd>
          </div>
          <div className="flex justify-between gap-4 py-2">
            <dt className="font-medium text-[#0F1F1C]/60">Products & Charges</dt>
            <dd className="font-semibold tabular-nums text-[#0F1F1C]">{combinedNonMedicineSubtotal === null ? '—' : formatRupees(combinedNonMedicineSubtotal)}</dd>
          </div>
          <div className="flex justify-between gap-4 py-2">
            <dt className="font-medium text-[#0F1F1C]/60">Delivery Fee</dt>
            <dd className="font-semibold tabular-nums text-[#0F1F1C]">{formatRupees(deliveryCharge)}</dd>
          </div>
          <div className="flex justify-between gap-4 py-2 text-[#156253]">
            <dt className="font-bold">Discount Applied</dt>
            <dd className="font-bold tabular-nums">-{preview.appliedDiscount === null ? '—' : formatRupees(preview.appliedDiscount)}</dd>
          </div>
          
          <div className="mt-4 flex items-center justify-between gap-4 rounded-xl bg-[#F6FAF8] p-4 ring-1 ring-inset ring-[#156253]/10">
            <dt className="text-[16px] font-bold text-[#0F1F1C]">Final Amount</dt>
            <dd className="font-display text-[28px] font-bold tabular-nums leading-none text-[#156253]">
              {preview.finalAmount === null ? '—' : formatRupees(preview.finalAmount)}
            </dd>
          </div>
        </dl>
      </section>

      {/* GIFT ELIGIBILITY CARD */}
      <section className={cn(
        'relative overflow-hidden rounded-2xl p-5 shadow-sm ring-1 ring-inset transition-all duration-300', 
        status.eligible ? 'bg-gradient-to-br from-[#D8F3E8]/80 to-[#FFFFFF] ring-[#156253]/20' : 'bg-[#FFFFFF] ring-[#156253]/10'
      )}>
        {status.eligible && <div className="absolute right-0 top-0 h-32 w-32 -translate-y-1/2 translate-x-1/3 rounded-full bg-gradient-to-bl from-[#156253]/10 to-transparent blur-2xl" />}
        
        <div className="relative">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-widest text-[#0F1F1C]/50">
                <Gift className="h-4 w-4 text-[#156253]" /> Gift Status
              </div>
              <p className="mt-2 text-[16px] font-bold text-[#0F1F1C]">Free {GIFT.shortName}</p>
              <p className="mt-1 text-[13px] font-medium text-[#0F1F1C]/60">Requires {formatRupees(order.offer.requiredMedicineAmount)} in medicines.</p>
            </div>
            <span className={cn(
              'shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-bold tracking-wide uppercase', 
              status.eligible ? 'bg-[#156253] text-[#FFFFFF] shadow-sm' : 'bg-[#0F1F1C]/5 text-[#0F1F1C]/60'
            )}>
              {status.eligible ? 'Qualified' : 'Ineligible'}
            </span>
          </div>

          <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
            {(Object.keys(CHECK_LABELS) as Array<keyof typeof CHECK_LABELS>).map((key) => (
              <div key={key} className="flex items-center gap-2.5 rounded-lg bg-[#FFFFFF]/50 p-2 text-[12px] font-medium ring-1 ring-inset ring-[#156253]/5">
                {status.checks[key] ? <CheckCircle2 className="h-4 w-4 text-[#156253]" aria-hidden /> : <XCircle className="h-4 w-4 text-[#0F1F1C]/20" aria-hidden />}
                <span className={status.checks[key] ? 'text-[#0F1F1C]' : 'text-[#0F1F1C]/50'}>{CHECK_LABELS[key]}</span>
              </div>
            ))}
          </div>

          <label
            className={cn(
              'mt-5 flex min-h-14 select-none items-center gap-3.5 rounded-xl bg-[#FFFFFF] px-4 shadow-sm ring-1 ring-inset transition-all',
              preview.eligible ? 'cursor-pointer ring-[#156253]/20 hover:ring-[#156253]/40' : 'cursor-not-allowed opacity-50 ring-transparent',
              giftIncluded && 'ring-2 ring-[#156253]'
            )}
          >
            <div className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors", giftIncluded ? "border-[#156253] bg-[#156253]" : "border-[#0F1F1C]/20 bg-transparent")}>
              {giftIncluded && <CheckCircle2 className="h-4 w-4 text-white" />}
            </div>
            <input type="checkbox" className="sr-only" checked={giftIncluded} disabled={!preview.eligible} onChange={(event) => setGiftIncluded(event.target.checked)} />
            <span className="text-[14px] font-bold text-[#0F1F1C]">Include free gift in delivery</span>
          </label>
        </div>
      </section>

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
    <section aria-labelledby={id} className="rounded-2xl border border-[#156253]/10 bg-[#FFFFFF] p-5 shadow-sm">
      <h3 id={id} className="mb-4 flex items-center gap-2.5 text-[12px] font-bold uppercase tracking-widest text-[#0F1F1C]/50">
        {icon}
        {title}
      </h3>
      {children}
    </section>
  );
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-[#F6FAF8] p-3 ring-1 ring-inset ring-[#156253]/5">
      <dt className="text-[12px] font-medium text-[#0F1F1C]/60">{label}</dt>
      <dd className="text-[15px] font-bold text-[#0F1F1C]">{children}</dd>
    </div>
  );
}

function SummaryRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn('flex items-center justify-between gap-4', strong && 'border-t border-[#156253]/10 pt-3 mt-1')}>
      <dt className={cn(strong ? 'text-[15px] font-bold text-[#0F1F1C]' : 'text-[14px] font-medium text-[#0F1F1C]/60')}>{label}</dt>
      <dd className={cn('tabular-nums', strong ? 'text-[20px] font-bold text-[#156253]' : 'text-[14px] font-semibold text-[#0F1F1C]')}>{value}</dd>
    </div>
  );
}

function BillSummary({ order }: { order: AdminOrder }) {
  const delivered = order.status === 'Delivered';
  if (!delivered && !order.billedAt) {
    return (
      <Section title="Final Bill">
        <p className="text-[14px] font-medium text-[#0F1F1C]/50">No bill was generated before cancellation.</p>
      </Section>
    );
  }
  return (
    <Section title={delivered ? 'Final Bill' : 'Saved Bill'}>
      <dl className="space-y-2.5">
        <SummaryRow label="Medicine Subtotal" value={formatRupees(order.medicineSubtotal)} />
        <SummaryRow label="Products & Other" value={formatRupees(order.nonMedicineSubtotal)} />
        <SummaryRow label="Delivery Charge" value={formatRupees(order.deliveryCharge)} />
        <SummaryRow label="Final Amount" value={formatRupees(order.finalAmount)} strong />
      </dl>
      <div className="mt-5 rounded-xl bg-[#F6FAF8] p-3 text-[13px] font-medium text-[#0F1F1C]/70 ring-1 ring-inset ring-[#156253]/5">
        <p className="flex items-center gap-2">
          <Gift className="h-4 w-4 text-[#156253]" aria-hidden />
          {order.offerApplied ? `Included free ${GIFT.shortName}` : 'No gift applied'}
        </p>
        {order.deliveredAt && <p className="mt-1 ml-6">Delivered on {formatDateTime(order.deliveredAt)}</p>}
      </div>
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
    <div className="fixed inset-0 z-[120] grid place-items-center p-4">
      <motion.div
        aria-hidden
        className="absolute inset-0 bg-[#0F1F1C]/40 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={submitting ? undefined : onClose}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onKeyDown={handleKeyDown}
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-[#FFFFFF] p-6 shadow-2xl sm:p-8"
      >
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 sm:mx-0">
          <AlertTriangle className="h-6 w-6 text-red-600" />
        </div>
        
        <h2 id={titleId} className="text-center font-display text-[22px] font-bold text-[#0F1F1C] sm:text-left">
          Cancel Order {order.orderId}
        </h2>
        <p id={descriptionId} className="mt-2 text-center text-[14px] font-medium text-[#0F1F1C]/60 sm:text-left">
          This order will be moved to Cancelled. The reason you select will be permanently saved and visible to {order.customerName}.
        </p>

        <fieldset className="mt-6 space-y-2.5" disabled={submitting}>
          <legend className="sr-only">Reason for cancellation</legend>
          {CANCEL_REASONS.map((option, index) => (
            <label
              key={option}
              className={cn(
                'flex min-h-12 cursor-pointer items-center gap-3.5 rounded-xl border p-3 text-[14px] font-semibold transition-all',
                reason === option 
                  ? 'border-[#156253] bg-[#D8F3E8]/30 ring-1 ring-inset ring-[#156253]/50' 
                  : 'border-[#156253]/15 bg-[#FFFFFF] hover:bg-[#F6FAF8]'
              )}
            >
              <div className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors", reason === option ? "border-[#156253] bg-[#156253]" : "border-[#0F1F1C]/20 bg-transparent")}>
                {reason === option && <div className="h-2 w-2 rounded-full bg-white" />}
              </div>
              <input
                ref={index === 0 ? firstOptionRef : undefined}
                type="radio"
                name={groupName}
                value={option}
                checked={reason === option}
                onChange={() => setReason(option)}
                className="sr-only"
              />
              <span className="text-[#0F1F1C]">{option}</span>
            </label>
          ))}
        </fieldset>

        <AnimatePresence>
          {reason === CUSTOM_REASON && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-4 overflow-hidden">
              <label htmlFor={customId} className="mb-2 block text-[13px] font-bold text-[#0F1F1C]">
                Custom Reason Detail
              </label>
              <textarea
                id={customId}
                ref={customRef}
                value={customReason}
                onChange={(event) => setCustomReason(event.target.value)}
                disabled={submitting}
                placeholder="Type the exact reason..."
                rows={3}
                aria-required
                className="w-full resize-none rounded-xl border-none bg-[#F6FAF8] p-3.5 text-[14px] font-medium text-[#0F1F1C] shadow-sm ring-1 ring-inset ring-[#156253]/15 transition-all placeholder:text-[#0F1F1C]/30 focus:bg-[#FFFFFF] focus:outline-none focus:ring-2 focus:ring-[#156253]"
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" size="lg" className="sm:w-auto w-full" onClick={onClose} disabled={submitting}>
            Keep Order
          </Button>
          <Button variant="danger" size="lg" className="sm:w-auto w-full" onClick={submit} loading={submitting} disabled={!canSubmit}>
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
          <div key="order-panel" className="fixed inset-0 z-[80]">
            <motion.div
              aria-hidden
              className="absolute inset-0 bg-[#0F1F1C]/20 backdrop-blur-sm transition-opacity"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={onClose}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              onKeyDown={trapTab}
              initial={{ x: '100%', opacity: 0.5 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0.5 }}
              transition={{ type: 'spring', damping: 32, stiffness: 350, mass: 0.8 }}
              className="absolute inset-y-0 right-0 flex w-full flex-col bg-[#F6FAF8] shadow-2xl sm:max-w-[560px] lg:max-w-[640px]"
            >
              <header className="relative flex shrink-0 items-start justify-between gap-4 border-b border-[#156253]/10 bg-[#FFFFFF] px-5 py-5 sm:px-8">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 id={titleId} className="font-mono text-[22px] font-bold tracking-tight text-[#156253]">
                      {shown.orderId}
                    </h2>
                    <OrderStatusBadge status={shown.status} />
                  </div>
                  <p className="mt-1.5 flex items-center gap-2 text-[13px] font-medium text-[#0F1F1C]/50">
                    <span className="flex items-center gap-1">
                      {shown.orderType === 'manual_text' ? <Inbox className="h-3.5 w-3.5" /> : <PackageCheck className="h-3.5 w-3.5" />}
                      {shown.orderType === 'manual_text' ? 'Manual Order' : 'Prescription Order'}
                    </span>
                    <span>•</span>
                    <span>{formatDateTime(shown.createdAt)}</span>
                  </p>
                </div>
                <button
                  ref={closeRef}
                  type="button"
                  onClick={onClose}
                  aria-label="Close panel"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#F6FAF8] text-[#0F1F1C]/40 transition-colors hover:bg-[#156253]/10 hover:text-[#156253] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#156253]"
                >
                  <X className="h-5 w-5" aria-hidden />
                </button>
              </header>

              <div className="flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 py-6 sm:px-8">
                {shown.status === 'Cancelled' && (
                  <div className="rounded-2xl border border-red-200 bg-[#FFFFFF] p-5 shadow-sm ring-1 ring-inset ring-red-100">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden />
                      <div>
                        <h4 className="text-[15px] font-bold text-red-900">Order Cancelled</h4>
                        <p className="mt-1 text-[14px] font-medium text-red-700">{shown.cancelReason ?? 'No reason provided.'}</p>
                        {whatsappLink && (
                          <a
                            href={whatsappLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-[13px] font-bold text-red-700 transition-colors hover:bg-red-100 active:scale-[0.98] w-fit"
                          >
                            Notify Customer via WhatsApp <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <Section title="Customer Details" icon={<User className="h-4 w-4" aria-hidden />}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#156253]/10 pb-4">
                    <div>
                      <p className="text-[18px] font-bold text-[#0F1F1C]">{shown.customerName}</p>
                      <a href={`tel:+91${shown.mobileNumber}`} className="mt-1 inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#156253] hover:underline">
                        <Phone className="h-3.5 w-3.5" aria-hidden /> {formatMobile(shown.mobileNumber)}
                      </a>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="rounded-lg bg-[#F6FAF8] px-3 py-1.5 text-[12px] font-bold uppercase tracking-wider text-[#0F1F1C]/60 ring-1 ring-inset ring-[#156253]/10">
                        {shown.firstOrderAtCreation ? 'New Customer' : 'Returning'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex gap-3">
                    <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[#156253]/40" aria-hidden />
                    <dl className="grid min-w-0 flex-1 gap-1.5 text-[14px]">
                      <div className="flex gap-2">
                        <dt className="w-20 shrink-0 font-medium text-[#0F1F1C]/50">Address</dt>
                        <dd className="font-semibold text-[#0F1F1C]">{shown.address.flat || '—'}</dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="w-20 shrink-0 font-medium text-[#0F1F1C]/50">Area</dt>
                        <dd className="font-semibold text-[#0F1F1C]">{shown.address.area || '—'}</dd>
                      </div>
                      {shown.address.landmark && (
                        <div className="flex gap-2">
                          <dt className="w-20 shrink-0 font-medium text-[#0F1F1C]/50">Landmark</dt>
                          <dd className="font-semibold text-[#0F1F1C]">{shown.address.landmark}</dd>
                        </div>
                      )}
                    </dl>
                  </div>
                </Section>

                <Section title="Customer History" icon={<TrendingUp className="h-4 w-4" />}>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Stat label="Total Orders">{shown.previousOrders}</Stat>
                    <Stat label="Completed">{shown.customer?.deliveredOrders ?? 0}</Stat>
                    <Stat label="First Order">{shown.firstOrderAtCreation ? 'Yes' : 'No'}</Stat>
                    <Stat label="Gift Claimed">
                      {shown.customer?.offerClaimed ? <span className="text-[#156253] flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" />Yes</span> : 'No'}
                    </Stat>
                  </div>
                </Section>

                <Section title="Requested Items" icon={<ShoppingBag className="h-4 w-4" />}>
                  {shown.orderType === 'manual_text' ? (
                    <div className="overflow-hidden rounded-xl ring-1 ring-inset ring-[#156253]/10">
                      <ul className="divide-y divide-[#156253]/10 bg-[#F6FAF8]">
                        {shown.medicines.map((item, index) => (
                          <li key={`${item.name}-${index}`} className="flex items-center justify-between gap-4 px-4 py-3">
                            <span className="min-w-0 break-words text-[14px] font-bold text-[#0F1F1C]">{item.name}</span>
                            <span className="shrink-0 rounded-md bg-[#FFFFFF] px-2.5 py-1 text-[13px] font-semibold text-[#156253] shadow-sm ring-1 ring-inset ring-[#156253]/10">{item.quantity}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : shown.prescriptionUrl ? (
                    <a
                      href={shown.prescriptionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative flex overflow-hidden rounded-xl bg-[#F6FAF8] ring-1 ring-inset ring-[#156253]/15 transition-all hover:shadow-md hover:ring-[#156253]/30"
                    >
                      <Image
                        src={cloudinaryThumb(shown.prescriptionUrl, 240)}
                        alt={`Prescription for ${shown.orderId}`}
                        width={96}
                        height={128}
                        className="h-32 w-24 shrink-0 border-r border-[#156253]/10 object-cover"
                        unoptimized
                      />
                      <div className="flex flex-1 items-center justify-between p-4">
                        <div>
                          <p className="text-[15px] font-bold text-[#0F1F1C]">Prescription Image</p>
                          <p className="mt-1 text-[13px] font-medium text-[#0F1F1C]/50">Tap to open full size</p>
                        </div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFFFFF] text-[#156253] shadow-sm transition-transform group-hover:scale-110">
                          <ExternalLink className="h-5 w-5" aria-hidden />
                        </div>
                      </div>
                    </a>
                  ) : (
                    <p className="text-[14px] font-medium text-[#0F1F1C]/50">No items or prescription attached.</p>
                  )}
                </Section>

                {!shown.telegramNotificationSent && (
                  <div className="flex gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <BellOff className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />
                    <div>
                      <p className="text-[14px] font-bold text-amber-900">Telegram Notification Failed</p>
                      <p className="mt-1 text-[13px] font-medium text-amber-800">Ensure the pharmacy team is aware of this order.</p>
                    </div>
                  </div>
                )}

                {shown.status === 'Pending' ? (
                  <Section title="Operations Workspace" icon={<Save className="h-4 w-4" />}>
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
                <footer className="shrink-0 flex flex-col gap-3 border-t border-[#156253]/10 bg-[#FFFFFF] p-5 pb-safe sm:px-8">
                  {/* Billing actions portaled here */}
                  <div ref={setActionsTarget} />
                  
                  <div className="flex justify-center border-t border-[#156253]/5 pt-3">
                    <button
                      ref={cancelTriggerRef}
                      type="button"
                      onClick={() => setCancelOpen(true)}
                      className="text-[13px] font-bold text-red-600 hover:text-red-700 hover:underline transition-colors"
                    >
                      Cancel Order...
                    </button>
                  </div>
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
  emptyTitle: 'Inbox Zero',
  emptyHint: 'No pending orders right now. New ones will appear here.',
};

const TABS: TabConfig[] = [
  PENDING_TAB,
  { status: 'Delivered', label: 'Delivered', icon: PackageCheck, emptyTitle: 'No deliveries yet.', emptyHint: 'Completed orders will be logged here.' },
  { status: 'Cancelled', label: 'Cancelled', icon: Ban, emptyTitle: 'No cancellations.', emptyHint: 'Orders that fell through appear here.' },
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
        <div className="mx-auto max-w-5xl">
          
          <AnalyticsOverview />

          <section className="mt-12 rounded-3xl bg-[#FFFFFF] shadow-sm ring-1 ring-inset ring-[#156253]/10">
            <header className="border-b border-[#156253]/10 p-5 sm:p-8">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="font-display text-[24px] font-bold tracking-tight text-[#0F1F1C]">Command Center</h2>
                    <span className="rounded-full bg-[#156253]/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest text-[#156253]">
                      All-Time
                    </span>
                  </div>
                  <p className="mt-1 text-[14px] text-[#0F1F1C]/60">Manage operations, handle incoming queues, and verify deliveries.</p>
                </div>
                <div className="flex items-center gap-4">
                  {pending.updatedAt && (
                    <span className="hidden text-[12px] font-bold uppercase tracking-wider text-[#0F1F1C]/40 sm:block">
                      Updated {timeFormatter.format(pending.updatedAt)}
                    </span>
                  )}
                  <Button variant="secondary" onClick={refresh} icon={<RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />}>
                    Refresh
                  </Button>
                </div>
              </div>

              <div
                role="tablist"
                aria-label="Order status"
                onKeyDown={handleTabKeyDown}
                className="mt-8 flex w-full max-w-[480px] gap-1 rounded-xl bg-[#F6FAF8] p-1 ring-1 ring-inset ring-[#156253]/10"
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
                        'relative flex h-11 flex-1 items-center justify-center gap-2 rounded-lg text-[13px] font-bold transition-colors',
                        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#156253]',
                        active ? 'text-[#0F1F1C]' : 'text-[#0F1F1C]/50 hover:text-[#0F1F1C]/80',
                      )}
                    >
                      {active && (
                        <motion.span 
                          layoutId={`${tabsId}-indicator`} 
                          className="absolute inset-0 rounded-lg bg-[#FFFFFF] shadow-sm ring-1 ring-inset ring-[#156253]/5" 
                          transition={{ type: 'spring', stiffness: 500, damping: 40 }} 
                        />
                      )}
                      <span className="relative z-10 hidden sm:inline">{tab.label}</span>
                      <tab.icon className="relative z-10 h-4 w-4 sm:hidden" />
                      {total !== undefined && (
                        <span className={cn('relative z-10 rounded-md px-1.5 py-0.5 text-[11px] tabular-nums transition-colors', active ? 'bg-[#156253]/10 text-[#156253]' : 'bg-transparent text-[#0F1F1C]/40')}>
                          {total}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </header>

            <div role="tabpanel" id={`${tabsId}-panel`} aria-labelledby={`${tabsId}-tab-${activeTab}`} className="p-5 sm:p-8 min-h-[400px]">
              {list.loading && list.orders.length === 0 ? (
                <div className="space-y-3" aria-busy>
                  {Array.from({ length: 4 }, (_, index) => (
                    <Skeleton key={index} className="h-24 rounded-2xl" />
                  ))}
                </div>
              ) : list.error && list.orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center" role="alert">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600 mb-4">
                    <AlertTriangle className="h-8 w-8" />
                  </div>
                  <h3 className="text-[18px] font-bold text-[#0F1F1C]">Could not load orders</h3>
                  <p className="mt-2 text-[14px] text-[#0F1F1C]/60 max-w-sm">{list.error}</p>
                  <Button variant="secondary" className="mt-6" onClick={() => void list.load()}>
                    Try Again
                  </Button>
                </div>
              ) : list.orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#F6FAF8] text-[#156253]/40 mb-4 ring-1 ring-inset ring-[#156253]/10">
                    <activeMeta.icon className="h-7 w-7" aria-hidden />
                  </div>
                  <h3 className="text-[18px] font-bold text-[#0F1F1C]">{activeMeta.emptyTitle}</h3>
                  <p className="mt-2 text-[14px] text-[#0F1F1C]/60 max-w-xs">{activeMeta.emptyHint}</p>
                </div>
              ) : (
                <>
                  {list.error && (
                    <div role="alert" className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[14px] font-medium text-red-700">
                      <span className="min-w-0">{list.error}</span>
                      <button type="button" onClick={() => void list.load()} className="shrink-0 font-bold underline hover:text-red-900 transition-colors">
                        Retry
                      </button>
                    </div>
                  )}
                  <ul className={cn('flex flex-col gap-3 transition-opacity duration-300', list.loading && 'opacity-50 pointer-events-none')}>
                    {list.orders.map((order) => (
                      <li key={order.id}>
                        <CompactOrderCard order={order} selected={order.id === selectedOrderId} onSelect={handleSelect} />
                      </li>
                    ))}
                  </ul>
                  {pagination && pagination.page < pagination.totalPages && (
                    <div className="mt-8 flex justify-center">
                      <Button variant="secondary" onClick={() => void list.load(pagination.page + 1)} loading={list.loadingMore} className="w-full sm:w-auto">
                        Load Older Orders
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>

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
// src/components/admin/SettingsForm.tsx
'use client';

import React, { 
  createContext, 
  forwardRef, 
  useCallback, 
  useContext, 
  useEffect, 
  useId, 
  useMemo, 
  useRef, 
  useState, 
  type ButtonHTMLAttributes, 
  type FormEvent, 
  type InputHTMLAttributes, 
  type ReactNode 
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info, Loader2, Save, X } from 'lucide-react';

// ============================================================================
// TYPES (from src/lib/types.ts)
// ============================================================================
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

// ============================================================================
// CONSTANTS (from src/lib/constant.ts)
// ============================================================================
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

// ============================================================================
// UTILITIES (from src/lib/cn.ts & src/lib/format.ts)
// ============================================================================
export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

const dateTime = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
export const formatDateTime = (iso: string) => dateTime.format(new Date(iso));

// ============================================================================
// API CLIENT (from src/lib/api.ts & src/lib/adminApi.ts)
// ============================================================================
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

// ============================================================================
// UI COMPONENTS (Button, Field, Skeleton, Toast)
// ============================================================================

// --- Button ---
type Variant = 'primary' | 'secondary' | 'ghost' | 'gift' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const buttonVariants: Record<Variant, string> = {
  primary: 'bg-brand-700 text-white hover:bg-brand-800 shadow-lift disabled:bg-brand-700/60',
  secondary: 'bg-white text-brand-800 ring-1 ring-inset ring-brand-200 hover:bg-brand-50 disabled:text-brand-800/50',
  ghost: 'text-brand-800 hover:bg-brand-50 disabled:text-brand-800/50',
  gift: 'bg-gift-500 text-white hover:bg-gift-600 shadow-[0_12px_30px_-12px_rgba(239,148,21,0.7)] disabled:bg-gift-500/60',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-600/60',
};

const buttonSizes: Record<Size, string> = {
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
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
});

// --- Field ---
interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: ReactNode;
  optional?: boolean;
  leading?: ReactNode;
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, error, hint, optional, leading, className, id, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  return (
    <div className={className}>
      <label htmlFor={inputId} className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-ink">
        {label}
        {optional && <span className="text-xs font-normal text-ink-soft">Optional</span>}
      </label>
      <div
        className={cn(
          'flex items-center rounded-2xl bg-white ring-1 ring-inset transition-shadow focus-within:ring-2',
          error ? 'ring-red-300 focus-within:ring-red-500' : 'ring-brand-100 focus-within:ring-brand-500',
        )}
      >
        {leading && <span className="pl-4 text-[15px] font-medium text-ink-muted">{leading}</span>}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className="h-12 w-full rounded-2xl bg-transparent px-4 text-[15px] text-ink placeholder:text-ink-soft focus:outline-none"
          {...props}
        />
      </div>
      {error ? (
        <p id={`${inputId}-error`} role="alert" className="mt-1.5 text-sm text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="mt-1.5 text-xs text-ink-soft">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

// --- Skeleton ---
export function Skeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn('relative overflow-hidden rounded-xl bg-brand-100/60', className)}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/70 to-transparent" />
    </div>
  );
}

// --- Toast ---
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
// MAIN COMPONENT: SettingsForm
// ============================================================================

const AMOUNT_PATTERN = /^\d{1,7}(\.\d{1,2})?$/;

// We wrap the internal implementation with the ToastProvider so it has access to useToast
function SettingsFormInner() {
  const toast = useToast();
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [deliveryCharge, setDeliveryCharge] = useState('');
  const [threshold, setThreshold] = useState('');
  const [offerEnabled, setOfferEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const apply = (value: AdminSettings) => {
    setSettings(value);
    setDeliveryCharge(String(value.deliveryCharge));
    setThreshold(String(value.firstOrderMinimumMedicineAmount));
    setOfferEnabled(value.firstOrderOfferEnabled);
  };

  useEffect(() => {
    adminRequest<{ settings: AdminSettings }>('/settings')
      .then((res) => apply(res.settings))
      .catch((error: Error) => setLoadError(error.message));
  }, []);

  const deliveryError = AMOUNT_PATTERN.test(deliveryCharge) ? undefined : 'Enter an amount like 0 or 30';
  const thresholdError = AMOUNT_PATTERN.test(threshold) ? undefined : 'Enter an amount like 500';

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (deliveryError || thresholdError) return;
    setSaving(true);
    try {
      const res = await adminRequest<{ settings: AdminSettings }>('/settings', {
        method: 'PATCH',
        body: { deliveryCharge: Number(deliveryCharge), firstOrderMinimumMedicineAmount: Number(threshold), firstOrderOfferEnabled: offerEnabled },
      });
      apply(res.settings);
      toast.success('Settings saved');
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loadError) return <div className="card p-6 text-center text-sm" role="alert">{loadError}</div>;
  if (!settings) return <Skeleton className="h-96 max-w-xl rounded-3xl" />;

  return (
    <form onSubmit={submit} className="card max-w-xl space-y-6 p-6 sm:p-8" noValidate>
      <div>
        <h1 className="font-display text-2xl font-bold">Settings</h1>
        {settings.updatedAt && <p className="mt-1 text-xs text-ink-soft">Last updated {formatDateTime(settings.updatedAt)}</p>}
      </div>

      <Field
        label="Delivery Charge"
        leading="₹"
        inputMode="decimal"
        value={deliveryCharge}
        onChange={(event) => setDeliveryCharge(event.target.value.replace(/[^\d.]/g, ''))}
        error={deliveryCharge ? deliveryError : 'Required'}
        hint={'Customers see "FREE Delivery" when this is 0. Applied to every bill saved from now on.'}
      />

      <fieldset className="space-y-4 rounded-2xl bg-surface p-4 ring-1 ring-brand-100">
        <legend className="px-1 text-sm font-semibold">First Order Gift · FREE {GIFT.name}</legend>
        <label className="flex cursor-pointer items-center justify-between gap-3">
          <span className="text-sm">Offer enabled</span>
          <input type="checkbox" role="switch" checked={offerEnabled} onChange={(event) => setOfferEnabled(event.target.checked)} className="h-5 w-5 accent-brand-700" />
        </label>
        <Field
          label="Minimum Medicine Subtotal"
          leading="₹"
          inputMode="decimal"
          value={threshold}
          onChange={(event) => setThreshold(event.target.value.replace(/[^\d.]/g, ''))}
          error={threshold ? thresholdError : 'Required'}
          hint="Checked against the medicine subtotal only. Other items and delivery never count."
        />
      </fieldset>

      <Button type="submit" loading={saving} disabled={Boolean(deliveryError || thresholdError)} icon={<Save className="h-4 w-4" />}>
        Save Settings
      </Button>
    </form>
  );
}

export function SettingsForm() {
  return (
    <ToastProvider>
      <SettingsFormInner />
    </ToastProvider>
  );
}
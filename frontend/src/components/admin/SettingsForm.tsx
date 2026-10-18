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
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info, Loader2, Save, X, Gift, Truck } from 'lucide-react';

// ============================================================================
// TYPES
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
// CONSTANTS
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
// UTILITIES
// ============================================================================
export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

const dateTime = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
export const formatDateTime = (iso: string) => dateTime.format(new Date(iso));

// ============================================================================
// API CLIENT
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
// UI COMPONENTS (Button, Field, Skeleton, Toast, Switch)
// ============================================================================

// --- Button ---
type Variant = 'primary' | 'secondary' | 'ghost' | 'gift' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const buttonVariants: Record<Variant, string> = {
  primary: 'bg-[#156253] text-[#FFFFFF] hover:bg-[#0F1F1C] shadow-[0_2px_8px_rgba(21,98,83,0.2)] disabled:opacity-50',
  secondary: 'bg-[#FFFFFF] text-[#0F1F1C] ring-1 ring-inset ring-[#156253]/15 hover:bg-[#F6FAF8] disabled:opacity-50',
  ghost: 'text-[#156253] hover:bg-[#156253]/5 disabled:opacity-50',
  gift: 'bg-gradient-to-br from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 shadow-md disabled:opacity-50',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:opacity-50',
};

const buttonSizes: Record<Size, string> = {
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
        'inline-flex select-none items-center justify-center font-semibold tracking-wide transition-[color,background-color,box-shadow,transform] duration-200 motion-reduce:transition-none',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#156253]',
        'active:scale-[0.97] disabled:cursor-not-allowed disabled:active:scale-100',
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin text-current" aria-hidden /> : icon}
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
      <label htmlFor={inputId} className="mb-2 flex items-baseline justify-between text-[13px] font-bold tracking-wide text-[#52675F]">
        {label}
        {optional && <span className="text-[11px] font-medium normal-case text-[#60756D]">Optional</span>}
      </label>
      <div
        className={cn(
          'group flex h-12 items-center rounded-xl bg-[#FFFFFF] shadow-sm ring-1 ring-inset transition-all',
          error 
            ? 'ring-red-300 focus-within:ring-2 focus-within:ring-red-500' 
            : 'ring-[#156253]/15 focus-within:ring-2 focus-within:ring-[#156253]',
        )}
      >
        {leading && <span className="pl-4 pr-2 text-[15px] font-semibold text-[#60756D] transition-colors group-focus-within:text-[#156253]">{leading}</span>}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className="h-full min-w-0 w-full rounded-r-xl bg-transparent px-3 text-[15px] font-semibold text-[#0F1F1C] placeholder:text-[#0F1F1C]/30 focus:outline-none"
          {...props}
        />
      </div>
      {error ? (
        <p id={`${inputId}-error`} role="alert" className="mt-2 text-[13px] font-medium text-red-600 flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5" /> {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="mt-2 text-[12px] font-medium text-[#60756D] leading-relaxed">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

// --- Skeleton ---
export function Skeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn('relative overflow-hidden bg-[#156253]/5', className)}>
      <style>{`@keyframes gmedShimmer { to { transform: translateX(100%); } }`}</style>
      <div className="absolute inset-0 -translate-x-full animate-[gmedShimmer_1.8s_ease-in-out_infinite] motion-reduce:animate-none bg-gradient-to-r from-transparent via-white/60 to-transparent" />
    </div>
  );
}

// --- Switch ---
function NativeSwitch({ checked, onChange, disabled }: { checked: boolean; onChange: (c: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-[32px] w-[54px] shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#156253]",
        checked ? "bg-[#156253]" : "bg-[#0F1F1C]/15",
        disabled && "cursor-not-allowed opacity-50"
      )}
    >
      <span className="sr-only">Enable first-order gift</span>
      <motion.span
        layout
        className="absolute left-[3px] h-[26px] w-[26px] rounded-full bg-white shadow-sm ring-1 ring-black/5"
        animate={{ x: checked ? 22 : 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      />
    </button>
  );
}

// --- Toast ---
type ToastTone = 'success' | 'error' | 'info';

interface ToastData {
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
  const [toasts, setToasts] = useState<ToastData[]>([]);
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
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-[999] md:bottom-6 flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:items-end sm:px-6">
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
                className="pointer-events-auto flex w-full max-w-[360px] items-start gap-3 rounded-2xl bg-[#FFFFFF]/95 px-4 py-3.5 shadow-xl ring-1 ring-[#156253]/10 backdrop-blur-md"
              >
                <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', toastTones[toast.tone])} aria-hidden />
                <p className="flex-1 text-[14px] font-medium text-[#0F1F1C]">{toast.message}</p>
                <button type="button" onClick={() => dismiss(toast.id)} className="text-[#60756D] hover:text-[#0F1F1C] transition-colors" aria-label="Dismiss">
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
      toast.success('Preferences successfully updated.');
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#156253]/20 bg-[#FFFFFF]/50 py-24 text-center max-w-[1100px] mx-auto mt-8">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h3 className="font-display text-[22px] font-bold text-[#0F1F1C]">Could not load settings</h3>
        <p className="mt-2 text-[14px] font-medium text-[#52675F] max-w-sm">{loadError}</p>
        <Button onClick={() => window.location.reload()} className="mt-6 shadow-sm" variant="secondary">Reload Page</Button>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="mx-auto max-w-[1100px] mt-8">
        <Skeleton className="h-24 w-[280px] rounded-2xl mb-8 bg-transparent" />
        <div className="space-y-6">
          <Skeleton className="h-[140px] w-full rounded-3xl" />
          <Skeleton className="h-[220px] w-full rounded-3xl" />
          <Skeleton className="h-14 w-full sm:w-[180px] rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="mx-auto max-w-[1100px]">
      <header className="mb-8 border-b border-[#156253]/10 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-[28px] font-bold tracking-tight text-[#0F1F1C]">Settings</h1>
            <p className="mt-1.5 text-[14px] font-medium text-[#52675F]">Delivery pricing and first-order rewards for your storefront.</p>
          </div>
          {settings.updatedAt && (
            <div className="text-[12px] font-bold tracking-wide text-[#60756D]">
              Last saved {formatDateTime(settings.updatedAt).split(',')[0]}
            </div>
          )}
        </div>
      </header>

      <form onSubmit={submit} className="grid items-start gap-5 lg:grid-cols-2" noValidate>
        
        {/* Delivery Charge Section */}
        <section className="overflow-hidden rounded-2xl bg-[#FFFFFF] shadow-sm ring-1 ring-inset ring-[#156253]/10">
          <div className="border-b border-[#156253]/5 bg-[#F6FAF8] px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFFFFF] shadow-sm ring-1 ring-inset ring-[#156253]/10">
                <Truck className="h-5 w-5 text-[#156253]" />
              </div>
              <h2 className="text-[16px] font-bold text-[#0F1F1C]">Delivery Fees</h2>
            </div>
          </div>
          <div className="p-5 sm:p-6">
            <Field
              label="Standard Delivery Charge"
              leading="₹"
              inputMode="decimal"
              value={deliveryCharge}
              onChange={(event) => setDeliveryCharge(event.target.value.replace(/[^\d.]/g, ''))}
              error={deliveryCharge ? deliveryError : 'Required'}
            hint={<>Set to <strong>0</strong> to advertise &quot;FREE Delivery&quot; sitewide. This charge is automatically applied to all new orders.</>}
              className="w-full"
            />
          </div>
        </section>

        {/* First Order Gift Section */}
        <section className="overflow-hidden rounded-2xl bg-[#FFFFFF] shadow-sm ring-1 ring-inset ring-[#156253]/10">
          <div className="border-b border-[#156253]/5 bg-gradient-to-r from-[#D8F3E8]/40 to-transparent px-5 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFFFFF] shadow-sm ring-1 ring-inset ring-[#156253]/10">
                  <Gift className="h-5 w-5 text-[#156253]" />
                </div>
                <div>
                  <h2 className="text-[16px] font-bold text-[#0F1F1C]">First Order Gift</h2>
                  <p className="text-[13px] font-medium text-[#52675F]">FREE {GIFT.name}</p>
                </div>
              </div>
              <NativeSwitch checked={offerEnabled} onChange={setOfferEnabled} />
            </div>
          </div>
          
          <AnimatePresence initial={false}>
            {offerEnabled && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }} 
                animate={{ height: 'auto', opacity: 1 }} 
                exit={{ height: 0, opacity: 0 }} 
                className="overflow-hidden"
              >
                <div className="p-5 sm:p-6 pt-6">
                  <Field
                    label="Minimum Eligibility Threshold"
                    leading="₹"
                    inputMode="decimal"
                    value={threshold}
                    onChange={(event) => setThreshold(event.target.value.replace(/[^\d.]/g, ''))}
                    error={threshold ? thresholdError : 'Required'}
                    hint="Checked against the medicine subtotal only. Delivery fees and other retail products do not count toward this threshold."
                    className="w-full"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Action Footer */}
        <div className="lg:col-span-2 sticky bottom-24 z-20 rounded-xl border border-[#156253]/10 bg-white/95 p-4 backdrop-blur-md md:bottom-4 flex flex-col sm:flex-row sm:items-center gap-4">
          <Button 
            type="submit" 
            size="lg" 
            loading={saving} 
            disabled={Boolean(deliveryError || thresholdError)} 
            className="w-full sm:w-auto min-w-[200px] shadow-[0_4px_16px_rgba(21,98,83,0.2)]"
            icon={<Save className="h-[18px] w-[18px] mr-1.5" />}
          >
            Save Preferences
          </Button>
          {saving && <span className="text-[13px] font-bold text-[#156253] animate-pulse">Applying updates...</span>}
        </div>
        
      </form>
    </motion.div>
  );
}

export function SettingsForm() {
  return (
    <MotionConfig reducedMotion="user"><ToastProvider>
      <SettingsFormInner />
    </ToastProvider></MotionConfig>
  );
}

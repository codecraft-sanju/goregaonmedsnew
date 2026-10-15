//src/components/admin/CustomersView.tsx
'use client';
import React, { useEffect, useState, forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Search, Users, Loader2 } from 'lucide-react';
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
// UTILS (from src/lib/cn.ts & src/lib/format.ts)
// ============================================================================
export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

const rupees = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2, minimumFractionDigits: 0 });
const dateTime = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });

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

// ============================================================================
// API & ADMIN API (from src/lib/api.ts & src/lib/adminApi.ts)
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
// UI COMPONENTS (from src/components/ui/Skeleton.tsx & src/components/ui/Button.tsx)
// ============================================================================
export function Skeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn('relative overflow-hidden rounded-xl bg-brand-100/60', className)}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/70 to-transparent" />
    </div>
  );
}

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

// ============================================================================
// MAIN COMPONENT (CustomersView)
// ============================================================================
interface Response {
  customers: Required<CustomerSummary>[];
  pagination: Pagination;
}

export function CustomersView() {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Response | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(query.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (debounced) params.set('q', debounced);
    adminRequest<Response>(`/customers?${params}`, { signal: controller.signal })
      .then(setData)
      .catch((err: Error) => err.name !== 'AbortError' && setError(err.message))
      .finally(() => !controller.signal.aborted && setLoading(false));
    return () => controller.abort();
  }, [debounced, page]);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Customer History</h1>
      <div className="mt-4 flex items-center rounded-2xl bg-white ring-1 ring-brand-100 focus-within:ring-2 focus-within:ring-brand-500">
        <Search className="ml-4 h-4 w-4 text-ink-soft" aria-hidden />
        <label htmlFor="customer-search" className="sr-only">Search customers</label>
        <input
          id="customer-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name or mobile number"
          maxLength={80}
          className="h-12 w-full rounded-2xl bg-transparent px-3 focus:outline-none"
        />
      </div>

      <div className="mt-5">
        {loading && !data ? (
          <div className="space-y-3">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>
        ) : error ? (
          <div className="card p-6 text-center" role="alert">
            <p className="font-semibold">Could not load customers</p>
            <p className="mt-1 text-sm text-ink-muted">{error}</p>
          </div>
        ) : !data || data.customers.length === 0 ? (
          <div className="card grid place-items-center p-10 text-center">
            <Users className="h-10 w-10 text-brand-200" aria-hidden />
            <p className="mt-3 text-sm text-ink-muted">{debounced ? 'No customers match your search.' : 'Customers appear here after their first order.'}</p>
          </div>
        ) : (
          <div className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
            <div className="card hidden overflow-hidden md:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface text-xs uppercase tracking-wider text-ink-soft">
                  <tr>
                    <th scope="col" className="px-4 py-3">Customer Name</th>
                    <th scope="col" className="px-4 py-3">Mobile Number</th>
                    <th scope="col" className="px-4 py-3 text-right">Total Orders</th>
                    <th scope="col" className="px-4 py-3 text-right">Delivered</th>
                    <th scope="col" className="px-4 py-3">First Order?</th>
                    <th scope="col" className="px-4 py-3">Offer Claimed?</th>
                    <th scope="col" className="px-4 py-3">Claimed On</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-100">
                 {data.customers.map((customer, index) => (
                  <tr key={index}>
                    <td className="px-4 py-3 font-medium">{customer.fullName}</td>
                    <td className="px-4 py-3"><a href={`tel:+91${customer.mobileNumber}`} className="text-brand-700">{formatMobile(customer.mobileNumber)}</a></td>
                    <td className="px-4 py-3 text-right tabular-nums">{customer.totalOrders}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{customer.deliveredOrders}</td>
                    <td className="px-4 py-3">{customer.isFirstTimeCustomer ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-3">{customer.offerClaimed ? <span className="font-semibold text-gift-600">Yes</span> : 'No'}</td>
                    <td className="px-4 py-3 font-mono text-xs">{customer.offerClaimedOrderId ?? '—'}</td>
                  </tr>
                 ))}
                </tbody>
              </table>
            </div>
            <ul className="space-y-3 md:hidden">
             {data.customers.map((customer, index) => (
              <li key={index} className="card p-4 text-sm">
                <div className="flex justify-between gap-2">
                  <p className="font-semibold">{customer.fullName}</p>
                  {customer.offerClaimed && <span className="rounded-full bg-gift-100 px-2 py-0.5 text-xs font-semibold text-gift-600">Gift claimed</span>}
                </div>
                <a href={`tel:+91${customer.mobileNumber}`} className="text-brand-700">{formatMobile(customer.mobileNumber)}</a>
                <p className="mt-2 text-xs text-ink-muted">
                  {customer.totalOrders} orders · {customer.deliveredOrders} delivered · First order: {customer.isFirstTimeCustomer ? 'Yes' : 'No'}
                  {customer.offerClaimedOrderId && ` · Gift on ${customer.offerClaimedOrderId}`}
                </p>
              </li>
             ))}
            </ul>
            {data.pagination.totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                <span className="text-sm text-ink-muted">Page {data.pagination.page} of {data.pagination.totalPages}</span>
                <Button variant="secondary" size="sm" disabled={page >= data.pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
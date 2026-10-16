// src/components/admin/CustomersView.tsx
'use client';
import React, { useEffect, useState, forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Search, Users, Loader2, X, Phone, Gift, ShoppingBag, PackageCheck, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';

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
// UTILS
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
// API
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
// UI COMPONENTS
// ============================================================================
export function Skeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn('relative overflow-hidden bg-[#156253]/5', className)}>
      <style>{`@keyframes gmedShimmer { to { transform: translateX(100%); } }`}</style>
      <div className="absolute inset-0 -translate-x-full animate-[gmedShimmer_1.8s_ease-in-out_infinite] motion-reduce:animate-none bg-gradient-to-r from-transparent via-white/60 to-transparent" />
    </div>
  );
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'gift' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const variants: Record<Variant, string> = {
  primary: 'bg-[#156253] text-[#FFFFFF] hover:bg-[#0F1F1C] shadow-sm disabled:opacity-50',
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
        'inline-flex select-none items-center justify-center font-semibold tracking-wide transition-[color,background-color,box-shadow,transform] duration-200 motion-reduce:transition-none',
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

// ============================================================================
// MAIN COMPONENT (CustomersView)
// ============================================================================
interface CustomersResponse {
  customers: Required<CustomerSummary>[];
  pagination: Pagination;
}

export function CustomersView() {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<CustomersResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);

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
    
    adminRequest<CustomersResponse>(`/customers?${params}`, { signal: controller.signal })
      .then(setData)
      .catch((err: Error) => err.name !== 'AbortError' && setError(err.message))
      .finally(() => !controller.signal.aborted && setLoading(false));
      
    return () => controller.abort();
  }, [debounced, page, retry]);

  return (
    <MotionConfig reducedMotion="user"><div className="mx-auto max-w-[1400px]">
      {/* PAGE HEADER */}
      <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end justify-between border-b border-[#156253]/10 pb-6">
        <div>
          <h1 className="font-display text-[26px] font-bold text-[#0F1F1C] tracking-tight">Customers</h1>
          <p className="mt-1 text-[14px] text-[#52675F]">Customer directory, order history and first-order rewards.</p>
        </div>
        
        {/* PREMIUM SEARCH */}
        <div className="relative w-full max-w-[340px] group">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Search className="h-[18px] w-[18px] text-[#60756D] transition-colors group-focus-within:text-[#156253]" aria-hidden />
          </div>
          <label htmlFor="customer-search" className="sr-only">Search customers</label>
          <input
            id="customer-search"
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name or phone..."
            maxLength={80}
            className="h-[42px] w-full rounded-xl border-none bg-[#FFFFFF] pl-10 pr-10 text-[14px] font-medium text-[#0F1F1C] shadow-sm ring-1 ring-inset ring-[#156253]/15 transition-all placeholder:text-[#0F1F1C]/30 hover:bg-[#F6FAF8] focus:bg-[#FFFFFF] focus:outline-none focus:ring-4 focus:ring-[#156253]/10"
          />
          <AnimatePresence>
            {query && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                type="button"
                onClick={() => setQuery('')}
                className="absolute inset-y-0 right-1.5 my-auto flex h-7 w-7 items-center justify-center rounded-lg text-[#60756D] hover:bg-[#0F1F1C]/5 hover:text-[#0F1F1C] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#156253]"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" aria-hidden />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </header>

      <div className="mb-4 flex items-center justify-between text-xs text-[#60756D]"><span>{data ? `${data.pagination.total} ${debounced ? 'matching' : 'registered'} customers` : 'Customer directory'}</span><span>{loading ? 'Updating…' : '20 customers per page'}</span></div>
      <div className="min-h-[400px]" aria-busy={loading}>
        {loading && !data ? (
          <div aria-busy="true" aria-label="Loading customers"><div className="space-y-3 hidden md:block">
             {Array.from({ length: 10 }, (_, i) => <Skeleton key={`desktop-skel-${i}`} className="h-[52px] rounded-xl" />)}
          </div>

          <div className="space-y-4 md:hidden">
             {Array.from({ length: 6 }, (_, i) => <Skeleton key={`mobile-skel-${i}`} className="h-[120px] rounded-2xl" />)}
          </div></div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 text-center" role="alert">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600 mb-4">
              <AlertCircle className="h-8 w-8" />
            </div>
            <h3 className="text-[18px] font-bold text-[#0F1F1C]">Could not load customers</h3>
            <p className="mt-2 text-[14px] text-[#52675F] max-w-sm">{error}</p><Button variant="secondary" className="mt-4" onClick={() => setRetry(v => v + 1)}>Try again</Button>
          </div>
        ) : !data || data.customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#F6FAF8] text-[#156253]/40 mb-4 ring-1 ring-inset ring-[#156253]/10">
              <Users className="h-7 w-7" aria-hidden />
            </div>
            <h3 className="text-[18px] font-bold text-[#0F1F1C]">No customers found</h3>
            <p className="mt-2 text-[14px] text-[#52675F] max-w-sm">
              {debounced ? `No matches for "${debounced}".` : 'Customers will appear here after their first order.'}
            </p>
          </div>
        ) : (
          <div className={cn("transition-opacity duration-300", loading ? "opacity-50 pointer-events-none" : "opacity-100")}>
            
            {/* DESKTOP DATA GRID */}
            <div className="hidden overflow-hidden rounded-2xl bg-[#FFFFFF] shadow-sm ring-1 ring-inset ring-[#156253]/10 md:block">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[13px]">
                  <thead className="border-b border-[#156253]/10 bg-[#F6FAF8] text-[11px] font-bold tracking-wide text-[#60756D]">
                    <tr>
                      <th scope="col" className="px-5 py-3.5 whitespace-nowrap">Customer Name</th>
                      <th scope="col" className="px-5 py-3.5 whitespace-nowrap">Mobile Number</th>
                      <th scope="col" className="px-5 py-3.5 text-right whitespace-nowrap">Total Orders</th>
                      <th scope="col" className="px-5 py-3.5 text-right whitespace-nowrap">Delivered</th>
                      <th scope="col" className="px-5 py-3.5 text-center whitespace-nowrap">First Order?</th>
                      <th scope="col" className="px-5 py-3.5 text-center whitespace-nowrap">Offer Claimed?</th>
                      <th scope="col" className="px-5 py-3.5 whitespace-nowrap">Claimed On</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#156253]/5">
                   {data.customers.map((customer) => (
                    <tr key={customer.mobileNumber} className="transition-colors hover:bg-[#F6FAF8]">
                      <td className="px-5 py-3.5 whitespace-nowrap font-semibold text-[#0F1F1C]">
                        {customer.fullName}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <a href={`tel:+91${customer.mobileNumber}`} className="font-medium text-[#156253] hover:underline focus-visible:outline-none focus-visible:underline">
                          {formatMobile(customer.mobileNumber)}
                        </a>
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap font-medium tabular-nums text-[#0F1F1C]">
                        {customer.totalOrders}
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap font-medium tabular-nums text-[#0F1F1C]">
                        {customer.deliveredOrders}
                      </td>
                      <td className="px-5 py-3.5 text-center whitespace-nowrap">
                        {customer.isFirstTimeCustomer ? (
                           <span className="inline-flex items-center rounded-full bg-[#D8F3E8]/60 px-2 py-0.5 text-[11px] font-bold tracking-wide text-[#156253]">Yes</span>
                        ) : (
                           <span className="text-[#60756D] font-medium">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-center whitespace-nowrap">
                        {customer.offerClaimed ? (
                           <span className="inline-flex items-center rounded-full bg-gradient-to-r from-orange-50 to-amber-50 px-2 py-0.5 text-[11px] font-bold tracking-wide text-orange-700 ring-1 ring-inset ring-orange-200/50">Yes</span>
                        ) : (
                           <span className="text-[#60756D] font-medium">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap font-mono text-[12px] font-medium tracking-wide text-[#52675F]">
                        {customer.offerClaimedOrderId ?? '—'}
                      </td>
                    </tr>
                   ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* MOBILE CARDS */}
            <ul className="flex flex-col gap-3 md:hidden">
             {data.customers.map((customer) => (
              <li key={customer.mobileNumber} className="relative overflow-hidden rounded-2xl bg-[#FFFFFF] p-5 shadow-sm ring-1 ring-inset ring-[#156253]/10">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[16px] font-bold text-[#0F1F1C]">{customer.fullName}</p>
                    <a href={`tel:+91${customer.mobileNumber}`} className="mt-0.5 flex items-center gap-1.5 text-[14px] font-semibold text-[#156253] active:opacity-70">
                      <Phone className="h-3.5 w-3.5" /> {formatMobile(customer.mobileNumber)}
                    </a>
                  </div>
                  {customer.isFirstTimeCustomer && (
                     <span className="shrink-0 rounded-lg bg-[#F6FAF8] px-2.5 py-1 text-[11px] font-bold tracking-wide text-[#156253] ring-1 ring-inset ring-[#156253]/10">
                       New
                     </span>
                  )}
                </div>
                
                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[#156253]/10 pt-4">
                  <div className="flex flex-col gap-1">
                    <span className="flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-[#60756D]">
                      <ShoppingBag className="h-3.5 w-3.5" /> Total
                    </span>
                    <span className="text-[15px] font-bold tabular-nums text-[#0F1F1C]">{customer.totalOrders}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-[#60756D]">
                      <PackageCheck className="h-3.5 w-3.5" /> Delivered
                    </span>
                    <span className="text-[15px] font-bold tabular-nums text-[#0F1F1C]">{customer.deliveredOrders}</span>
                  </div>
                </div>

                {customer.offerClaimed && (
                  <div className="mt-3 flex items-center justify-between rounded-xl bg-gradient-to-r from-orange-50/50 to-amber-50/50 px-3 py-2 ring-1 ring-inset ring-orange-200/30">
                    <span className="flex items-center gap-1.5 text-[12px] font-bold text-orange-700">
                      <Gift className="h-3.5 w-3.5" /> Gift Claimed
                    </span>
                    {customer.offerClaimedOrderId && (
                      <span className="font-mono text-[11px] font-bold tracking-wide text-orange-700/60">
                        {customer.offerClaimedOrderId}
                      </span>
                    )}
                  </div>
                )}
              </li>
             ))}
            </ul>

            {/* PAGINATION */}
            {data.pagination.totalPages > 1 && (
              <div className="mt-8 flex items-center justify-between border-t border-[#156253]/10 pt-6">
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="w-24 sm:w-28" 
                  disabled={loading || page <= 1} 
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <span className="text-[13px] font-bold text-[#52675F]">
                  Page {data.pagination.page} <span className="font-medium text-[#60756D]">/</span> {data.pagination.totalPages}
                </span>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="w-24 sm:w-28" 
                  disabled={loading || page >= data.pagination.totalPages} 
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div></MotionConfig>
  );
}

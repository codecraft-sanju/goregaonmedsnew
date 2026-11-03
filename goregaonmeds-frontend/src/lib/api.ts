//src/lib/api.ts
import { z } from 'zod';
export const configured = Boolean(process.env.NEXT_PUBLIC_API_BASE_URL);
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public retryAfter: string | null = null,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
export function errorMessage(data: unknown, status: number): string {
  if (data && typeof data === 'object' && 'error' in data) {
    const e = data.error;
    if (typeof e === 'string') return e;
    if (
      e &&
      typeof e === 'object' &&
      'message' in e &&
      typeof e.message === 'string'
    )
      return e.message;
  }
  return `The request could not be completed (${status}). Please try again.`;
}
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!configured)
    throw new ApiError(
      0,
      'NOT_CONFIGURED',
      'Online ordering is not available yet. Please check back soon.',
    );
  let res: Response;
  try {
    res = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL!.replace(/\/$/, '')}${path}`,
      {
        ...init,
        credentials: 'include',
        cache: 'no-store',
        signal: init.signal ?? AbortSignal.timeout(20000),
        headers: {
          ...(init.body ? { 'Content-Type': 'application/json' } : {}),
          ...Object.fromEntries(new Headers(init.headers).entries()),
        },
      },
    );
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
    throw new ApiError(
      0,
      'NETWORK',
      'We couldn’t reach the pharmacy. Check your connection and try again.',
    );
  }
  const data = await res.json().catch(() => null);
  if (!res.ok)
    throw new ApiError(
      res.status,
      data?.error?.code ?? `HTTP_${res.status}`,
      errorMessage(data, res.status),
      res.headers.get('Retry-After'),
    );
  if (!data || typeof data !== 'object')
    throw new ApiError(
      res.status,
      'INVALID_RESPONSE',
      'The service returned an unexpected response. Please try again.',
    );
  return data as T;
}
export const send = <T>(path: string, body?: unknown, method = 'POST') =>
  api<T>(path, {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
export const money = (n: number | null | undefined) =>
  n == null
    ? 'Bill pending'
    : new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 2,
      }).format(n);
export const date = (s?: string) =>
  s
    ? new Intl.DateTimeFormat('en-IN', {
        dateStyle: 'medium',
        timeZone: 'Asia/Kolkata',
      }).format(new Date(s))
    : '—';
export const productSchema = z.object({
  _id: z.string().optional(),
  id: z.string().optional(),
  name: z.string(),
  category: z.string(),
  description: z.string().optional(),
  price: z.number().nonnegative(),
  imageUrl: z.string().optional(),
  inStock: z.boolean(),
  isActive: z.boolean().optional(),
  trackStock: z.boolean().optional(),
  stockQuantity: z.number().optional(),
  kind: z.enum(['medicine', 'non_medicine']).optional(),
});
export type Product = z.infer<typeof productSchema>;
export const productId = (p: Product) => p.id ?? p._id ?? '';
export type Pagination = { page: number; total: number; totalPages: number };
export type Line = {
  _id?: string;
  productId?: string;
  name: string;
  quantity: number;
  price: number;
  isAvailable?: boolean;
  imageUrl?: string;
};
export type Cart = {
  items: (Line & { productId: string })[];
  estimate: null | {
    medicineSubtotal: number;
    nonMedicineSubtotal: number;
    deliveryCharge: number;
    finalAmount: number;
    offerApplied: boolean;
  };
};
export type Settings = {
  deliveryCharge: number;
  firstOrderOfferEnabled: boolean;
  firstOrderMinimumMedicineAmount: number;
  lowStockThreshold?: number;
  trendingProducts?: string[];
  trendingLimit?: number;
};
export type Order = {
  id?: string;
  orderId: string;
  status: 'Pending' | 'Delivered' | 'Cancelled';
  statusLabel?: string;
  finalAmount: number | null;
  placedAt?: string;
  createdAt?: string;
  billedAt?: string;
  billingVersion?: number;
  customerName?: string;
  mobileNumber?: string;
  address?: { flat: string; area: string; landmark: string };
  medicines: Line[];
  products: Line[];
  discount?: number;
  cancelReason?: string;
  prescriptionUrl?: string;
};
export type Session = {
  authenticated: true;
  user?: { id: string; email: string };
  admin?: { username: string };
};
export async function session(admin = false) {
  try {
    return await api<Session>(admin ? '/admin/session' : '/auth/session');
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return null;
    throw e;
  }
}
export const catalog = async (params: string, signal?: AbortSignal) =>
  z
    .object({
      products: z.array(productSchema),
      pagination: z.object({
        page: z.number(),
        total: z.number(),
        totalPages: z.number(),
      }),
    })
    .parse(await api(`/products?${params}`, { signal }));

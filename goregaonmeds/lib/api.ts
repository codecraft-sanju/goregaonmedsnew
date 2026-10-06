import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export const cn = (...v: ClassValue[]) => twMerge(clsx(v));
export type Status = "Pending" | "Delivered" | "Cancelled";
export type Medicine = {
  _id: string;
  name: string;
  quantity: string;
  isAvailable: boolean;
  price: number;
};
export type Settings = {
  deliveryCharge: number;
  firstOrderOfferEnabled: boolean;
  firstOrderMinimumMedicineAmount: number;
  updatedAt?: string;
};
export type Customer = {
  fullName: string;
  mobileNumber: string;
  totalOrders: number;
  deliveredOrders: number;
  offerClaimed: boolean;
  offerClaimedOrderId: string | null;
  isFirstTimeCustomer?: boolean;
};
export type PublicOrder = {
  orderId: string;
  status: Status;
  statusLabel: string;
  orderType: "manual_text" | "prescription_image";
  itemCount: number;
  placedAt: string;
  deliveredAt: string | null;
  paymentMethod?: string;
  medicines: Medicine[];
  medicineSubtotal: number;
  nonMedicineSubtotal: number;
  deliveryCharge: number;
  discount: number;
  finalAmount: number | null;
  cancelReason?: string | null;
};
export type AdminOrder = Omit<
  PublicOrder,
  "placedAt" | "statusLabel" | "itemCount" | "finalAmount"
> & {
  id: string;
  finalAmount: number;
  customerName: string;
  mobileNumber: string;
  prescriptionUrl: string | null;
  address: { flat: string; area: string; landmark: string };
  billedAt: string | null;
  offerOptIn: boolean;
  firstOrderAtCreation: boolean;
  previousOrders: number;
  offerEligible: boolean;
  offerApplied: boolean;
  offer: {
    eligible: boolean;
    checks: {
      offerEnabled: boolean;
      firstOrder: boolean;
      meetsMedicineThreshold: boolean;
      giftNotPreviouslyClaimed: boolean;
    };
    requiredMedicineAmount: number;
    eligibleMedicineSubtotal: number;
  };
  telegramNotificationSent: boolean;
  createdAt: string;
  customer: Customer | null;
};
export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};
export class ApiError extends Error {
  constructor(
    message: string,
    public status = 0,
    public code = "",
    public fields: { path: string; message: string }[] = [],
  ) {
    super(message);
    this.name = "ApiError";
  }
}
export const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/$/, "");
export async function api<T>(
  path: string,
  options: {
    method?: "GET" | "POST" | "PATCH";
    body?: unknown;
    signal?: AbortSignal;
  } = {},
): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  options.signal?.addEventListener("abort", abort, { once: true });
  if (options.signal?.aborted) controller.abort();
  const timer = setTimeout(abort, 25000);
  try {
    const response = await fetch(`${API_BASE}/api${path}`, {
      method: options.method || "GET",
      credentials: "include",
      cache: "no-store",
      headers:
        options.body === undefined
          ? { Accept: "application/json" }
          : { Accept: "application/json", "Content-Type": "application/json" },
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || data?.success === false) {
      if (
        response.status === 401 &&
        path.startsWith("/admin") &&
        typeof window !== "undefined"
      )
        window.dispatchEvent(new Event("gm:session-expired"));
      const e = data?.error;
      const retry = response.headers.get("Retry-After");
      throw new ApiError(
        (typeof e === "string" ? e : e?.message) ||
          (response.status === 429
            ? `Too many attempts. Please try again later${retry ? ` (Retry-After: ${retry})` : ""}.`
            : "Unable to complete the request. Please try again."),
        response.status,
        e?.code,
        e?.fields || [],
      );
    }
    if (!data)
      throw new ApiError(
        "The server returned an unreadable response.",
        response.status,
      );
    return data as T;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    if (options.signal?.aborted) throw e;
    throw new ApiError(
      controller.signal.aborted
        ? "The request timed out. Your request may have reached the pharmacy; retry safely."
        : "Cannot reach the pharmacy. Check your connection and try again.",
    );
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", abort);
  }
}
export const money = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n);
export const date = (value: string) =>
  new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
export function normalizeMobile(s: string) {
  let n = s.replace(/\D/g, "");
  if (n.length === 12 && n.startsWith("91")) n = n.slice(2);
  if (n.length === 11 && n.startsWith("0")) n = n.slice(1);
  return n;
}
export function savedIds(): string[] {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem("gm:orders") || "[]",
    );
    return Array.isArray(value)
      ? value
          .filter(
            (id): id is string =>
              typeof id === "string" &&
              /^GMED-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/.test(id),
          )
          .slice(0, 100)
      : [];
  } catch {
    return [];
  }
}
export function rememberIds(ids: string[]) {
  try {
    localStorage.setItem(
      "gm:orders",
      JSON.stringify([...new Set([...ids, ...savedIds()])].slice(0, 100)),
    );
    return true;
  } catch {
    return false;
  }
}
export const message = (e: unknown) =>
  e instanceof Error ? e.message : "Something went wrong. Please try again.";

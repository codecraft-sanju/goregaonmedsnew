import type { Address } from './types';

const STORAGE_KEY = 'gmeds:checkout';
const TTL_MS = 180 * 24 * 60 * 60 * 1000;

export interface SavedCheckout {
  customerName: string;
  mobileNumber: string;
  address: Address;
}

interface StoredValue {
  version: 1;
  expiresAt: number;
  data: SavedCheckout;
}

const isString = (value: unknown, max: number): value is string => typeof value === 'string' && value.length <= max;

function isSavedCheckout(value: unknown): value is SavedCheckout {
  const v = value as SavedCheckout;
  return (
    !!v &&
    isString(v.customerName, 80) &&
    isString(v.mobileNumber, 20) &&
    !!v.address &&
    isString(v.address.flat, 120) &&
    isString(v.address.area, 120) &&
    isString(v.address.landmark, 120)
  );
}

/** Stores only name, number and address (never prescriptions or auth) for 180 days. */
export function saveCheckout(data: SavedCheckout) {
  try {
    const value: StoredValue = { version: 1, expiresAt: Date.now() + TTL_MS, data };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Storage can be full or blocked (private mode); saving is a convenience only.
  }
}

export function loadCheckout(): SavedCheckout | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredValue;
    if (parsed?.version !== 1 || typeof parsed.expiresAt !== 'number' || parsed.expiresAt < Date.now() || !isSavedCheckout(parsed.data)) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

export function clearCheckout() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

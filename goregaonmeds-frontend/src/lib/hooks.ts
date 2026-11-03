// src/lib/hooks.ts
'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { api, send, session, Cart, Settings, Line } from './api';

export const useSession = (admin = false) =>
  useQuery({
    queryKey: [admin ? 'admin' : 'customer', 'session'],
    queryFn: () => session(admin),
    retry: false,
    staleTime: 30000,
  });

export const useCart = () =>
  useQuery({
    queryKey: ['customer', 'cart'],
    queryFn: ({ signal }) => api<{ cart: Cart }>('/cart', { signal }),
    retry: false,
  });

export const useSettings = () =>
  useQuery({
    queryKey: ['public', 'settings'],
    queryFn: ({ signal }) =>
      api<{ settings: Settings }>('/settings/public', { signal }),
    retry: false,
  });

// Module-level state for 500ms per-item debounce & clean rollback tracking
type DebouncedEntry = {
  timer: ReturnType<typeof setTimeout>;
  reject: (err: unknown) => void;
};
const pendingTimers = new Map<string, DebouncedEntry>();
let activeRequests = 0;
let rollbackSnapshot: { cart: Cart } | undefined = undefined;
const syncListeners = new Set<(syncing: boolean) => void>();

function notifySync() {
  const isSyncing = pendingTimers.size > 0 || activeRequests > 0;
  syncListeners.forEach((listener) => listener(isSyncing));
}

export type CartUpdatePayload = {
  type?: 'catalog' | 'manual' | 'prescription';
  productId?: string;
  name?: string;
  url?: string;
  quantity: number;
  product?: Partial<Line> & { kind?: 'medicine' | 'non_medicine' };
};

function computeOptimisticCart(
  current: { cart: Cart } | undefined,
  payload: CartUpdatePayload,
  deliverySetting?: number,
): { cart: Cart } {
  const itemType = payload.type ?? 'catalog';
  const prevCart = current?.cart ?? {
    items: [],
    manualMedicines: [],
    prescriptions: [],
    estimate: null,
  };

  const items = [...(prevCart.items ?? [])];
  const manualMedicines = [...(prevCart.manualMedicines ?? [])];
  const prescriptions = [...(prevCart.prescriptions ?? [])];

  const oldMedicineSub = prevCart.estimate?.medicineSubtotal ?? 0;
  const oldNonMedicineSub = prevCart.estimate?.nonMedicineSubtotal ?? 0;
  let deltaAmount = 0;
  let isMedicine = false;

  if (itemType === 'catalog' && payload.productId) {
    const idx = items.findIndex((i) => i.productId === payload.productId);

    if (idx > -1) {
      const existing = items[idx];
      const diff = payload.quantity - existing.quantity;
      deltaAmount = diff * existing.price;
      if (oldMedicineSub > 0 && oldNonMedicineSub === 0) isMedicine = true;
      else if (payload.product?.kind === 'medicine') isMedicine = true;

      if (payload.quantity <= 0) {
        items.splice(idx, 1);
      } else {
        items[idx] = { ...existing, quantity: payload.quantity };
      }
    } else if (payload.quantity > 0 && payload.product) {
      const price = payload.product.price ?? 0;
      deltaAmount = payload.quantity * price;
      isMedicine = payload.product.kind === 'medicine';
      items.push({
        productId: payload.productId,
        name: payload.product.name ?? 'Item',
        price,
        quantity: payload.quantity,
        imageUrl: payload.product.imageUrl,
        isAvailable: payload.product.isAvailable ?? true,
      });
    }
  } else if (itemType === 'manual' && payload.name) {
    const cleanName = payload.name.trim();
    const idx = manualMedicines.findIndex((m) => m.name === cleanName);
    if (idx > -1) {
      if (payload.quantity <= 0) {
        manualMedicines.splice(idx, 1);
      } else {
        manualMedicines[idx] = { name: cleanName, quantity: payload.quantity };
      }
    } else if (payload.quantity > 0) {
      manualMedicines.push({ name: cleanName, quantity: payload.quantity });
    }
  } else if (itemType === 'prescription' && payload.url) {
    const idx = prescriptions.findIndex((p) => p.url === payload.url);
    if (idx > -1) {
      if (payload.quantity <= 0) {
        prescriptions.splice(idx, 1);
      }
    } else if (payload.quantity > 0) {
      prescriptions.push({ url: payload.url });
    }
  }

  if (items.length === 0) {
    return {
      cart: {
        items: [],
        manualMedicines,
        prescriptions,
        estimate: null,
      },
    };
  }

  const totalItemsPrice = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  let medSub = oldMedicineSub;
  let nonMedSub = oldNonMedicineSub;

  if (isMedicine) {
    medSub = Math.max(0, medSub + deltaAmount);
    nonMedSub = Math.max(0, totalItemsPrice - medSub);
  } else {
    nonMedSub = Math.max(0, nonMedSub + deltaAmount);
    medSub = Math.max(0, totalItemsPrice - nonMedSub);
  }

  const deliveryCharge =
    prevCart.estimate?.deliveryCharge ?? deliverySetting ?? 0;

  return {
    cart: {
      items,
      manualMedicines,
      prescriptions,
      estimate: {
        medicineSubtotal: medSub,
        nonMedicineSubtotal: nonMedSub,
        deliveryCharge,
        finalAmount: totalItemsPrice + deliveryCharge,
        offerApplied: prevCart.estimate?.offerApplied ?? false,
      },
    },
  };
}

export function useCartUpdate() {
  const qc = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(
    () => pendingTimers.size > 0 || activeRequests > 0,
  );

  useEffect(() => {
    syncListeners.add(setIsSyncing);
    return () => {
      syncListeners.delete(setIsSyncing);
    };
  }, []);

  const mutation = useMutation({
    mutationFn: (payload: CartUpdatePayload) =>
      new Promise<{ cart: Cart }>((resolve, reject) => {
        const itemType = payload.type ?? 'catalog';
        const keyId =
          itemType === 'catalog'
            ? `p:${payload.productId}`
            : itemType === 'manual'
              ? `m:${payload.name}`
              : `u:${payload.url}`;

        const prev = pendingTimers.get(keyId);
        if (prev) {
          clearTimeout(prev.timer);
          prev.reject(new DOMException('Superseded', 'AbortError'));
        }
        const timer = setTimeout(async () => {
          pendingTimers.delete(keyId);
          activeRequests++;
          notifySync();
          try {
            const res = await send<{ cart: Cart }>('/cart/update', {
              type: itemType,
              productId: payload.productId,
              name: payload.name,
              url: payload.url,
              quantity: payload.quantity,
            });
            resolve(res);
          } catch (err) {
            reject(err);
          } finally {
            activeRequests--;
            notifySync();
          }
        }, 500);

        pendingTimers.set(keyId, { timer, reject });
        notifySync();
      }),

    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: ['customer', 'cart'] });

      if (pendingTimers.size <= 1 && activeRequests === 0 && !rollbackSnapshot) {
        rollbackSnapshot = qc.getQueryData<{ cart: Cart }>(['customer', 'cart']);
      }

      const settings = qc.getQueryData<{ settings: Settings }>([
        'public',
        'settings',
      ]);
      const current = qc.getQueryData<{ cart: Cart }>(['customer', 'cart']);

      qc.setQueryData<{ cart: Cart }>(
        ['customer', 'cart'],
        computeOptimisticCart(
          current,
          payload,
          settings?.settings.deliveryCharge,
        ),
      );
    },

    onError: (err) => {
      if (err instanceof DOMException && err.name === 'AbortError') return;

      if (rollbackSnapshot !== undefined) {
        qc.setQueryData(['customer', 'cart'], rollbackSnapshot);
      }
      if (pendingTimers.size === 0 && activeRequests === 0) {
        rollbackSnapshot = undefined;
      }
      qc.invalidateQueries({ queryKey: ['customer', 'cart'] });
    },

    onSuccess: (data) => {
      if (pendingTimers.size === 0 && activeRequests === 0) {
        rollbackSnapshot = undefined;
        qc.setQueryData(['customer', 'cart'], data);
      }
    },
  });

  const realError =
    mutation.error instanceof DOMException &&
    mutation.error.name === 'AbortError'
      ? null
      : mutation.error;

  return {
    ...mutation,
    error: realError,
    isPending: isSyncing || mutation.isPending,
  };
}
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Inbox, PackageCheck, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { adminRequest } from '@/lib/adminApi';
import { cn } from '@/lib/cn';
import type { AdminOrder, AdminSettings, OrderStatus, Pagination } from '@/lib/types';
import { OrderCard } from './OrderCard';

const PAGE_SIZE = 20;
const POLL_MS = 30_000;

interface ListState {
  orders: AdminOrder[];
  pagination: Pagination | null;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
}

const initialList: ListState = { orders: [], pagination: null, loading: true, loadingMore: false, error: null };

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
        setState((current) => ({
          orders: page === 1 ? res.orders : [...current.orders, ...res.orders.filter((order) => !current.orders.some((existing) => existing.id === order.id))],
          pagination: res.pagination,
          loading: false,
          loadingMore: false,
          error: null,
        }));
      } catch (error) {
        if (id !== requestId.current) return;
        setState((current) => ({ ...current, loading: false, loadingMore: false, error: (error as Error).message }));
      }
    },
    [status],
  );

  const replace = (order: AdminOrder) => setState((current) => ({ ...current, orders: current.orders.map((item) => (item.id === order.id ? order : item)) }));
  const remove = (id: string) =>
    setState((current) => ({
      ...current,
      orders: current.orders.filter((item) => item.id !== id),
      pagination: current.pagination && { ...current.pagination, total: Math.max(0, current.pagination.total - 1) },
    }));
  const prepend = (order: AdminOrder) =>
    setState((current) => ({
      ...current,
      orders: [order, ...current.orders.filter((item) => item.id !== order.id)],
      pagination: current.pagination && { ...current.pagination, total: current.pagination.total + 1 },
    }));

  return { ...state, load, replace, remove, prepend };
}

export function OrdersBoard() {
  const pending = useOrderList('Pending');
  const delivered = useOrderList('Delivered');
  const [mobileTab, setMobileTab] = useState<OrderStatus>('Pending');
  const [deliveryCharge, setDeliveryCharge] = useState(0);
  const { load: loadPending } = pending;
  const { load: loadDelivered } = delivered;

  const loadSettings = useCallback(() => {
    adminRequest<{ settings: AdminSettings }>('/settings')
      .then((res) => setDeliveryCharge(res.settings.deliveryCharge))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    void loadPending();
    void loadDelivered();
    loadSettings();
  }, [loadPending, loadDelivered, loadSettings]);

  // Poll only the first page of pending orders, and only while the tab is visible.
  // Skipped once more pages are loaded so a refresh never collapses the admin's scroll position.
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
    loadSettings();
  };

  const handleDelivered = (order: AdminOrder) => {
    pending.remove(order.id);
    delivered.prepend(order);
  };

  const columns = [
    { status: 'Pending' as const, title: 'Pending Orders', list: pending, icon: Inbox, empty: 'No pending orders. New orders appear here automatically.' },
    { status: 'Delivered' as const, title: 'Delivered Orders', list: delivered, icon: PackageCheck, empty: 'Delivered orders will show up here.' },
  ];

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold">Orders</h1>
        <Button variant="secondary" size="sm" onClick={refresh} icon={<RefreshCw className={cn('h-4 w-4', pending.loading && 'animate-spin')} />}>
          Refresh
        </Button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-1.5 rounded-2xl bg-white p-1.5 ring-1 ring-brand-100 md:hidden" role="tablist" aria-label="Order status">
        {columns.map((column) => (
          <button
            key={column.status}
            type="button"
            role="tab"
            aria-selected={mobileTab === column.status}
            onClick={() => setMobileTab(column.status)}
            className={cn('relative h-10 rounded-xl text-sm font-semibold', mobileTab === column.status ? 'text-white' : 'text-ink-muted')}
          >
            {mobileTab === column.status && <motion.span layoutId="admin-tab" className="absolute inset-0 rounded-xl bg-brand-700" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
            <span className="relative">
              {column.status === 'Pending' ? 'Pending Orders' : 'Delivered'}
              {column.list.pagination ? ` (${column.list.pagination.total})` : ''}
            </span>
          </button>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {columns.map((column) => (
          <section key={column.status} className={cn(mobileTab !== column.status && 'hidden md:block')} aria-labelledby={`col-${column.status}`}>
            <h2 id={`col-${column.status}`} className="mb-3 hidden items-center gap-2 text-sm font-bold uppercase tracking-wider text-ink-soft md:flex">
              <column.icon className="h-4 w-4" aria-hidden /> {column.title}
              {column.list.pagination && <span className="rounded-full bg-brand-50 px-2 py-0.5 text-brand-700">{column.list.pagination.total}</span>}
            </h2>

            {column.list.loading ? (
              <div className="space-y-4">
                <Skeleton className="h-80 rounded-3xl" />
                <Skeleton className="h-80 rounded-3xl" />
              </div>
            ) : column.list.error ? (
              <div className="card p-6 text-center" role="alert">
                <p className="font-semibold">Could not load orders</p>
                <p className="mt-1 text-sm text-ink-muted">{column.list.error}</p>
                <Button variant="secondary" size="sm" className="mt-4" onClick={() => column.list.load()}>Try again</Button>
              </div>
            ) : column.list.orders.length === 0 ? (
              <div className="card grid place-items-center p-10 text-center">
                <column.icon className="h-10 w-10 text-brand-200" aria-hidden />
                <p className="mt-3 text-sm text-ink-muted">{column.empty}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <AnimatePresence initial={false} mode="popLayout">
                  {column.list.orders.map((order) => (
                    <OrderCard key={order.id} order={order} deliveryCharge={deliveryCharge} onUpdated={column.list.replace} onDelivered={handleDelivered} />
                  ))}
                </AnimatePresence>
                {column.list.pagination && column.list.pagination.page < column.list.pagination.totalPages && (
                  <Button variant="secondary" className="w-full" loading={column.list.loadingMore} onClick={() => column.list.load(column.list.pagination!.page + 1)}>
                    Load more
                  </Button>
                )}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

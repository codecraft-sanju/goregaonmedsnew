// //src/components/admin/OrdersBoard.tsx
// 'use client';
// import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
// import { MotionConfig, motion } from 'framer-motion';
// import { Ban, Inbox, PackageCheck, RefreshCw, type LucideIcon } from 'lucide-react';
// import { Button } from '@/components/ui/Button';
// import { Skeleton } from '@/components/ui/Skeleton';
// import { adminRequest } from '@/lib/adminApi';
// import { cn } from '@/lib/cn';
// import type { AdminOrder, AdminSettings, OrderStatus, Pagination } from '@/lib/types';
// import { CompactOrderCard } from './CompactOrderCard';
// import { OrderSidePanel } from './OrderSidePanel';

// const PAGE_SIZE = 20;
// const POLL_MS = 30_000;

// const timeFormatter = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' });

// interface TabConfig {
//   status: OrderStatus;
//   label: string;
//   icon: LucideIcon;
//   emptyTitle: string;
//   emptyHint: string;
// }

// const TABS: TabConfig[] = [
//   { status: 'Pending', label: 'Pending', icon: Inbox, emptyTitle: 'No pending orders', emptyHint: 'New orders will appear here automatically.' },
//   { status: 'Delivered', label: 'Delivered', icon: PackageCheck, emptyTitle: 'No delivered orders yet.', emptyHint: 'Delivered orders will show up here.' },
//   { status: 'Cancelled', label: 'Cancelled', icon: Ban, emptyTitle: 'No cancelled orders.', emptyHint: 'Cancelled orders and their reasons will show up here.' },
// ];

// interface ListState {
//   orders: AdminOrder[];
//   pagination: Pagination | null;
//   loading: boolean;
//   loadingMore: boolean;
//   error: string | null;
//   updatedAt: number | null;
// }

// const initialList: ListState = { orders: [], pagination: null, loading: true, loadingMore: false, error: null, updatedAt: null };

// function useOrderList(status: OrderStatus) {
//   const [state, setState] = useState<ListState>(initialList);
//   const requestId = useRef(0);

//   const load = useCallback(
//     async (page = 1, { silent = false } = {}) => {
//       const id = ++requestId.current;
//       setState((current) => ({ ...current, loading: page === 1 && !silent, loadingMore: page > 1, error: null }));
//       try {
//         const res = await adminRequest<{ orders: AdminOrder[]; pagination: Pagination }>(`/orders?status=${status}&page=${page}&limit=${PAGE_SIZE}`);
//         if (id !== requestId.current) return;
//         setState((current) => {
//           const known = new Set(current.orders.map((order) => order.id));
//           return {
//             orders: page === 1 ? res.orders : [...current.orders, ...res.orders.filter((order) => !known.has(order.id))],
//             pagination: res.pagination,
//             loading: false,
//             loadingMore: false,
//             error: null,
//             updatedAt: Date.now(),
//           };
//         });
//       } catch (error) {
//         if (id !== requestId.current) return;
//         setState((current) => ({ ...current, loading: false, loadingMore: false, error: (error as Error).message }));
//       }
//     },
//     [status],
//   );

//   const replace = useCallback(
//     (order: AdminOrder) =>
//       setState((current) =>
//         current.orders.some((item) => item.id === order.id) ? { ...current, orders: current.orders.map((item) => (item.id === order.id ? order : item)) } : current,
//       ),
//     [],
//   );

//   const remove = useCallback(
//     (id: string) =>
//       setState((current) => {
//         if (!current.orders.some((item) => item.id === id)) return current;
//         return {
//           ...current,
//           orders: current.orders.filter((item) => item.id !== id),
//           pagination: current.pagination && { ...current.pagination, total: Math.max(0, current.pagination.total - 1) },
//         };
//       }),
//     [],
//   );

//   const prepend = useCallback(
//     (order: AdminOrder) =>
//       setState((current) => {
//         const existed = current.orders.some((item) => item.id === order.id);
//         return {
//           ...current,
//           orders: [order, ...current.orders.filter((item) => item.id !== order.id)],
//           pagination: existed ? current.pagination : current.pagination && { ...current.pagination, total: current.pagination.total + 1 },
//         };
//       }),
//     [],
//   );

//   return { ...state, load, replace, remove, prepend };
// }

// export function OrdersBoard() {
//   const pending = useOrderList('Pending');
//   const delivered = useOrderList('Delivered');
//   const cancelled = useOrderList('Cancelled');

//   const [activeTab, setActiveTab] = useState<OrderStatus>('Pending');
//   const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
//   const [deliveryCharge, setDeliveryCharge] = useState(0);
//   const triggerRef = useRef<HTMLElement | null>(null);
//   const tabsId = useId();

//   const { load: loadPending, replace: replacePending, remove: removePending } = pending;
//   const { load: loadDelivered, replace: replaceDelivered, prepend: prependDelivered } = delivered;
//   const { load: loadCancelled, replace: replaceCancelled, prepend: prependCancelled } = cancelled;

//   const loadSettings = useCallback(() => {
//     adminRequest<{ settings: AdminSettings }>('/settings')
//       .then((res) => setDeliveryCharge(res.settings.deliveryCharge))
//       .catch(() => undefined);
//   }, []);

//   useEffect(() => {
//     void loadPending();
//     void loadDelivered();
//     void loadCancelled();
//     loadSettings();
//   }, [loadPending, loadDelivered, loadCancelled, loadSettings]);

//   // Poll only the first page of pending orders, and only while the tab is visible.
//   // Skipped once more pages are loaded so a refresh never collapses the admin's scroll position.
//   const pendingPage = pending.pagination?.page ?? 1;
//   useEffect(() => {
//     const timer = setInterval(() => {
//       if (document.visibilityState === 'visible' && pendingPage === 1) void loadPending(1, { silent: true });
//     }, POLL_MS);
//     return () => clearInterval(timer);
//   }, [loadPending, pendingPage]);

//   const refresh = () => {
//     void loadPending();
//     void loadDelivered();
//     void loadCancelled();
//     loadSettings();
//   };

//   // The selected order is derived from the loaded lists so the drawer never holds a stale copy.
//   const selectedOrder = useMemo(() => {
//     if (selectedOrderId === null) return null;
//     const match = (order: AdminOrder) => order.id === selectedOrderId;
//     return pending.orders.find(match) ?? delivered.orders.find(match) ?? cancelled.orders.find(match) ?? null;
//   }, [selectedOrderId, pending.orders, delivered.orders, cancelled.orders]);

//   useEffect(() => {
//     if (selectedOrderId !== null && selectedOrder === null) setSelectedOrderId(null);
//   }, [selectedOrderId, selectedOrder]);

//   // Return focus to the card that opened the drawer (if it is still on screen).
//   useEffect(() => {
//     if (selectedOrderId !== null) return;
//     const trigger = triggerRef.current;
//     triggerRef.current = null;
//     if (trigger?.isConnected) trigger.focus({ preventScroll: true });
//   }, [selectedOrderId]);

//   const handleSelect = useCallback((id: string, trigger: HTMLElement) => {
//     triggerRef.current = trigger;
//     setSelectedOrderId(id);
//   }, []);

//   const handleClose = useCallback(() => setSelectedOrderId(null), []);

//   const handleUpdated = useCallback(
//     (order: AdminOrder) => {
//       replacePending(order);
//       replaceDelivered(order);
//       replaceCancelled(order);
//     },
//     [replacePending, replaceDelivered, replaceCancelled],
//   );

//   const handleDelivered = useCallback(
//     (order: AdminOrder) => {
//       removePending(order.id);
//       prependDelivered(order);
//     },
//     [removePending, prependDelivered],
//   );

//   const handleCancelled = useCallback(
//     (order: AdminOrder) => {
//       removePending(order.id);
//       prependCancelled(order);
//     },
//     [removePending, prependCancelled],
//   );

//   const handleTabKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
//     const index = TABS.findIndex((tab) => tab.status === activeTab);
//     let next = index;
//     if (event.key === 'ArrowRight') next = (index + 1) % TABS.length;
//     else if (event.key === 'ArrowLeft') next = (index - 1 + TABS.length) % TABS.length;
//     else if (event.key === 'Home') next = 0;
//     else if (event.key === 'End') next = TABS.length - 1;
//     else return;
//     event.preventDefault();
//     setActiveTab(TABS[next].status);
//     document.getElementById(`${tabsId}-tab-${TABS[next].status}`)?.focus();
//   };

//   const lists = { Pending: pending, Delivered: delivered, Cancelled: cancelled } as const;
//   const list = lists[activeTab];
//   const activeMeta = TABS.find((tab) => tab.status === activeTab) ?? TABS[0];
//   const refreshing = pending.loading || delivered.loading || cancelled.loading;
//   const pagination = list.pagination;

//   return (
//     <MotionConfig reducedMotion="user">
//       <div className="mx-auto max-w-4xl">
//         <div className="flex flex-wrap items-start justify-between gap-3">
//           <div>
//             <h1 className="font-display text-2xl font-bold">Orders</h1>
//             <p className="mt-1 text-sm text-ink-muted">Manage incoming, delivered and cancelled pharmacy orders.</p>
//           </div>
//           <div className="flex items-center gap-3">
//             {pending.updatedAt && <span className="hidden text-xs text-ink-soft sm:inline">Updated {timeFormatter.format(pending.updatedAt)}</span>}
//             <Button variant="secondary" onClick={refresh} icon={<RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />}>
//               Refresh
//             </Button>
//           </div>
//         </div>

//         <dl className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
//           {TABS.map((tab) => (
//             <div key={tab.status} className="rounded-2xl border border-brand-100 bg-white px-3 py-3 sm:px-4">
//               <dt className="flex items-center gap-1.5 text-xs font-semibold text-ink-soft">
//                 <tab.icon className="h-3.5 w-3.5" aria-hidden /> {tab.label}
//               </dt>
//               <dd className="mt-1 text-2xl font-bold tabular-nums">{lists[tab.status].pagination?.total ?? '—'}</dd>
//             </div>
//           ))}
//         </dl>

//         <div
//           role="tablist"
//           aria-label="Order status"
//           onKeyDown={handleTabKeyDown}
//           className="mt-5 grid grid-cols-3 gap-1 rounded-2xl bg-white p-1 ring-1 ring-brand-100 sm:inline-grid sm:grid-cols-[repeat(3,minmax(8rem,1fr))]"
//         >
//           {TABS.map((tab) => {
//             const active = activeTab === tab.status;
//             const total = lists[tab.status].pagination?.total;
//             return (
//               <button
//                 key={tab.status}
//                 id={`${tabsId}-tab-${tab.status}`}
//                 type="button"
//                 role="tab"
//                 aria-selected={active}
//                 aria-controls={`${tabsId}-panel`}
//                 tabIndex={active ? 0 : -1}
//                 onClick={() => setActiveTab(tab.status)}
//                 className={cn(
//                   'relative flex h-11 items-center justify-center gap-1.5 rounded-xl px-2 text-sm font-semibold transition-colors',
//                   'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
//                   active ? 'text-white' : 'text-ink-muted hover:text-ink',
//                 )}
//               >
//                 {active && (
//                   <motion.span layoutId={`${tabsId}-indicator`} className="absolute inset-0 rounded-xl bg-brand-700" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />
//                 )}
//                 <span className="relative">{tab.label}</span>
//                 {total !== undefined && (
//                   <span className={cn('relative rounded-full px-1.5 text-xs tabular-nums', active ? 'bg-white/20' : 'bg-brand-50 text-brand-700')}>{total}</span>
//                 )}
//               </button>
//             );
//           })}
//         </div>

//         <div role="tabpanel" id={`${tabsId}-panel`} aria-labelledby={`${tabsId}-tab-${activeTab}`} className="mt-4">
//           {list.loading && list.orders.length === 0 ? (
//             <div className="space-y-2" aria-busy>
//               {Array.from({ length: 5 }, (_, index) => (
//                 <Skeleton key={index} className="h-24 rounded-2xl" />
//               ))}
//             </div>
//           ) : list.error && list.orders.length === 0 ? (
//             <div className="card p-6 text-center" role="alert">
//               <p className="font-semibold">Could not load orders</p>
//               <p className="mt-1 text-sm text-ink-muted">{list.error}</p>
//               <Button variant="secondary" size="sm" className="mt-4" onClick={() => void list.load()}>
//                 Try again
//               </Button>
//             </div>
//           ) : list.orders.length === 0 ? (
//             <div className="card grid place-items-center p-10 text-center">
//               <activeMeta.icon className="h-10 w-10 text-brand-200" aria-hidden />
//               <p className="mt-3 text-sm font-semibold text-ink">{activeMeta.emptyTitle}</p>
//               <p className="mt-1 text-sm text-ink-muted">{activeMeta.emptyHint}</p>
//             </div>
//           ) : (
//             <>
//               {list.error && (
//                 <div role="alert" className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
//                   <span className="min-w-0">{list.error}</span>
//                   <button type="button" onClick={() => void list.load()} className="min-h-11 shrink-0 px-2 font-semibold underline">
//                     Try again
//                   </button>
//                 </div>
//               )}
//               <ul className={cn('space-y-2 transition-opacity', list.loading && 'opacity-60')}>
//                 {list.orders.map((order) => (
//                   <li key={order.id}>
//                     <CompactOrderCard order={order} selected={order.id === selectedOrderId} onSelect={handleSelect} />
//                   </li>
//                 ))}
//               </ul>
//               {pagination && pagination.page < pagination.totalPages && (
//                 <Button variant="secondary" className="mt-4 w-full" loading={list.loadingMore} onClick={() => void list.load(pagination.page + 1)}>
//                   Load more
//                 </Button>
//               )}
//             </>
//           )}
//         </div>
//       </div>

//       <OrderSidePanel
//         order={selectedOrder}
//         open={selectedOrder !== null}
//         deliveryCharge={deliveryCharge}
//         onClose={handleClose}
//         onUpdated={handleUpdated}
//         onDelivered={handleDelivered}
//         onCancelled={handleCancelled}
//       />
//     </MotionConfig>
//   );
// }

'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { MotionConfig, motion } from 'framer-motion';
import { Ban, Inbox, PackageCheck, RefreshCw, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { adminRequest } from '@/lib/adminApi';
import { cn } from '@/lib/cn';
import type { AdminOrder, AdminSettings, OrderStatus, Pagination } from '@/lib/types';
import { CompactOrderCard } from './CompactOrderCard';
import { OrderSidePanel } from './OrderSidePanel';
// Naya component yahan import kiya hai
import { AnalyticsOverview } from './AnalyticsOverview'; 

const PAGE_SIZE = 20;
const POLL_MS = 30_000;

const timeFormatter = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' });

interface TabConfig {
  status: OrderStatus;
  label: string;
  icon: LucideIcon;
  emptyTitle: string;
  emptyHint: string;
}

const TABS: TabConfig[] = [
  { status: 'Pending', label: 'Pending', icon: Inbox, emptyTitle: 'No pending orders', emptyHint: 'New orders will appear here automatically.' },
  { status: 'Delivered', label: 'Delivered', icon: PackageCheck, emptyTitle: 'No delivered orders yet.', emptyHint: 'Delivered orders will show up here.' },
  { status: 'Cancelled', label: 'Cancelled', icon: Ban, emptyTitle: 'No cancelled orders.', emptyHint: 'Cancelled orders and their reasons will show up here.' },
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
    void loadCancelled();
    loadSettings();
  };

  // The selected order is derived from the loaded lists so the drawer never holds a stale copy.
  const selectedOrder = useMemo(() => {
    if (selectedOrderId === null) return null;
    const match = (order: AdminOrder) => order.id === selectedOrderId;
    return pending.orders.find(match) ?? delivered.orders.find(match) ?? cancelled.orders.find(match) ?? null;
  }, [selectedOrderId, pending.orders, delivered.orders, cancelled.orders]);

  useEffect(() => {
    if (selectedOrderId !== null && selectedOrder === null) setSelectedOrderId(null);
  }, [selectedOrderId, selectedOrder]);

  // Return focus to the card that opened the drawer (if it is still on screen).
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

  const handleTabKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = TABS.findIndex((tab) => tab.status === activeTab);
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % TABS.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + TABS.length) % TABS.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = TABS.length - 1;
    else return;
    if (!TABS[next]) return;
    event.preventDefault();
    setActiveTab(TABS[next].status);
    document.getElementById(`${tabsId}-tab-${TABS[next].status}`)?.focus();
  };

  const lists = { Pending: pending, Delivered: delivered, Cancelled: cancelled } as const;
  const list = lists[activeTab];
  const activeMeta = TABS.find((tab) => tab.status === activeTab) ?? TABS[0];
  const refreshing = pending.loading || delivered.loading || cancelled.loading;
  const pagination = list.pagination;

  return (
    <MotionConfig reducedMotion="user">
      <div className="mx-auto max-w-4xl">
        
        {/* Naya Analytics Component Sabse Upar */}
        <AnalyticsOverview />

        <div className="mt-8 flex flex-wrap items-start justify-between gap-3 border-t border-brand-100 pt-8">
          <div>
            <h2 className="font-display text-2xl font-bold">Orders</h2>
            <p className="mt-1 text-sm text-ink-muted">Manage incoming, delivered and cancelled pharmacy orders.</p>
          </div>
          <div className="flex items-center gap-3">
            {pending.updatedAt && <span className="hidden text-xs text-ink-soft sm:inline">Updated {timeFormatter.format(pending.updatedAt)}</span>}
            <Button variant="secondary" onClick={refresh} icon={<RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />}>
              Refresh
            </Button>
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
          {TABS.map((tab) => (
            <div key={tab.status} className="rounded-2xl border border-brand-100 bg-white px-3 py-3 sm:px-4">
              <dt className="flex items-center gap-1.5 text-xs font-semibold text-ink-soft">
                <tab.icon className="h-3.5 w-3.5" aria-hidden /> {tab.label}
              </dt>
              <dd className="mt-1 text-2xl font-bold tabular-nums">{lists[tab.status].pagination?.total ?? '—'}</dd>
            </div>
          ))}
        </dl>

        <div
          role="tablist"
          aria-label="Order status"
          onKeyDown={handleTabKeyDown}
          className="mt-5 grid grid-cols-3 gap-1 rounded-2xl bg-white p-1 ring-1 ring-brand-100 sm:inline-grid sm:grid-cols-[repeat(3,minmax(8rem,1fr))]"
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
                  'relative flex h-11 items-center justify-center gap-1.5 rounded-xl px-2 text-sm font-semibold transition-colors',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
                  active ? 'text-white' : 'text-ink-muted hover:text-ink',
                )}
              >
                {active && (
                  <motion.span layoutId={`${tabsId}-indicator`} className="absolute inset-0 rounded-xl bg-brand-700" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />
                )}
                <span className="relative">{tab.label}</span>
                {total !== undefined && (
                  <span className={cn('relative rounded-full px-1.5 text-xs tabular-nums', active ? 'bg-white/20' : 'bg-brand-50 text-brand-700')}>{total}</span>
                )}
              </button>
            );
          })}
        </div>

        <div role="tabpanel" id={`${tabsId}-panel`} aria-labelledby={`${tabsId}-tab-${activeTab}`} className="mt-4">
          {list.loading && list.orders.length === 0 ? (
            <div className="space-y-2" aria-busy>
              {Array.from({ length: 5 }, (_, index) => (
                <Skeleton key={index} className="h-24 rounded-2xl" />
              ))}
            </div>
          ) : list.error && list.orders.length === 0 ? (
            <div className="card p-6 text-center" role="alert">
              <p className="font-semibold">Could not load orders</p>
              <p className="mt-1 text-sm text-ink-muted">{list.error}</p>
              <Button variant="secondary" size="sm" className="mt-4" onClick={() => void list.load()}>
                Try again
              </Button>
            </div>
          ) : list.orders.length === 0 ? (
            <div className="card grid place-items-center p-10 text-center">
              <activeMeta.icon className="h-10 w-10 text-brand-200" aria-hidden />
              <p className="mt-3 text-sm font-semibold text-ink">{activeMeta.emptyTitle}</p>
              <p className="mt-1 text-sm text-ink-muted">{activeMeta.emptyHint}</p>
            </div>
          ) : (
            <>
              {list.error && (
                <div role="alert" className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                  <span className="min-w-0">{list.error}</span>
                  <button type="button" onClick={() => void list.load()} className="min-h-11 shrink-0 px-2 font-semibold underline">
                    Try again
                  </button>
                </div>
              )}
              <ul className={cn('space-y-2 transition-opacity', list.loading && 'opacity-60')}>
                {list.orders.map((order) => (
                  <li key={order.id}>
                    <CompactOrderCard order={order} selected={order.id === selectedOrderId} onSelect={handleSelect} />
                  </li>
                ))}
              </ul>
              {pagination && pagination.page < pagination.totalPages && (
                <Button variant="secondary" className="mt-4 w-full" loading={list.loadingMore} onClick={() => void list.load(pagination.page + 1)}>
                  Load more
                </Button>
              )}
            </>
          )}
        </div>
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
  );
}
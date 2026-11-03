//src/features/orders.tsx
'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import {
  Package,
  ArrowRight,
  Download,
  LogOut,
  MapPin,
  Phone,
  Bell,
  Check,
  Trash2,
} from 'lucide-react';
import { api, send, Order, Pagination, money, date } from '@/lib/api';
import { useSession } from '@/lib/hooks';
import {
  OrdersSkeleton,
  OrderDetailSkeleton,
  ProfileSkeleton,
  NotificationsSkeleton,
  ErrorState,
  Empty,
  PageHeading,
  Status,
  Pager,
} from '@/components/ui';

export function Protected({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const auth = useSession();
  return auth.isPending ? (
    <>{fallback ?? <OrdersSkeleton />}</>
  ) : auth.error ? (
    <ErrorState error={auth.error} retry={() => auth.refetch()} />
  ) : !auth.data ? (
    <Empty title="Your care, all in one place.">
      <p>Sign in to securely view your orders and saved details.</p>
      <Link className="btn" href="/login/">
        Sign in
        <ArrowRight size={17} />
      </Link>
    </Empty>
  ) : (
    children
  );
}

function Invoice({ order }: { order: Order }) {
  const [url, setUrl] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<Error | null>(null);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    const hide = () => {
      if (document.hidden) abort.current?.abort();
    };
    document.addEventListener('visibilitychange', hide);
    return () => {
      abort.current?.abort();
      document.removeEventListener('visibilitychange', hide);
    };
  }, []);

  async function get() {
    setBusy(true);
    setError(null);
    setUrl('');
    const c = new AbortController();
    abort.current = c;
    try {
      for (let i = 0; i < 10; i++) {
        const r = await api<{ url?: string; processing?: boolean }>(
          `/orders/${encodeURIComponent(order.orderId)}/invoice`,
          { signal: c.signal },
        );
        if (r.url) {
          const u = new URL(r.url);
          if (u.protocol !== 'https:' || u.hostname !== 'res.cloudinary.com')
            throw new Error(
              'Unexpected invoice provider. Please contact the pharmacy.',
            );
          setUrl(r.url);
          return;
        }
        if (!r.processing) throw new Error('The invoice is not ready.');
        if (i < 9)
          await new Promise<void>((resolve, reject) => {
            const t = setTimeout(() => {
              c.signal.removeEventListener('abort', stop);
              resolve();
            }, 3000);
            const stop = () => {
              clearTimeout(t);
              reject(new Error('Invoice request paused. Please try again.'));
            };
            if (c.signal.aborted) stop();
            else c.signal.addEventListener('abort', stop, { once: true });
          });
      }
      throw new Error(
        'Your invoice is still being prepared. Please try again shortly.',
      );
    } catch (e) {
      setError(e as Error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {url ? (
        <a
          href={url}
          className="btn secondary"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Download size={17} />
          Open invoice
        </a>
      ) : (
        <button
          className="btn secondary"
          onClick={get}
          disabled={busy || order.finalAmount == null}
        >
          {busy ? 'Preparing invoice…' : 'Request invoice'}
          <Download size={17} />
        </button>
      )}
      {busy && (
        <button className="text-link" onClick={() => abort.current?.abort()}>
          Cancel
        </button>
      )}
      {error && <ErrorState error={error} />}
    </div>
  );
}

function OrderContent() {
  const sp = useSearchParams(),
    id = sp.get('id');
  const [page, setPage] = useState(1);

  const list = useQuery({
    queryKey: ['customer', 'orders', page],
    queryFn: ({ signal }) =>
      api<{ orders: Order[]; pagination: Pagination }>(
        `/orders/history?page=${page}&limit=10`,
        { signal },
      ),
    enabled: !id,
  });

  const detail = useQuery({
    queryKey: ['customer', 'order', id],
    queryFn: ({ signal }) =>
      api<{ order: Order }>(`/orders/${encodeURIComponent(id!)}`, { signal }),
    enabled: !!id,
  });

  const query = id ? detail : list;
  if (query.isPending) return id ? <OrderDetailSkeleton /> : <OrdersSkeleton />;
  if (query.error)
    return <ErrorState error={query.error} retry={() => query.refetch()} />;

  if (id && detail.data) {
    const o = detail.data.order;
    return (
      <div className="panel order-detail">
        <Link href="/orders/" className="text-link">
          ← All your orders
        </Link>
        <div className="section-head">
          <div>
            <h2>{o.orderId}</h2>
            <p>{date(o.placedAt)}</p>
          </div>
          <Status status={o.status} />
        </div>
        <div className="order-status">
          <Package size={28} />
          <div>
            <h3>{o.statusLabel ?? o.status}</h3>
            <p>
              {o.status === 'Pending'
                ? 'Your order is with the pharmacy. Final availability and pricing are confirmed during billing.'
                : o.status === 'Delivered'
                  ? 'Your order has been marked delivered.'
                  : 'This order has been cancelled.'}
            </p>
          </div>
        </div>
        {[...o.medicines, ...o.products].map((i, n) => (
          <div className="order-line" key={i._id ?? n}>
            <span>
              {i.name} × {i.quantity}
            </span>
            <strong>
              {o.finalAmount == null
                ? 'Awaiting bill'
                : money(i.price * i.quantity)}
            </strong>
          </div>
        ))}
        <div className="summary-total">
          <span>Final amount</span>
          <strong>{money(o.finalAmount)}</strong>
        </div>
        <p className="muted">Pay at Delivery (Cash/UPI)</p>
        <Invoice key={o.orderId} order={o} />
      </div>
    );
  }

  return list.data?.orders.length ? (
    <>
      <div className="orders-list">
        {list.data.orders.map((o) => (
          <Link
            href={`/orders/?id=${encodeURIComponent(o.orderId)}`}
            className="panel order-card"
            key={o.orderId}
          >
            <div className="empty-icon">
              <Package size={24} />
            </div>
            <div>
              <h3>{o.orderId}</h3>
              <p>
                {date(o.placedAt)} · {o.medicines.length + o.products.length}{' '}
                line items
              </p>
            </div>
            <Status status={o.status} />
            <strong>{money(o.finalAmount)}</strong>
            <ArrowRight size={19} />
          </Link>
        ))}
      </div>
      <Pager
        page={page}
        total={list.data.pagination.totalPages}
        onChange={setPage}
      />
    </>
  ) : (
    <Empty title="Your care story starts here." icon={Package}>
      <p>Your orders will appear here once you’ve placed one.</p>
      <Link href="/products/" className="btn">
        Explore the shop
      </Link>
    </Empty>
  );
}

export default function Orders() {
  return (
    <div className="container page">
      <PageHeading title="Your orders, in good hands.">
        A clear view of what you ordered and where things stand.
      </PageHeading>
      <Protected fallback={<OrdersSkeleton />}>
        <OrderContent />
      </Protected>
    </div>
  );
}

type SavedOptions = {
  savedPhones: string[];
  savedAddresses: { key: string; flat: string; area: string; landmark: string }[];
};

function ProfileContent() {
  const auth = useSession(),
    qc = useQueryClient();
  const [error, setError] = useState<Error | null>(null),
    [busy, setBusy] = useState(false);

  const options = useQuery({
    queryKey: ['customer', 'checkout-options'],
    queryFn: () => api<SavedOptions>('/profile/checkout-options'),
  });

  // Optimistic removal with automatic rollback on failure
  const removeMutation = useMutation({
    mutationFn: (vars: { path: string; type: 'address' | 'phone'; id: string }) =>
      send(vars.path, undefined, 'DELETE'),
    onMutate: async (vars) => {
      setError(null);
      await qc.cancelQueries({ queryKey: ['customer', 'checkout-options'] });
      const prev = qc.getQueryData<SavedOptions>([
        'customer',
        'checkout-options',
      ]);
      if (prev) {
        qc.setQueryData<SavedOptions>(['customer', 'checkout-options'], {
          savedAddresses:
            vars.type === 'address'
              ? prev.savedAddresses.filter((a) => a.key !== vars.id)
              : prev.savedAddresses,
          savedPhones:
            vars.type === 'phone'
              ? prev.savedPhones.filter((p) => p !== vars.id)
              : prev.savedPhones,
        });
      }
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) {
        qc.setQueryData(['customer', 'checkout-options'], ctx.prev);
      }
      setError(err as Error);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['customer', 'checkout-options'] });
    },
  });

  async function logout() {
    setBusy(true);
    try {
      await send('/auth/logout');
      qc.removeQueries({ queryKey: ['customer'] });
      window.location.assign('/');
    } catch (e) {
      setError(e as Error);
      setBusy(false);
    }
  }

  return (
    <div className="profile-grid">
      <aside className="panel profile-card">
        <div className="avatar">{auth.data?.user?.email[0]?.toUpperCase()}</div>
        <h2>Your account</h2>
        <p>{auth.data?.user?.email}</p>
        <Link href="/orders/" className="menu-link">
          <Package size={19} />
          Your orders
          <ArrowRight size={16} />
        </Link>
        <Link href="/notifications/" className="menu-link">
          <Bell size={19} />
          Notifications
          <ArrowRight size={16} />
        </Link>
        <Link href="/privacy/" className="menu-link">
          Privacy notice
          <ArrowRight size={16} />
        </Link>
        <button onClick={logout} disabled={busy} className="text-link">
          <LogOut size={17} />
          Sign out
        </button>
      </aside>
      <section className="panel">
        <h2>A little less typing next time.</h2>
        <p className="muted">
          Delivery details from successful orders are remembered for you. Select
          them explicitly at checkout.
        </p>
        {options.isPending ? (
          <div>
            {[1, 2].map((i) => (
              <div className="saved-row" key={i}>
                <div style={{ flex: 1 }}>
                  <div className="skeleton" style={{ width: '45%', height: 16, borderRadius: 4, marginBottom: 8 }} />
                  <div className="skeleton" style={{ width: '70%', height: 13, borderRadius: 4 }} />
                </div>
                <div className="skeleton" style={{ width: 36, height: 36, borderRadius: 8 }} />
              </div>
            ))}
          </div>
        ) : options.error ? (
          <ErrorState error={options.error} retry={() => options.refetch()} />
        ) : (
          <>
            <h3>
              <MapPin size={18} />
              Saved addresses
            </h3>
            {options.data?.savedAddresses.length ? (
              options.data.savedAddresses.map((a) => (
                <div className="saved-row" key={a.key}>
                  <div>
                    <strong>{a.flat}</strong>
                    <p>
                      {a.area} {a.landmark}
                    </p>
                  </div>
                  <button
                    className="icon-button"
                    aria-label={`Remove ${a.flat}`}
                    onClick={() => {
                      if (window.confirm('Remove this saved detail?')) {
                        removeMutation.mutate({
                          path: `/profile/saved-addresses/${a.key}`,
                          type: 'address',
                          id: a.key,
                        });
                      }
                    }}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              ))
            ) : (
              <p>No saved addresses yet.</p>
            )}
            <h3>
              <Phone size={18} />
              Saved phone numbers
            </h3>
            {options.data?.savedPhones.length ? (
              options.data.savedPhones.map((p) => (
                <div className="saved-row" key={p}>
                  <span>{p}</span>
                  <button
                    className="icon-button"
                    aria-label={`Remove ${p}`}
                    onClick={() => {
                      if (window.confirm('Remove this saved detail?')) {
                        removeMutation.mutate({
                          path: `/profile/saved-phones/${encodeURIComponent(p)}`,
                          type: 'phone',
                          id: p,
                        });
                      }
                    }}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              ))
            ) : (
              <p>No saved phone numbers yet.</p>
            )}
          </>
        )}
        {error && <ErrorState error={error} />}
      </section>
    </div>
  );
}

export function Profile() {
  return (
    <div className="container page">
      <PageHeading title="A space for your everyday care." />
      <Protected fallback={<ProfileSkeleton />}>
        <ProfileContent />
      </Protected>
    </div>
  );
}

type NotificationsResponse = {
  notifications: {
    _id: string;
    title: string;
    message: string;
    isRead: boolean;
    orderId?: string;
    createdAt: string;
  }[];
  meta: Pagination & { unreadCount: number };
};

function NotificationContent() {
  const [page, setPage] = useState(1);
  const qc = useQueryClient();
  const qk = ['customer', 'notifications', page] as const;

  const q = useQuery({
    queryKey: qk,
    queryFn: () =>
      api<NotificationsResponse>(`/notifications?page=${page}&limit=20`),
  });

  // Optimistic Mark Read with automatic rollback on failure
  const m = useMutation({
    mutationFn: (id: string) =>
      send(
        id === 'all' ? '/notifications/read-all' : `/notifications/${id}/read`,
        undefined,
        'PUT',
      ),
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: qk });
      const prev = qc.getQueryData<NotificationsResponse>(qk);
      if (prev) {
        const notifications = prev.notifications.map((n) =>
          id === 'all' || n._id === id ? { ...n, isRead: true } : n,
        );
        const unreadCount =
          id === 'all' ? 0 : Math.max(0, prev.meta.unreadCount - 1);
        qc.setQueryData<NotificationsResponse>(qk, {
          notifications,
          meta: { ...prev.meta, unreadCount },
        });
      }
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) {
        qc.setQueryData(qk, ctx.prev);
      }
    },
    onSettled: () =>
      qc.invalidateQueries({ queryKey: ['customer', 'notifications'] }),
  });

  if (q.isPending) return <NotificationsSkeleton />;
  if (q.error) return <ErrorState error={q.error} retry={() => q.refetch()} />;

  return (
    <section className="panel">
      <div className="section-head">
        <h2>Updates for you</h2>
        <button
          className="btn secondary small"
          disabled={!q.data?.meta.unreadCount}
          onClick={() => m.mutate('all')}
        >
          <Check size={16} />
          Mark all read
        </button>
      </div>
      {m.error && <ErrorState error={m.error} />}
      {q.data?.notifications.length ? (
        q.data.notifications.map((n) => (
          <article
            className={`notification ${n.isRead ? '' : 'unread'}`}
            key={n._id}
          >
            <Bell size={20} />
            <div>
              <h3>{n.title}</h3>
              <p>{n.message}</p>
              <small>{date(n.createdAt)}</small>
              {n.orderId && (
                <Link
                  href={`/orders/?id=${encodeURIComponent(n.orderId)}`}
                  className="text-link"
                >
                  View order
                </Link>
              )}
            </div>
            {!n.isRead && (
              <button
                className="icon-button"
                aria-label="Mark read"
                onClick={() => m.mutate(n._id)}
              >
                <Check size={18} />
              </button>
            )}
          </article>
        ))
      ) : (
        <Empty title="All caught up." icon={Bell}>
          <p>Order updates will appear here.</p>
        </Empty>
      )}
      <Pager
        page={page}
        total={q.data?.meta.totalPages ?? 0}
        onChange={setPage}
      />
    </section>
  );
}

export function Notifications() {
  return (
    <div className="container page">
      <PageHeading title="A little update for you." />
      <Protected fallback={<NotificationsSkeleton />}>
        <NotificationContent />
      </Protected>
    </div>
  );
}
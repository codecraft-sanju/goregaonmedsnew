//src/features/admin.tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  HeartPulse,
  LayoutDashboard,
  Package,
  Boxes,
  Users,
  Settings as SettingsIcon,
  Activity,
  ArrowUpRight,
  LogOut,
  Search,
  Plus,
  RefreshCw,
  IndianRupee,
  ShoppingBag,
  Clock,
  CheckCheck,
  Trash2,
  Save,
} from 'lucide-react';
import {
  api,
  send,
  Order,
  Product,
  Pagination,
  Settings,
  Line,
  money,
  date,
  productId,
  ApiError,
} from '@/lib/api';
import { useSession } from '@/lib/hooks';
import {
  PageHeading,
  Loading,
  Empty,
  ErrorState,
  Pager,
  Status,
  Modal,
  MetricsSkeleton,
  TableSkeleton,
} from '@/components/ui';
import { Brand } from '@/components/shell';
import Login from './auth';

const nav = [
  ['/admin/', 'Overview', LayoutDashboard],
  ['/admin/orders/', 'Orders', Package],
  ['/admin/products/', 'Products', Boxes],
  ['/admin/customers/', 'Customers', Users],
  ['/admin/settings/', 'Settings', SettingsIcon],
  ['/admin/logs/', 'System logs', Activity],
] as const;

export default function Admin({ view = 'overview' }: { view?: string }) {
  const auth = useSession(true),
    path = usePathname(),
    qc = useQueryClient();

  const logout = useMutation({
    mutationFn: () => send('/admin/logout'),
    onSuccess: () => {
      qc.removeQueries({ queryKey: ['admin'] });
      window.location.assign('/admin/login/');
    },
  });

  if (view === 'login') return <Login admin />;

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <Brand />
        <div className="workspace-label">PHARMACY WORKSPACE</div>
        <nav>
          {nav.map(([href, label, Icon]) => (
            <Link
              className={
                path === href || path === href.slice(0, -1) ? 'active' : ''
              }
              href={href}
              key={href}
            >
              <Icon size={19} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="admin-sidebar-bottom">
          <div className="workspace-note">
            <HeartPulse size={20} />
            <p>
              A little care.
              <br />
              Every order.
            </p>
          </div>
          <Link href="/" className="text-link">
            Visit storefront
            <ArrowUpRight size={16} />
          </Link>
          <button
            className="text-link"
            disabled={logout.isPending || !auth.data}
            onClick={() => logout.mutate()}
          >
            <LogOut size={17} />
            Sign out
          </button>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-top">
          <span>
            Workspace / {nav.find((n) => n[0] === path)?.[1] ?? 'Overview'}
          </span>
          <span className="admin-identity">
            <span className="green-dot" />
            {auth.data?.admin?.username ?? 'Pharmacy team'}
          </span>
        </header>
        <main>
          {logout.error && <ErrorState error={logout.error} />}{' '}
          {auth.isPending ? (
            <Loading />
          ) : auth.error ? (
            <>
              <PageHeading
                eyebrow="PHARMACY WORKSPACE"
                title="Welcome to your workspace."
              />
              <ErrorState error={auth.error} retry={() => auth.refetch()} />
              <div className="admin-welcome">
                <LayoutDashboard size={44} />
                <h2>One thoughtful space for daily operations.</h2>
                <p>
                  Orders, billing, products, and reporting will appear when the
                  pharmacy service is connected.
                </p>
                <Link href="/admin/login/" className="btn">
                  Go to admin sign-in
                </Link>
              </div>
            </>
          ) : !auth.data ? (
            <Empty title="Your pharmacy workspace">
              <p>Sign in to view orders, stock, and reporting.</p>
              <Link className="btn" href="/admin/login/">
                Admin sign-in
              </Link>
            </Empty>
          ) : view === 'overview' ? (
            <Overview />
          ) : view === 'orders' ? (
            <AdminOrders />
          ) : view === 'products' ? (
            <AdminProducts />
          ) : view === 'customers' ? (
            <Customers />
          ) : view === 'settings' ? (
            <AdminSettings />
          ) : (
            <Logs />
          )}
        </main>
      </div>
    </div>
  );
}

function Overview() {
  const [start, setStart] = useState(''),
    [end, setEnd] = useState('');
  const valid = (!start && !end) || (!!start && !!end && start <= end);
  const q = useQuery({
    queryKey: ['admin', 'analytics', start, end],
    queryFn: () =>
      api<{
        totalSales: number;
        totalOrders: number;
        breakdown: { pending: number; delivered: number };
      }>(
        `/admin/analytics/overview?${start ? `startDate=${start}&endDate=${end}` : 'allTime=true'}`,
      ),
    enabled: valid,
  });

  const cards = [
    {
      icon: IndianRupee,
      label: 'Sales delivered in period',
      value: money(q.data?.totalSales),
    },
    { icon: ShoppingBag, label: 'Orders placed', value: q.data?.totalOrders },
    {
      icon: Clock,
      label: 'Pending among placed orders',
      value: q.data?.breakdown.pending,
    },
    {
      icon: CheckCheck,
      label: 'Orders delivered in period',
      value: q.data?.breakdown.delivered,
    },
  ];

  return (
    <>
      <PageHeading
        eyebrow="A CLEARER VIEW OF YOUR DAY"
        title="Good care. Well managed."
      >
        Your pharmacy at a glance, with figures from your live backend.
      </PageHeading>
      <div className="date-controls">
        <label>
          From
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </label>
        <label>
          To
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </label>
        <button
          className="btn secondary"
          onClick={() => {
            setStart('');
            setEnd('');
          }}
        >
          All time
        </button>
      </div>
      {!valid ? (
        <p className="field-error">Choose a valid start and end date.</p>
      ) : q.isPending ? (
        <MetricsSkeleton />
      ) : q.error ? (
        <ErrorState error={q.error} retry={() => q.refetch()} />
      ) : (
        <div className="metric-grid">
          {cards.map((c) => (
            <div className="metric panel" key={c.label}>
              <div>
                <c.icon size={21} />
                <span>{start ? 'SELECTED PERIOD' : 'ALL TIME'}</span>
              </div>
              <strong>{c.value ?? '—'}</strong>
              <p>{c.label}</p>
            </div>
          ))}
        </div>
      )}
      <p className="fine-print">
        Placed-order metrics use creation dates. Sales and delivered metrics use
        delivery dates. These counts are different cohorts and need not add up.
      </p>
      <div className="admin-quick-grid">
        <Link href="/admin/orders/" className="panel">
          <Package size={28} />
          <h2>Keep orders moving.</h2>
          <p>Review pending orders, prepare bills, and manage fulfilment.</p>
          <span className="text-link">
            Open orders
            <ArrowUpRight size={17} />
          </span>
        </Link>
        <Link href="/admin/products/" className="panel">
          <Boxes size={28} />
          <h2>A well-kept shelf.</h2>
          <p>Update your catalog, availability, and tracked inventory.</p>
          <span className="text-link">
            Manage products
            <ArrowUpRight size={17} />
          </span>
        </Link>
      </div>
    </>
  );
}

function AdminOrders() {
  const [status, setStatus] = useState('Pending'),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ['admin', 'orders', status, page],
    queryFn: ({ signal }) =>
      api<{ orders: Order[]; pagination: Pagination }>(
        `/admin/orders?status=${status}&page=${page}&limit=20`,
        { signal },
      ),
    refetchInterval: status === 'Pending' ? 30000 : false,
  });

  return (
    <>
      <PageHeading
        eyebrow="EVERY ORDER DESERVES ATTENTION"
        title="Orders, thoughtfully handled."
      />
      <div className="section-head">
        <div className="segmented">
          {['Pending', 'Delivered', 'Cancelled'].map((s) => (
            <button
              className={s === status ? 'active' : ''}
              key={s}
              onClick={() => {
                setStatus(s);
                setPage(1);
              }}
            >
              {s}
            </button>
          ))}
        </div>
        <button className="btn secondary small" onClick={() => q.refetch()}>
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>
      {q.isPending ? (
        <TableSkeleton rows={5} />
      ) : q.error ? (
        <ErrorState error={q.error} retry={() => q.refetch()} />
      ) : q.data?.orders.length ? (
        <>
          <div className="table-wrap panel">
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Placed</th>
                  <th>Bill</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {q.data.orders.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <strong>{o.orderId}</strong>
                    </td>
                    <td>
                      {o.customerName}
                      <small>{o.mobileNumber}</small>
                    </td>
                    <td>{date(o.createdAt)}</td>
                    <td>
                      {o.billedAt ? money(o.finalAmount) : 'Bill pending'}
                    </td>
                    <td>
                      <Status status={o.status} />
                    </td>
                    <td>
                      <button
                        className="text-link"
                        onClick={() => setSelected(o.id!)}
                      >
                        Review
                        <ArrowUpRight size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager
            page={page}
            total={q.data.pagination.totalPages}
            onChange={setPage}
          />
        </>
      ) : (
        <Empty title={`No ${status.toLowerCase()} orders.`}>
          <p>Orders in this state will appear here.</p>
        </Empty>
      )}
      {selected && (
        <Modal title="Order workspace" onClose={() => setSelected(null)}>
          <OrderEditor id={selected} />
        </Modal>
      )}
    </>
  );
}

function OrderEditor({ id }: { id: string }) {
  const q = useQuery({
    queryKey: ['admin', 'order', id],
    queryFn: () => api<{ order: Order }>(`/admin/orders/${id}`),
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });
  return q.isPending ? (
    <Loading />
  ) : q.error ? (
    <ErrorState error={q.error} retry={() => q.refetch()} />
  ) : q.data ? (
    <Bill
      key={`${id}-${q.data.order.billingVersion}-${q.data.order.status}`}
      order={q.data.order}
      reload={() => q.refetch()}
    />
  ) : null;
}

function Bill({ order: o, reload }: { order: Order; reload: () => void }) {
  const [medicines, setMedicines] = useState(
      o.medicines.map((i) => ({ ...i })),
    ),
    [products, setProducts] = useState(o.products.map((i) => ({ ...i }))),
    [discount, setDiscount] = useState(o.discount ?? 0),
    [reason, setReason] = useState(''),
    [conflict, setConflict] = useState(false);
  const qc = useQueryClient();

  const m = useMutation({
    mutationFn: async (action: string) => {
      if (action === 'billing')
        return send<{ order: Order }>(
          `/admin/orders/${o.id}/billing`,
          {
            billingVersion: o.billingVersion,
            discount,
            medicines: medicines.map(
              ({ _id, name, quantity, price, isAvailable }) => ({
                _id,
                name,
                quantity,
                price,
                isAvailable: isAvailable !== false,
              }),
            ),
            products: products.map(
              ({ _id, productId, name, quantity, price }) => ({
                _id,
                productId,
                name,
                quantity,
                price,
              }),
            ),
          },
          'PATCH',
        );
      if (action === 'cancel')
        return send<{ order: Order }>(
          `/admin/orders/${o.id}/cancel`,
          { cancelReason: reason.trim() },
          'PATCH',
        );
      return send<{ order: Order }>(
        `/admin/orders/${o.id}/deliver`,
        undefined,
        'PATCH',
      );
    },
    onSuccess: (data) => {
      qc.setQueryData(['admin', 'order', o.id], data);
      qc.invalidateQueries({ queryKey: ['admin', 'orders'] });
      qc.invalidateQueries({ queryKey: ['admin', 'analytics'] });
    },
    onError: (e) => {
      if (e instanceof ApiError && e.status === 409) setConflict(true);
    },
  });

  const locked = m.isPending || o.status !== 'Pending' || conflict;

  function rows(lines: Line[], set: (v: Line[]) => void, isMedicine: boolean) {
    return lines.map((i, index) => (
      <div className="bill-row" key={i._id ?? index}>
        <span>{i.name}</span>
        <label>
          Qty
          <input
            type="number"
            required
            min="1"
            max="100"
            value={i.quantity}
            onChange={(e) =>
              set(
                lines.map((v, j) =>
                  j === index ? { ...v, quantity: Number(e.target.value) } : v,
                ),
              )
            }
          />
        </label>
        <label>
          Price ₹
          <input
            type="number"
            required
            min="0"
            step="0.01"
            value={i.price}
            onChange={(e) =>
              set(
                lines.map((v, j) =>
                  j === index ? { ...v, price: Number(e.target.value) } : v,
                ),
              )
            }
          />
        </label>
        {isMedicine ? (
          <label className="checkbox">
            <input
              type="checkbox"
              checked={i.isAvailable !== false}
              onChange={(e) =>
                set(
                  lines.map((v, j) =>
                    j === index ? { ...v, isAvailable: e.target.checked } : v,
                  ),
                )
              }
            />
            Available
          </label>
        ) : (
          <button
            className="icon-button"
            type="button"
            aria-label={`Remove ${i.name}`}
            onClick={() => set(lines.filter((_, j) => j !== index))}
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    ));
  }

  return (
    <>
      <div className="section-head">
        <h3>{o.orderId}</h3>
        <Status status={o.status} />
      </div>
      <p>
        {o.customerName} · {o.mobileNumber}
      </p>
      <p>
        {o.address?.flat}, {o.address?.area}, {o.address?.landmark}
      </p>
      {o.prescriptionUrl && (
        <p className="notice">
          Prescription attached. Secure preview is pending an authorized backend
          preview endpoint.
        </p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          m.mutate('billing');
        }}
      >
        <fieldset disabled={locked}>
          <h3>Billing lines</h3>
          {rows(medicines, setMedicines, true)}
          {rows(products, setProducts, false)}
          <label>
            Discount (₹)
            <input
              type="number"
              min="0"
              max="1000000"
              step="0.01"
              required
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value))}
            />
          </label>
          <p className="fine-print">
            Version {o.billingVersion}. Totals, stock adjustments, and offers
            are calculated by the backend.
          </p>
          <button className="btn">
            <Save size={17} />
            Save bill
          </button>
        </fieldset>
      </form>
      <div className="summary-total">
        <span>{o.billedAt ? 'Saved final bill' : 'Awaiting billing'}</span>
        <strong>{o.billedAt ? money(o.finalAmount) : '—'}</strong>
      </div>
      {m.error && <ErrorState error={m.error} />}{' '}
      {conflict && (
        <div className="notice">
          This order changed or the operation conflicted. Your draft has been
          kept.{' '}
          <button
            className="text-link"
            onClick={() => {
              if (
                window.confirm('Discard this draft and load the latest order?')
              ) {
                setConflict(false);
                reload();
              }
            }}
          >
            Discard draft & reload latest
          </button>
        </div>
      )}
      {o.status === 'Pending' && (
        <>
          <button
            className="btn full"
            disabled={locked || !o.billedAt}
            onClick={() => {
              if (window.confirm('Confirm this order has been delivered?'))
                m.mutate('deliver');
            }}
          >
            Mark delivered
          </button>
          <label>
            Cancellation reason
            <input
              maxLength={300}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={locked}
            />
          </label>
          <button
            className="btn danger"
            disabled={locked || !reason.trim()}
            onClick={() => {
              if (
                window.confirm('Cancel this order and restore eligible stock?')
              )
                m.mutate('cancel');
            }}
          >
            Cancel order
          </button>
        </>
      )}
    </>
  );
}

// function AdminProducts() {
//   const [page, setPage] = useState(1),
//     [search, setSearch] = useState(''),
//     [query, setQuery] = useState(''),
//     [edit, setEdit] = useState<Product | true | null>(null);
//   const qc = useQueryClient();

//   const q = useQuery({
//     queryKey: ['admin', 'products', page, query],
//     queryFn: () =>
//       api<{ products: Product[]; pagination?: Pagination }>(
//         `/admin/products?page=${page}&limit=20&q=${encodeURIComponent(query)}`,
//       ),
//   });

//   const del = useMutation({
//     mutationFn: (id: string) =>
//       send(`/admin/products/${id}`, undefined, 'DELETE'),
//     onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'products'] }),
//   });

//   return (
//     <>
//       <PageHeading title="A well-kept shelf." eyebrow="CATALOG & INVENTORY" />
//       <div className="section-head">
//         <form
//           className="search-field"
//           onSubmit={(e) => {
//             e.preventDefault();
//             setQuery(search);
//             setPage(1);
//           }}
//         >
//           <Search size={18} />
//           <input
//             placeholder="Search products"
//             aria-label="Search products"
//             value={search}
//             maxLength={80}
//             onChange={(e) => setSearch(e.target.value)}
//           />
//           <button className="text-link">Search</button>
//         </form>
//         <button className="btn" onClick={() => setEdit(true)}>
//           <Plus size={17} />
//           Add product
//         </button>
//       </div>
//       {del.error && <ErrorState error={del.error} />}{' '}
//       {q.isPending ? (
//         <TableSkeleton rows={5} />
//       ) : q.error ? (
//         <ErrorState error={q.error} retry={() => q.refetch()} />
//       ) : q.data?.products.length ? (
//         <>
//           <div className="table-wrap panel">
//             <table>
//               <thead>
//                 <tr>
//                   <th>Product</th>
//                   <th>Category</th>
//                   <th>Price</th>
//                   <th>Stock</th>
//                   <th>Actions</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {q.data.products.map((p) => (
//                   <tr key={productId(p)}>
//                     <td>
//                       <strong>{p.name}</strong>
//                       <small>{p.isActive ? 'Active' : 'Hidden'}</small>
//                     </td>
//                     <td>{p.category}</td>
//                     <td>{money(p.price)}</td>
//                     <td>
//                       {p.trackStock
//                         ? `${p.stockQuantity} units`
//                         : p.inStock
//                           ? 'Available'
//                           : 'Unavailable'}
//                     </td>
//                     <td>
//                       <button className="text-link" onClick={() => setEdit(p)}>
//                         Edit
//                       </button>
//                       <button
//                         className="icon-button"
//                         aria-label={`Delete ${p.name}`}
//                         disabled={del.isPending}
//                         onClick={() => {
//                           if (window.confirm(`Permanently delete ${p.name}?`))
//                             del.mutate(productId(p));
//                         }}
//                       >
//                         <Trash2 size={16} />
//                       </button>
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//           <Pager
//             page={page}
//             total={q.data.pagination?.totalPages ?? page}
//             onChange={setPage}
//           />
//         </>
//       ) : (
//         <Empty title="Your catalog starts here.">
//           <p>Add a product to put it on your shelf.</p>
//         </Empty>
//       )}
//       {edit && (
//         <Modal
//           title={edit === true ? 'Add a product' : 'Edit product'}
//           onClose={() => setEdit(null)}
//         >
//           <ProductForm
//             product={edit === true ? undefined : edit}
//             done={() => setEdit(null)}
//           />
//         </Modal>
//       )}
//     </>
//   );
// }
function AdminProducts() {
  const [page, setPage] = useState(1),
    [search, setSearch] = useState(''),
    [query, setQuery] = useState(''),
    [edit, setEdit] = useState<Product | true | null>(null);
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ['admin', 'products', page, query],
    queryFn: () =>
      api<{ products: Product[]; pagination?: Pagination }>(
        `/admin/products?page=${page}&limit=20&q=${encodeURIComponent(query)}`,
      ),
  });

  const settingsQuery = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: () => api<{ settings: Settings }>('/admin/settings'),
  });

  const trendingIds = settingsQuery.data?.settings.trendingProducts ?? [];
  const trendingLimit = settingsQuery.data?.settings.trendingLimit ?? 4;

  const toggleTrending = useMutation({
    mutationFn: (nextTrending: string[]) =>
      send('/admin/settings', { trendingProducts: nextTrending }, 'PATCH'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'settings'] });
      qc.invalidateQueries({ queryKey: ['public', 'trending'] });
    },
  });

  const del = useMutation({
    mutationFn: (id: string) =>
      send(`/admin/products/${id}`, undefined, 'DELETE'),
    onSuccess: (_data, deletedId) => {
      qc.invalidateQueries({ queryKey: ['admin', 'products'] });
      qc.invalidateQueries({ queryKey: ['public'] });
      if (trendingIds.includes(deletedId)) {
        toggleTrending.mutate(trendingIds.filter((id) => id !== deletedId));
      }
    },
  });

  const handleToggleTrending = (id: string) => {
    const isTrending = trendingIds.includes(id);
    if (!isTrending && trendingIds.length >= 20) {
      window.alert('You can select up to 20 trending products.');
      return;
    }
    const next = isTrending
      ? trendingIds.filter((item) => item !== id)
      : [...trendingIds, id];
    toggleTrending.mutate(next);
  };

  return (
    <>
      <PageHeading title="A well-kept shelf." eyebrow="CATALOG & INVENTORY" />
      <div className="section-head">
        <form
          className="search-field"
          onSubmit={(e) => {
            e.preventDefault();
            setQuery(search);
            setPage(1);
          }}
        >
          <Search size={18} />
          <input
            placeholder="Search products"
            aria-label="Search products"
            value={search}
            maxLength={80}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="text-link">Search</button>
        </form>
        <button className="btn" onClick={() => setEdit(true)}>
          <Plus size={17} />
          Add product
        </button>
      </div>
      <p className="fine-print">
        Trending selected: <strong>{trendingIds.length}</strong> / 20 · Showing up to{' '}
        <strong>{trendingLimit}</strong> on homepage (change limit in Settings).
      </p>
      {del.error && <ErrorState error={del.error} />}{' '}
      {toggleTrending.error && <ErrorState error={toggleTrending.error} />}{' '}
      {q.isPending ? (
        <TableSkeleton rows={5} />
      ) : q.error ? (
        <ErrorState error={q.error} retry={() => q.refetch()} />
      ) : q.data?.products.length ? (
        <>
          <div className="table-wrap panel">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Homepage</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {q.data.products.map((p) => {
                  const id = productId(p);
                  const isTrending = trendingIds.includes(id);
                  return (
                    <tr key={id}>
                      <td>
                        <strong>{p.name}</strong>
                        <small>{p.isActive ? 'Active' : 'Hidden'}</small>
                      </td>
                      <td>{p.category}</td>
                      <td>{money(p.price)}</td>
                      <td>
                        {p.trackStock
                          ? `${p.stockQuantity} units`
                          : p.inStock
                            ? 'Available'
                            : 'Unavailable'}
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`btn small ${isTrending ? '' : 'secondary'}`}
                          disabled={toggleTrending.isPending || settingsQuery.isPending}
                          onClick={() => handleToggleTrending(id)}
                        >
                          {isTrending ? '★ Trending' : '+ Add to trending'}
                        </button>
                      </td>
                      <td>
                        <button className="text-link" onClick={() => setEdit(p)}>
                          Edit
                        </button>
                        <button
                          className="icon-button"
                          aria-label={`Delete ${p.name}`}
                          disabled={del.isPending}
                          onClick={() => {
                            if (window.confirm(`Permanently delete ${p.name}?`))
                              del.mutate(id);
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pager
            page={page}
            total={q.data.pagination?.totalPages ?? page}
            onChange={setPage}
          />
        </>
      ) : (
        <Empty title="Your catalog starts here.">
          <p>Add a product to put it on your shelf.</p>
        </Empty>
      )}
      {edit && (
        <Modal
          title={edit === true ? 'Add a product' : 'Edit product'}
          onClose={() => setEdit(null)}
        >
          <ProductForm
            product={edit === true ? undefined : edit}
            done={() => setEdit(null)}
          />
        </Modal>
      )}
    </>
  );
}

function ProductForm({
  product: p,
  done,
}: {
  product?: Product;
  done: () => void;
}) {
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      send(
        p ? `/admin/products/${productId(p)}` : '/admin/products',
        body,
        p ? 'PUT' : 'POST',
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'products'] });
      qc.invalidateQueries({ queryKey: ['public'] });
      done();
    },
  });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        m.mutate({
          name: f.get('name'),
          category: f.get('category'),
          description: f.get('description'),
          price: Number(f.get('price')),
          imageUrl: f.get('imageUrl'),
          kind: f.get('kind'),
          stockQuantity: Number(f.get('stockQuantity')),
          isActive: f.has('isActive'),
          inStock: f.has('inStock'),
          trackStock: f.has('trackStock'),
        });
      }}
    >
      <fieldset disabled={m.isPending}>
        <div className="form-grid">
          {['name', 'category', 'price', 'stockQuantity'].map((k) => (
            <label key={k}>
              {
                (
                  {
                    name: 'Product name',
                    category: 'Category',
                    price: 'Price (₹)',
                    stockQuantity: 'Stock quantity',
                  } as Record<string, string>
                )[k]
              }
              <input
                name={k}
                required
                type={
                  ['price', 'stockQuantity'].includes(k) ? 'number' : 'text'
                }
                min={['price', 'stockQuantity'].includes(k) ? 0 : undefined}
                minLength={['name', 'category'].includes(k) ? 2 : undefined}
                step={k === 'price' ? '0.01' : '1'}
                maxLength={k === 'category' ? 60 : 120}
                defaultValue={String(
                  p?.[k as keyof Product] ??
                    (['price', 'stockQuantity'].includes(k) ? 0 : ''),
                )}
              />
            </label>
          ))}
        </div>
        <label>
          Description
          <textarea
            name="description"
            maxLength={500}
            defaultValue={p?.description}
          />
        </label>
        <label>
          Public product image URL
          <input name="imageUrl" type="url" defaultValue={p?.imageUrl} />
        </label>
        <p className="fine-print">
          Use an existing public product image. Prescription-upload signatures
          must not be reused for catalog images.
        </p>
        <label>
          Product classification
          <select name="kind" defaultValue={p?.kind ?? 'non_medicine'}>
            <option value="non_medicine">Non-medicine</option>
            <option value="medicine">Medicine</option>
          </select>
        </label>
        {(['isActive', 'inStock', 'trackStock'] as const).map((k) => (
          <label className="checkbox" key={k}>
            <input
              type="checkbox"
              name={k}
              defaultChecked={p?.[k] ?? k !== 'trackStock'}
            />
            {
              {
                isActive: 'Visible in catalog',
                inStock: 'Available to order',
                trackStock: 'Track stock quantity',
              }[k]
            }
          </label>
        ))}
        {m.error && <ErrorState error={m.error} />}
        <button className="btn full">
          {m.isPending ? 'Saving…' : 'Save product'}
        </button>
      </fieldset>
    </form>
  );
}

function Customers() {
  const [page, setPage] = useState(1),
    [search, setSearch] = useState(''),
    [qtext, setQtext] = useState('');

  const q = useQuery({
    queryKey: ['admin', 'customers', page, qtext],
    queryFn: () =>
      api<{
        customers: {
          id?: string;
          email: string;
          fullName: string;
          totalOrders: number;
          deliveredOrders: number;
        }[];
        pagination: Pagination;
      }>(
        `/admin/customers?page=${page}&limit=20&q=${encodeURIComponent(qtext)}`,
      ),
  });

  return (
    <>
      <PageHeading
        title="The people behind every order."
        eyebrow="YOUR CUSTOMERS"
      />
      <form
        className="search-field"
        onSubmit={(e) => {
          e.preventDefault();
          setQtext(search);
          setPage(1);
        }}
      >
        <Search size={18} />
        <input
          aria-label="Search customers"
          placeholder="Search by name or email"
          value={search}
          maxLength={80}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="text-link">Search</button>
      </form>
      {q.isPending ? (
        <TableSkeleton rows={5} />
      ) : q.error ? (
        <ErrorState error={q.error} retry={() => q.refetch()} />
      ) : q.data?.customers.length ? (
        <>
          <div className="table-wrap panel">
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Email</th>
                  <th>Total orders</th>
                  <th>Delivered</th>
                </tr>
              </thead>
              <tbody>
                {q.data.customers.map((c) => (
                  <tr key={c.id ?? c.email}>
                    <td>{c.fullName || 'Name not provided'}</td>
                    <td>{c.email}</td>
                    <td>{c.totalOrders}</td>
                    <td>{c.deliveredOrders}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager
            page={page}
            total={q.data.pagination.totalPages}
            onChange={setPage}
          />
        </>
      ) : (
        <Empty title="No customers found." />
      )}
    </>
  );
}

function AdminSettings() {
  const q = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: () => api<{ settings: Settings }>('/admin/settings'),
    refetchOnWindowFocus: false,
  });
  return (
    <>
      <PageHeading
        title="The details that make a difference."
        eyebrow="PHARMACY SETTINGS"
      />
      {q.isPending ? (
        <Loading />
      ) : q.error ? (
        <ErrorState error={q.error} retry={() => q.refetch()} />
      ) : (
        q.data && <SettingsForm settings={q.data.settings} />
      )}
    </>
  );
}

// function SettingsForm({ settings: s }: { settings: Settings }) {
//   const qc = useQueryClient();
//   const [saved, setSaved] = useState(false);
//   const m = useMutation({
//     mutationFn: (body: unknown) => send('/admin/settings', body, 'PATCH'),
//     onSuccess: () => {
//       setSaved(true);
//       qc.invalidateQueries({ queryKey: ['admin', 'settings'] });
//       qc.invalidateQueries({ queryKey: ['public', 'settings'] });
//     },
//   });
//   return (
//     <form
//       className="panel settings-form"
//       onChange={() => setSaved(false)}
//       onSubmit={(e) => {
//         e.preventDefault();
//         const f = new FormData(e.currentTarget);
//         m.mutate({
//           deliveryCharge: Number(f.get('deliveryCharge')),
//           firstOrderMinimumMedicineAmount: Number(
//             f.get('firstOrderMinimumMedicineAmount'),
//           ),
//           lowStockThreshold: Number(f.get('lowStockThreshold')),
//           firstOrderOfferEnabled: f.has('firstOrderOfferEnabled'),
//         });
//       }}
//     >
//       <fieldset disabled={m.isPending}>
//         <h2>Delivery & offers</h2>
//         <label>
//           Delivery charge (₹)
//           <input
//             type="number"
//             name="deliveryCharge"
//             min="0"
//             max="2000"
//             step="0.01"
//             required
//             defaultValue={s.deliveryCharge}
//           />
//         </label>
//         <label className="checkbox">
//           <input
//             type="checkbox"
//             name="firstOrderOfferEnabled"
//             defaultChecked={s.firstOrderOfferEnabled}
//           />
//           Enable first-order gift offer
//         </label>
//         <label>
//           Minimum medicine subtotal for gift (₹)
//           <input
//             type="number"
//             name="firstOrderMinimumMedicineAmount"
//             min="0"
//             max="1000000"
//             step="0.01"
//             required
//             defaultValue={s.firstOrderMinimumMedicineAmount}
//           />
//         </label>
//         <p className="fine-print">
//           Only medicine subtotal counts. Non-medicine products and delivery are
//           excluded.
//         </p>
//         <label>
//           Low-stock alert threshold
//           <input
//             type="number"
//             name="lowStockThreshold"
//             min="0"
//             step="1"
//             required
//             defaultValue={s.lowStockThreshold ?? 0}
//           />
//         </label>
//         {m.error && <ErrorState error={m.error} />}{' '}
//         {saved && (
//           <p role="status" className="success-text">
//             Settings saved.
//           </p>
//         )}
//         <button className="btn">
//           <Save size={17} />
//           {m.isPending ? 'Saving…' : 'Save settings'}
//         </button>
//       </fieldset>
//     </form>
//   );
// }
function SettingsForm({ settings: s }: { settings: Settings }) {
  const qc = useQueryClient();
  const [saved, setSaved] = useState(false);
  const m = useMutation({
    mutationFn: (body: unknown) => send('/admin/settings', body, 'PATCH'),
    onSuccess: () => {
      setSaved(true);
      qc.invalidateQueries({ queryKey: ['admin', 'settings'] });
      qc.invalidateQueries({ queryKey: ['public', 'settings'] });
      qc.invalidateQueries({ queryKey: ['public', 'trending'] });
    },
  });
  return (
    <form
      className="panel settings-form"
      onChange={() => setSaved(false)}
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        m.mutate({
          deliveryCharge: Number(f.get('deliveryCharge')),
          firstOrderMinimumMedicineAmount: Number(
            f.get('firstOrderMinimumMedicineAmount'),
          ),
          lowStockThreshold: Number(f.get('lowStockThreshold')),
          trendingLimit: Number(f.get('trendingLimit')),
          firstOrderOfferEnabled: f.has('firstOrderOfferEnabled'),
        });
      }}
    >
      <fieldset disabled={m.isPending}>
        <h2>Delivery & offers</h2>
        <label>
          Delivery charge (₹)
          <input
            type="number"
            name="deliveryCharge"
            min="0"
            max="2000"
            step="0.01"
            required
            defaultValue={s.deliveryCharge}
          />
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            name="firstOrderOfferEnabled"
            defaultChecked={s.firstOrderOfferEnabled}
          />
          Enable first-order gift offer
        </label>
        <label>
          Minimum medicine subtotal for gift (₹)
          <input
            type="number"
            name="firstOrderMinimumMedicineAmount"
            min="0"
            max="1000000"
            step="0.01"
            required
            defaultValue={s.firstOrderMinimumMedicineAmount}
          />
        </label>
        <p className="fine-print">
          Only medicine subtotal counts. Non-medicine products and delivery are
          excluded.
        </p>
        <label>
          Low-stock alert threshold
          <input
            type="number"
            name="lowStockThreshold"
            min="0"
            step="1"
            required
            defaultValue={s.lowStockThreshold ?? 0}
          />
        </label>
        <label>
          Homepage trending products limit (1–20)
          <input
            type="number"
            name="trendingLimit"
            min="1"
            max="20"
            step="1"
            required
            defaultValue={s.trendingLimit ?? 4}
          />
        </label>
        <p className="fine-print">
          Controls how many selected trending products appear on the homepage.
        </p>
        {m.error && <ErrorState error={m.error} />}{' '}
        {saved && (
          <p role="status" className="success-text">
            Settings saved.
          </p>
        )}
        <button className="btn">
          <Save size={17} />
          {m.isPending ? 'Saving…' : 'Save settings'}
        </button>
      </fieldset>
    </form>
  );
}
function Logs() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['admin', 'logs'],
    queryFn: () =>
      api<{
        logs: {
          _id: string;
          type: string;
          message: string;
          createdAt: string;
        }[];
      }>('/admin/logs'),
  });

  const m = useMutation({
    mutationFn: (id: string) =>
      send(`/admin/logs${id === 'all' ? '' : `/${id}`}`, undefined, 'DELETE'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'logs'] }),
  });

  return (
    <>
      <PageHeading
        title="Keep an eye on the essentials."
        eyebrow="SYSTEM LOGS"
      />
      <div className="section-head">
        <p>Newest 100 events · Raw error context is not displayed.</p>
        <button
          className="btn danger small"
          disabled={m.isPending || !q.data?.logs.length}
          onClick={() => {
            if (window.confirm('Permanently clear all system logs?'))
              m.mutate('all');
          }}
        >
          Clear all logs
        </button>
      </div>
      {m.error && <ErrorState error={m.error} />}{' '}
      {q.isPending ? (
        <TableSkeleton rows={5} />
      ) : q.error ? (
        <ErrorState error={q.error} retry={() => q.refetch()} />
      ) : q.data?.logs.length ? (
        <div className="panel">
          {q.data.logs.map((l) => (
            <div className="saved-row" key={l._id}>
              <Activity size={19} />
              <div>
                <strong>
                  {l.type === 'inventory_alert'
                    ? 'Inventory alert'
                    : 'System event'}
                </strong>
                <p>{date(l.createdAt)}</p>
              </div>
              <button
                className="icon-button"
                aria-label="Delete log"
                disabled={m.isPending}
                onClick={() => {
                  if (window.confirm('Delete this event?')) m.mutate(l._id);
                }}
              >
                <Trash2 size={17} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <Empty title="No system events to show." />
      )}
    </>
  );
}
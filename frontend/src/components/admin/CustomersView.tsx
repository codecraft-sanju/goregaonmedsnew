'use client';

import { useEffect, useState } from 'react';
import { Search, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { adminRequest } from '@/lib/adminApi';
import { formatMobile } from '@/lib/format';
import type { CustomerSummary, Pagination } from '@/lib/types';

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
                  {data.customers.map((customer) => (
                    <tr key={customer.mobileNumber}>
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
              {data.customers.map((customer) => (
                <li key={customer.mobileNumber} className="card p-4 text-sm">
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

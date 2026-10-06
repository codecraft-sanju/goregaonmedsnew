"use client";
import { useEffect, useState } from "react";
import { Search, Phone, Gift } from "lucide-react";
import { api, message, type Customer, type Pagination } from "@/lib/api";
import { Button, Empty, Field, Notice, Pager, Sheet, Skeleton } from "@/app/ui";
export default function CustomersPage() {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{
    customers: Customer[];
    pagination: Pagination;
  } | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Customer | null>(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const c = new AbortController();
    setBusy(true);
    setError("");
    api<{ customers: Customer[]; pagination: Pagination }>(
      `/admin/customers?q=${encodeURIComponent(query)}&page=${page}&limit=20`,
      { signal: c.signal },
    )
      .then(setData)
      .catch((e) => {
        if (!c.signal.aborted) setError(message(e));
      })
      .finally(() => {
        if (!c.signal.aborted) setBusy(false);
      });
    return () => c.abort();
  }, [query, page, revision]);
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow mb-3">People behind the orders</p>
        <h1 className="title">Your neighbourhood.</h1>
        <p className="muted mt-3">Customer records and their care journey.</p>
      </div>
      <form
        className="card flex flex-col items-stretch gap-3 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setQuery(input.trim());
          setRevision((n) => n + 1);
        }}
      >
        <Field
          className="flex-1"
          label="Search customers"
          placeholder="Name or mobile number"
          maxLength={80}
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <Button type="submit" busy={busy}>
          <Search size={17} />
          Search
        </Button>
      </form>
      {error && <Notice>{error}</Notice>}
      {busy ? (
        <Skeleton />
      ) : data?.customers.length ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.customers.map((c) => (
              <button
                key={c.mobileNumber}
                onClick={() => setSelected(c)}
                className="card text-left transition hover:border-brand/25"
              >
                <span className="mb-4 grid size-12 place-items-center rounded-2xl bg-mint text-lg text-brand">
                  {c.fullName.slice(0, 1).toUpperCase()}
                </span>
                <h2 className="font-semibold">{c.fullName}</h2>
                <p className="muted mt-1">{c.mobileNumber}</p>
                <div className="mt-5 flex justify-between border-t border-slate-100 pt-4 text-xs">
                  <span>{c.totalOrders} orders</span>
                  <span className="text-brand">
                    {c.deliveredOrders} delivered
                  </span>
                </div>
                {c.isFirstTimeCustomer && (
                  <p className="mt-3 text-xs text-brand">First-time customer</p>
                )}
              </button>
            ))}
          </div>
          <Pager pagination={data.pagination} onPage={setPage} />
        </>
      ) : (
        <Empty title="No customers found">
          Try a different name or mobile number.
        </Empty>
      )}
      <Sheet
        title="Customer details"
        open={!!selected}
        onClose={() => setSelected(null)}
      >
        {selected && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">{selected.fullName}</h2>
            <a
              className="flex items-center gap-2 text-brand"
              href={`tel:${selected.mobileNumber}`}
            >
              <Phone size={18} />
              {selected.mobileNumber}
            </a>
            <div className="grid grid-cols-2 gap-4">
              <div className="card">
                <p className="muted">Total orders</p>
                <p className="mt-2 text-3xl font-semibold">
                  {selected.totalOrders}
                </p>
              </div>
              <div className="card">
                <p className="muted">Delivered</p>
                <p className="mt-2 text-3xl font-semibold">
                  {selected.deliveredOrders}
                </p>
              </div>
            </div>
            <Notice tone="info">
              <Gift className="mb-2" size={19} />
              {selected.offerClaimed
                ? `Gift claimed${selected.offerClaimedOrderId ? ` with ${selected.offerClaimedOrderId}` : ""}.`
                : "No first-order gift claimed."}
            </Notice>
          </div>
        )}
      </Sheet>
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import { IndianRupee, ShoppingBag, PackageCheck, Clock3 } from "lucide-react";
import { api, message, money } from "@/lib/api";
import { Button, Field, Notice, Skeleton } from "@/app/ui";
type Overview = {
  totalSales: number;
  totalOrders: number;
  breakdown: { pending: number; delivered: number };
};
function today() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
export default function AnalyticsPage() {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [range, setRange] = useState<{ start: string; end: string } | null>(
    null,
  );
  const [data, setData] = useState<Overview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const t = today();
    const start = t.slice(0, 8) + "01";
    setStart(start);
    setEnd(t);
    setRange({ start, end: t });
  }, []);
  useEffect(() => {
    if (!range) return;
    const c = new AbortController();
    setBusy(true);
    setError("");
    api<Overview>(
      `/admin/analytics/overview?startDate=${range.start}&endDate=${range.end}`,
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
  }, [range]);
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow mb-3">A clearer view of your pharmacy</p>
        <h1 className="title">Care, by the numbers.</h1>
        <p className="muted mt-3">
          Orders created in your selected date range.
        </p>
      </div>
      <form
        className="card grid items-end gap-4 sm:grid-cols-[1fr_1fr_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          if (!start || !end || start > end) {
            setError(
              "Choose a valid range; the start date must be before the end date.",
            );
            return;
          }
          setRange({ start, end });
        }}
      >
        <Field
          label="From"
          type="date"
          value={start}
          required
          onChange={(e) => setStart(e.target.value)}
        />
        <Field
          label="To"
          type="date"
          value={end}
          required
          min={start}
          onChange={(e) => setEnd(e.target.value)}
        />
        <Button type="submit" busy={busy}>
          Apply dates
        </Button>
      </form>
      {error && <Notice>{error}</Notice>}
      {busy ? (
        <Skeleton />
      ) : (
        data && (
          <>
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
              {[
                {
                  label: "Sales from delivered orders",
                  value: money(data.totalSales),
                  icon: IndianRupee,
                },
                {
                  label: "Total orders",
                  value: String(data.totalOrders),
                  icon: ShoppingBag,
                },
                {
                  label: "Pending",
                  value: String(data.breakdown.pending),
                  icon: Clock3,
                },
                {
                  label: "Delivered",
                  value: String(data.breakdown.delivered),
                  icon: PackageCheck,
                },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="card">
                  <Icon className="mb-6 text-brand" size={24} />
                  <p className="text-2xl font-semibold tracking-tight sm:text-3xl">
                    {value}
                  </p>
                  <p className="muted mt-2 text-xs">{label}</p>
                </div>
              ))}
            </div>
            <section className="card">
              <h2 className="text-lg font-semibold">Order mix</h2>
              <p className="muted mt-2">
                Current status of orders created within the range.
              </p>
              {data.totalOrders === 0 ? (
                <p className="mt-6 text-sm text-muted">
                  No orders in this range.
                </p>
              ) : (
                <div className="mt-6 space-y-4">
                  {[
                    {
                      label: "Delivered",
                      value: data.breakdown.delivered,
                      color: "bg-brand",
                    },
                    {
                      label: "Pending",
                      value: data.breakdown.pending,
                      color: "bg-amber-400",
                    },
                    {
                      label: "Cancelled (calculated)",
                      value: Math.max(
                        0,
                        data.totalOrders -
                          data.breakdown.pending -
                          data.breakdown.delivered,
                      ),
                      color: "bg-rose-300",
                    },
                  ].map(({ label, value, color }) => (
                    <div key={label}>
                      <div className="mb-2 flex justify-between text-sm">
                        <span>{label}</span>
                        <span>
                          {value} ·{" "}
                          {Math.round((value / data.totalOrders) * 100)}%
                        </span>
                      </div>
                      <progress
                        className={`h-2 w-full overflow-hidden rounded-full ${color === "bg-brand" ? "accent-[#156253]" : color === "bg-amber-400" ? "accent-amber-400" : "accent-rose-300"}`}
                        value={value}
                        max={data.totalOrders}
                        aria-label={label}
                      />
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )
      )}
      <Notice tone="info">
        Sales are attributed to the order’s creation date, not its delivery
        date. Date boundaries follow the backend server’s timezone. Cancelled
        counts are calculated from the returned total.
      </Notice>
    </div>
  );
}

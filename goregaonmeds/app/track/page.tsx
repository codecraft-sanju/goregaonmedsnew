"use client";
import { useEffect, useState } from "react";
import { Route, PackageCheck, Clock3, XCircle } from "lucide-react";
import { api, date, message, rememberIds, type PublicOrder } from "@/lib/api";
import { Button, Field, Notice, OrderReceipt, Skeleton } from "../ui";
export default function TrackPage() {
  const [id, setId] = useState("");
  const [last4, setLast4] = useState("");
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("orderId");
    if (id) setId(id);
    try {
      const saved = JSON.parse(
        sessionStorage.getItem("gm:last-order") || "null",
      );
      if (saved && (!id || saved.orderId === id)) {
        setId(saved.orderId);
        setLast4(saved.mobileLast4);
      }
    } catch {}
  }, []);
  async function track(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setOrder(null);
    if (
      !/^GMED-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/.test(
        id.trim().toUpperCase(),
      ) ||
      !/^\d{4}$/.test(last4)
    ) {
      setError(
        "Enter a valid GMED Order ID and the last four digits of your mobile number.",
      );
      return;
    }
    setBusy(true);
    try {
      const d = await api<{ order: PublicOrder }>("/orders/track", {
        method: "POST",
        body: { orderId: id.trim().toUpperCase(), mobileLast4: last4 },
      });
      setOrder(d.order);
      rememberIds([d.order.orderId]);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  const Icon =
    order?.status === "Delivered"
      ? PackageCheck
      : order?.status === "Cancelled"
        ? XCircle
        : Clock3;
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="eyebrow mb-3">Every step, a little clearer</p>
        <h1 className="title">Your care, on track.</h1>
        <p className="muted mt-3">
          Check your order’s latest status and confirmed bill.
        </p>
      </div>
      <form onSubmit={track} className="card space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Order ID"
            placeholder="GMED-XXXXXX"
            value={id}
            maxLength={11}
            required
            onChange={(e) => setId(e.target.value.toUpperCase())}
          />
          <Field
            label="Last 4 mobile digits"
            inputMode="numeric"
            pattern="[0-9]{4}"
            maxLength={4}
            placeholder="1234"
            value={last4}
            required
            onChange={(e) => setLast4(e.target.value.replace(/\D/g, ""))}
          />
        </div>
        <Button type="submit" busy={busy}>
          <Route size={18} />
          Check status
        </Button>
      </form>
      {error && <Notice>{error}</Notice>}
      {busy && <Skeleton />}
      {order && (
        <section className="card space-y-6">
          <div className="flex items-center gap-4 rounded-2xl bg-mint/60 p-5">
            <Icon className="shrink-0 text-brand" size={30} />
            <div>
              <h2 className="font-semibold">{order.statusLabel}</h2>
              <p className="muted mt-1">Placed {date(order.placedAt)}</p>
              {order.deliveredAt && (
                <p className="muted">Delivered {date(order.deliveredAt)}</p>
              )}
            </div>
          </div>
          <OrderReceipt order={order} />
        </section>
      )}
    </div>
  );
}

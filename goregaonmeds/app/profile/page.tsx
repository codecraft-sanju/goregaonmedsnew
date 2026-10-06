"use client";
import { useEffect, useState } from "react";
import { History, RotateCcw, Smartphone, Trash2 } from "lucide-react";
import {
  api,
  date,
  message,
  normalizeMobile,
  rememberIds,
  savedIds,
  type PublicOrder,
} from "@/lib/api";
import {
  Button,
  Empty,
  Field,
  Notice,
  OrderReceipt,
  Sheet,
  Skeleton,
  StatusBadge,
} from "../ui";
export default function ProfilePage() {
  const [orders, setOrders] = useState<PublicOrder[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [recover, setRecover] = useState(false);
  const [number, setNumber] = useState("");
  const [id, setId] = useState("");
  const [recovering, setRecovering] = useState(false);
  const [selected, setSelected] = useState<PublicOrder | null>(null);
  const [clear, setClear] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const c = new AbortController();
    setBusy(true);
    setError("");
    const ids = savedIds();
    if (!ids.length) {
      setOrders([]);
      setBusy(false);
      return;
    }
    api<{ orders: PublicOrder[] }>("/orders/history", {
      method: "POST",
      body: { orderIds: ids },
      signal: c.signal,
    })
      .then((d) => setOrders(d.orders))
      .catch((e) => {
        if (!c.signal.aborted) setError(message(e));
      })
      .finally(() => {
        if (!c.signal.aborted) setBusy(false);
      });
    return () => c.abort();
  }, [revision]);
  async function restore(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const mobileNumber = normalizeMobile(number);
    if (
      !/^[6-9]\d{9}$/.test(mobileNumber) ||
      !/^GMED-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/.test(
        id.trim().toUpperCase(),
      )
    ) {
      setError("Enter a valid mobile number and one previous Order ID.");
      return;
    }
    setRecovering(true);
    try {
      const d = await api<{ orderIds: string[] }>("/orders/recover", {
        method: "POST",
        body: { mobileNumber, orderId: id.trim().toUpperCase() },
      });
      const saved = rememberIds(d.orderIds);
      const history = await api<{ orders: PublicOrder[] }>("/orders/history", {
        method: "POST",
        body: { orderIds: d.orderIds.slice(0, 100) },
      });
      setOrders(history.orders);
      setRecover(false);
      if (!saved)
        setError(
          "Orders restored for this session. Browser storage is unavailable.",
        );
    } catch (e) {
      setError(message(e));
    } finally {
      setRecovering(false);
    }
  }
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="eyebrow mb-3">Your little corner of care</p>
        <h1 className="title">My space.</h1>
        <p className="muted mt-3">
          Orders remembered on this device. No account or password needed.
        </p>
      </div>
      <div className="card flex items-center gap-4">
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-mint text-brand">
          <Smartphone size={27} />
        </span>
        <div>
          <h2 className="font-semibold">This device’s orders</h2>
          <p className="muted mt-1">
            Keep your Order IDs handy. On a shared device, clear this list when
            you’re done.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button
          variant="secondary"
          onClick={() => {
            setError("");
            setRecover(true);
          }}
        >
          <RotateCcw size={17} />
          Recover orders
        </Button>
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() => setRevision((v) => v + 1)}
        >
          <History size={17} />
          Refresh
        </Button>
        {orders.length > 0 && (
          <Button variant="secondary" onClick={() => setClear(true)}>
            <Trash2 size={17} />
            Clear this device
          </Button>
        )}
      </div>
      {error && !recover && <Notice>{error}</Notice>}
      {busy ? (
        <Skeleton />
      ) : orders.length === 0 ? (
        <Empty title="Your care story starts here">
          Place your first order or recover previous orders using your mobile
          number and an Order ID.
        </Empty>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <button
              key={o.orderId}
              onClick={() => setSelected(o)}
              className="card w-full text-left transition hover:border-brand/25"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="font-semibold">{o.orderId}</span>
                <StatusBadge status={o.status} />
              </div>
              <p className="muted mt-3">
                {date(o.placedAt)} ·{" "}
                {o.orderType === "prescription_image"
                  ? "Prescription"
                  : `${o.itemCount} items`}
              </p>
              <p className="mt-3 text-xs font-semibold text-brand">
                View details →
              </p>
            </button>
          ))}
        </div>
      )}
      <Sheet
        open={recover}
        onClose={() => setRecover(false)}
        title="Bring back your orders"
        locked={recovering}
      >
        <form onSubmit={restore} className="space-y-5">
          <p className="muted">
            Enter the mobile number used to order and any matching Order ID.
          </p>
          <Field
            label="Mobile number"
            type="tel"
            maxLength={16}
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            required
          />
          <Field
            label="Previous Order ID"
            maxLength={11}
            value={id}
            onChange={(e) => setId(e.target.value.toUpperCase())}
            placeholder="GMED-XXXXXX"
            required
          />
          {error && <Notice>{error}</Notice>}
          <Button type="submit" busy={recovering} className="w-full">
            Recover orders
          </Button>
        </form>
      </Sheet>
      <Sheet
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Order details"
      >
        {selected && <OrderReceipt order={selected} />}
      </Sheet>
      <Sheet
        open={clear}
        onClose={() => setClear(false)}
        title="Clear this device?"
      >
        <p className="muted mb-5">
          This removes saved Order IDs from this browser. Your pharmacy’s
          records stay intact. You can recover them with your mobile number and
          an Order ID.
        </p>
        <Button
          variant="danger"
          onClick={() => {
            try {
              localStorage.removeItem("gm:orders");
              sessionStorage.removeItem("gm:last-order");
              setOrders([]);
              setClear(false);
            } catch {
              setError("Could not clear browser storage.");
              setClear(false);
            }
          }}
        >
          Clear saved Order IDs
        </Button>
      </Sheet>
    </div>
  );
}

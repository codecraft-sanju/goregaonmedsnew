"use client";
import { useEffect, useRef, useState } from "react";
import {
  Package,
  RefreshCw,
  ArrowUpRight,
  ReceiptText,
  Phone,
  MapPin,
  Gift,
  CheckCheck,
} from "lucide-react";
import {
  api,
  ApiError,
  cn,
  date,
  message,
  money,
  type AdminOrder,
  type Pagination,
  type Status,
} from "@/lib/api";
import {
  Button,
  Empty,
  Field,
  Notice,
  Pager,
  Sheet,
  Skeleton,
  StatusBadge,
} from "@/app/ui";
type Bill = {
  medicines: { _id?: string; price: number; isAvailable: boolean }[];
  nonMedicineSubtotal: number;
  discount: number;
  offerApplied: boolean;
};
const billOf = (o: AdminOrder): Bill => ({
  medicines: o.medicines.map((m) => ({
    _id: m._id,
    price: m.price,
    isAvailable: m.isAvailable,
  })),
  nonMedicineSubtotal: o.nonMedicineSubtotal,
  discount: o.discount,
  offerApplied: o.offerApplied,
});
const emptyPage: Pagination = { page: 1, limit: 20, total: 0, totalPages: 0 };
export default function OrdersPage() {
  const [status, setStatus] = useState<Status>("Pending");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{
    orders: AdminOrder[];
    pagination: Pagination;
  }>({ orders: [], pagination: emptyPage });
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState<AdminOrder | null>(null);
  const [detailBusy, setDetailBusy] = useState(false);
  const detailSeq = useRef(0);
  useEffect(() => {
    const c = new AbortController();
    setBusy(true);
    setError("");
    api<{ orders: AdminOrder[]; pagination: Pagination }>(
      `/admin/orders?status=${status}&page=${page}&limit=20`,
      { signal: c.signal },
    )
      .then((d) => setData(d))
      .catch((e) => {
        if (!c.signal.aborted) setError(message(e));
      })
      .finally(() => {
        if (!c.signal.aborted) setBusy(false);
      });
    return () => c.abort();
  }, [status, page, revision]);
  async function open(o: AdminOrder) {
    const seq = ++detailSeq.current;
    setDetailBusy(true);
    setError("");
    try {
      const d = await api<{ order: AdminOrder }>(`/admin/orders/${o.id}`);
      if (seq === detailSeq.current) setSelected(d.order);
    } catch (e) {
      if (seq === detailSeq.current) setError(message(e));
    } finally {
      if (seq === detailSeq.current) setDetailBusy(false);
    }
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-3">The care desk</p>
          <h1 className="title">Every order matters.</h1>
          <p className="muted mt-3">
            Review, prepare and deliver with a little more clarity.
          </p>
        </div>
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() => setRevision((n) => n + 1)}
        >
          <RefreshCw size={16} />
          Refresh
        </Button>
      </div>
      <div className="flex flex-wrap gap-2 rounded-2xl bg-white/70 p-2">
        {(["Pending", "Delivered", "Cancelled"] as const).map((s) => (
          <Button
            key={s}
            variant="secondary"
            className={cn(
              "flex-1 border-transparent sm:flex-none",
              status === s
                ? "bg-brand text-white hover:bg-brand"
                : "bg-transparent",
            )}
            aria-pressed={status === s}
            onClick={() => {
              setStatus(s);
              setPage(1);
            }}
          >
            {s}
          </Button>
        ))}
      </div>
      {error && <Notice>{error}</Notice>}
      {detailBusy && <Notice tone="info">Opening full order details…</Notice>}
      {busy ? (
        <Skeleton />
      ) : data.orders.length ? (
        <>
          <div className="grid gap-4 xl:grid-cols-2">
            {data.orders.map((o) => (
              <button
                disabled={detailBusy}
                onClick={() => open(o)}
                key={o.id}
                className="card text-left transition hover:border-brand/25 hover:shadow-lg disabled:opacity-60"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs font-semibold tracking-wide text-muted">
                    {o.orderId}
                  </span>
                  <StatusBadge status={o.status} />
                </div>
                <div className="my-5 flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-2xl bg-mint text-lg font-medium text-brand">
                    {o.customerName.slice(0, 1).toUpperCase()}
                  </span>
                  <div>
                    <h2 className="font-semibold">{o.customerName}</h2>
                    <p className="muted">{o.mobileNumber}</p>
                  </div>
                  <ArrowUpRight size={20} className="ml-auto text-muted" />
                </div>
                <p className="muted truncate">
                  {o.address.flat}, {o.address.area}
                </p>
                <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                  <span className="text-xs text-muted">
                    {o.orderType === "prescription_image"
                      ? "Prescription"
                      : `${o.medicines.length} medicine lines`}{" "}
                    · {date(o.createdAt)}
                  </span>
                  <span className="shrink-0 text-sm font-semibold">
                    {o.billedAt ? money(o.finalAmount) : "Awaiting bill"}
                  </span>
                </div>
              </button>
            ))}
          </div>
          <Pager pagination={data.pagination} onPage={setPage} />
        </>
      ) : (
        <Empty title={`No ${status.toLowerCase()} orders`}>
          Orders with this status will appear here. Refresh to check for new
          orders.
        </Empty>
      )}
      {selected && (
        <OrderPanel
          initial={selected}
          onClose={() => setSelected(null)}
          onChanged={() => setRevision((n) => n + 1)}
        />
      )}
    </div>
  );
}
function OrderPanel({
  initial,
  onClose,
  onChanged,
}: {
  initial: AdminOrder;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [order, setOrder] = useState(initial);
  const [bill, setBill] = useState<Bill>(billOf(initial));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [confirm, setConfirm] = useState<"deliver" | "cancel" | null>(null);
  const [reason, setReason] = useState("");
  const [discard, setDiscard] = useState(false);
  const saving = useRef(false);
  const dirty = JSON.stringify(bill) !== JSON.stringify(billOf(order));
  const locked = order.status !== "Pending";
  const medTotal =
    Math.round(
      bill.medicines.reduce((s, m) => s + (m.isAvailable ? m.price : 0), 0) *
        100,
    ) / 100;
  const eligible =
    order.offer.checks.offerEnabled &&
    order.offer.checks.firstOrder &&
    order.offer.checks.giftNotPreviouslyClaimed &&
    medTotal >= order.offer.requiredMedicineAmount;
  async function refresh() {
    setError("");
    setBusy(true);
    try {
      const d = await api<{ order: AdminOrder }>(`/admin/orders/${order.id}`);
      setOrder(d.order);
      setBill(billOf(d.order));
      setSuccess("Latest order loaded.");
      onChanged();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function mutate(kind: "billing" | "deliver" | "cancel") {
    if (saving.current) return;
    setError("");
    setSuccess("");
    if (
      kind === "billing" &&
      ![
        bill.nonMedicineSubtotal,
        bill.discount,
        ...bill.medicines.map((m) => m.price),
      ].every((n) => Number.isFinite(n) && n >= 0)
    ) {
      setError("All amounts must be valid non-negative numbers.");
      return;
    }
    if (
      kind === "billing" &&
      (bill.nonMedicineSubtotal > 1000000 || bill.discount > 1000000)
    ) {
      setError("Other products and discount must not exceed ₹10,00,000.");
      return;
    }
    if (kind === "cancel" && !reason.trim()) {
      setError("Enter a cancellation reason.");
      return;
    }
    saving.current = true;
    setBusy(true);
    try {
      const body =
        kind === "billing"
          ? {
              medicines: bill.medicines.map((m) => ({
                ...m,
                price: m.isAvailable ? Math.round(m.price * 100) / 100 : 0,
              })),
              nonMedicineSubtotal:
                Math.round(bill.nonMedicineSubtotal * 100) / 100,
              discount: Math.round(bill.discount * 100) / 100,
              offerApplied: bill.offerApplied,
            }
          : kind === "cancel"
            ? { cancelReason: reason.trim() }
            : undefined;
      const d = await api<{ order: AdminOrder }>(
        `/admin/orders/${order.id}/${kind}`,
        { method: "PATCH", body },
      );
      setOrder(d.order);
      setBill(billOf(d.order));
      setConfirm(null);
      setSuccess(
        kind === "billing"
          ? "Bill saved. The confirmed total below is from the pharmacy server."
          : kind === "deliver"
            ? "Order marked as delivered."
            : "Order cancelled.",
      );
      onChanged();
    } catch (e) {
      setError(message(e));
      setConfirm(null);
      if (e instanceof ApiError && e.status === 409) {
        try {
          const d = await api<{ order: AdminOrder }>(
            `/admin/orders/${order.id}`,
          );
          setOrder(d.order);
          setBill(billOf(d.order));
          onChanged();
        } catch {}
      }
    } finally {
      setBusy(false);
      saving.current = false;
    }
  }
  return (
    <>
      <Sheet
        open
        onClose={() => {
          if (dirty) setDiscard(true);
          else onClose();
        }}
        title={order.orderId}
        locked={busy}
      >
        <div className="space-y-6">
          <div className="flex justify-between">
            <StatusBadge status={order.status} />
            <span className="text-xs text-muted">
              {order.billedAt ? "Bill confirmed" : "Awaiting bill"}
            </span>
          </div>
          <div>
            <h2 className="text-xl font-semibold">{order.customerName}</h2>
            <a
              href={`tel:${order.mobileNumber}`}
              className="mt-2 flex min-h-10 items-center gap-2 text-sm text-brand"
            >
              <Phone size={15} />
              {order.mobileNumber}
            </a>
            <p className="muted flex gap-2">
              <MapPin size={16} className="mt-1 shrink-0" />
              {order.address.flat}, {order.address.area}
              {order.address.landmark ? `, ${order.address.landmark}` : ""}
            </p>
            <p className="mt-3 text-xs text-muted">
              Placed {date(order.createdAt)} · {order.previousOrders} previous
              orders
            </p>
          </div>
          {order.prescriptionUrl && (
            <div className="rounded-2xl bg-white p-4">
              <h3 className="mb-3 text-sm font-semibold">Prescription</h3>
              <a href={order.prescriptionUrl} target="_blank" rel="noreferrer">
                <img
                  src={order.prescriptionUrl}
                  alt={`Prescription for ${order.orderId}`}
                  className="max-h-56 w-full rounded-xl object-contain"
                />
                <span className="mt-3 block text-xs text-brand">
                  Open full image ↗
                </span>
              </a>
            </div>
          )}
          {error && <Notice>{error}</Notice>}
          {success && <Notice tone="success">{success}</Notice>}
          <fieldset
            disabled={busy || locked}
            className="space-y-4 disabled:opacity-80"
          >
            <legend className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <ReceiptText size={20} />
              Item-wise billing
            </legend>
            <p className="muted">
              Enter the complete amount for each line, including its requested
              quantity.
            </p>
            {order.medicines.length ? (
              order.medicines.map((m, i) => (
                <div
                  key={m._id || i}
                  className="rounded-2xl border border-slate-100 bg-white p-4"
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{m.name}</p>
                      <p className="muted">{m.quantity}</p>
                    </div>
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        className="size-5 accent-[#156253]"
                        checked={bill.medicines[i].isAvailable}
                        onChange={(e) =>
                          setBill((b) => ({
                            ...b,
                            medicines: b.medicines.map((x, n) =>
                              i === n
                                ? {
                                    ...x,
                                    isAvailable: e.target.checked,
                                    price: e.target.checked ? x.price : 0,
                                  }
                                : x,
                            ),
                          }))
                        }
                      />
                      Available
                    </label>
                  </div>
                  <Field
                    label={`Line amount · ${m.name}`}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    disabled={!bill.medicines[i].isAvailable}
                    value={bill.medicines[i].price}
                    onChange={(e) =>
                      setBill((b) => ({
                        ...b,
                        medicines: b.medicines.map((x, n) =>
                          i === n ? { ...x, price: Number(e.target.value) } : x,
                        ),
                      }))
                    }
                  />
                </div>
              ))
            ) : (
              <Notice tone="info">
                This prescription order has no medicine lines. The current
                billing service cannot add medicine lines, so medicine charges
                cannot be entered for this order. Do not put medicine charges
                under other products.
              </Notice>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Other products (₹)"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={bill.nonMedicineSubtotal}
                onChange={(e) =>
                  setBill((b) => ({
                    ...b,
                    nonMedicineSubtotal: Number(e.target.value),
                  }))
                }
              />
              <Field
                label="Flat discount (₹)"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={bill.discount}
                onChange={(e) =>
                  setBill((b) => ({ ...b, discount: Number(e.target.value) }))
                }
              />
            </div>
            <div className="rounded-2xl bg-amber-50 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
                <Gift size={18} />
                First-order gift
              </div>
              <p className="mt-2 text-xs leading-relaxed text-amber-900/80">
                {order.offerOptIn
                  ? "Customer requested the gift."
                  : "Customer did not request the gift."}{" "}
                Medicine threshold: {money(order.offer.requiredMedicineAmount)}.
              </p>
              <label className="mt-3 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-5 accent-[#156253]"
                  disabled={
                    !bill.offerApplied && (!eligible || !order.offerOptIn)
                  }
                  checked={bill.offerApplied}
                  onChange={(e) =>
                    setBill((b) => ({ ...b, offerApplied: e.target.checked }))
                  }
                />
                Include GlucoOne BG-03
              </label>
              {!eligible && (
                <p className="mt-2 text-xs text-amber-900">
                  Current order does not meet all offer checks.
                </p>
              )}
            </div>
          </fieldset>
          <div className="rounded-2xl bg-mint/60 p-5 text-sm">
            <div className="flex justify-between">
              <span>Medicine line subtotal</span>
              <strong>{money(medTotal)}</strong>
            </div>
            <p className="mt-3 text-xs text-muted">
              Delivery charge and gift eligibility are recalculated when you
              save.
            </p>
            {order.billedAt && (
              <>
                <div className="mt-4 flex justify-between">
                  <span>Confirmed delivery</span>
                  <span>
                    {order.deliveryCharge === 0
                      ? "FREE"
                      : money(order.deliveryCharge)}
                  </span>
                </div>
                <div className="mt-2 flex justify-between">
                  <span>Confirmed discount</span>
                  <span>{money(order.discount)}</span>
                </div>
                <div className="mt-4 flex justify-between border-t border-brand/15 pt-4 text-lg font-semibold">
                  <span>Last saved total</span>
                  <span>{money(order.finalAmount)}</span>
                </div>
                <p className="mt-2 text-xs text-muted">
                  Saved {date(order.billedAt)}
                </p>
              </>
            )}
            {dirty && (
              <p className="mt-3 text-xs font-semibold text-brand">
                You have unsaved billing changes.
              </p>
            )}
          </div>
          {order.cancelReason && <Notice>{order.cancelReason}</Notice>}
          {order.deliveredAt && (
            <p className="muted">Delivered {date(order.deliveredAt)}</p>
          )}
          {!locked && (
            <div className="space-y-3">
              <Button
                className="w-full"
                busy={busy}
                onClick={() => mutate("billing")}
              >
                Save complete bill
              </Button>
              <Button
                className="w-full"
                variant="secondary"
                disabled={busy || dirty || !order.billedAt}
                onClick={() => setConfirm("deliver")}
              >
                <CheckCheck size={18} />
                Mark delivered
              </Button>
              <Button
                className="w-full"
                variant="danger"
                disabled={busy}
                onClick={() => setConfirm("cancel")}
              >
                Cancel order
              </Button>
            </div>
          )}
          <Button
            variant="secondary"
            className="w-full"
            disabled={busy || dirty}
            onClick={refresh}
          >
            <RefreshCw size={16} />
            Load latest details
          </Button>
          <p className="text-xs text-muted">
            Notification:{" "}
            {order.telegramNotificationSent
              ? "sent to pharmacy"
              : "not confirmed"}{" "}
            · {order.paymentMethod}
          </p>
        </div>
      </Sheet>
      <Sheet
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={
          confirm === "deliver" ? "Confirm delivery" : "Cancel this order?"
        }
        locked={busy}
      >
        {confirm === "deliver" ? (
          <div className="space-y-5">
            <p className="muted">
              Confirm that {order.orderId} has been delivered and payment of{" "}
              {money(order.finalAmount)} collected. This cannot be undone.
            </p>
            <Button busy={busy} onClick={() => mutate("deliver")}>
              Confirm delivered
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            <p className="muted">
              Cancellation cannot be undone. The reason will be saved with this
              order.
            </p>
            <label className="block">
              <span className="label">Cancellation reason</span>
              <textarea
                className="field min-h-28"
                maxLength={300}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
            <Button
              variant="danger"
              busy={busy}
              disabled={!reason.trim()}
              onClick={() => mutate("cancel")}
            >
              Confirm cancellation
            </Button>
          </div>
        )}
      </Sheet>
      <Sheet
        open={discard}
        onClose={() => setDiscard(false)}
        title="Leave without saving?"
      >
        <p className="muted mb-5">Your billing changes have not been saved.</p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setDiscard(false)}>
            Keep editing
          </Button>
          <Button variant="danger" onClick={onClose}>
            Discard changes
          </Button>
        </div>
      </Sheet>
    </>
  );
}

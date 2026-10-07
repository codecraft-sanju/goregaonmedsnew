"use client";
import { motion, AnimatePresence } from "framer-motion";
import * as Dialog from "@radix-ui/react-dialog";
import {
  X,
  AlertCircle,
  PackageOpen,
  ChevronLeft,
  ChevronRight,
  Check,
  
} from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import {
  cn,
  money,
  type PublicOrder,
  type Status,
  type Pagination,
} from "@/lib/api";
export function Button({
  className,
  variant = "primary",
  busy = false,
  children,
  ...props
}: ComponentProps<typeof motion.button> & {
  variant?: "primary" | "secondary" | "danger";
  busy?: boolean;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      className={cn(
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary"
          ? "bg-brand text-white shadow-soft hover:bg-[#104d40]"
          : variant === "danger"
            ? "bg-rose-50 text-rose-700 hover:bg-rose-100"
            : "border border-slate-200 bg-white text-ink hover:bg-mint/50",
        className,
      )}
      {...props}
      disabled={busy || props.disabled}
      aria-busy={busy}
    >
      {busy ? (
        <span className="motion-safe:animate-pulse">Working…</span>
      ) : (
        children
      )}
    </motion.button>
  );
}
export function Field({
  label,
  error,
  className,
  ...props
}: ComponentProps<"input"> & { label: string; error?: string }) {
  const id = props.id || props.name || label.replace(/\W/g, "-");
  return (
    <label htmlFor={id} className={cn("block", className)}>
      <span className="label">{label}</span>
      <input
        {...props}
        id={id}
        className="field"
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && (
        <span id={`${id}-error`} className="mt-1 block text-xs text-rose-700">
          {error}
        </span>
      )}
    </label>
  );
}
export function Notice({
  children,
  tone = "error",
}: {
  children: ReactNode;
  tone?: "error" | "info" | "success";
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex gap-3 rounded-2xl p-4 text-sm leading-relaxed",
        tone === "error"
          ? "bg-rose-50 text-rose-800"
          : tone === "success"
            ? "bg-mint text-brand"
            : "bg-slate-100 text-slate-700",
      )}
    >
      <AlertCircle size={18} className="mt-0.5 shrink-0" />
      <div>{children}</div>
    </div>
  );
}
export function Skeleton() {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="space-y-4 motion-safe:animate-pulse"
    >
      {[0, 1, 2].map((n) => (
        <div
          key={n}
          className="h-28 rounded-3xl bg-gradient-to-r from-mint/50 via-white to-mint/50"
        />
      ))}
    </div>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="card py-14 text-center">
      <PackageOpen className="mx-auto mb-5 text-brand" size={38} />
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <div className="muted mx-auto mt-2 max-w-sm">{children}</div>
    </div>
  );
}
export function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-3 py-1.5 text-[11px] font-semibold",
        status === "Delivered"
          ? "bg-mint text-brand"
          : status === "Cancelled"
            ? "bg-rose-50 text-rose-700"
            : "bg-amber-50 text-amber-800",
      )}
    >
      {status === "Pending" ? "Received & processing" : status}
    </span>
  );
}
export function Sheet({
  open,
  onClose,
  title,
  children,
  locked = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  locked?: boolean;
}) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(v) => {
        if (!v && !locked) onClose();
      }}
    >
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-ink/35 backdrop-blur-sm"
              />
            </Dialog.Overlay>
            <Dialog.Content
              forceMount
              asChild
              onEscapeKeyDown={(e) => {
                if (locked) e.preventDefault();
              }}
              onPointerDownOutside={(e) => {
                if (locked) e.preventDefault();
              }}
            >
              <motion.section
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 40, opacity: 0 }}
                className="fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-y-auto rounded-t-[30px] bg-paper px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-4 shadow-2xl sm:inset-x-auto sm:inset-y-4 sm:right-4 sm:w-[580px] sm:max-w-[calc(100vw-32px)] sm:rounded-[30px] sm:p-7"
              >
                <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-slate-200 sm:hidden" />
                <div className="mb-6 flex items-center justify-between gap-3">
                  <Dialog.Title className="text-2xl font-semibold tracking-tight">
                    {title}
                  </Dialog.Title>
                  <Dialog.Close asChild>
                    <button
                      disabled={locked}
                      aria-label="Close panel"
                      className="grid size-11 shrink-0 place-items-center rounded-full bg-white"
                    >
                      <X size={20} />
                    </button>
                  </Dialog.Close>
                </div>
                <Dialog.Description className="sr-only">
                  Review the details and available actions below.
                </Dialog.Description>
                {children}
              </motion.section>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
export function Pager({
  pagination,
  onPage,
}: {
  pagination: Pagination;
  onPage: (page: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-5 text-sm">
      <span className="text-muted">
        {pagination.total} results · Page {pagination.page} of{" "}
        {Math.max(1, pagination.totalPages)}
      </span>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          aria-label="Previous page"
          disabled={pagination.page <= 1}
          onClick={() => onPage(pagination.page - 1)}
        >
          <ChevronLeft size={18} />
        </Button>
        <Button
          variant="secondary"
          aria-label="Next page"
          disabled={pagination.page >= pagination.totalPages}
          onClick={() => onPage(pagination.page + 1)}
        >
          <ChevronRight size={18} />
        </Button>
      </div>
    </div>
  );
}
export function OrderReceipt({ order }: { order: PublicOrder }) {
  const billed = order.finalAmount !== null;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold">{order.orderId}</h3>
        <StatusBadge status={order.status} />
      </div>
      <div className="divide-y divide-slate-100">
        {order.medicines.map((m, i) => (
          <div key={m._id || i} className="flex justify-between gap-3 py-4">
            <div>
              <p className="text-sm font-medium">{m.name}</p>
              <p className="muted">
                {m.quantity}
                {billed && !m.isAvailable ? " · Unavailable" : ""}
              </p>
            </div>
            <span className="text-sm font-medium">
              {billed
                ? m.isAvailable
                  ? money(m.price)
                  : "—"
                : "To be confirmed"}
            </span>
          </div>
        ))}
      </div>
      {billed ? (
        <div className="space-y-3 rounded-2xl bg-paper p-5 text-sm">
          {[
            ["Medicines", order.medicineSubtotal],
            ["Other products", order.nonMedicineSubtotal],
            ["Delivery", order.deliveryCharge],
            ["Discount", -order.discount],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between">
              <span className="text-muted">{k}</span>
              <span>
                {k === "Delivery" && v === 0 ? "FREE" : money(Number(v))}
              </span>
            </div>
          ))}
          <div className="flex justify-between border-t border-brand/10 pt-4 text-lg font-semibold">
            <span>Total</span>
            <span>{money(order.finalAmount!)}</span>
          </div>
        </div>
      ) : (
        <Notice tone="info">
          Your pharmacy will confirm availability and the final bill.
        </Notice>
      )}
      {order.cancelReason && <Notice>{order.cancelReason}</Notice>}
      <p className="muted">
        {order.paymentMethod || "Pay at Delivery (Cash/UPI)"}
      </p>
    </div>
  );
}
export function SuccessMark() {
  return (
    <div className="mx-auto grid size-20 place-items-center rounded-full bg-mint text-brand">
      <motion.svg
        viewBox="0 0 48 48"
        className="size-12"
        fill="none"
        aria-hidden="true"
      >
        <motion.path
          d="m12 25 8 8 17-18"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.65 }}
        />
      </motion.svg>
    </div>
  );
}

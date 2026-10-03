'use client';

import Image from 'next/image';
import { Fragment, useCallback, useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, BellOff, ExternalLink, Gift, MapPin, Phone, User, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { adminRequest } from '@/lib/adminApi';
import { cn } from '@/lib/cn';
import { GIFT } from '@/lib/constants';
import { cloudinaryThumb, formatDateTime, formatMobile, formatRupees } from '@/lib/format';
import type { AdminOrder } from '@/lib/types';
import { BillingPanel } from './BillingPanel';
import { OrderStatusBadge } from './OrderStatusBadge';

interface Props {
  order: AdminOrder | null;
  deliveryCharge: number;
  open: boolean;
  onClose: () => void;
  onUpdated: (order: AdminOrder) => void;
  onDelivered: (order: AdminOrder) => void;
  onCancelled: (order: AdminOrder) => void;
}

const CUSTOM_REASON = 'Other (Custom Reason)';
const CANCEL_REASONS = [
  'Medicine Out of Stock',
  'Delivery partner unavailable right now',
  'Incomplete or Invalid Prescription',
  'Out of delivery coverage area',
  CUSTOM_REASON,
] as const;

const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Keeps Tab / Shift+Tab inside the element the handler is attached to. */
function trapTab(event: ReactKeyboardEvent<HTMLElement>) {
  if (event.key !== 'Tab') return;
  const container = event.currentTarget;
  const nodes = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((node) => node.getClientRects().length > 0);
  if (nodes.length === 0) return;
  const first = nodes[0];
  const last = nodes[nodes.length - 1];
  const active = document.activeElement;
  const outside = !container.contains(active);
  if (event.shiftKey && (active === first || outside)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (active === last || outside)) {
    event.preventDefault();
    first.focus();
  }
}

function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const { overflow, paddingRight } = document.body.style;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
    return () => {
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
    };
  }, [locked]);
}

function buildWhatsappLink(order: AdminOrder): string | null {
  if (!order.cancelReason) return null;
  const message = encodeURIComponent(
    `Hi ${order.customerName},\n\nUnfortunately, your GoregaonMeds order #${order.orderId} had to be cancelled.\n\nReason: ${order.cancelReason}\n\nWe apologize for the inconvenience.`,
  );
  return `https://wa.me/91${order.mobileNumber}?text=${message}`;
}

function Section({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="rounded-2xl border border-brand-100 bg-white p-4">
      <h3 id={id} className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink-soft">
        {icon}
        {title}
      </h3>
      {children}
    </section>
  );
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-ink-soft">{label}</dt>
      <dd className="mt-0.5 text-sm font-bold text-ink">{children}</dd>
    </div>
  );
}

function SummaryRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn('flex items-center justify-between gap-3', strong && 'border-t border-brand-100 pt-3')}>
      <dt className={strong ? 'text-sm font-semibold' : 'text-ink-muted'}>{label}</dt>
      <dd className={cn('tabular-nums', strong ? 'text-xl font-bold text-brand-800' : 'font-medium')}>{value}</dd>
    </div>
  );
}

/** Read-only bill for Delivered orders, and for Cancelled orders that were billed before cancellation. */
function BillSummary({ order }: { order: AdminOrder }) {
  const delivered = order.status === 'Delivered';
  if (!delivered && !order.billedAt) {
    return (
      <Section title="Bill">
        <p className="text-sm text-ink-muted">No bill was saved before this order was cancelled.</p>
      </Section>
    );
  }
  return (
    <Section title={delivered ? 'Bill' : 'Bill (order not delivered)'}>
      <dl className="space-y-2 text-sm">
        <SummaryRow label="Medicine subtotal" value={formatRupees(order.medicineSubtotal)} />
        <SummaryRow label="Other items subtotal" value={formatRupees(order.nonMedicineSubtotal)} />
        <SummaryRow label="Delivery charge" value={formatRupees(order.deliveryCharge)} />
        <SummaryRow label="Final amount" value={formatRupees(order.finalAmount)} strong />
      </dl>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-muted">
        <Gift className="h-3.5 w-3.5 text-gift-500" aria-hidden />
        {order.offerApplied ? `Free ${GIFT.shortName} included` : 'No gift included'}
      </p>
      {order.deliveredAt && <p className="mt-1 text-xs text-ink-muted">Delivered {formatDateTime(order.deliveredAt)}</p>}
    </Section>
  );
}

interface CancelDialogProps {
  order: AdminOrder;
  onClose: () => void;
  onCancelled: (order: AdminOrder) => void;
}

function CancelOrderDialog({ order, onClose, onCancelled }: CancelDialogProps) {
  const toast = useToast();
  const titleId = useId();
  const descriptionId = useId();
  const customId = useId();
  const groupName = useId();
  const [reason, setReason] = useState<string | null>(null);
  const [customReason, setCustomReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const firstOptionRef = useRef<HTMLInputElement>(null);
  const customRef = useRef<HTMLTextAreaElement>(null);

  const finalReason = reason === CUSTOM_REASON ? customReason.trim() : (reason ?? '');
  const canSubmit = finalReason.length > 0;

  useEffect(() => {
    firstOptionRef.current?.focus();
  }, []);

  useEffect(() => {
    if (reason === CUSTOM_REASON) customRef.current?.focus();
  }, [reason]);

  const submit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      const res = await adminRequest<{ order: AdminOrder }>(`/orders/${order.id}/cancel`, {
        method: 'PATCH',
        body: { cancelReason: finalReason },
      });
      toast.success('Order cancelled successfully');
      onCancelled(res.order);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not cancel order');
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      // Stop here so the drawer's own Escape handler does not also close the panel.
      event.stopPropagation();
      if (!submitting) onClose();
      return;
    }
    trapTab(event);
  };

  return (
    <div className="fixed inset-0 z-[55] grid place-items-center p-4">
      <motion.div
        aria-hidden
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={submitting ? undefined : onClose}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onKeyDown={handleKeyDown}
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        transition={{ duration: 0.18 }}
        className="relative max-h-full w-full max-w-md overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-6"
      >
        <h2 id={titleId} className="font-display text-xl font-bold text-ink">
          Cancel this order?
        </h2>
        <p id={descriptionId} className="mt-1 text-sm text-ink-muted">
          {order.orderId} for {order.customerName} will move to Cancelled. The reason is saved with the order and shown to the customer when they track it.
        </p>

        <fieldset className="mt-4 space-y-2" disabled={submitting}>
          <legend className="mb-2 text-sm font-medium text-ink">Reason for cancellation</legend>
          {CANCEL_REASONS.map((option, index) => (
            <label
              key={option}
              className={cn(
                'flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 text-sm',
                reason === option ? 'border-brand-500 bg-brand-50' : 'border-brand-100 hover:bg-surface',
              )}
            >
              <input
                ref={index === 0 ? firstOptionRef : undefined}
                type="radio"
                name={groupName}
                value={option}
                checked={reason === option}
                onChange={() => setReason(option)}
                className="h-4 w-4 accent-brand-700"
              />
              {option}
            </label>
          ))}
        </fieldset>

        {reason === CUSTOM_REASON && (
          <div className="mt-3">
            <label htmlFor={customId} className="mb-1.5 block text-sm font-medium text-ink">
              Custom reason
            </label>
            <textarea
              id={customId}
              ref={customRef}
              value={customReason}
              onChange={(event) => setCustomReason(event.target.value)}
              disabled={submitting}
              placeholder="Type the exact reason here..."
              rows={3}
              aria-required
              className="w-full resize-none rounded-xl border-0 bg-surface p-3 text-sm outline-none ring-1 ring-inset ring-brand-100 focus:ring-2 focus:ring-brand-500"
            />
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Keep Order
          </Button>
          <Button variant="danger" onClick={submit} loading={submitting} disabled={!canSubmit}>
            Confirm Cancellation
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

export function OrderSidePanel({ order, deliveryCharge, open, onClose, onUpdated, onDelivered, onCancelled }: Props) {
  // Keep rendering the last order while the exit animation runs after `order` becomes null.
  const lastOrder = useRef<AdminOrder | null>(null);
  if (order) lastOrder.current = order;
  const shown = order ?? lastOrder.current;

  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const cancelTriggerRef = useRef<HTMLButtonElement>(null);
  const [actionsTarget, setActionsTarget] = useState<HTMLDivElement | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);

  useBodyScrollLock(open);

  useEffect(() => {
    if (open) closeRef.current?.focus({ preventScroll: true });
    else setCancelOpen(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented && !cancelOpen) onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, cancelOpen, onClose]);

  const closeCancelDialog = useCallback(() => {
    setCancelOpen(false);
    requestAnimationFrame(() => (cancelTriggerRef.current ?? closeRef.current)?.focus({ preventScroll: true }));
  }, []);

  const handleCancelled = useCallback(
    (updated: AdminOrder) => {
      setCancelOpen(false);
      onCancelled(updated);
      requestAnimationFrame(() => closeRef.current?.focus({ preventScroll: true }));
    },
    [onCancelled],
  );

  const whatsappLink = shown ? buildWhatsappLink(shown) : null;

  return (
    <>
      <AnimatePresence>
        {open && shown && (
          <div key="order-panel" className="fixed inset-0 z-50">
            <motion.div
              aria-hidden
              className="absolute inset-0 bg-black/25 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onClose}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              onKeyDown={trapTab}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
              className="absolute inset-y-0 right-0 flex w-full flex-col bg-surface shadow-2xl sm:max-w-xl lg:max-w-2xl"
            >
              <header className="flex shrink-0 items-start justify-between gap-3 border-b border-brand-100 bg-white px-4 py-4 sm:px-6">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 id={titleId} className="font-mono text-xl font-bold tracking-wide text-brand-800">
                      {shown.orderId}
                    </h2>
                    <OrderStatusBadge status={shown.status} />
                  </div>
                  <p className="mt-1 text-xs text-ink-soft">
                    {shown.orderType === 'manual_text' ? 'Manual order' : 'Prescription order'} · {formatDateTime(shown.createdAt)}
                  </p>
                </div>
                <button
                  ref={closeRef}
                  type="button"
                  onClick={onClose}
                  aria-label="Close order details"
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-ink-muted hover:bg-brand-50 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                >
                  <X className="h-5 w-5" aria-hidden />
                </button>
              </header>

              <div className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
                {shown.status === 'Cancelled' && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                    <p className="flex items-center gap-2 text-sm font-bold text-red-800">
                      <AlertCircle className="h-4 w-4" aria-hidden /> Order cancelled
                    </p>
                    <p className="mt-1 text-sm text-red-700">{shown.cancelReason ?? 'No reason recorded.'}</p>
                    {whatsappLink && (
                      <a
                        href={whatsappLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"
                      >
                        Notify customer on WhatsApp <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                      </a>
                    )}
                  </div>
                )}

                <Section title="Customer" icon={<User className="h-3.5 w-3.5" aria-hidden />}>
                  <p className="text-base font-semibold text-ink">{shown.customerName}</p>
                  <a
                    href={`tel:+91${shown.mobileNumber}`}
                    className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-700 hover:underline"
                  >
                    <Phone className="h-4 w-4" aria-hidden /> {formatMobile(shown.mobileNumber)}
                  </a>
                  <div className="mt-2 flex gap-2 border-t border-brand-100 pt-3 text-sm">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-soft" aria-hidden />
                    <dl className="grid min-w-0 flex-1 grid-cols-[auto,1fr] gap-x-3 gap-y-1">
                      <dt className="text-ink-soft">Address</dt>
                      <dd className="break-words text-ink">{shown.address.flat || '—'}</dd>
                      <dt className="text-ink-soft">Area</dt>
                      <dd className="break-words text-ink">{shown.address.area || '—'}</dd>
                      {shown.address.landmark && (
                        <Fragment>
                          <dt className="text-ink-soft">Landmark</dt>
                          <dd className="break-words text-ink">{shown.address.landmark}</dd>
                        </Fragment>
                      )}
                    </dl>
                  </div>
                </Section>

                <Section title="Customer history">
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
                    <Stat label="First order">{shown.firstOrderAtCreation ? 'Yes' : 'No'}</Stat>
                    <Stat label="Previous orders">{shown.previousOrders}</Stat>
                    <Stat label="Delivered">{shown.customer?.deliveredOrders ?? 0}</Stat>
                    <Stat label="Gift claimed before">
                      {shown.customer?.offerClaimed ? `Yes${shown.customer.offerClaimedOrderId ? ` (${shown.customer.offerClaimedOrderId})` : ''}` : 'No'}
                    </Stat>
                  </dl>
                </Section>

                <Section title="Order details">
                  {shown.orderType === 'manual_text' ? (
                    <ul className="divide-y divide-brand-100 overflow-hidden rounded-xl ring-1 ring-brand-100">
                      {shown.medicines.map((item, index) => (
                        <li key={`${item.name}-${index}`} className="flex justify-between gap-3 px-3 py-2.5 text-sm">
                          <span className="min-w-0 break-words font-medium">{item.name}</span>
                          <span className="shrink-0 text-ink-muted">{item.quantity}</span>
                        </li>
                      ))}
                    </ul>
                  ) : shown.prescriptionUrl ? (
                    <a
                      href={shown.prescriptionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-4 rounded-xl p-2 ring-1 ring-brand-100 hover:ring-brand-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                    >
                      <Image
                        src={cloudinaryThumb(shown.prescriptionUrl, 240)}
                        alt={`Prescription for ${shown.orderId}`}
                        width={72}
                        height={96}
                        className="h-24 w-[72px] shrink-0 rounded-lg object-cover"
                        unoptimized
                      />
                      <span className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-brand-700 group-hover:underline">
                        View Prescription <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                      </span>
                    </a>
                  ) : (
                    <p className="text-sm text-ink-muted">No prescription image is attached to this order.</p>
                  )}
                </Section>

                {!shown.telegramNotificationSent && (
                  <div role="status" className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
                    <BellOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    <div className="text-sm">
                      <p className="font-semibold">Telegram notification was not delivered.</p>
                      <p className="mt-0.5 text-xs text-amber-800">Make sure this order has been seen by the team.</p>
                    </div>
                  </div>
                )}

                {shown.status === 'Pending' ? (
                  <Section title="Billing">
                    <BillingPanel
                      key={shown.id}
                      order={shown}
                      deliveryCharge={deliveryCharge}
                      onUpdated={onUpdated}
                      onDelivered={onDelivered}
                      actionsTarget={actionsTarget}
                    />
                  </Section>
                ) : (
                  <BillSummary order={shown} />
                )}
              </div>

              {shown.status === 'Pending' && (
                <footer className="shrink-0 space-y-1 border-t border-brand-100 bg-white px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-6">
                  {/* BillingPanel portals Save Bill / Mark as Delivered here so they stay visible while the body scrolls. */}
                  <div ref={setActionsTarget} />
                  <button
                    ref={cancelTriggerRef}
                    type="button"
                    onClick={() => setCancelOpen(true)}
                    className="flex min-h-11 w-full items-center justify-center rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
                  >
                    Cancel Order
                  </button>
                </footer>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {cancelOpen && shown && <CancelOrderDialog key="cancel-dialog" order={shown} onClose={closeCancelDialog} onCancelled={handleCancelled} />}
      </AnimatePresence>
    </>
  );
}
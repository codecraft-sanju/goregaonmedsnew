

// // //src/components/admin/BillingPanel.tsx
// 'use client';

// import { useEffect, useMemo, useState } from 'react';
// import { createPortal } from 'react-dom';
// import { AnimatePresence, motion } from 'framer-motion';
// import { CheckCircle2, Gift, PackageCheck, Save, XCircle } from 'lucide-react';
// import { Button } from '@/components/ui/Button';
// import { useToast } from '@/components/ui/Toast';
// import { adminRequest } from '@/lib/adminApi';
// import { GIFT } from '@/lib/constants';
// import { cn } from '@/lib/cn';
// import { formatRupees } from '@/lib/format';
// import type { AdminOrder } from '@/lib/types';

// const AMOUNT_PATTERN = /^\d{1,7}(\.\d{1,2})?$/;

// const parseAmount = (value: string) => (AMOUNT_PATTERN.test(value.trim()) ? Number(value) : null);
// const toInput = (amount: number, billed: boolean) => (billed ? String(amount) : '');

// const CHECK_LABELS: Record<keyof AdminOrder['offer']['checks'], string> = {
//   offerEnabled: 'Offer enabled',
//   firstOrder: 'First order',
//   meetsMedicineThreshold: 'Medicine subtotal eligible',
//   giftNotPreviouslyClaimed: 'Gift not previously claimed',
// };

// interface Props {
//   order: AdminOrder;
//   deliveryCharge: number;
//   onUpdated: (order: AdminOrder) => void;
//   onDelivered: (order: AdminOrder) => void;
//   /**
//    * Where to render Save Bill / Mark as Delivered.
//    * undefined: inline. null: the target is not mounted yet, render nothing. Element: portal into it.
//    */
//   actionsTarget?: HTMLElement | null;
// }

// /**
//  * The admin enters only the two subtotals. Delivery, final amount and gift eligibility are
//  * computed by the backend on save; the values shown before saving are a preview.
//  */
// export function BillingPanel({ order, deliveryCharge, onUpdated, onDelivered, actionsTarget }: Props) {
//   const toast = useToast();
//   const billed = Boolean(order.billedAt);
//   const [medicine, setMedicine] = useState(toInput(order.medicineSubtotal, billed));
//   const [other, setOther] = useState(toInput(order.nonMedicineSubtotal, billed));
//   const [giftIncluded, setGiftIncluded] = useState(order.offerApplied);
//   const [saving, setSaving] = useState(false);
//   const [confirmDelivery, setConfirmDelivery] = useState(false);
//   const [delivering, setDelivering] = useState(false);

//   const medicineValue = parseAmount(medicine);
//   const otherValue = other.trim() === '' ? 0 : parseAmount(other);
//   const valid = medicineValue !== null && otherValue !== null;

//   const preview = useMemo(() => {
//     const checks = {
//       ...order.offer.checks,
//       meetsMedicineThreshold: medicineValue !== null && medicineValue >= order.offer.requiredMedicineAmount,
//     };
//     return {
//       checks,
//       eligible: Object.values(checks).every(Boolean),
//       finalAmount: valid ? Math.round((medicineValue! + otherValue! + deliveryCharge) * 100) / 100 : null,
//     };
//   }, [order.offer, medicineValue, otherValue, valid, deliveryCharge]);

//   const dirty =
//     !billed ||
//     medicineValue !== order.medicineSubtotal ||
//     (otherValue ?? -1) !== order.nonMedicineSubtotal ||
//     giftIncluded !== order.offerApplied ||
//     deliveryCharge !== order.deliveryCharge;

//   useEffect(() => {
//     if (!preview.eligible) setGiftIncluded(false);
//   }, [preview.eligible]);

//   const saveBill = async () => {
//     if (!valid) {
//       toast.error('Enter the medicine subtotal (and other items, if any) as amounts like 520 or 520.50');
//       return;
//     }
//     setSaving(true);
//     try {
//       const res = await adminRequest<{ order: AdminOrder }>(`/orders/${order.id}/billing`, {
//         method: 'PATCH',
//         body: { medicineSubtotal: medicineValue, nonMedicineSubtotal: otherValue, offerApplied: giftIncluded },
//       });
//       onUpdated(res.order);
//       setGiftIncluded(res.order.offerApplied);
//       toast.success(res.order.offerEligible ? 'Bill saved · Eligible for the free gift' : 'Bill saved');
//     } catch (error) {
//       toast.error((error as Error).message);
//     } finally {
//       setSaving(false);
//     }
//   };

//   const deliver = async () => {
//     setDelivering(true);
//     try {
//       const res = await adminRequest<{ order: AdminOrder }>(`/orders/${order.id}/deliver`, { method: 'PATCH' });
//       toast.success(`${order.orderId} marked as delivered`);
//       onDelivered(res.order);
//     } catch (error) {
//       toast.error((error as Error).message);
//       setDelivering(false);
//       setConfirmDelivery(false);
//     }
//   };

//   const status = billed && !dirty ? { eligible: order.offerEligible, checks: order.offer.checks, saved: true } : { ...preview, saved: false };

//   const actions = (
//     <div className="space-y-2">
//       <div className="grid gap-2 min-[400px]:grid-cols-2">
//         <Button variant="secondary" onClick={saveBill} loading={saving} disabled={!valid || delivering} icon={<Save className="h-4 w-4" />}>
//           Save Bill
//         </Button>
//         <AnimatePresence mode="wait" initial={false}>
//           {confirmDelivery ? (
//             <motion.div key="confirm" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex gap-2">
//               <Button variant="ghost" className="flex-1" onClick={() => setConfirmDelivery(false)} disabled={delivering}>
//                 Back
//               </Button>
//               <Button className="flex-1" onClick={deliver} loading={delivering}>
//                 Confirm
//               </Button>
//             </motion.div>
//           ) : (
//             <motion.div key="deliver" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
//               <Button
//                 className="w-full"
//                 onClick={() => setConfirmDelivery(true)}
//                 disabled={!billed || dirty || saving}
//                 title={!billed || dirty ? 'Save the bill first' : undefined}
//                 icon={<PackageCheck className="h-4 w-4" />}
//               >
//                 Mark as Delivered
//               </Button>
//             </motion.div>
//           )}
//         </AnimatePresence>
//       </div>
//       {confirmDelivery && (
//         <p className="text-xs text-ink-muted">
//           Confirm payment was collected{order.offerApplied ? ` and the free ${GIFT.shortName} was handed over. The gift will be recorded as claimed.` : '.'}
//         </p>
//       )}
//       {(!billed || dirty) && !confirmDelivery && <p className="text-xs text-ink-soft">Save the bill before marking the order as delivered.</p>}
//     </div>
//   );
// // jgg
//   return (
//     <div className="space-y-4">
//       <div className="grid grid-cols-2 gap-3">
//         <AmountInput id={`${order.id}-med`} label="Medicine Subtotal" hint="After discounts" value={medicine} onChange={setMedicine} />
//         <AmountInput id={`${order.id}-other`} label="Other Items Subtotal" hint="Cosmetics, FMCG, general" value={other} onChange={setOther} />
//       </div>

//       <dl className="space-y-2 rounded-xl bg-surface p-3.5 text-sm">
//         <div className="flex justify-between gap-3">
//           <dt className="text-ink-muted">Medicine subtotal</dt>
//           <dd className="font-medium tabular-nums">{medicineValue === null ? '—' : formatRupees(medicineValue)}</dd>
//         </div>
//         <div className="flex justify-between gap-3">
//           <dt className="text-ink-muted">Other items</dt>
//           <dd className="font-medium tabular-nums">{otherValue === null ? '—' : formatRupees(otherValue)}</dd>
//         </div>
//         <div className="flex justify-between gap-3">
//           <dt className="text-ink-muted">Delivery</dt>
//           <dd className="font-medium tabular-nums">{formatRupees(deliveryCharge)}</dd>
//         </div>
//         <div className="flex items-center justify-between gap-3 border-t border-brand-100 pt-3">
//           <dt className="text-sm font-semibold">Final Amount</dt>
//           <dd className="text-2xl font-bold tabular-nums text-brand-800">{preview.finalAmount === null ? '—' : formatRupees(preview.finalAmount)}</dd>
//         </div>
//       </dl>

//       <div className={cn('rounded-xl p-3.5 ring-1', status.eligible ? 'bg-brand-50 ring-brand-300' : 'bg-white ring-brand-100')}>
//         <div className="flex items-start justify-between gap-2">
//           <div>
//             <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">First Order Gift Eligibility</p>
//             <p className="mt-0.5 text-sm font-semibold">{formatRupees(order.offer.requiredMedicineAmount)} Medicine Minimum</p>
//             <p className="mt-0.5 text-xs text-ink-soft">Medicine subtotal only. Delivery and other items never count.</p>
//           </div>
//           <span className={cn('shrink-0 rounded-full px-3 py-1 text-xs font-bold', status.eligible ? 'bg-brand-700 text-white' : 'bg-red-50 text-red-700')}>
//             {status.eligible ? 'ELIGIBLE' : 'NOT ELIGIBLE'}
//           </span>
//         </div>
//         <p className="mt-2 text-xs text-ink-soft">
//           Eligible medicine subtotal: <strong className="text-ink">{medicineValue === null ? '—' : formatRupees(medicineValue)}</strong>
//           {!status.saved && ' · preview, confirmed on save'}
//         </p>
//         <ul className="mt-3 grid gap-1.5 text-xs sm:grid-cols-2">
//           {(Object.keys(CHECK_LABELS) as Array<keyof typeof CHECK_LABELS>).map((key) => (
//             <li key={key} className="flex items-center gap-1.5">
//               {status.checks[key] ? <CheckCircle2 className="h-3.5 w-3.5 text-brand-600" aria-hidden /> : <XCircle className="h-3.5 w-3.5 text-red-500" aria-hidden />}
//               <span className={status.checks[key] ? 'text-ink-muted' : 'text-ink'}>{CHECK_LABELS[key]}</span>
//             </li>
//           ))}
//         </ul>
//         <label
//           className={cn(
//             'mt-3 flex min-h-11 items-center gap-2.5 rounded-xl bg-white px-3 text-sm font-semibold ring-1 ring-brand-100',
//             preview.eligible ? 'cursor-pointer' : 'cursor-not-allowed opacity-50',
//           )}
//         >
//           <input type="checkbox" className="h-5 w-5 accent-brand-700" checked={giftIncluded} disabled={!preview.eligible} onChange={(event) => setGiftIncluded(event.target.checked)} />
//           <Gift className="h-4 w-4 text-gift-500" aria-hidden /> FREE {GIFT.shortName} Included
//         </label>
//       </div>

//       {actionsTarget === undefined ? actions : actionsTarget ? createPortal(actions, actionsTarget) : null}
//     </div>
//   );
// }

// function AmountInput({ id, label, hint, value, onChange }: { id: string; label: string; hint: string; value: string; onChange: (value: string) => void }) {
//   const invalid = value.trim() !== '' && !AMOUNT_PATTERN.test(value.trim());
//   return (
//     <div>
//       <label htmlFor={id} className="block text-xs font-semibold text-ink">{label}</label>
//       <div className={cn('mt-1 flex items-center rounded-xl bg-white ring-1 ring-inset focus-within:ring-2', invalid ? 'ring-red-300 focus-within:ring-red-500' : 'ring-brand-100 focus-within:ring-brand-500')}>
//         <span className="pl-3 text-sm text-ink-muted">₹</span>
//         <input
//           id={id}
//           inputMode="decimal"
//           autoComplete="off"
//           value={value}
//           onChange={(event) => onChange(event.target.value.replace(/[^\d.]/g, ''))}
//           placeholder="0"
//           aria-invalid={invalid || undefined}
//           className="h-11 w-full rounded-xl bg-transparent px-2 font-semibold tabular-nums focus:outline-none"
//         />
//       </div>
      
//       <p className="mt-1 text-[11px] text-ink-soft">{hint}</p>
//     </div>
//   );
// }

'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Gift, PackageCheck, Save, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { adminRequest } from '@/lib/adminApi';
import { GIFT } from '@/lib/constants';
import { cn } from '@/lib/cn';
import { formatRupees } from '@/lib/format';
import type { AdminOrder } from '@/lib/types';

const AMOUNT_PATTERN = /^\d{1,7}(\.\d{1,2})?$/;

const parseAmount = (value: string) => (AMOUNT_PATTERN.test(value.trim()) ? Number(value) : null);
const toInput = (amount: number, billed: boolean) => (billed ? String(amount) : '');

const CHECK_LABELS: Record<keyof AdminOrder['offer']['checks'], string> = {
  offerEnabled: 'Offer enabled',
  firstOrder: 'First order',
  meetsMedicineThreshold: 'Medicine subtotal eligible',
  giftNotPreviouslyClaimed: 'Gift not previously claimed',
};

interface Props {
  order: AdminOrder;
  deliveryCharge: number;
  onUpdated: (order: AdminOrder) => void;
  onDelivered: (order: AdminOrder) => void;
  actionsTarget?: HTMLElement | null;
}

export function BillingPanel({ order, deliveryCharge, onUpdated, onDelivered, actionsTarget }: Props) {
  const toast = useToast();
  const billed = Boolean(order.billedAt);
  
  // NEW: State for item-wise medicines
  const [medicinesData, setMedicinesData] = useState(() => 
    order.medicines.map((m: any) => ({
      _id: m._id,
      name: m.name,
      quantity: m.quantity,
      price: toInput(m.price ?? 0, billed),
      isAvailable: m.isAvailable ?? true
    }))
  );

  const [other, setOther] = useState(toInput(order.nonMedicineSubtotal, billed));
  const [discount, setDiscount] = useState(toInput((order as any).discount ?? 0, billed)); // NEW: Discount field
  const [giftIncluded, setGiftIncluded] = useState(order.offerApplied);
  const [saving, setSaving] = useState(false);
  const [confirmDelivery, setConfirmDelivery] = useState(false);
  const [delivering, setDelivering] = useState(false);

  // NEW: Auto-calculate medicine subtotal from items
  const medicineValue = useMemo(() => {
    return medicinesData.reduce((total, item) => {
      if (item.isAvailable) {
        const val = parseAmount(item.price);
        return total + (val ?? 0);
      }
      return total;
    }, 0);
  }, [medicinesData]);

  const otherValue = other.trim() === '' ? 0 : parseAmount(other);
  const discountValue = discount.trim() === '' ? 0 : parseAmount(discount);
  
  // Validate that all available medicines have valid numeric strings
  const medicinesValid = medicinesData.every(m => !m.isAvailable || (m.price.trim() !== '' && parseAmount(m.price) !== null));
  const valid = medicinesValid && otherValue !== null && discountValue !== null;

  const preview = useMemo(() => {
    const checks = {
      ...order.offer.checks,
      meetsMedicineThreshold: medicineValue !== null && medicineValue >= order.offer.requiredMedicineAmount,
    };
    
    // Prevent discount from making final amount negative
    const gross = (medicineValue ?? 0) + (otherValue ?? 0) + deliveryCharge;
    const safeDiscount = (discountValue ?? 0) > gross ? gross : (discountValue ?? 0);
    
    return {
      checks,
      eligible: Object.values(checks).every(Boolean),
      finalAmount: valid ? Math.round((gross - safeDiscount) * 100) / 100 : null,
      appliedDiscount: safeDiscount
    };
  }, [order.offer, medicineValue, otherValue, discountValue, valid, deliveryCharge]);

  const dirty =
    !billed ||
    medicineValue !== order.medicineSubtotal ||
    (otherValue ?? -1) !== order.nonMedicineSubtotal ||
    (discountValue ?? -1) !== (order as any).discount ||
    giftIncluded !== order.offerApplied ||
    deliveryCharge !== order.deliveryCharge ||
    medicinesData.some((m, i) => m.isAvailable !== (order.medicines[i] as any).isAvailable);

  useEffect(() => {
    if (!preview.eligible) setGiftIncluded(false);
  }, [preview.eligible]);

  const updateMedicine = (index: number, field: string, value: any) => {
    setMedicinesData(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const saveBill = async () => {
    if (!valid) {
      toast.error('Enter valid amounts for all items, other charges, and discount.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        medicines: medicinesData.map(m => ({
          _id: m._id,
          price: parseAmount(m.price) ?? 0,
          isAvailable: m.isAvailable
        })),
        nonMedicineSubtotal: otherValue,
        discount: discountValue,
        offerApplied: giftIncluded
      };

      const res = await adminRequest<{ order: AdminOrder }>(`/orders/${order.id}/billing`, {
        method: 'PATCH',
        body: payload,
      });
      onUpdated(res.order);
      setGiftIncluded(res.order.offerApplied);
      toast.success(res.order.offerEligible ? 'Bill saved · Eligible for the free gift' : 'Bill saved');
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const deliver = async () => {
    setDelivering(true);
    try {
      const res = await adminRequest<{ order: AdminOrder }>(`/orders/${order.id}/deliver`, { method: 'PATCH' });
      toast.success(`${order.orderId} marked as delivered`);
      onDelivered(res.order);
    } catch (error) {
      toast.error((error as Error).message);
      setDelivering(false);
      setConfirmDelivery(false);
    }
  };

  const status = billed && !dirty ? { eligible: order.offerEligible, checks: order.offer.checks, saved: true } : { ...preview, saved: false };

  const actions = (
    <div className="space-y-2">
      <div className="grid gap-2 min-[400px]:grid-cols-2">
        <Button variant="secondary" onClick={saveBill} loading={saving} disabled={!valid || delivering} icon={<Save className="h-4 w-4" />}>
          Save Bill
        </Button>
        <AnimatePresence mode="wait" initial={false}>
          {confirmDelivery ? (
            <motion.div key="confirm" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={() => setConfirmDelivery(false)} disabled={delivering}>
                Back
              </Button>
              <Button className="flex-1" onClick={deliver} loading={delivering}>
                Confirm
              </Button>
            </motion.div>
          ) : (
            <motion.div key="deliver" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Button
                className="w-full"
                onClick={() => setConfirmDelivery(true)}
                disabled={!billed || dirty || saving}
                title={!billed || dirty ? 'Save the bill first' : undefined}
                icon={<PackageCheck className="h-4 w-4" />}
              >
                Mark as Delivered
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {confirmDelivery && (
        <p className="text-xs text-ink-muted">
          Confirm payment was collected{order.offerApplied ? ` and the free ${GIFT.shortName} was handed over. The gift will be recorded as claimed.` : '.'}
        </p>
      )}
      {(!billed || dirty) && !confirmDelivery && <p className="text-xs text-ink-soft">Save the bill before marking the order as delivered.</p>}
    </div>
  );

  return (
    <div className="space-y-4">
      
      {/* NEW: Itemized Medicine List */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-ink">Medicines ({medicinesData.length})</h4>
        {medicinesData.map((med, index) => (
          // <div key={med._id} className={cn("p-3 rounded-xl border transition-colors", med.isAvailable ? "bg-white border-brand-100" : "bg-surface border-transparent opacity-80")}>
          <div key={med._id || `legacy-med-${index}`} className={cn("p-3 rounded-xl border transition-colors", med.isAvailable ? "bg-white border-brand-100" : "bg-surface border-transparent opacity-80")}>
            <div className="flex justify-between items-start gap-2">
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-semibold truncate", !med.isAvailable && "line-through text-ink-muted")}>{med.name}</p>
                <p className="text-xs text-ink-soft">{med.quantity}</p>
              </div>
              <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 accent-brand-600 rounded" 
                  checked={med.isAvailable} 
                  onChange={(e) => {
                    updateMedicine(index, 'isAvailable', e.target.checked);
                    if (!e.target.checked) updateMedicine(index, 'price', '0');
                  }} 
                />
                <span className="text-xs font-medium text-ink-muted">In Stock</span>
              </label>
            </div>
            {med.isAvailable && (
              <div className="mt-3">
                <AmountInput 
                  id={`price-${med._id}`} 
                  label="" 
                  hint="" 
                  value={med.price} 
                  onChange={(val) => updateMedicine(index, 'price', val)} 
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2">
        <AmountInput id={`${order.id}-other`} label="Other Items Subtotal" hint="Cosmetics, FMCG, general" value={other} onChange={setOther} />
        <AmountInput id={`${order.id}-discount`} label="Discount" hint="Global order discount" value={discount} onChange={setDiscount} />
      </div>

      <dl className="space-y-2 rounded-xl bg-surface p-3.5 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-ink-muted">Medicine subtotal</dt>
          <dd className="font-medium tabular-nums">{medicineValue === null ? '—' : formatRupees(medicineValue)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-ink-muted">Other items</dt>
          <dd className="font-medium tabular-nums">{otherValue === null ? '—' : formatRupees(otherValue)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-ink-muted">Delivery</dt>
          <dd className="font-medium tabular-nums">{formatRupees(deliveryCharge)}</dd>
        </div>
        <div className="flex justify-between gap-3 text-brand-700">
          <dt className="font-medium">Discount</dt>
          <dd className="font-medium tabular-nums">-{preview.appliedDiscount === null ? '—' : formatRupees(preview.appliedDiscount)}</dd>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-brand-100 pt-3">
          <dt className="text-sm font-semibold">Final Amount</dt>
          <dd className="text-2xl font-bold tabular-nums text-brand-800">{preview.finalAmount === null ? '—' : formatRupees(preview.finalAmount)}</dd>
        </div>
      </dl>

      <div className={cn('rounded-xl p-3.5 ring-1', status.eligible ? 'bg-brand-50 ring-brand-300' : 'bg-white ring-brand-100')}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">First Order Gift Eligibility</p>
            <p className="mt-0.5 text-sm font-semibold">{formatRupees(order.offer.requiredMedicineAmount)} Medicine Minimum</p>
            <p className="mt-0.5 text-xs text-ink-soft">Medicine subtotal only. Delivery and other items never count.</p>
          </div>
          <span className={cn('shrink-0 rounded-full px-3 py-1 text-xs font-bold', status.eligible ? 'bg-brand-700 text-white' : 'bg-red-50 text-red-700')}>
            {status.eligible ? 'ELIGIBLE' : 'NOT ELIGIBLE'}
          </span>
        </div>
        <p className="mt-2 text-xs text-ink-soft">
          Eligible medicine subtotal: <strong className="text-ink">{medicineValue === null ? '—' : formatRupees(medicineValue)}</strong>
          {!status.saved && ' · preview, confirmed on save'}
        </p>
        <ul className="mt-3 grid gap-1.5 text-xs sm:grid-cols-2">
          {(Object.keys(CHECK_LABELS) as Array<keyof typeof CHECK_LABELS>).map((key) => (
            <li key={key} className="flex items-center gap-1.5">
              {status.checks[key] ? <CheckCircle2 className="h-3.5 w-3.5 text-brand-600" aria-hidden /> : <XCircle className="h-3.5 w-3.5 text-red-500" aria-hidden />}
              <span className={status.checks[key] ? 'text-ink-muted' : 'text-ink'}>{CHECK_LABELS[key]}</span>
            </li>
          ))}
        </ul>
        <label
          className={cn(
            'mt-3 flex min-h-11 items-center gap-2.5 rounded-xl bg-white px-3 text-sm font-semibold ring-1 ring-brand-100',
            preview.eligible ? 'cursor-pointer' : 'cursor-not-allowed opacity-50',
          )}
        >
          <input type="checkbox" className="h-5 w-5 accent-brand-700" checked={giftIncluded} disabled={!preview.eligible} onChange={(event) => setGiftIncluded(event.target.checked)} />
          <Gift className="h-4 w-4 text-gift-500" aria-hidden /> FREE {GIFT.shortName} Included
        </label>
      </div>

      {actionsTarget === undefined ? actions : actionsTarget ? createPortal(actions, actionsTarget) : null}
    </div>
  );
}

function AmountInput({ id, label, hint, value, onChange }: { id: string; label?: string; hint?: string; value: string; onChange: (value: string) => void }) {
  const invalid = value.trim() !== '' && !AMOUNT_PATTERN.test(value.trim());
  return (
    <div>
      {label && <label htmlFor={id} className="block text-xs font-semibold text-ink">{label}</label>}
      <div className={cn('flex items-center rounded-xl bg-white ring-1 ring-inset focus-within:ring-2', label && 'mt-1', invalid ? 'ring-red-300 focus-within:ring-red-500' : 'ring-brand-100 focus-within:ring-brand-500')}>
        <span className="pl-3 text-sm text-ink-muted">₹</span>
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          value={value}
          onChange={(event) => onChange(event.target.value.replace(/[^\d.]/g, ''))}
          placeholder="0"
          aria-invalid={invalid || undefined}
          className="h-11 w-full rounded-xl bg-transparent px-2 font-semibold tabular-nums focus:outline-none"
        />
      </div>
      {hint && <p className="mt-1 text-[11px] text-ink-soft">{hint}</p>}
    </div>
  );
}
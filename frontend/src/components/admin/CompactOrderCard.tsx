// //components/admin/CompactOrderCard.tsx
// 'use client';

// import { memo } from 'react';
// import { BellOff, ChevronRight, Gift } from 'lucide-react';
// export type OrderType = 'manual_text' | 'prescription_image';
// export type OrderStatus = 'Pending' | 'Delivered' | 'Cancelled';

// export interface MedicineItem {
//   _id?: string;
//   name: string;
//   quantity: string;
//   price?: number;
//   isAvailable?: boolean;
// }

// export interface OrderProduct {
//   _id?: string;
//   productId?: string;
//   name: string;
//   price: number;
//   quantity: number;
// }

// export interface Address {
//   flat: string;
//   area: string;
//   landmark: string;
// }

// export interface OfferEvaluation {
//   eligible: boolean;
//   checks: {
//     offerEnabled: boolean;
//     firstOrder: boolean;
//     meetsMedicineThreshold: boolean;
//     giftNotPreviouslyClaimed: boolean;
//   };
//   requiredMedicineAmount: number;
//   eligibleMedicineSubtotal: number;
// }

// export interface CustomerSummary {
//   fullName: string;
//   mobileNumber: string;
//   totalOrders: number;
//   deliveredOrders: number;
//   offerClaimed: boolean;
//   offerClaimedOrderId: string | null;
//   isFirstTimeCustomer?: boolean;
// }

// export interface AdminOrder {
//   id: string;
//   orderId: string;
//   customerName: string;
//   mobileNumber: string;
//   orderType: OrderType;
//   medicines: MedicineItem[];
//   products?: OrderProduct[]; 
//   prescriptionUrl: string | null;
//   address: Address;
//   paymentMethod: string;
//   medicineSubtotal: number;
//   nonMedicineSubtotal: number;
//   deliveryCharge: number;
//   discount?: number;
//   finalAmount: number;
//   billedAt: string | null;
//   offerOptIn: boolean;
//   firstOrderAtCreation: boolean;
//   previousOrders: number;
//   offerEligible: boolean;
//   offerApplied: boolean;
//   offer: OfferEvaluation;
//   status: OrderStatus;
//   telegramNotificationSent: boolean;
//   createdAt: string;
//   deliveredAt: string | null;
//   customer: CustomerSummary | null;
//   cancelReason: string | null;
// }

// // ==========================================
// // UTILS 
// // ==========================================

// function cn(...classes: Array<string | false | null | undefined>) {
//   return classes.filter(Boolean).join(' ');
// }

// const rupees = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2, minimumFractionDigits: 0 });
// const dateTime = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });

// const formatRupees = (amount: number) => rupees.format(amount);
// const formatDateTime = (iso: string) => dateTime.format(new Date(iso));

// const formatMobile = (mobile?: string | null) => {
//   if (!mobile || typeof mobile !== 'string') return 'N/A';
//   return `+91 ${mobile.slice(0, 5)} ${mobile.slice(5)}`;
// };

// // ==========================================
// // ORDER STATUS BADGE COMPONENT
// // ==========================================

// const TONES: Record<OrderStatus, { pill: string; dot: string }> = {
//   Pending: { pill: 'bg-amber-50 text-amber-800 ring-amber-200', dot: 'bg-amber-500' },
//   Delivered: { pill: 'bg-brand-50 text-brand-800 ring-brand-200', dot: 'bg-brand-600' },
//   Cancelled: { pill: 'bg-red-50 text-red-700 ring-red-200', dot: 'bg-red-500' },
// };

// interface OrderStatusBadgeProps {
//   status: OrderStatus;
//   className?: string;
// }

// /** The text label is always rendered, so status never depends on colour alone. */
// export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
//   const tone = TONES[status];
//   return (
//     <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset', tone.pill, className)}>
//       <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', tone.dot)} />
//       {status}
//     </span>
//   );
// }

// // ==========================================
// // COMPACT ORDER CARD COMPONENT
// // ==========================================

// interface CompactOrderCardProps {
//   order: AdminOrder;
//   selected: boolean;
//   /** The trigger element is passed up so the board can restore focus when the drawer closes. */
//   onSelect: (id: string, trigger: HTMLElement) => void;
// }

// function buildSummary(order: AdminOrder) {
//   const parts: string[] = [];
//   if (order.orderType === 'manual_text') {
//     const count = order.medicines.length;
//     parts.push(`${count} ${count === 1 ? 'medicine' : 'medicines'} · Manual order`);
//   } else {
//     parts.push('Prescription upload');
//   }
//   if (order.status === 'Delivered') parts.push(formatRupees(order.finalAmount));
//   if (order.status === 'Cancelled' && order.cancelReason) parts.push(order.cancelReason);
//   return parts.join(' · ');
// }

// export const CompactOrderCard = memo(function CompactOrderCard({ order, selected, onSelect }: CompactOrderCardProps) {
//   const giftRequested = order.offerOptIn && order.firstOrderAtCreation;
//   const notNotified = !order.telegramNotificationSent;

//   const label = [
//     `Order ${order.orderId}`,
//     order.customerName,
//     order.status,
//     giftRequested ? 'gift requested' : null,
//     notNotified ? 'Telegram notification not delivered' : null,
//   ]
//     .filter(Boolean)
//     .join(', ');

//   return (
//     <button
//       type="button"
//       onClick={(event) => onSelect(order.id, event.currentTarget)}
//       aria-current={selected ? 'true' : undefined}
//       aria-label={`${label}. View details`}
//       className={cn(
//         'group flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition duration-150',
//         'hover:-translate-y-px hover:border-brand-300 hover:shadow-sm',
//         'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
//         selected ? 'border-brand-500 bg-brand-50/60' : 'border-brand-100 bg-white',
//       )}
//     >
//       <span className="min-w-0 flex-1">
//         <span className="flex items-start justify-between gap-2">
//           <span className="font-mono text-base font-bold tracking-wide text-brand-800">{order.orderId}</span>
//           <span className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
//             {notNotified && (
//               <span className="inline-flex items-center gap-1 rounded-full bg-gift-50 px-2 py-1 text-xs font-semibold text-gift-600" title="Telegram notification was not delivered">
//                 <BellOff className="h-3 w-3" aria-hidden />
//                 <span className="sr-only sm:not-sr-only">Not notified</span>
//               </span>
//             )}
//             {giftRequested && (
//               <span className="inline-flex items-center gap-1 rounded-full bg-gift-100 px-2 py-1 text-xs font-semibold text-gift-600" title="Gift requested">
//                 <Gift className="h-3 w-3" aria-hidden />
//                 <span className="sr-only sm:not-sr-only">Gift</span>
//               </span>
//             )}
//             <OrderStatusBadge status={order.status} />
//           </span>
//         </span>

//         <span className="mt-1 block truncate text-sm font-semibold text-ink">{order.customerName}</span>
//         <span className="block text-xs text-ink-muted">{formatMobile(order.mobileNumber)}</span>

//         <span className="mt-2 flex items-center justify-between gap-3 text-xs text-ink-soft">
//           <span className="truncate">{buildSummary(order)}</span>
//           <span className="shrink-0">{formatDateTime(order.createdAt)}</span>
//         </span>
//       </span>
//       <ChevronRight className="h-5 w-5 shrink-0 text-ink-soft transition-transform group-hover:translate-x-0.5" aria-hidden />
//     </button>
//   );
// });
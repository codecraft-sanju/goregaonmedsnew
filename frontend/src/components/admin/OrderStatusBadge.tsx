// //src/components/admin/OrderStatusBadge.tsx
// export type OrderType = 'manual_text' | 'prescription_image';
// export type OrderStatus = 'Pending' | 'Delivered' | 'Cancelled';

// export interface MedicineItem {
//   _id?: string;
//   name: string;
//   quantity: string;
//   price?: number;
//   isAvailable?: boolean;
// }

// export interface Product {
//   _id: string;
//   name: string;
//   category: string;
//   description: string;
//   price: number;
//   imageUrl: string | null;
//   isActive: boolean;
//   inStock: boolean;
//   createdAt?: string;
//   updatedAt?: string;
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

// export interface PublicSettings {
//   deliveryCharge: number;
//   firstOrderOfferEnabled: boolean;
//   firstOrderMinimumMedicineAmount: number;
// }

// export interface AdminSettings extends PublicSettings {
//   updatedAt?: string;
// }

// export interface CreateOrderPayload {
//   clientRequestId: string;
//   customerName: string;
//   mobileNumber: string;
//   orderType: OrderType;
//   medicines: MedicineItem[];
//   products?: OrderProduct[]; 
//   prescriptionUrl?: string;
//   address: Address;
//   offerOptIn: boolean;
// }

// export interface CreateOrderResponse {
//   success: true;
//   orderId: string;
//   status: OrderStatus;
//   telegramNotificationSent: boolean;
// }

// export interface TrackedOrder {
//   orderId: string;
//   status: OrderStatus;
//   statusLabel: string;
//   orderType: OrderType;
//   itemCount: number;
//   placedAt: string;
//   deliveredAt: string | null;
//   paymentMethod: string;
//   finalAmount: number | null;
//   cancelReason: string | null;
//   medicines?: MedicineItem[];
//   products?: OrderProduct[]; 
//   medicineSubtotal?: number;
//   nonMedicineSubtotal?: number;
//   deliveryCharge?: number;
//   discount?: number;
//   offerApplied?: boolean;
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

// export interface Pagination {
//   page: number;
//   limit: number;
//   total: number;
//   totalPages: number;
// }

// // ==========================================
// // UTILS
// // ==========================================
// export function cn(...classes: Array<string | false | null | undefined>) {
//   return classes.filter(Boolean).join(' ');
// }

// // ==========================================
// // COMPONENT
// // ==========================================
// const TONES: Record<OrderStatus, { pill: string; dot: string }> = {
//   Pending: { pill: 'bg-amber-50 text-amber-800 ring-amber-200', dot: 'bg-amber-500' },
//   Delivered: { pill: 'bg-brand-50 text-brand-800 ring-brand-200', dot: 'bg-brand-600' },
//   Cancelled: { pill: 'bg-red-50 text-red-700 ring-red-200', dot: 'bg-red-500' },
// };

// interface Props {
//   status: OrderStatus;
//   className?: string;
// }

// /** The text label is always rendered, so status never depends on colour alone. */
// export function OrderStatusBadge({ status, className }: Props) {
//   const tone = TONES[status];
//   return (
//     <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset', tone.pill, className)}>
//       <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', tone.dot)} />
//       {status}
//     </span>
//   );
// }
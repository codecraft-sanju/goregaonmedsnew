// lib/types.ts
export type OrderType = 'manual_text' | 'prescription_image';

export type OrderStatus = 'Pending' | 'Delivered' | 'Cancelled';

export interface MedicineItem {
  _id?: string;
  name: string;
  quantity: string;
  price?: number;
  isAvailable?: boolean;
}

export interface Address {
  flat: string;
  area: string;
  landmark: string;
}

export interface PublicSettings {
  deliveryCharge: number;
  firstOrderOfferEnabled: boolean;
  firstOrderMinimumMedicineAmount: number;
}

export interface AdminSettings extends PublicSettings {
  updatedAt?: string;
}

export interface CreateOrderPayload {
  clientRequestId: string;
  customerName: string;
  mobileNumber: string;
  orderType: OrderType;
  medicines: MedicineItem[];
  prescriptionUrl?: string;
  address: Address;
  offerOptIn: boolean;
}

export interface CreateOrderResponse {
  success: true;
  orderId: string;
  status: OrderStatus;
  telegramNotificationSent: boolean;
}

export interface TrackedOrder {
  orderId: string;
  status: OrderStatus;
  statusLabel: string;
  orderType: OrderType;
  itemCount: number;
  placedAt: string;
  deliveredAt: string | null;
  paymentMethod: string;
  finalAmount: number | null;
  cancelReason: string | null;
  medicines?: MedicineItem[];
  medicineSubtotal?: number;
  nonMedicineSubtotal?: number;
  deliveryCharge?: number;
  discount?: number;
}

export interface OfferEvaluation {
  eligible: boolean;
  checks: {
    offerEnabled: boolean;
    firstOrder: boolean;
    meetsMedicineThreshold: boolean;
    giftNotPreviouslyClaimed: boolean;
  };
  requiredMedicineAmount: number;
  eligibleMedicineSubtotal: number;
}

export interface CustomerSummary {
  fullName: string;
  mobileNumber: string;
  totalOrders: number;
  deliveredOrders: number;
  offerClaimed: boolean;
  offerClaimedOrderId: string | null;
  isFirstTimeCustomer?: boolean;
}

export interface AdminOrder {
  id: string;
  orderId: string;
  customerName: string;
  mobileNumber: string;
  orderType: OrderType;
  medicines: MedicineItem[];
  prescriptionUrl: string | null;
  address: Address;
  paymentMethod: string;
  medicineSubtotal: number;
  nonMedicineSubtotal: number;
  deliveryCharge: number;
  discount?: number;
  finalAmount: number;
  billedAt: string | null;
  offerOptIn: boolean;
  firstOrderAtCreation: boolean;
  previousOrders: number;
  offerEligible: boolean;
  offerApplied: boolean;
  offer: OfferEvaluation;
  status: OrderStatus;
  telegramNotificationSent: boolean;
  createdAt: string;
  deliveredAt: string | null;
  customer: CustomerSummary | null;
  cancelReason: string | null;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
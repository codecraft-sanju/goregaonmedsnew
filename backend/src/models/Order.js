import mongoose from 'mongoose';

export const ORDER_STATUSES = Object.freeze(['Pending', 'Delivered']);
export const ORDER_TYPES = Object.freeze(['manual_text', 'prescription_image']);
export const PAYMENT_METHOD = 'Pay at Delivery (Cash/UPI)';

const medicineSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    quantity: { type: String, required: true, trim: true, maxlength: 60 },
  },
  { _id: false },
);

const money = { type: Number, default: 0, min: 0 };

const orderSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true, index: true },
    clientRequestId: { type: String, required: true, unique: true },
    mobileNumber: { type: String, required: true, index: true },
    customerName: { type: String, required: true, trim: true, maxlength: 80 },
    orderType: { type: String, enum: ORDER_TYPES, required: true },
    medicines: { type: [medicineSchema], default: [] },
    prescriptionUrl: { type: String, default: null },
    address: {
      flat: { type: String, required: true, trim: true, maxlength: 120 },
      area: { type: String, required: true, trim: true, maxlength: 120 },
      landmark: { type: String, trim: true, maxlength: 120, default: '' },
    },
    paymentMethod: { type: String, default: PAYMENT_METHOD },

    // Billing. The first-order gift threshold is checked against medicineSubtotal ONLY.
    medicineSubtotal: money,
    nonMedicineSubtotal: money,
    deliveryCharge: money,
    finalAmount: money,
    billedAt: { type: Date, default: null },

    // Offer state. offerOptIn records the customer's banner choice; eligibility is decided at billing.
    offerOptIn: { type: Boolean, default: false },
    firstOrderAtCreation: { type: Boolean, required: true },
    customerOrderNumber: { type: Number, required: true, min: 1 },
    offerEligible: { type: Boolean, default: false },
    offerApplied: { type: Boolean, default: false },

    status: { type: String, enum: ORDER_STATUSES, default: 'Pending', index: true },
    telegramNotificationSent: { type: Boolean, default: false },
    deliveredAt: { type: Date, default: null },
  },
  { timestamps: true },
);

orderSchema.index({ status: 1, createdAt: -1 });

export const Order = mongoose.models.Order ?? mongoose.model('Order', orderSchema);

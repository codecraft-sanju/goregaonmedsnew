//src/validation/schemas.js
import { z } from 'zod';
import { ORDER_STATUSES, ORDER_TYPES } from '../models/Order.js';
import { normalizeIndianMobile } from '../utils/phone.js';
import { MAX_BILL_AMOUNT } from '../utils/money.js';
import { ORDER_ID_PATTERN } from '../utils/orderId.js';
import { cleanText } from '../utils/text.js';

const text = (min, max, label) =>
  z
    .string({ required_error: `${label} is required` })
    .transform(cleanText)
    .pipe(z.string().min(min, `${label} is required`).max(max, `${label} is too long`));

const optionalText = (max, label) =>
  z.string().max(max * 2).optional().default('').transform(cleanText).pipe(z.string().max(max, `${label} is too long`));

const mobileNumber = z
  .string({ required_error: 'Mobile number is required' })
  .max(20)
  .transform((value, ctx) => {
    const normalized = normalizeIndianMobile(value);
    if (!normalized) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Enter a valid 10-digit Indian mobile number' });
      return z.NEVER;
    }
    return normalized;
  });

const medicine = z.object({
  name: text(1, 120, 'Medicine name'),
  quantity: text(1, 60, 'Quantity'),
});

// Pricing, eligibility and status fields are intentionally absent: anything the browser sends
// for them is stripped and never read.
export const createOrderSchema = z
  .object({
    clientRequestId: z.string().uuid('Invalid request id'),
    customerName: text(2, 80, 'Full name'),
    mobileNumber,
    orderType: z.enum(ORDER_TYPES),
    medicines: z.array(medicine).max(30, 'Up to 30 medicines per order').default([]),
    prescriptionUrl: z.string().max(500).optional(),
    address: z.object({
      flat: text(1, 120, 'Flat / House / Building'),
      area: text(2, 120, 'Area'),
      landmark: optionalText(120, 'Landmark'),
    }),
    offerOptIn: z.boolean().default(false),
  })
  .superRefine((order, ctx) => {
    if (order.orderType === 'manual_text' && order.medicines.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['medicines'], message: 'Add at least one medicine' });
    }
    if (order.orderType === 'prescription_image' && !order.prescriptionUrl) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['prescriptionUrl'], message: 'Upload your prescription' });
    }
  });

export const trackOrderSchema = z.object({
  orderId: z
    .string()
    .max(20)
    .transform((value) => value.trim().toUpperCase())
    .pipe(z.string().regex(ORDER_ID_PATTERN, 'Enter a valid Order ID, e.g. GMED-X8P2K7')),
  mobileLast4: z.string().regex(/^\d{4}$/, 'Enter the last 4 digits of your mobile number'),
});

export const loginSchema = z.object({
  username: z.string().min(1).max(100),
  password: z.string().min(1).max(200),
});

const amount = (label) =>
  z
    .number({ required_error: `${label} is required`, invalid_type_error: `${label} must be a number` })
    .finite()
    .min(0, `${label} cannot be negative`)
    .max(MAX_BILL_AMOUNT, `${label} is too large`)
    .refine((value) => Number.isInteger(Math.round(value * 100 * 1e6) / 1e6), `${label} can have at most 2 decimals`);

// // Only the two subtotals (and the gift checkbox) are accepted; delivery and final amount are server-computed.
// export const billingSchema = z
//   .object({
//     medicineSubtotal: amount('Medicine subtotal'),
//     nonMedicineSubtotal: amount('Other items subtotal'),
//     offerApplied: z.boolean().default(false),
//   })
//   .strict();

// Only nonMedicineSubtotal, discount, offerApplied and item prices are accepted.
// medicineSubtotal, deliveryCharge, and finalAmount are purely server-computed.
// export const billingSchema = z
//   .object({
//     medicines: z.array(
//       z.object({
//         _id: z.string(),
//         price: z.number().min(0, 'Price cannot be negative').default(0),
//         isAvailable: z.boolean().default(true),
//       })
//     ).optional().default([]),
//     nonMedicineSubtotal: amount('Other items subtotal'),
//     discount: amount('Discount').default(0),
//     offerApplied: z.boolean().default(false),
//   })
//   .strict();

// Only nonMedicineSubtotal, discount, offerApplied and item prices are accepted.
// medicineSubtotal, deliveryCharge, and finalAmount are purely server-computed.
export const billingSchema = z
  .object({
    medicines: z.array(
      z.object({
        _id: z.string().optional(), // <-- Made optional for older orders
        price: z.number().min(0, 'Price cannot be negative').default(0),
        isAvailable: z.boolean().default(true),
      })
    ).optional().default([]),
    nonMedicineSubtotal: amount('Other items subtotal'),
    discount: amount('Discount').default(0),
    offerApplied: z.boolean().default(false),
  })
  .strict();

export const settingsUpdateSchema = z
  .object({
    deliveryCharge: amount('Delivery charge').pipe(z.number().max(2000, 'Delivery charge is too large')),
    firstOrderOfferEnabled: z.boolean(),
    firstOrderMinimumMedicineAmount: amount('Minimum medicine amount'),
  })
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'Nothing to update');

const page = z.coerce.number().int().min(1).max(10_000).default(1);

export const listOrdersQuerySchema = z.object({
  status: z.enum(ORDER_STATUSES).default('Pending'),
  page,
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const listCustomersQuerySchema = z.object({
  q: z.string().max(80).optional().transform((value) => (value ? cleanText(value) : '')),
  page,
  limit: z.coerce.number().int().min(1).max(50).default(20),
});


export const cancelOrderSchema = z.object({
  cancelReason: z.string().min(1, 'Reason is required').max(300, 'Reason is too long').transform(cleanText),
}).strict();

//src/validation/schemas.js
import { z } from 'zod';
import { ORDER_STATUSES, ORDER_TYPES } from '../models/Order.js';
import { normalizeIndianMobile } from '../utils/phone.js';
import { MAX_BILL_AMOUNT } from '../utils/money.js';
// import { ORDER_ID_PATTERN } from '../utils/orderId.js';
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
  quantity: z.union([z.string(), z.number()])
    .transform(val => (val === '' ? 0 : Number(val))) 
    .pipe(
      z.number({ invalid_type_error: 'Quantity is required' })
       .int('Quantity must be a whole number')
       .min(1, 'Quantity cannot be zero or empty')
       .max(100, 'Quantity cannot exceed 100')
    ),
});

const orderProduct = z.object({
  productId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Product ID'),
  name: z.string().optional(),
  price: z.number().min(0).optional(),
  quantity: z.union([z.string(), z.number()])
    .transform(val => (val === '' ? 0 : Number(val)))
    .pipe(
      z.number({ invalid_type_error: 'Quantity is required' })
       .int('Quantity must be a whole number')
       .min(1, 'Quantity cannot be zero or empty')
       .max(100, 'Quantity cannot exceed 100')
    ),
});

export const checkoutAddressSchema = z.object({
  flat: text(1, 120, 'Flat / House / Building'),
  area: text(2, 120, 'Area'),
  landmark: optionalText(120, 'Landmark')
}).strict();

export const createOrderSchema = z
  .object({
    clientRequestId: z.string().uuid('Invalid request id'),
    customerName: text(2, 80, 'Full name'),
    mobileNumber,
    orderType: z.enum(ORDER_TYPES),
    medicines: z.array(medicine).max(30, 'Up to 30 medicines per order').default([]),
    products: z.array(orderProduct).max(20, 'Up to 20 products per order').default([]),
    prescriptionUrl: z.string().max(500).optional(),
    address: checkoutAddressSchema,
    
    offerOptIn: z.boolean().default(false),
  })
  .superRefine((order, ctx) => {
    if (order.orderType === 'manual_text' && order.medicines.length === 0 && order.products.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['medicines'], message: 'Add at least one medicine or product' });
    }
    if (order.orderType === 'prescription_image' && !order.prescriptionUrl) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['prescriptionUrl'], message: 'Upload your prescription' });
    }
    
    // FIX: Duplicate Product Array Check
    const productIds = order.products.map(p => p.productId);
    if (new Set(productIds).size !== productIds.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['products'], message: 'Duplicate products are not allowed in checkout. Please merge quantities into a single item.' });
    }
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

export const billingSchema = z
  .object({
    medicines: z.array(
      z.object({
        _id: z.string().optional(),
        name: z.string().max(120, 'Name is too long').optional(),
        quantity: z.coerce.number().int().min(1).max(100).optional(),
    price: z.number().min(0, 'Price cannot be negative').optional(),
        isAvailable: z.boolean().default(true),
      })
    ).optional(),
  
    products: z.array(
      z.object({
        _id: z.string().optional(),
        productId: z.string().optional(),
        name: z.string().max(120, 'Name is too long').optional(),
      price: z.number().min(0, 'Price cannot be negative').optional(),
        quantity: z.coerce.number().int().min(1).max(100).optional(),
      })
    ).optional(),
    
    // FIX: Ignore frontend subtotal
    nonMedicineSubtotal: z.any().optional(),
    discount: amount('Discount').default(0),
    offerApplied: z.boolean().default(false),
    billingVersion: z.number().int().min(0) 
  })
  .strict();

export const settingsUpdateSchema = z
  .object({
    deliveryCharge: amount('Delivery charge').pipe(z.number().max(2000, 'Delivery charge is too large')),
    firstOrderOfferEnabled: z.boolean(),
    firstOrderMinimumMedicineAmount: amount('Minimum medicine amount'),
    lowStockThreshold: z.coerce.number().int().min(0, 'Threshold cannot be negative'), 
    trendingProducts: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID')).max(20).optional(), 
    trendingLimit: z.coerce.number().int().min(1, 'Minimum 1 product').max(20, 'Maximum 20 products').optional(),
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


export const historyQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20)
}).strict();

export const createProductSchema = z.object({
  name: text(2, 120, 'Product name'),
  category: text(2, 60, 'Category'),
  description: z.string().max(500, 'Description too long').optional().default(''),
  price: z.number().min(0, 'Price cannot be negative'),
  imageUrl: z.string().url('Invalid image URL').optional().or(z.literal('')),
  isActive: z.boolean().default(true),
  inStock: z.boolean().default(true),
  trackStock: z.boolean().default(false),
  stockQuantity: z.coerce.number().int().min(0).default(0),
  kind: z.enum(['medicine', 'non_medicine']).default('non_medicine')
}).strict();

export const updateProductSchema = createProductSchema.partial();

export const sendOtpSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254)
}).strict();

export const verifyOtpSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  otp: z.string().regex(/^\d{6}$/, 'Enter a valid 6-digit OTP')
}).strict();

export const updateCartSchema = z.object({
  productId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Product ID'),
  quantity: z.union([z.string(), z.number()])
    .transform(val => (val === '' ? null : Number(val)))
    .pipe(
      z.number({ invalid_type_error: 'Quantity cannot be empty' })
       .int('Quantity must be a whole number')
       .min(0, 'Quantity cannot be negative')
       .max(100, 'Quantity cannot exceed 100')
    )
}).strict();

export const reverseGeocodeSchema = z.object({
  lat: z.coerce.number().min(-90).max(90, 'Invalid latitude'),
  lng: z.coerce.number().min(-180).max(180, 'Invalid longitude')
}).strict();
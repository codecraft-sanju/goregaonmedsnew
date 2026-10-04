//src/services/orderService.js
import { Order } from '../models/Order.js';
import { User } from '../models/User.js';
import { generateOrderId } from '../utils/orderId.js';
import { duplicateKeyField } from '../utils/mongoErrors.js';
import { conflict } from '../utils/AppError.js';
import { getSettings } from './settingsService.js';

const MAX_ORDER_ID_ATTEMPTS = 5;

function toCreateResponse(order) {
  return {
    success: true,
    orderId: order.orderId,
    status: order.status,
    telegramNotificationSent: Boolean(order.telegramNotificationSent),
  };
}

async function findReplay(clientRequestId, mobileNumber) {
  const existing = await Order.findOne({ clientRequestId }).lean();
  if (!existing) return null;
  if (existing.mobileNumber !== mobileNumber) {
    throw conflict('This order request was already used. Please refresh and try again.', 'DUPLICATE_REQUEST');
  }
  return existing;
}

/**
 * Atomically counts the order against the customer and reports whether it is their first.
 * Returns the customer's order count before this order.
 */
async function registerCustomerOrder(mobileNumber, fullName) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const previous = await User.findOneAndUpdate(
        { mobileNumber },
        { $inc: { totalOrders: 1 }, $set: { fullName } },
        { upsert: true, new: false, lean: true },
      );
      return previous?.totalOrders ?? 0;
    } catch (error) {
      // Two simultaneous first orders for one number: the losing upsert retries as an update.
      if (duplicateKeyField(error) !== 'mobileNumber' || attempt > 0) throw error;
    }
  }
  throw new Error('unreachable');
}

async function insertOrder(fields) {
  for (let attempt = 1; attempt <= MAX_ORDER_ID_ATTEMPTS; attempt += 1) {
    try {
      return await Order.create({ ...fields, orderId: generateOrderId() });
    } catch (error) {
      if (duplicateKeyField(error) !== 'orderId' || attempt === MAX_ORDER_ID_ATTEMPTS) throw error;
    }
  }
  throw new Error('unreachable');
}

/**
 * Creates an order. MongoDB is written first; Telegram is attempted second and its failure
 * never fails the order (the response reports telegramNotificationSent: false instead).
 */
export async function createOrder(input, { notifier, logger = console }) {
  const replay = await findReplay(input.clientRequestId, input.mobileNumber);
  if (replay) return toCreateResponse(replay);

  const settings = await getSettings();
  const previousOrders = await registerCustomerOrder(input.mobileNumber, input.customerName);

  let order;
  try {
    order = await insertOrder({
      clientRequestId: input.clientRequestId,
      mobileNumber: input.mobileNumber,
      customerName: input.customerName,
      orderType: input.orderType,
      medicines: input.medicines,
      prescriptionUrl: input.orderType === 'prescription_image' ? input.prescriptionUrl : null,
      address: input.address,
      offerOptIn: input.offerOptIn,
      firstOrderAtCreation: previousOrders === 0,
      customerOrderNumber: previousOrders + 1,
      telegramNotificationSent: false,
    });
  } catch (error) {
    // Undo the customer counter so a failed insert does not consume their first order.
    await User.updateOne({ mobileNumber: input.mobileNumber, totalOrders: { $gt: 0 } }, { $inc: { totalOrders: -1 } });
    if (duplicateKeyField(error) === 'clientRequestId') {
      const raced = await findReplay(input.clientRequestId, input.mobileNumber);
      if (raced) return toCreateResponse(raced);
    }
    throw error;
  }

  let sent = false;
  try {
    sent = (await notifier.notifyNewOrder(order.toObject(), settings)) === true;
  } catch (error) {
    logger.error(`[orders] notifier failed for ${order.orderId}: ${error.message}`);
  }
  if (sent) {
    order.telegramNotificationSent = true;
    try {
      await Order.updateOne({ _id: order._id }, { $set: { telegramNotificationSent: true } });
    } catch (error) {
      logger.error(`[orders] could not record Telegram delivery for ${order.orderId}: ${error.message}`);
    }
  }

  return toCreateResponse(order);
}

const STATUS_LABELS = {
  Pending: 'Order Received & Processing',
  Delivered: 'Delivered',
};

// /** Returns only what a customer needs, and the same "not found" for a wrong ID or wrong number. */
// export async function trackOrder({ orderId, mobileLast4 }) {
//   const order = await Order.findOne({ orderId }).lean();
//   if (!order || order.mobileNumber.slice(-4) !== mobileLast4) return null;
//   return {
//     orderId: order.orderId,
//     status: order.status,
//     statusLabel: STATUS_LABELS[order.status],
//     orderType: order.orderType,
//     itemCount: order.medicines.length,
//     placedAt: order.createdAt,
//     deliveredAt: order.deliveredAt,
//     paymentMethod: order.paymentMethod,
//     finalAmount: order.billedAt ? order.finalAmount : null,
//   };
// }
/** Returns only what a customer needs, and the same "not found" for a wrong ID or wrong number. */
export async function trackOrder({ orderId, mobileLast4 }) {
  const order = await Order.findOne({ orderId }).lean();
  if (!order || order.mobileNumber.slice(-4) !== mobileLast4) return null;
  return {
    orderId: order.orderId,
    status: order.status,
    statusLabel: STATUS_LABELS[order.status],
    orderType: order.orderType,
    itemCount: order.medicines.length,
    placedAt: order.createdAt,
    deliveredAt: order.deliveredAt,
    paymentMethod: order.paymentMethod,
    
    // NEW: Complete Billing Transparency for User
    medicines: order.medicines,
    medicineSubtotal: order.medicineSubtotal,
    nonMedicineSubtotal: order.nonMedicineSubtotal,
    deliveryCharge: order.deliveryCharge,
    discount: order.discount,
    finalAmount: order.billedAt ? order.finalAmount : null,
  };
}
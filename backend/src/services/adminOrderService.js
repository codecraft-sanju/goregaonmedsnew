//src/services/adminOrderService.js

import mongoose from 'mongoose';
import { Order } from '../models/Order.js';
import { User } from '../models/User.js';
import { conflict, notFound, unprocessable, badRequest } from '../utils/AppError.js';
import { escapeRegex } from '../utils/text.js';
import { calculateBill, evaluateOfferEligibility } from './offerService.js';
import { getSettings } from './settingsService.js';

function toCustomerSummary(user) {
  if (!user) return null;
  return {
    fullName: user.fullName,
    mobileNumber: user.mobileNumber,
    totalOrders: user.totalOrders,
    deliveredOrders: user.deliveredOrders,
    offerClaimed: user.offerClaimed,
    offerClaimedOrderId: user.offerClaimedOrderId,
  };
}


function toAdminOrder(order, user, settings) {
  return {
    id: String(order._id),
    orderId: order.orderId,
    customerName: order.customerName,
    mobileNumber: order.mobileNumber,
    orderType: order.orderType,
    medicines: order.medicines,
    prescriptionUrl: order.prescriptionUrl,
    address: order.address,
    paymentMethod: order.paymentMethod,
    medicineSubtotal: order.medicineSubtotal,
    nonMedicineSubtotal: order.nonMedicineSubtotal,
    deliveryCharge: order.deliveryCharge,
    discount: order.discount, 
    finalAmount: order.finalAmount,
    billedAt: order.billedAt,
    offerOptIn: order.offerOptIn,
    firstOrderAtCreation: order.firstOrderAtCreation,
    previousOrders: order.customerOrderNumber - 1,
    offerEligible: order.offerEligible,
    offerApplied: order.offerApplied,
    offer: evaluateOfferEligibility({
      settings,
      firstOrderAtCreation: order.firstOrderAtCreation,
      userOfferClaimed: Boolean(user?.offerClaimed) && user.offerClaimedOrderId !== order.orderId,
      medicineSubtotal: order.medicineSubtotal,
    }),
    status: order.status,
    cancelReason: order.cancelReason,
    telegramNotificationSent: order.telegramNotificationSent,
    createdAt: order.createdAt,
    deliveredAt: order.deliveredAt,
    customer: toCustomerSummary(user),
  };
}

async function usersByMobile(mobileNumbers) {
  const users = await User.find({ mobileNumber: { $in: [...new Set(mobileNumbers)] } }).lean();
  return new Map(users.map((user) => [user.mobileNumber, user]));
}

async function findOrderOrThrow(id) {
  if (!mongoose.isValidObjectId(id)) throw notFound('Order not found');
  const order = await Order.findById(id).lean();
  if (!order) throw notFound('Order not found');
  return order;
}

export async function listOrders({ status, page, limit }) {
  const filter = { status };
  const sort = status === 'Delivered' || status === 'Cancelled' ? { updatedAt: -1, _id: -1 } : { createdAt: -1, _id: -1 };
  const [orders, total, settings] = await Promise.all([
    Order.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
    Order.countDocuments(filter),
    getSettings(),
  ]);
  const users = await usersByMobile(orders.map((order) => order.mobileNumber));
  return {
    orders: orders.map((order) => toAdminOrder(order, users.get(order.mobileNumber), settings)),
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}

export async function getOrder(id) {
  const order = await findOrderOrThrow(id);
  const [user, settings] = await Promise.all([User.findOne({ mobileNumber: order.mobileNumber }).lean(), getSettings()]);
  return toAdminOrder(order, user, settings);
}


export async function saveBilling(id, { medicines, nonMedicineSubtotal, discount, offerApplied }) {
  const order = await findOrderOrThrow(id);
  if (order.status !== 'Pending') throw conflict('Only pending orders can be billed', 'ORDER_LOCKED');

  const [settings, user] = await Promise.all([getSettings(), User.findOne({ mobileNumber: order.mobileNumber }).lean()]);

  let computedMedicineSubtotal = 0;
  

  const updatedMedicines = medicines.map((inputMed, index) => {
    // Try to find if this medicine already exists in DB
    let dbMed = null;
    if (inputMed._id && order.medicines) {
      dbMed = order.medicines.find((m) => String(m._id) === String(inputMed._id));
    } else if (order.medicines && order.medicines[index]) {
      // Fallback for very old orders
      dbMed = order.medicines[index];
    }
    
    const isAvailable = inputMed.isAvailable;
    const price = isAvailable ? inputMed.price : 0;

    if (isAvailable) {
      computedMedicineSubtotal += price;
    }

    // Combine old data with new data added by admin
    return {
      ...(dbMed ? dbMed : {}),
      name: inputMed.name || (dbMed ? dbMed.name : 'Prescription Medicine'),
      quantity: inputMed.quantity || (dbMed ? dbMed.quantity : '1'),
      isAvailable,
      price
    };
  });

  const bill = calculateBill({
    medicineSubtotal: computedMedicineSubtotal,
    nonMedicineSubtotal,
    deliveryCharge: settings.deliveryCharge,
    discount
  });

  const offer = evaluateOfferEligibility({
    settings,
    firstOrderAtCreation: order.firstOrderAtCreation,
    userOfferClaimed: Boolean(user?.offerClaimed),
    medicineSubtotal: bill.medicineSubtotal,
  });

  if (offerApplied && !offer.eligible) {
    throw unprocessable('The free GlucoOne cannot be included: this order is not eligible.', 'OFFER_NOT_ELIGIBLE');
  }

  const updated = await Order.findOneAndUpdate(
    { _id: order._id, status: 'Pending' },
    { $set: { 
        ...bill, 
        medicines: updatedMedicines, 
        offerEligible: offer.eligible, 
        offerApplied: Boolean(offerApplied), 
        billedAt: new Date() 
      } 
    },
    { new: true, lean: true },
  );
  
  if (!updated) throw conflict('Order was modified while you were billing it', 'ORDER_LOCKED');
  return toAdminOrder(updated, user, settings);
}

export async function markDelivered(id) {
  const order = await findOrderOrThrow(id);
  if (order.status !== 'Pending') throw conflict('Order is already delivered or cancelled', 'ALREADY_DELIVERED');
  if (!order.billedAt) throw unprocessable('Save the bill before marking the order as delivered.', 'BILL_REQUIRED');

  let claimedGift = false;
  if (order.offerApplied) {
    const claim = await User.updateOne(
      { mobileNumber: order.mobileNumber, offerClaimed: false },
      { $set: { offerClaimed: true, offerClaimedOrderId: order.orderId } },
    );
    if (claim.modifiedCount !== 1) {
      throw conflict('This customer has already claimed the free gift. Re-save the bill without the gift.', 'OFFER_ALREADY_CLAIMED');
    }
    claimedGift = true;
  }

  const delivered = await Order.findOneAndUpdate(
    { _id: order._id, status: 'Pending' },
    { $set: { status: 'Delivered', deliveredAt: new Date() } },
    { new: true, lean: true },
  );
  if (!delivered) {
    if (claimedGift) {
      await User.updateOne(
        { mobileNumber: order.mobileNumber, offerClaimedOrderId: order.orderId },
        { $set: { offerClaimed: false, offerClaimedOrderId: null } },
      );
    }
    throw conflict('Order is already modified', 'ALREADY_DELIVERED');
  }

  await User.updateOne({ mobileNumber: order.mobileNumber }, { $inc: { deliveredOrders: 1 } });
  return getOrder(id);
}

// NEW: Cancel Order Service
export async function cancelOrder(id, cancelReason) {
  const order = await findOrderOrThrow(id);
  if (order.status !== 'Pending') {
    throw badRequest('Only pending orders can be cancelled');
  }

  const updated = await Order.findOneAndUpdate(
    { _id: order._id, status: 'Pending' },
    { $set: { status: 'Cancelled', cancelReason, updatedAt: new Date() } },
    { new: true, lean: true }
  );

  if (!updated) {
    throw conflict('Order was modified while you were cancelling it', 'ORDER_LOCKED');
  }

  return getOrder(id);
}

export async function listCustomers({ query, page, limit }) {
  let filter = {};
  if (query) {
    const digits = query.replace(/\D/g, '');
    filter = digits.length >= 3
      ? { mobileNumber: { $regex: escapeRegex(digits.slice(-10)) } }
      : { fullName: { $regex: escapeRegex(query), $options: 'i' } };
  }
  const [users, total] = await Promise.all([
    User.find(filter).sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    User.countDocuments(filter),
  ]);
  return {
    customers: users.map((user) => ({ ...toCustomerSummary(user), isFirstTimeCustomer: user.totalOrders <= 1 })),
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}
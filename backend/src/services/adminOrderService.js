//src/services/adminOrderService.js
import mongoose from 'mongoose';
import { Order } from '../models/Order.js';
import { User } from '../models/User.js';
import { conflict, notFound, unprocessable, badRequest } from '../utils/AppError.js';
import { escapeRegex } from '../utils/text.js';
import { calculateBill, evaluateOfferEligibility } from './offerService.js';
import { getSettings } from './settingsService.js';
// import { roundMoney } from '../utils/money.js'; 
import { Product } from '../models/Product.js';
import { calculateCategorizedSubtotals } from './offerLineService.js';
import { createNotification } from './notificationService.js';

function toCustomerSummary(user) {
  if (!user) return null;
  return {
    email: user.email,
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
    products: order.products,
    prescriptionUrl: order.prescriptionUrl,
    address: order.address,
    paymentMethod: order.paymentMethod,
    medicineSubtotal: order.medicineSubtotal,
    nonMedicineSubtotal: order.nonMedicineSubtotal,
    deliveryCharge: order.deliveryCharge,
    discount: order.discount, 
    finalAmount: order.finalAmount,
    billedAt: order.billedAt,
    billingVersion: order.billingVersion,
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

async function usersById(orders) {
  const ids = [
    ...new Set(
      orders
        .filter(order => order.userId)
        .map(order => String(order.userId))
    )
  ];

  if (ids.length === 0) return new Map();

  const users = await User.find({ _id: { $in: ids } })
    .select('email fullName totalOrders deliveredOrders offerClaimed offerClaimedOrderId')
    .lean();

  return new Map(users.map(user => [String(user._id), user]));
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
  
  const users = await usersById(orders);
  
  return {
    orders: orders.map((order) => toAdminOrder(order, users.get(String(order.userId)), settings)),
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}

export async function getOrder(id) {
  const order = await findOrderOrThrow(id);
  const [user, settings] = await Promise.all([
    order.userId ? User.findById(order.userId).lean() : Promise.resolve(null),
    getSettings()
  ]);
  return toAdminOrder(order, user, settings);
}

export async function saveBilling(id, { medicines, products, nonMedicineSubtotal, discount, offerApplied, billingVersion }) {
  const order = await findOrderOrThrow(id);
  if (order.status !== 'Pending') throw conflict('Only pending orders can be billed', 'ORDER_LOCKED');

  const [settings, user] = await Promise.all([
    getSettings(), 
    order.userId ? User.findById(order.userId).lean() : Promise.resolve(null)
  ]);

  const medsToProcess = medicines !== undefined ? medicines : order.medicines;
  const prodsToProcess = products !== undefined ? products : order.products;

  const updatedMedicines = medsToProcess.map((inputMed, index) => {
    let dbMed = null;
    if (inputMed._id && order.medicines) {
      dbMed = order.medicines.find((m) => String(m._id) === String(inputMed._id));
    } else if (order.medicines && order.medicines[index]) {
      dbMed = order.medicines[index];
    }
    
    const isAvailable = inputMed.isAvailable !== undefined ? inputMed.isAvailable : true;
    const price = isAvailable ? (inputMed.price !== undefined ? Number(inputMed.price) : Number(dbMed?.price ?? 0)) : 0;
    const quantity = Number(inputMed.quantity || (dbMed ? dbMed.quantity : 1));

    return {
      ...(dbMed ? dbMed : {}),
      name: inputMed.name || (dbMed ? dbMed.name : 'Prescription Medicine'),
      quantity: quantity,
      isAvailable,
      price
    };
  });

  let stockAdjustments = []; 
  let newInventoryReservations = [];
  const updatedProducts = prodsToProcess.map((inputProd, index) => {
    let dbProd = null;
    if (inputProd._id && order.products) {
      dbProd = order.products.find((p) => String(p._id) === String(inputProd._id));
    } else if (order.products && order.products[index]) {
      dbProd = order.products[index];
    }
    const price = inputProd.price !== undefined ? Number(inputProd.price) : Number(dbProd?.price ?? 0);
    const quantity = Number(inputProd.quantity ?? dbProd?.quantity ?? 1);
    
    const productId = inputProd.productId || (dbProd ? dbProd.productId : null);

    if (productId) {
      const pIdStr = String(productId);
      newInventoryReservations.push({ productId, quantityDeducted: quantity });

      const existingReservation = order.inventoryReservations?.find(r => String(r.productId) === pIdStr);
      const oldQty = existingReservation ? existingReservation.quantityDeducted : 0;
      const qtyDifference = quantity - oldQty; 
      
      if (qtyDifference !== 0) {
         stockAdjustments.push({ productId, adjustment: -qtyDifference });
      }
    }

    return {
      ...(dbProd ? dbProd : {}),
      productId,
      name: inputProd.name || (dbProd ? dbProd.name : 'Unknown Product'),
      price,
      quantity,
      kind: dbProd ? dbProd.kind : 'non_medicine'
    };
  });

  if (order.inventoryReservations) {
    order.inventoryReservations.forEach(oldRes => {
       const stillInBill = updatedProducts.some(p => String(p.productId) === String(oldRes.productId));
       if (!stillInBill) {
          stockAdjustments.push({ productId: oldRes.productId, adjustment: oldRes.quantityDeducted });
       }
    });
  }
  const subtotals = calculateCategorizedSubtotals({
    medicines: updatedMedicines,
    products: updatedProducts,
    nonMedicineSubtotal: 0 
  });

  const bill = calculateBill({
    ...subtotals, 
    deliveryCharge: settings.deliveryCharge,
    discount,
  });

  const offer = evaluateOfferEligibility({
    settings,
    firstOrderAtCreation: order.firstOrderAtCreation,
    userOfferClaimed: Boolean(user?.offerClaimed),
    medicineSubtotal: bill.medicineSubtotal,
  });
  const autoApplyOffer = offer.eligible;

  if (billingVersion === undefined) {
    throw badRequest('Billing version is missing. Please refresh the page to get the latest bill data.');
  }

  let updatedOrder;
  await mongoose.connection.transaction(async (session) => {
    updatedOrder = await Order.findOneAndUpdate(
      { _id: order._id, status: 'Pending', billingVersion: billingVersion }, 
      { 
        $set: { 
          ...bill, 
          medicines: updatedMedicines, 
          products: updatedProducts, 
          inventoryReservations: newInventoryReservations, 
          offerEligible: offer.eligible, 
          offerApplied: autoApplyOffer,
          billedAt: new Date(),
          invoiceUrl: null 
        },
        $inc: { billingVersion: 1 }
      },
      { new: true, lean: true, session }
    );
    
    if (!updatedOrder) {
      throw conflict('Data modified by another admin. Please refresh to see the latest changes.', 'ORDER_LOCKED');
    }
    
    if (updatedOrder.userId) {
      const billAmount = Number(updatedOrder.finalAmount).toFixed(2);
      await createNotification({
        userId: updatedOrder.userId,
        type: 'order',
        title: 'Bill Generated',
        message: `Your final bill for order #${updatedOrder.orderId} is Rs ${billAmount}. Please review the invoice from order details.`,
        orderId: updatedOrder.orderId,
        session
      });
    }

    if (stockAdjustments.length > 0) {
      const consolidatedAdjustments = stockAdjustments.reduce((acc, curr) => {
        const id = String(curr.productId);
        acc[id] = (acc[id] || 0) + curr.adjustment;
        return acc;
      }, {});
      
      const bulkOps = Object.entries(consolidatedAdjustments)
        .filter(([id, adj]) => adj !== 0) 
        .map(([id, adjustment]) => {
          if (adjustment < 0) {
            return {
              updateOne: {
                filter: { 
                  _id: new mongoose.Types.ObjectId(id), 
                  trackStock: true,
                  stockQuantity: { $gte: Math.abs(adjustment) } 
                },
                update: { $inc: { stockQuantity: adjustment } }
              }
            };
          } else {
            return {
              updateOne: {
                filter: { _id: new mongoose.Types.ObjectId(id), trackStock: true },
                update: { $inc: { stockQuantity: adjustment } }
              }
            };
          }
        });

      if (bulkOps.length > 0) {
        const bulkResult = await Product.bulkWrite(bulkOps, { session });
        if (bulkResult.modifiedCount !== bulkOps.length) {
          throw conflict('Insufficient stock for update. Product might be out of stock.', 'INSUFFICIENT_STOCK');
        }
      }
    }
  });
  
  return toAdminOrder(updatedOrder, user, settings);
}

export async function markDelivered(id) {
  const order = await findOrderOrThrow(id);
  if (order.status !== 'Pending') throw conflict('Order is already delivered or cancelled', 'ALREADY_DELIVERED');
  if (!order.billedAt) throw unprocessable('Save the bill before marking the order as delivered.', 'BILL_REQUIRED');

  await mongoose.connection.transaction(async (session) => {
    const delivered = await Order.findOneAndUpdate(
      { _id: order._id, status: 'Pending' },
      { $set: { status: 'Delivered', deliveredAt: new Date() } },
      { new: true, lean: true, session }
    );

    if (!delivered) {
      throw conflict('Order is already modified or cancelled by someone else', 'ALREADY_DELIVERED');
    }
    if (delivered.offerApplied && !delivered.userId) {
      throw conflict('Legacy guest order requires manual offer review. Order delivered blocked.', 'MANUAL_REVIEW_NEEDED');
    }

    if (delivered.userId) {
      if (delivered.offerApplied) {
        const claim = await User.updateOne(
          {
            _id: delivered.userId,
            offerClaimed: false
          },
          {
            $set: {
              offerClaimed: true,
              offerClaimedOrderId: delivered.orderId
            }
          },
          { session }
        );

        if (claim.modifiedCount !== 1) {
          throw conflict('This account has already claimed the free gift.', 'OFFER_ALREADY_CLAIMED');
        }
      }

      const update = await User.updateOne(
        { _id: delivered.userId },
        { $inc: { deliveredOrders: 1 } },
        { session }
      );

      if (update.matchedCount !== 1) {
        throw conflict('Order account no longer exists.', 'USER_MISSING');
      }

      // ---> NEW: Create Notification for Delivered Order <---
      await createNotification({
        userId: delivered.userId,
        type: 'order',
        title: 'Order Delivered',
        message: `Order #${delivered.orderId} has been successfully delivered. We hope to see you again!`,
        orderId: delivered.orderId,
        session
      });
    }
  });
  return getOrder(id);
}

export async function cancelOrder(id, cancelReason) {
  const order = await findOrderOrThrow(id);
  if (order.status !== 'Pending') {
    throw badRequest('Only pending orders can be cancelled');
  }

  let updatedOrder;
  
  await mongoose.connection.transaction(async (session) => {
    updatedOrder = await Order.findOneAndUpdate(
      { _id: order._id, status: 'Pending' },
      { $set: { status: 'Cancelled', cancelReason, updatedAt: new Date() } },
      { new: true, lean: true, session } 
    );

    if (!updatedOrder) {
      throw conflict('Order was modified while you were cancelling it', 'ORDER_LOCKED');
    }
    if (updatedOrder.inventoryReservations && updatedOrder.inventoryReservations.length > 0) {
      const bulkOps = updatedOrder.inventoryReservations.map(reservation => ({
        updateOne: {
          filter: { _id: reservation.productId },
          update: { $inc: { stockQuantity: reservation.quantityDeducted } } 
        }
      }));

      if (bulkOps.length > 0) {
        await Product.bulkWrite(bulkOps, { session });
      }
    }
    
    // ---> NEW: Create Notification for Cancelled Order <---
    if (updatedOrder.userId) {
      await createNotification({
        userId: updatedOrder.userId,
        type: 'info',
        title: 'Order Cancelled',
        message: `Order #${updatedOrder.orderId} has been cancelled. Reason: ${cancelReason || 'Not specified'}.`,
        orderId: updatedOrder.orderId,
        session
      });
    }
  });

  return getOrder(id);
}

export async function listCustomers({ query, page, limit }) {
  let filter = {};
  if (query) {
    const isEmail = query.includes('@');
    filter = isEmail 
      ? { email: { $regex: escapeRegex(query),$options: 'i' } } 
      : { fullName: { $regex: escapeRegex(query),$options: 'i' } };
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
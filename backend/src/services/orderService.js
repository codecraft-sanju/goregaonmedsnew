//src/services/orderService.js
import mongoose from 'mongoose';
import { Order } from '../models/Order.js';
import { User } from '../models/User.js';
import { generateOrderId } from '../utils/orderId.js';
import { duplicateKeyField } from '../utils/mongoErrors.js'; 
import { conflict, badRequest, unauthorized } from '../utils/AppError.js';
import { getSettings } from './settingsService.js';
import { Product } from '../models/Product.js';
import { SystemLog } from '../models/SystemLog.js';
import { isTrustedPrescriptionUrl, verifyCloudinaryFileExists } from './cloudinaryService.js';
import { loadEnv } from '../config/env.js';
import { rememberCheckoutDetails } from './checkoutPreferencesService.js';
import { createNotification } from './notificationService.js'; 

function toCreateResponse(order) {
  return {
    success: true,
    orderId: order.orderId,
    status: order.status,
    telegramNotificationSent: Boolean(order.telegramNotificationSent),
  };
}

async function findReplay(clientRequestId, userId, mobileNumber) {
  const existing = await Order.findOne({ clientRequestId }).lean();
  if (!existing) return null;
 
  if (String(existing.userId) !== String(userId) || existing.mobileNumber !== mobileNumber) {
    throw conflict('This order request ID was already used.', 'DUPLICATE_REQUEST');
  }
  return existing;
}

export async function createOrder(input, { userId, notifier, logger = console }) {

  if (!mongoose.isValidObjectId(userId)) {
    throw unauthorized('Please log in before checkout.');
  }

  const replay = await findReplay(input.clientRequestId, userId, input.mobileNumber);
  if (replay) return toCreateResponse(replay);

  const env = loadEnv();
  
  if (input.orderType === 'prescription_image' && input.prescriptionUrl) {
    const cloudinaryConfig = { 
      cloudName: env.CLOUDINARY_CLOUD_NAME, 
      apiKey: env.CLOUDINARY_API_KEY, 
      apiSecret: env.CLOUDINARY_API_SECRET, 
      folder: env.CLOUDINARY_UPLOAD_FOLDER 
    };
    
    if (!isTrustedPrescriptionUrl(input.prescriptionUrl, cloudinaryConfig, input.clientRequestId)) {
      throw badRequest('Prescription upload format is invalid.');
    }
    
    const fileExists = await verifyCloudinaryFileExists(input.prescriptionUrl, cloudinaryConfig);
    if (!fileExists) {
      throw badRequest('Prescription file missing on server. Please upload it again.');
    }
  }

  const settings = await getSettings();
  let secureProducts = [];
  let productMap = new Map();
  
  if (input.products && input.products.length > 0) {
    const productIds = input.products.map(p => p.productId);
    const dbProducts = await Product.find({ _id: { $in: productIds } }).lean();
    productMap = new Map(dbProducts.map(p => [String(p._id), p]));

    for (const item of input.products) {
      const realProduct = productMap.get(item.productId);
      
      if (!realProduct || !realProduct.isActive || !realProduct.inStock) {
        throw badRequest(`Sorry, a product is currently unavailable or out of stock.`);
      }
      
      secureProducts.push({
        productId: realProduct._id,
        name: realProduct.name,     
        price: realProduct.price,     
        quantity: item.quantity,
        kind: realProduct.kind 
      });
    }
  }

  let order;
  
  try {
    const newOrderId = await generateOrderId();
    
    await mongoose.connection.transaction(async (session) => {
      const inventoryReservations = [];
      if (secureProducts.length > 0) {
        const bulkOps = [];
        
        for (const item of input.products) {
          const realProduct = productMap.get(item.productId);
          
          if (realProduct.trackStock) {
            const remainingStock = realProduct.stockQuantity - item.quantity;
            if (remainingStock < 0) {
              throw badRequest(`Sorry, '${realProduct.name}' has only ${realProduct.stockQuantity} units left in stock.`);
            }
            
            bulkOps.push({
              updateOne: {
                filter: { _id: realProduct._id, stockQuantity: { $gte: item.quantity } },
                update: { $inc: { stockQuantity: -item.quantity } }
              }
            });
            inventoryReservations.push({
              productId: realProduct._id,
              quantityDeducted: item.quantity
            });
            const threshold = settings.lowStockThreshold ?? 1;
            if (remainingStock <= threshold) {
              await SystemLog.create([{
                type: 'inventory_alert',
                message: `Low Stock Alert: '${realProduct.name}' has only ${remainingStock} units left. Please update stock.`,
                context: { productId: realProduct._id, remainingStock }
              }], { session });
            }
          }
        }

        if (bulkOps.length > 0) {
          const bulkResult = await Product.bulkWrite(bulkOps, { session });
          
          if (bulkResult.modifiedCount !== bulkOps.length) {
            const productIdsToCheck = input.products.map(p => p.productId);
            const currentDbProducts = await Product.find({ _id: { $in: productIdsToCheck } }).session(session).lean();
            
            const currentProductMap = new Map(currentDbProducts.map(p => [String(p._id), p]));
            
            let failedItemName = "an item in your cart";
            
            for (const requestedItem of input.products) {
                const dbProd = currentProductMap.get(requestedItem.productId);
                if (dbProd && dbProd.trackStock && dbProd.stockQuantity < requestedItem.quantity) {
                    failedItemName = `'${dbProd.name}'`;
                    break;
                }
            }
            
            throw badRequest(`Someone just bought ${failedItemName}. Please review your cart and try again.`);
          }
        }
      }     
      const purchasedProductIds = input.products.map(p => new mongoose.Types.ObjectId(p.productId));

     const userBefore = await User.findOneAndUpdate(
        { _id: userId },
        { 
          $inc: { totalOrders: 1 }, 
          $set: { 
             fullName: input.customerName,
             cart: [],             // Catalog items clear
             manualMedicines: [],  // Manual items clear
             prescriptions: []     // Prescriptions clear
          }
        },
        { session, new: false } 
      );
      if (!userBefore) {
        throw unauthorized('Your account is no longer available. Please log in again.');
      }

      const previousOrders = userBefore.totalOrders || 0;
      await rememberCheckoutDetails(
        userId,
        {
          address: input.address,
          mobileNumber: input.mobileNumber
        },
        session
      );

      const newOrder = new Order({
        clientRequestId: input.clientRequestId,
        userId: userBefore._id,
        mobileNumber: input.mobileNumber, 
        customerName: input.customerName,
        orderType: input.orderType,
        medicines: input.medicines,
        products: secureProducts, 
        inventoryReservations: inventoryReservations,
    prescriptionUrl: (input.orderType === 'prescription_image' || input.orderType === 'mixed') ? input.prescriptionUrl : null,
        address: input.address,
        offerOptIn: true, 
        firstOrderAtCreation: previousOrders === 0, 
        customerOrderNumber: previousOrders + 1,
        telegramNotificationSent: false, 
        orderId: newOrderId, 
      });

      await newOrder.save({ session });
      order = newOrder.toObject();
      await createNotification({
        userId,
        type: 'order',
        title: 'Order Placed Successfully',
        message: `Your order #${order.orderId} has been received and is being processed.`,
        orderId: order.orderId,
        session
      });
    });

    try {
      if (notifier && notifier.isConfigured) {
        await notifier.notifyNewOrder(order, settings);
        logger.info(`[orderService] Queued Telegram notification for ${order.orderId}`);
      }
    } catch (err) {
      logger.error(`[CRITICAL] Order ${order.orderId} saved to DB, but Telegram Queue failed: ${err.message}`);
    }

  } catch (error) {
    if (duplicateKeyField(error) === 'clientRequestId') {
      const raced = await findReplay(input.clientRequestId, userId, input.mobileNumber);
      if (raced) return toCreateResponse(raced);
    }
    throw error;
  }
  
  return toCreateResponse(order);
}

const STATUS_LABELS = {
  Pending: 'Order Received & Processing',
  Delivered: 'Delivered',
  Cancelled: 'Cancelled',
};

export async function fetchOrderHistory(userId) {
  const orders = await Order.find({ userId }).sort({ createdAt: -1 }).lean();

  return orders.map((order) => ({
    orderId: order.orderId,
    status: order.status,
    statusLabel: STATUS_LABELS[order.status] || order.status,
    orderType: order.orderType,
    itemCount: order.medicines.length + (order.products ? order.products.length : 0),
    placedAt: order.createdAt,
    deliveredAt: order.deliveredAt,
    finalAmount: order.billedAt ? order.finalAmount : null,
    medicines: order.medicines,
    products: order.products,
    medicineSubtotal: order.medicineSubtotal,
    nonMedicineSubtotal: order.nonMedicineSubtotal,
    deliveryCharge: order.deliveryCharge,
    discount: order.discount,
    cancelReason: order.cancelReason,
  }));
}
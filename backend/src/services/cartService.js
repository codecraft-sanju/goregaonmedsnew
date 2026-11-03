//src/services/cartService.js
import mongoose from 'mongoose';
import { redisClient } from '../config/redis.js';
import { User } from '../models/User.js';
import { Product } from '../models/Product.js';
import { getSettings } from './settingsService.js';
import { evaluateOfferEligibility, calculateBill, OFFER_GIFT } from './offerService.js';
import { calculateCategorizedSubtotals } from './offerLineService.js';

const GUEST_CART_TTL = 7 * 24 * 60 * 60; // 7 Days in seconds

function getGuestCartKey(guestId) {
  return `cart:guest:${guestId}`;
}

async function getEnrichedCart(rawCart) {
  if (!rawCart || rawCart.length === 0) return [];

  const productIds = rawCart.map((item) => item.productId);
  const products = await Product.find(
    { _id: { $in: productIds }, isActive: true },
    'name price imageUrl inStock stockQuantity trackStock kind'
  ).lean();

  const productMap = new Map(products.map((p) => [String(p._id), p]));

  const enrichedCart = [];
  for (const item of rawCart) {
    const product = productMap.get(String(item.productId));
    if (product) {
      const isAvailable = product.inStock && (!product.trackStock || product.stockQuantity >= item.quantity);
      enrichedCart.push({
        productId: product._id,
        name: product.name,
        price: product.price,
        imageUrl: product.imageUrl,
        quantity: item.quantity,
        kind: product.kind || 'non_medicine', // fallback
        isAvailable,
      });
    }
  }
  return enrichedCart;
}


async function generateCartEstimate(enrichedCart, userId) {
  if (!enrichedCart || enrichedCart.length === 0) {
    return null; // Empty cart needs no estimate
  }

  const [settings, user] = await Promise.all([
    getSettings(),
    userId ? User.findById(userId).select('totalOrders offerClaimed').lean() : null
  ]);

  // Calculate Subtotals just like Admin billing does
  const subtotals = calculateCategorizedSubtotals({
    medicines: [], // Cart medicines if any (currently cart only holds catalog products)
    products: enrichedCart.filter(item => item.isAvailable) 
  });

  // Determine if it's the first order
  const firstOrderAtCreation = user ? (user.totalOrders === 0) : true; // Guests are assumed first order for display purposes
  const userOfferClaimed = user ? user.offerClaimed : false;

  // Evaluate Offer
  const offer = evaluateOfferEligibility({
    settings,
    firstOrderAtCreation,
    userOfferClaimed,
    medicineSubtotal: subtotals.medicineSubtotal, // Free GlucoOne check based ONLY on medicine total
  });

  // Calculate final bill (Delivery charge applies to products too)
  const bill = calculateBill({
    ...subtotals,
    deliveryCharge: settings.deliveryCharge,
    discount: 0 // Applying no immediate discount in cart estimate
  });

  return {
    ...bill,
    isEstimate: true, 
    offerApplied: offer.eligible,
    offerDetails: offer.eligible ? OFFER_GIFT : null,
    message: "This is an estimated bill. Final amount will be calculated at checkout based on prescription medicines."
  };
}


export async function getCart(userId, guestId) {
  let rawCart = [];
  let manualMedicines = [];
  let prescriptions = [];

  if (userId) {
    const user = await User.findById(userId).select('cart manualMedicines prescriptions').lean();
    if (user) {
      rawCart = user.cart || [];
      manualMedicines = user.manualMedicines || [];
      prescriptions = user.prescriptions || [];
    }
  } else if (guestId) {
    const guestCartHash = await redisClient.hgetall(getGuestCartKey(guestId));
    if (guestCartHash && Object.keys(guestCartHash).length > 0) {
      for (const [key, val] of Object.entries(guestCartHash)) {
        if (key.startsWith('p:')) rawCart.push({ productId: key.slice(2), quantity: parseInt(val, 10) });
        else if (key.startsWith('m:')) manualMedicines.push({ name: key.slice(2), quantity: parseInt(val, 10) });
        else if (key.startsWith('url:')) prescriptions.push({ url: key.slice(4) });
      }
    }
  }

  const items = await getEnrichedCart(rawCart);
  const estimate = await generateCartEstimate(items, userId);

  return { items, manualMedicines, prescriptions, estimate };
}

export async function updateCart(userId, guestId, itemData) {
  const { type, productId, name, url, quantity } = itemData;

  // Stock check sirf catalog products ke liye
  if (type === 'catalog') {
    const product = await Product.findById(productId).lean();
    if (!product || !product.isActive) throw new Error('Product not found or currently inactive');
    if (quantity > 0 && product.trackStock && quantity > product.stockQuantity) {
      throw new Error(`Cannot add ${quantity} items. Only ${product.stockQuantity} left in stock.`);
    }
  }

  if (userId) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    if (type === 'catalog') {
      if (quantity === 0) user.cart = user.cart.filter(item => String(item.productId) !== String(productId));
      else {
        const existing = user.cart.findIndex(item => String(item.productId) === String(productId));
        if (existing > -1) user.cart[existing].quantity = quantity;
        else user.cart.push({ productId, quantity });
      }
    } else if (type === 'manual') {
      if (quantity === 0) user.manualMedicines = user.manualMedicines.filter(item => item.name !== name);
      else {
        const existing = user.manualMedicines.findIndex(item => item.name === name);
        if (existing > -1) user.manualMedicines[existing].quantity = quantity;
        else user.manualMedicines.push({ name, quantity });
      }
    } else if (type === 'prescription') {
      if (quantity === 0) user.prescriptions = user.prescriptions.filter(item => item.url !== url);
      else {
        if (!user.prescriptions.find(item => item.url === url)) user.prescriptions.push({ url });
      }
    }
    await user.save();
  } else if (guestId) {
    const redisKey = getGuestCartKey(guestId);
    let hashKey = type === 'catalog' ? `p:${productId}` : (type === 'manual' ? `m:${name}` : `url:${url}`);

    if (quantity === 0) await redisClient.hdel(redisKey, hashKey);
    else await redisClient.hset(redisKey, hashKey, type === 'prescription' ? 1 : quantity);
    
    await redisClient.expire(redisKey, GUEST_CART_TTL);
  }

  return await getCart(userId, guestId);
}

export async function clearCart(userId, guestId) {
  if (userId) {
    
    await User.findByIdAndUpdate(userId, { 
        $set: { cart: [], manualMedicines: [], prescriptions: [] } 
    });
  } else if (guestId) {
    await redisClient.del(getGuestCartKey(guestId));
  }
}

export async function mergeCartOnLogin(userId, guestId) {
  const redisKey = getGuestCartKey(guestId);
  const guestCartHash = await redisClient.hgetall(redisKey);
  
  if (!guestCartHash || Object.keys(guestCartHash).length === 0) return { hasAdjustments: false };
  const user = await User.findById(userId);
  if (!user) return { hasAdjustments: false };

  let hasAdjustments = false;

  for (const [key, val] of Object.entries(guestCartHash)) {
    const quantity = parseInt(val, 10);
    
    if (key.startsWith('p:')) {
      const productId = key.slice(2);
      const existing = user.cart.findIndex(item => String(item.productId) === String(productId));
      if (existing > -1) user.cart[existing].quantity += quantity;
      else user.cart.push({ productId, quantity });
    } 
    else if (key.startsWith('m:')) {
      const name = key.slice(2);
      const existing = user.manualMedicines.findIndex(item => item.name === name);
      if (existing > -1) user.manualMedicines[existing].quantity += quantity;
      else user.manualMedicines.push({ name, quantity });
    } 
    else if (key.startsWith('url:')) {
      const url = key.slice(4);
      if (!user.prescriptions.find(item => item.url === url)) user.prescriptions.push({ url });
    }
  }

  await user.save();
  await redisClient.del(redisKey);
  return { hasAdjustments };
}
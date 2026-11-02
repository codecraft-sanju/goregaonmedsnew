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

  if (userId) {
    const user = await User.findById(userId).select('cart').lean();
    if (user && user.cart) rawCart = user.cart;
  } else if (guestId) {
    const guestCartHash = await redisClient.hgetall(getGuestCartKey(guestId));
    if (guestCartHash && Object.keys(guestCartHash).length > 0) {
      rawCart = Object.entries(guestCartHash).map(([productId, quantity]) => ({
        productId,
        quantity: parseInt(quantity, 10),
      }));
    }
  }

  const items = await getEnrichedCart(rawCart);
  const estimate = await generateCartEstimate(items, userId);

  return { items, estimate };
}

export async function updateCart(userId, guestId, productId, quantity) {
  const product = await Product.findById(productId).lean();
  if (!product || !product.isActive) {
    throw new Error('Product not found or currently inactive');
  }
  if (quantity > 0 && product.trackStock && quantity > product.stockQuantity) {
    throw new Error(`Cannot add ${quantity} items. Only ${product.stockQuantity} left in stock.`);
  }

  // FIX: Cleaner approach to merging array items to prevent duplicate IDs
  if (userId) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    if (quantity === 0) {
      user.cart = user.cart.filter(item => String(item.productId) !== String(productId));
    } else {
      const existingItemIndex = user.cart.findIndex(item => String(item.productId) === String(productId));
      
      if (existingItemIndex > -1) {
        // Agar product cart mein hai, toh nayi row mat banao, existing quantity replace/merge karo
        user.cart[existingItemIndex].quantity = quantity; 
      } else {
        // Sirf tabhi push karo jab naya product ho
        user.cart.push({ productId, quantity });
      }
    }
    await user.save();
  } else if (guestId) {
    const redisKey = getGuestCartKey(guestId);

    if (quantity === 0) {
      await redisClient.hdel(redisKey, productId);
    } else {
      await redisClient.hset(redisKey, productId, quantity);
    }
    
    await redisClient.expire(redisKey, GUEST_CART_TTL);
  }

  return await getCart(userId, guestId);
}

export async function clearCart(userId, guestId) {
  if (userId) {
    await User.findByIdAndUpdate(userId, { $set: { cart: [] } });
  } else if (guestId) {
    await redisClient.del(getGuestCartKey(guestId));
  }
}

export async function mergeCartOnLogin(userId, guestId) {
  const redisKey = getGuestCartKey(guestId);
  
  const guestCartHash = await redisClient.hgetall(redisKey);
  if (!guestCartHash || Object.keys(guestCartHash).length === 0) {
    return { hasAdjustments: false };
  }

  const guestCart = Object.entries(guestCartHash).map(([productId, quantity]) => ({
    productId,
    quantity: parseInt(quantity, 10),
  }));

  const user = await User.findById(userId).select('cart');
  if (!user) return { hasAdjustments: false };

  const productIds = guestCart.map((item) => item.productId);
  const products = await Product.find(
    { _id: { $in: productIds }, isActive: true },
    'trackStock stockQuantity inStock'
  ).lean();
  
  const productMap = new Map(products.map((p) => [String(p._id), p]));
  const cartMap = new Map(user.cart.map((item) => [String(item.productId), item.quantity]));
  let hasAdjustments = false;

  for (const item of guestCart) {
    const product = productMap.get(item.productId);
    if (!product || !product.inStock) {
      hasAdjustments = true;
      continue;
    }

    const existingQty = cartMap.get(item.productId) || 0;
    
    let maxAllowed = 100;
    if (product.trackStock) {
      maxAllowed = Math.min(100, product.stockQuantity);
    }

    const requestedQty = existingQty + item.quantity;
    const finalQty = Math.min(requestedQty, maxAllowed);
    if (finalQty < requestedQty) {
      hasAdjustments = true;
    }

    if (finalQty > 0) {
      cartMap.set(item.productId, finalQty);
    }
  }
  const mergedCart = Array.from(cartMap.entries()).map(([productId, quantity]) => ({
    productId,
    quantity,
  }));
  user.cart = mergedCart;
  await user.save();
  await redisClient.del(redisKey);
  return { hasAdjustments };
}
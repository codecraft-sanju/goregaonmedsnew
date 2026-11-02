// src/controllers/publicController.js
import { Order } from '../models/Order.js'; 
import { createOrder } from '../services/orderService.js';
import { getSettings, toPublicSettings } from '../services/settingsService.js';
import { createUploadSignature, isTrustedPrescriptionUrl ,generateSignedDeliveryUrl} from '../services/cloudinaryService.js';
import { badRequest, notFound, unauthorized, conflict } from '../utils/AppError.js';
import { Product } from '../models/Product.js';
import { User } from '../models/User.js';
import { signCustomerToken, CUSTOMER_COOKIE, CUSTOMER_SESSION_TTL, GUEST_COOKIE, guestCookieOptions } from '../middleware/auth.js';
import * as cartService from '../services/cartService.js';
import { listPublicProducts } from '../services/productCatalogService.js';
import * as invoiceService from '../services/invoiceService.js';
import { normalizeIndianMobile } from '../utils/phone.js';
import { getUserNotifications, getUnreadCount, markNotificationAsRead, markAllNotificationsAsRead } from '../services/notificationService.js';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken'; 
import bcrypt from 'bcryptjs';

const geocodeCache = new Map();
function cleanupGeocodeCache() {
  if (geocodeCache.size > 2000) {
    geocodeCache.clear();
  }
}

function generateOTP() {
  return crypto.randomInt(100000, 1000000).toString();
}

function customerCookieOptions(env) {
  return {
    httpOnly: true,
    secure: env.isProduction || env.COOKIE_SAME_SITE === 'none',
    sameSite: env.COOKIE_SAME_SITE || 'lax', 
    path: '/',
    maxAge: CUSTOMER_SESSION_TTL * 1000,
  };
}

export function createPublicController({ env, notifier, logger, emailService, invoiceService: passedInvoiceService }) {
  const cloudinary = {
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
    apiSecret: env.CLOUDINARY_API_SECRET,
    folder: env.CLOUDINARY_UPLOAD_FOLDER,
  };
  
  const invService = passedInvoiceService || invoiceService;

  return {
    async requestOtp(req, res) {
      const { email } = req.body;
      if (!email) throw badRequest('Email is required');
      
      const formattedEmail = email.toLowerCase().trim();

      const existingUser = await User.findOne({ email: formattedEmail });
      if (existingUser && existingUser.lockUntil && existingUser.lockUntil > new Date()) {
        throw conflict('Account temporarily locked due to too many failed attempts. Try again in 15 minutes.');
      }

      const otp = generateOTP();
      const otpExpires = new Date(Date.now() + 5 * 60 * 1000); 
      
      const hashedOtp = await bcrypt.hash(otp, 10);

      await User.findOneAndUpdate(
        { email: formattedEmail },
        { $set: { otp: hashedOtp, otpExpires, otpAttempts: 0, lockUntil: null } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      // ---> UPDATED EMAIL SENDING LOGIC <---
      if (emailService) {
        try {
          // Ab yeh background me nahi, balki yahi par wait karega
          await emailService.sendOtpEmail(email, otp);
        } catch (error) {
          // Agar Gmail connect nahi hua, toh frontend ko 500 error jayega aur wo alert dikhayega
          throw new Error('Failed to send OTP email. Mail server connection timed out. Please try again.');
        }
      } else {
        logger.warn('Email service not configured. OTP not sent.');
      }

      // Yeh line tabhi chalegi jab email successfully send ho jayega
      res.json({ success: true, message: 'OTP sent to your email' });
    },

    async verifyOtp(req, res) {
      const { email, otp } = req.body;
      if (!email || !otp) throw badRequest('Email and OTP are required');
      const formattedEmail = email.toLowerCase().trim();
      const user = await User.findOne({ email: formattedEmail });
      if (!user || !user.otp) {
        throw unauthorized('Invalid OTP or no OTP requested.');
      }
      if (user.lockUntil && user.lockUntil > new Date()) {
        throw unauthorized('Account is temporarily locked. Please try again later.');
      }
      if (new Date() > user.otpExpires) {
        throw unauthorized('OTP has expired. Please request a new one.');
      }
      const isMatch = await bcrypt.compare(otp, user.otp);

      if (!isMatch) {
        const now = new Date();
        const updatedUser = await User.findOneAndUpdate(
          { 
            _id: user._id, 
            otp: user.otp, 
            $or: [{ lockUntil: null }, { lockUntil: { $lte: now } }] 
          },
          [
            {
              $set: {
                otpAttempts: { $add: ['$otpAttempts', 1] }
              }
            },
            {
              $set: {
                lockUntil: {
                  $cond: [
                    { $gte: ['$otpAttempts', 5] },
                    new Date(now.getTime() + 15 * 60 * 1000),
                    '$lockUntil'
                  ]
                }
              }
            }
          ],
          { new: true }
        );

        if (!updatedUser) {
           throw unauthorized('Too many invalid attempts or session expired.');
        }

        let errorMessage = `Invalid OTP. You have ${5 - updatedUser.otpAttempts} attempts left.`;
        if (updatedUser.otpAttempts >= 5) {
          errorMessage = 'Too many invalid attempts. Account locked for 15 minutes.';
        }
        
        throw unauthorized(errorMessage);
      }

      const updatedUser = await User.findOneAndUpdate(
        { email: user.email, otp: user.otp }, 
        { $set: { otp: null, otpExpires: null, otpAttempts: 0, lockUntil: null } },
        { new: true }
      );

      if (!updatedUser) {
         throw unauthorized('OTP already verified by another request.');
      }
      
      const guestId = req.cookies?.[GUEST_COOKIE];
      let cartAdjustedMessage = null;

      if (guestId) {
        try {
          const mergeResult = await cartService.mergeCartOnLogin(updatedUser._id, guestId);
          if (mergeResult && mergeResult.hasAdjustments) {
              cartAdjustedMessage = 'Some item quantities in your cart were adjusted based on available stock.';
          }
          res.clearCookie(GUEST_COOKIE, guestCookieOptions(env));
        } catch (mergeError) {
          logger.error(`[Redis] Failed to merge guest cart for user ${updatedUser.email} during login: ${mergeError.message}`);
        }
      }

      const token = signCustomerToken(env, updatedUser._id, updatedUser.email, updatedUser.sessionVersion);
      res.cookie(CUSTOMER_COOKIE, token, customerCookieOptions(env));

      res.json({ 
        success: true, 
        user: { email: updatedUser.email, fullName: updatedUser.fullName },
        cartAdjusted: !!cartAdjustedMessage,
        message: cartAdjustedMessage || 'Logged in successfully'
      });
    },

    async logout(req, res) {
      const token = req.cookies?.[CUSTOMER_COOKIE];
      if (token) {
        try {
          const payload = jwt.verify(token, env.JWT_SECRET, { 
            algorithms: ['HS256'], 
            ignoreExpiration: true 
          });
          
          if (payload && payload.email) {
             const isHeavilyExpired = payload.exp && (Date.now() / 1000 - payload.exp > 3600);
             
             if (!isHeavilyExpired) {
                 await User.findOneAndUpdate(
                    { email: payload.email },
                    { $inc: { sessionVersion: 1 } }
                 );
             }
          }
        } catch (error) {
        }
      }

      res.clearCookie(CUSTOMER_COOKIE, customerCookieOptions(env));
      res.json({ success: true, message: 'Logged out successfully' });
    },

    async getSession(req, res) {
      res.json({ success: true, authenticated: true, user: req.customer });
    },
    
    async getCart(req, res) {
      const cart = await cartService.getCart(req.customer?.id, req.guestId);
      res.json({ success: true, cart });
    },

    async updateCart(req, res) {
      const { productId, quantity } = req.body;
      try {
        const cart = await cartService.updateCart(req.customer?.id, req.guestId, productId, quantity);
        res.json({ success: true, cart });
      } catch (err) {
        throw badRequest(err.message);
      }
    },

    async clearCart(req, res) {
      await cartService.clearCart(req.customer?.id, req.guestId);
      res.json({ success: true, message: 'Cart cleared successfully' });
    },
    
    async createOrder(req, res) {
      const input = req.body;

      if (input.orderType === 'prescription_image' && !isTrustedPrescriptionUrl(input.prescriptionUrl, cloudinary, input.clientRequestId)) {
        throw badRequest('Prescription upload could not be verified. Please upload it again.');
      }

      const result = await createOrder(input, { 
        userId: req.customer.id, 
        notifier, 
        logger 
      });

      res.status(201).json(result);
    },
    
    async trackOrder(req, res) {
      const orderId = req.params.id.trim().toUpperCase();

      const order = await Order.findOne({ 
        orderId, 
        userId: req.customer.id 
      }).lean();
      
      if (!order) {
        throw notFound('Order not found or you are not authorized to view it.');
      }

      const STATUS_LABELS = {
        Pending: 'Order Received & Processing',
        Delivered: 'Delivered',
        Cancelled: 'Cancelled',
      };

      const formattedOrder = {
        orderId: order.orderId,
        status: order.status,
        statusLabel: STATUS_LABELS[order.status] || order.status,
        orderType: order.orderType,
        itemCount: order.medicines.length + (order.products ? order.products.length : 0),
        placedAt: order.createdAt,
        deliveredAt: order.deliveredAt,
        paymentMethod: order.paymentMethod,
        medicines: order.medicines,
        products: order.products,
        medicineSubtotal: order.medicineSubtotal,
        nonMedicineSubtotal: order.nonMedicineSubtotal,
        deliveryCharge: order.deliveryCharge,
        discount: order.discount,
        finalAmount: order.billedAt ? order.finalAmount : null,
      };

      res.set('Cache-Control', 'no-store');
      res.json({ success: true, order: formattedOrder });
    },

    async fetchHistory(req, res) {
      const userId = req.customer.id;
      const { page, limit } = req.validatedQuery;
      const skip = (page - 1) * limit;

      const filter = { userId };

      const [userOrders, total] = await Promise.all([
        Order.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).lean(),
        Order.countDocuments(filter)
      ]);

      const STATUS_LABELS = {
        Pending: 'Order Received & Processing',
        Delivered: 'Delivered',
        Cancelled: 'Cancelled',
      };

      const formattedOrders = userOrders.map((order) => ({
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

      res.set('Cache-Control', 'no-store');
      res.json({ 
        success: true, 
        orders: formattedOrders,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
      });
    },

    async downloadInvoice(req, res) {
      const orderId = req.params.id.trim().toUpperCase(); 
      
      const order = await Order.findOne({ 
        orderId, 
        userId: req.customer.id 
      }).lean();
      if (!order) throw notFound('Order not found or you are not authorized to download this invoice.');
      if (!order.billedAt) {
        throw badRequest('Invoice cannot be generated because this order has not been billed yet.');
      }
      res.set('Cache-Control', 'no-store');
      if (order.invoiceUrl) {
         const secureDownloadUrl = generateSignedDeliveryUrl(order.invoiceUrl, cloudinary);
         return res.json({ success: true, url: secureDownloadUrl });
      }
      await invService.requestInvoiceGeneration(orderId, order.billingVersion);
      res.status(202).json({
        success: true,
        processing: true,
        message: 'Your invoice is being generated. Please check back in a few seconds.'
      });
    },

    async getCheckoutOptions(req, res) {
      const user = await User.findById(req.customer.id)
        .select('savedPhones savedAddresses')
        .lean();

      if (!user) {
        throw unauthorized('User account not found.');
      }

      res.set('Cache-Control', 'no-store');
      res.json({
        success: true,
        savedPhones: user.savedPhones || [],
        savedAddresses: user.savedAddresses || []
      });
    },

    async deleteSavedAddress(req, res) {
      const key = req.params.key;

      if (!/^[a-f0-9]{64}$/.test(key)) {
        throw badRequest('Invalid address key.');
      }

      await User.updateOne(
        { _id: req.customer.id },
        { $pull: { savedAddresses: { key } } }
      );

      res.set('Cache-Control', 'no-store');
      res.json({ success: true, message: 'Address removed from saved preferences.' });
    },

    async deleteSavedPhone(req, res) {
      const number = normalizeIndianMobile(req.params.number);

      if (!number) {
        throw badRequest('Invalid mobile number.');
      }

      await User.updateOne(
        { _id: req.customer.id },
        { $pull: { savedPhones: number } }
      );

      res.set('Cache-Control', 'no-store');
      res.json({ success: true, message: 'Phone removed from saved preferences.' });
    },

    async publicSettings(_req, res) {
      res.set('Cache-Control', 'public, max-age=30');
      res.json({ success: true, settings: toPublicSettings(await getSettings()) });
    },

    uploadSignature(req, res) {
      res.set('Cache-Control', 'no-store');
      
      const { uploadId } = req.query;
      if (!uploadId) throw badRequest('uploadId is required to generate signature');

      const { 
        cloudName, apiKey, folder, timestamp, 
        client_allowed_formats, max_file_size,
        type, signature, uploadUrl 
      } = createUploadSignature(cloudinary, uploadId);
      
      res.json({ 
        success: true, 
        upload: { 
          cloudName, apiKey, folder, timestamp, 
          client_allowed_formats, max_file_size,
          type, signature, uploadUrl 
        } 
      });
    },

    async getCategories(_req, res) {
      const categories = await Product.distinct('category', { isActive: true, inStock: true });
      res.set('Cache-Control', 'public, max-age=300'); 
      res.json({ success: true, categories });
    },

    async getTrendingProducts(req, res) {
      const { category } = req.query;
      const settings = await getSettings();
      const trendingIds = settings.trendingProducts || [];

      const matchQuery = { 
        _id: { $in: trendingIds },
        isActive: true, 
        inStock: true,
        $or: [{ trackStock: false }, { stockQuantity: { $gt: 0 } }] 
      };
      
      if (category && category !== 'All') {
        matchQuery.category = category;
      }
      const products = await Product.find(matchQuery).limit(10);
      res.set('Cache-Control', 'no-store'); 
      res.json({ success: true, products });
    },

    async getPublicProducts(req, res) {
      const result = await listPublicProducts(req.validatedQuery);
      res.set('Cache-Control', 'public, max-age=60');
      res.json({ success: true, ...result });
    },
    
    async getAddressFromLocation(req, res) {
      const { lat, lng } = req.validatedQuery;
      const cacheKey = `${parseFloat(lat).toFixed(4)},${parseFloat(lng).toFixed(4)}`;
      
      if (geocodeCache.has(cacheKey)) {
        return res.json(geocodeCache.get(cacheKey));
      }

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
          {
            headers: {
              'User-Agent': 'GoregaonMedsApp/1.0',
              'Accept-Language': 'en-US,en;q=0.9'
            },
            signal: AbortSignal.timeout(5000)
          }
        );

        if (!response.ok) {
          throw new Error(`Nominatim API responded with ${response.status}`);
        }

        const data = await response.json();
        
        if (!data || !data.address) {
          return res.status(404).json({ success: false, error: 'Address not found for these coordinates.' });
        }
        const addr = data.address;
  
        const buildingOrFlat = addr.building || addr.house_number || addr.residential || '';
        const streetOrArea = addr.road || addr.neighbourhood || addr.suburb || addr.village || '';
        const landmark = addr.city || addr.town || addr.state_district || '';
        const pincode = addr.postcode || '';
        const areaFullName = [streetOrArea, landmark, pincode].filter(Boolean).join(', ');

        const finalResult = {
          success: true,
          address: {
            flat: buildingOrFlat || 'Not Found (Please type)', 
            area: areaFullName,
            landmark: addr.county || ''
          },
          rawDetails: addr 
        };
        cleanupGeocodeCache();
        geocodeCache.set(cacheKey, finalResult);
        res.json(finalResult);

      } catch (error) {
        logger.error(`[location] Reverse geocoding failed for ${lat},${lng}:`, error);
        throw badRequest('Could not fetch address. Please enter manually.');
      }
    },


    async getNotifications(req, res) {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.max(1, Math.min(50, parseInt(req.query.limit) || 20));
      const result = await getUserNotifications(req.customer.id, { page, limit });
      res.json({ success: true, ...result });
    },

    async getUnreadNotificationCount(req, res) {
      const count = await getUnreadCount(req.customer.id);
      res.json({ success: true, count });
    },

    async markNotificationRead(req, res) {
      const { id } = req.params;
      const success = await markNotificationAsRead(req.customer.id, id);
      if (!success) throw notFound('Notification not found.');
      res.json({ success: true });
    },

    async markAllNotificationsRead(req, res) {
      await markAllNotificationsAsRead(req.customer.id);
      res.json({ success: true });
    }
  };
}
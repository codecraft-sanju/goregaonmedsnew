// src/controllers/adminController.js
import { createHash, timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { ADMIN_COOKIE, SESSION_TTL_SECONDS, adminCookieOptions, signAdminToken } from '../middleware/auth.js';
import { getOrder, listCustomers, listOrders, markDelivered, saveBilling, cancelOrder } from '../services/adminOrderService.js';
import { getSettings, toAdminSettings, updateSettings } from '../services/settingsService.js';
import { unauthorized } from '../utils/AppError.js';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js'; 
import { SystemLog } from '../models/SystemLog.js';
import { getLocalStartOfDay, getLocalEndOfDay } from '../utils/date.js';

const DUMMY_HASH = '$2b$12$u0YK1PBfuuKz2KrcYy.BU.iG011BDU6ZzkEpa/Qv5mfcyu0dPUzui';

function safeEqual(a, b) {
  const hashA = createHash('sha256').update(a).digest();
  const hashB = createHash('sha256').update(b).digest();
  return timingSafeEqual(hashA, hashB);
}

export function createAdminController({ env, notifier }) {
  return {
    async login(req, res) {
      const { username, password } = req.body;
      const usernameMatches = safeEqual(username, env.ADMIN_USERNAME);
      const passwordMatches = await bcrypt.compare(password, usernameMatches ? env.ADMIN_PASSWORD_HASH : DUMMY_HASH);
      if (!usernameMatches || !passwordMatches) throw unauthorized('Invalid username or password');

      res.cookie(ADMIN_COOKIE, signAdminToken(env, env.ADMIN_USERNAME), {
        ...adminCookieOptions(env),
        maxAge: SESSION_TTL_SECONDS * 1000,
      });
      res.json({ success: true, admin: { username: env.ADMIN_USERNAME } });
    },

    logout(_req, res) {
      res.clearCookie(ADMIN_COOKIE, adminCookieOptions(env));
      res.json({ success: true });
    },

    session(req, res) {
      res.json({ success: true, authenticated: true, admin: req.admin });
    },

    async listOrders(req, res) {
      res.json({ success: true, ...(await listOrders(req.validatedQuery)) });
    },

    async getOrder(req, res) {
      res.json({ success: true, order: await getOrder(req.params.id) });
    },

    async saveBilling(req, res) {
      res.json({ success: true, order: await saveBilling(req.params.id, req.body) });
    },

    async markDelivered(req, res) {
      res.json({ success: true, order: await markDelivered(req.params.id) });
    },

    async cancelOrder(req, res) {
      const order = await cancelOrder(req.params.id, req.body.cancelReason);
      if (notifier && notifier.isConfigured) {
        notifier.notifyOrderCancelled(order).catch(console.error);
      }
      res.json({ success: true, order });
    },

    async listCustomers(req, res) {
      const { q, page, limit } = req.validatedQuery;
      res.json({ success: true, ...(await listCustomers({ query: q, page, limit })) });
    },

    async getSettings(_req, res) {
      res.json({ success: true, settings: toAdminSettings(await getSettings()) });
    },

    async updateSettings(req, res) {
      res.json({ success: true, settings: toAdminSettings(await updateSettings(req.body)) });
    },
  // async getAnalyticsOverview(req, res, next) {
  //     try {
  //       const { startDate, endDate, allTime } = req.query;

  //       let matchQuery = {};

  //       if (allTime !== 'true') {
  //         if (!startDate || !endDate) {
  //           return res.status(400).json({ success: false, error: 'startDate and endDate are required unless allTime is true.' });
  //         }
  //         const start = getLocalStartOfDay(startDate);
  //         const end = getLocalEndOfDay(endDate);

  //         if (isNaN(start.getTime()) || isNaN(end.getTime())) {
  //            return res.status(400).json({ success: false, error: 'Invalid date format. Use YYYY-MM-DD.' });
  //         }

  //         matchQuery.createdAt = { $gte: start, $lte: end };
  //       }
  //       const stats = await Order.aggregate([
  //         { $match: matchQuery },
  //         {
  //           $group: {
  //             _id: null,
  //             totalOrders: { $sum: 1 },
  //             pendingOrders: {
  //               $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] }
  //             },
  //             deliveredOrdersCount: {
  //               $sum: { $cond: [{ $eq: ['$status', 'Delivered'] }, 1, 0] }
  //             },
  //             totalSales: {
  //               $sum: {
  //                 $cond: [{ $eq: ['$status', 'Delivered'] }, '$finalAmount', 0]
  //               }
  //             }
  //           }
  //         }
  //       ]);

  //       const result = stats.length > 0 ? stats[0] : {
  //         totalOrders: 0,
  //         pendingOrders: 0,
  //         deliveredOrdersCount: 0,
  //         totalSales: 0
  //       };

  //       res.json({
  //         success: true,
  //         totalSales: result.totalSales,
  //         totalOrders: result.totalOrders,
  //         breakdown: {
  //           pending: result.pendingOrders,
  //           delivered: result.deliveredOrdersCount,
  //         },
  //       });
  //     } catch (error) {
  //       next(error);
  //     }
  //   },
  async getAnalyticsOverview(req, res, next) {
      try {
        const { startDate, endDate, allTime } = req.query;

        let matchQueryPlaced = {};
        let matchQueryDelivered = { status: 'Delivered' };

        if (allTime !== 'true') {
          if (!startDate || !endDate) {
            return res.status(400).json({ success: false, error: 'startDate and endDate are required unless allTime is true.' });
          }
          const start = getLocalStartOfDay(startDate);
          const end = getLocalEndOfDay(endDate);

          if (isNaN(start.getTime()) || isNaN(end.getTime())) {
             return res.status(400).json({ success: false, error: 'Invalid date format. Use YYYY-MM-DD.' });
          }
          matchQueryPlaced.createdAt = { $gte: start, $lte: end };
          matchQueryDelivered.deliveredAt = { $gte: start, $lte: end };
        }
        const [placedStats, salesStats] = await Promise.all([
          Order.aggregate([
            { $match: matchQueryPlaced },
            {
              $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                pendingOrders: { $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] } }
              }
            }
          ]),
          Order.aggregate([
            { $match: matchQueryDelivered },
            {
              $group: {
                _id: null,
                deliveredOrdersCount: { $sum: 1 },
                totalSales: { $sum: '$finalAmount' }
              }
            }
          ])
        ]);

        const placedResult = placedStats.length > 0 ? placedStats[0] : { totalOrders: 0, pendingOrders: 0 };
        const salesResult = salesStats.length > 0 ? salesStats[0] : { deliveredOrdersCount: 0, totalSales: 0 };

        res.json({
          success: true,
          totalSales: salesResult.totalSales,
          totalOrders: placedResult.totalOrders,
          breakdown: {
            pending: placedResult.pendingOrders,
            delivered: salesResult.deliveredOrdersCount,
          },
        });
      } catch (error) {
        next(error);
      }
    },

async listProducts(req, res, next) {
      try {
        // 1. Pagination Params with Safety Caps (Industry Standard)
        const page = Math.max(1, parseInt(req.query.page) || 1);
        // Max limit 100 set ki hai taaki server overload na ho
        const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 50)); 
        const skip = (page - 1) * limit;

        // 2. Basic Search Filter (Admin search form ke liye optional)
        const { q } = req.query;
        const filter = {};
        if (q) {
          // Admin search ke liye simple regex name ya category par
          filter.$or = [
            { name: { $regex: q, $options: 'i' } },
            { category: { $regex: q, $options: 'i' } }
          ];
        }

        // 3. Concurrent Execution & .lean() for 5x faster performance
        const [products, total] = await Promise.all([
          Product.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(), // .lean() plain JSON return karta hai mongoose instance ki jagah
          Product.countDocuments(filter)
        ]);

        // 4. Calculate Meta
        const totalPages = Math.ceil(total / limit);

        // 5. Standardized Response
        res.json({ 
          success: true, 
          products,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.max(1, totalPages),
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
          }
        });
      } catch (error) {
        next(error);
      }
    },

    async createProduct(req, res, next) {
      try {
        const product = await Product.create(req.body);
        res.status(201).json({ success: true, product });
      } catch (error) {
        next(error);
      }
    },

    async updateProduct(req, res, next) {
      try {
       const product = await Product.findByIdAndUpdate(req.params.id, req.body, { 
  new: true, 
  runValidators: true 
});
        if (!product) {
          return res.status(404).json({ success: false, error: 'Product not found' });
        }
        res.json({ success: true, product });
      } catch (error) {
        next(error);
      }
    },

    async deleteProduct(req, res, next) {
      try {
        const product = await Product.findByIdAndDelete(req.params.id);
        if (!product) {
          return res.status(404).json({ success: false, error: 'Product not found' });
        }
        res.json({ success: true, message: 'Product deleted successfully' });
      } catch (error) {
        next(error);
      }
    },

    async getSystemLogs(req, res, next) {
      try {
        const logs = await SystemLog.find().sort({ createdAt: -1 }).limit(100);
        res.json({ success: true, logs });
      } catch (error) { next(error); }
    },

    async deleteSystemLog(req, res, next) {
      try {
        await SystemLog.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Log deleted successfully' });
      } catch (error) { next(error); }
    },

    async clearAllLogs(req, res, next) {
      try {
        await SystemLog.deleteMany({});
        res.json({ success: true, message: 'All logs cleared successfully' });
      } catch (error) { next(error); }
    }
  };
}
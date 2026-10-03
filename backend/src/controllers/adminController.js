// import { createHash, timingSafeEqual } from 'node:crypto';
// import bcrypt from 'bcryptjs';
// import { ADMIN_COOKIE, SESSION_TTL_SECONDS, adminCookieOptions, signAdminToken } from '../middleware/auth.js';
// // ADDED cancelOrder to imports
// import { getOrder, listCustomers, listOrders, markDelivered, saveBilling, cancelOrder } from '../services/adminOrderService.js';
// import { getSettings, toAdminSettings, updateSettings } from '../services/settingsService.js';
// import { unauthorized } from '../utils/AppError.js';

// const DUMMY_HASH = '$2b$12$u0YK1PBfuuKz2KrcYy.BU.iG011BDU6ZzkEpa/Qv5mfcyu0dPUzui';

// function safeEqual(a, b) {
//   const hashA = createHash('sha256').update(a).digest();
//   const hashB = createHash('sha256').update(b).digest();
//   return timingSafeEqual(hashA, hashB);
// }

// // UPDATED: Accepting notifier
// export function createAdminController({ env, notifier }) {
//   return {
//     async login(req, res) {
//       const { username, password } = req.body;
//       const usernameMatches = safeEqual(username, env.ADMIN_USERNAME);
//       const passwordMatches = await bcrypt.compare(password, usernameMatches ? env.ADMIN_PASSWORD_HASH : DUMMY_HASH);
//       if (!usernameMatches || !passwordMatches) throw unauthorized('Invalid username or password');

//       res.cookie(ADMIN_COOKIE, signAdminToken(env, env.ADMIN_USERNAME), {
//         ...adminCookieOptions(env),
//         maxAge: SESSION_TTL_SECONDS * 1000,
//       });
//       res.json({ success: true, admin: { username: env.ADMIN_USERNAME } });
//     },

//     logout(_req, res) {
//       res.clearCookie(ADMIN_COOKIE, adminCookieOptions(env));
//       res.json({ success: true });
//     },

//     session(req, res) {
//       res.json({ success: true, authenticated: true, admin: req.admin });
//     },

//     async listOrders(req, res) {
//       res.json({ success: true, ...(await listOrders(req.validatedQuery)) });
//     },

//     async getOrder(req, res) {
//       res.json({ success: true, order: await getOrder(req.params.id) });
//     },

//     async saveBilling(req, res) {
//       res.json({ success: true, order: await saveBilling(req.params.id, req.body) });
//     },

//     async markDelivered(req, res) {
//       res.json({ success: true, order: await markDelivered(req.params.id) });
//     },

//     // NEW: Cancel Order Controller
//     async cancelOrder(req, res) {
//       const order = await cancelOrder(req.params.id, req.body.cancelReason);
//       // Notify admin on Telegram that order was cancelled successfully
//       if (notifier && notifier.isConfigured) {
//         notifier.notifyOrderCancelled(order).catch(console.error);
//       }
//       res.json({ success: true, order });
//     },

//     async listCustomers(req, res) {
//       const { q, page, limit } = req.validatedQuery;
//       res.json({ success: true, ...(await listCustomers({ query: q, page, limit })) });
//     },

//     async getSettings(_req, res) {
//       res.json({ success: true, settings: toAdminSettings(await getSettings()) });
//     },

//     async updateSettings(req, res) {
//       res.json({ success: true, settings: toAdminSettings(await updateSettings(req.body)) });
//     },
//   };
// }


import { createHash, timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { ADMIN_COOKIE, SESSION_TTL_SECONDS, adminCookieOptions, signAdminToken } from '../middleware/auth.js';
import { getOrder, listCustomers, listOrders, markDelivered, saveBilling, cancelOrder } from '../services/adminOrderService.js';
import { getSettings, toAdminSettings, updateSettings } from '../services/settingsService.js';
import { unauthorized } from '../utils/AppError.js';
import { Order } from '../models/Order.js'; // ADDED: Import Order model for analytics query

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

    // NEW: Analytics Controller for Sales and Orders
    async getAnalyticsOverview(req, res, next) {
      try {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
          return res.status(400).json({ success: false, error: 'startDate and endDate are required.' });
        }

        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);

        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const ordersInRange = await Order.find({
          createdAt: { $gte: start, $lte: end },
        });

        const totalOrders = ordersInRange.length;
        const pendingOrders = ordersInRange.filter((o) => o.status === 'Pending').length;
        const deliveredOrdersCount = ordersInRange.filter((o) => o.status === 'Delivered').length;

        const salesAggregation = await Order.aggregate([
          {
            $match: {
              status: 'Delivered',
              createdAt: { $gte: start, $lte: end },
            },
          },
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: '$finalAmount' },
            },
          },
        ]);

        const totalSales = salesAggregation.length > 0 ? salesAggregation[0].totalRevenue : 0;

        res.json({
          success: true,
          totalSales,
          totalOrders,
          breakdown: {
            pending: pendingOrders,
            delivered: deliveredOrdersCount,
          },
        });
      } catch (error) {
        next(error);
      }
    }
  };
}
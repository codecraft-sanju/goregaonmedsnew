import { createHash, timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { ADMIN_COOKIE, SESSION_TTL_SECONDS, adminCookieOptions, signAdminToken } from '../middleware/auth.js';
import { getOrder, listCustomers, listOrders, markDelivered, saveBilling } from '../services/adminOrderService.js';
import { getSettings, toAdminSettings, updateSettings } from '../services/settingsService.js';
import { unauthorized } from '../utils/AppError.js';

// Compared when the username is wrong so response time does not reveal valid usernames.
const DUMMY_HASH = '$2b$12$u0YK1PBfuuKz2KrcYy.BU.iG011BDU6ZzkEpa/Qv5mfcyu0dPUzui';

function safeEqual(a, b) {
  const hashA = createHash('sha256').update(a).digest();
  const hashB = createHash('sha256').update(b).digest();
  return timingSafeEqual(hashA, hashB);
}

export function createAdminController({ env }) {
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
  };
}

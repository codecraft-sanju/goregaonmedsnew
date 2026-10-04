//src/routes/adminRoutes.js
import { Router } from 'express';
import { requireAdmin, requireTrustedOrigin } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import {
  billingSchema,
  listCustomersQuerySchema,
  listOrdersQuerySchema,
  loginSchema,
  settingsUpdateSchema,
  cancelOrderSchema, 
} from '../validation/schemas.js';

export function createAdminRouter({ env, controller, limiters }) {
  const router = Router();
  const authenticated = requireAdmin(env);

  router.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  router.use(requireTrustedOrigin(env));

  router.post('/login', limiters.adminLogin, validateBody(loginSchema), controller.login);
  router.post('/logout', controller.logout);
  router.get('/session', authenticated, controller.session);

  router.get('/orders', authenticated, validateQuery(listOrdersQuerySchema), controller.listOrders);
  router.get('/orders/:id', authenticated, controller.getOrder);
  router.patch('/orders/:id/billing', authenticated, validateBody(billingSchema), controller.saveBilling);
  router.patch('/orders/:id/deliver', authenticated, controller.markDelivered);
  router.patch('/orders/:id/cancel', authenticated, validateBody(cancelOrderSchema), controller.cancelOrder);

  router.get('/customers', authenticated, validateQuery(listCustomersQuerySchema), controller.listCustomers);

  router.get('/settings', authenticated, controller.getSettings);
  router.patch('/settings', authenticated, validateBody(settingsUpdateSchema), controller.updateSettings);

  
  router.get('/analytics/overview', authenticated, controller.getAnalyticsOverview);

  return router;
}
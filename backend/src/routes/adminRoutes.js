// src/routes/adminRoutes.js
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
  createProductSchema, 
  updateProductSchema
} from '../validation/schemas.js';

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export function createAdminRouter({ env, controller, limiters }) {
  const router = Router();
  const authenticated = requireAdmin(env);

  router.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  router.use(requireTrustedOrigin(env));
  router.post('/login', limiters.adminLogin, validateBody(loginSchema), asyncHandler(controller.login));
  router.post('/logout', asyncHandler(controller.logout));
  router.get('/session', authenticated, asyncHandler(controller.session));

  router.get('/orders', authenticated, validateQuery(listOrdersQuerySchema), asyncHandler(controller.listOrders));
  router.get('/orders/:id', authenticated, asyncHandler(controller.getOrder));
  router.patch('/orders/:id/billing', authenticated, validateBody(billingSchema), asyncHandler(controller.saveBilling));
  router.patch('/orders/:id/deliver', authenticated, asyncHandler(controller.markDelivered));
  router.patch('/orders/:id/cancel', authenticated, validateBody(cancelOrderSchema), asyncHandler(controller.cancelOrder));

  router.get('/customers', authenticated, validateQuery(listCustomersQuerySchema), asyncHandler(controller.listCustomers));

  router.get('/settings', authenticated, asyncHandler(controller.getSettings));
  router.patch('/settings', authenticated, validateBody(settingsUpdateSchema), asyncHandler(controller.updateSettings));
  
  router.get('/analytics/overview', authenticated, asyncHandler(controller.getAnalyticsOverview));

  router.get('/products', authenticated, asyncHandler(controller.listProducts)); 
  router.post('/products', authenticated, validateBody(createProductSchema), asyncHandler(controller.createProduct));
 router.put('/products/:id', authenticated, validateBody(updateProductSchema), asyncHandler(controller.updateProduct));
  router.delete('/products/:id', authenticated, asyncHandler(controller.deleteProduct));
router.get('/logs', authenticated, asyncHandler(controller.getSystemLogs));
  router.delete('/logs/:id', authenticated, asyncHandler(controller.deleteSystemLog));
  router.delete('/logs', authenticated, asyncHandler(controller.clearAllLogs));
  return router;
}
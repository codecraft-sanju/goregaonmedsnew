//src/routes/publicRoutes.js
import { Router } from 'express';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { productFiltersSchema } from '../validation/productFiltersSchema.js';
import { requireCustomer, guestSession, optionalCustomerAuth, requireTrustedOrigin } from '../middleware/auth.js';

import { 
  createOrderSchema, 
  historyQuerySchema,
  sendOtpSchema, 
  verifyOtpSchema,
  updateCartSchema,
  reverseGeocodeSchema
} from '../validation/schemas.js';

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export function createPublicRouter({ env, controller, limiters }) {
  const router = Router();

  const customerAuth = requireCustomer(env);
  const optionalAuth = optionalCustomerAuth(env);
  const trackGuest = guestSession(env);
  const trustedOrigin = requireTrustedOrigin(env); 
  router.use(trustedOrigin); 
  
  // Auth Routes
  router.post('/auth/send-otp', limiters.sendOtp, validateBody(sendOtpSchema), asyncHandler(controller.requestOtp)); 
  router.post('/auth/verify-otp', limiters.verifyOtp, validateBody(verifyOtpSchema), asyncHandler(controller.verifyOtp)); 
  router.post('/auth/logout', asyncHandler(controller.logout)); 
  router.get('/auth/session', customerAuth, asyncHandler(controller.getSession)); 
  
  // Cart Routes
  router.get('/cart', optionalAuth, trackGuest, asyncHandler(controller.getCart));
  router.post('/cart/update', optionalAuth, trackGuest, validateBody(updateCartSchema), asyncHandler(controller.updateCart));
  router.post('/cart/clear', optionalAuth, trackGuest, asyncHandler(controller.clearCart));
  
  // Profile / Checkout Options Routes 
  router.get('/profile/checkout-options', customerAuth, asyncHandler(controller.getCheckoutOptions));
  router.delete('/profile/saved-addresses/:key', customerAuth, asyncHandler(controller.deleteSavedAddress));
  router.delete('/profile/saved-phones/:number', customerAuth, asyncHandler(controller.deleteSavedPhone));

  // Notification Routes
  router.get('/notifications', customerAuth, asyncHandler(controller.getNotifications));
  router.get('/notifications/unread-count', customerAuth, asyncHandler(controller.getUnreadNotificationCount));
  router.put('/notifications/read-all', customerAuth, asyncHandler(controller.markAllNotificationsRead));
  router.put('/notifications/:id/read', customerAuth, asyncHandler(controller.markNotificationRead));

  // Orders Routes
  router.post('/orders/create', limiters.createOrder, customerAuth, validateBody(createOrderSchema), asyncHandler(controller.createOrder));
  
  // Secure History and Tracking via GET
  router.get('/orders/history', customerAuth, validateQuery(historyQuerySchema), asyncHandler(controller.fetchHistory));
  router.get('/orders/:id', customerAuth, asyncHandler(controller.trackOrder));
  router.get('/orders/:id/invoice', customerAuth, asyncHandler(controller.downloadInvoice));
  
  // Settings & Utilities
  router.get('/settings/public', asyncHandler(controller.publicSettings));
  router.get('/location/address', limiters.fetchLocation, validateQuery(reverseGeocodeSchema), asyncHandler(controller.getAddressFromLocation));

  router.get('/uploads/signature', customerAuth, limiters.uploadSignature, asyncHandler(controller.uploadSignature));
  
  // Products
  router.get('/categories', asyncHandler(controller.getCategories));
  router.get('/products/trending', asyncHandler(controller.getTrendingProducts));
  router.get('/products', validateQuery(productFiltersSchema), asyncHandler(controller.getPublicProducts));
  
  return router;
}
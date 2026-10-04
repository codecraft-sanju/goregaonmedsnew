//src/routes/publicRoutes.js
import { Router } from 'express';
import { validateBody } from '../middleware/validate.js';
import { createOrderSchema, trackOrderSchema } from '../validation/schemas.js';

export function createPublicRouter({ controller, limiters }) {
  const router = Router();
  router.post('/orders/create', limiters.createOrder, validateBody(createOrderSchema), controller.createOrder);
  router.post('/orders/track', limiters.trackOrder, validateBody(trackOrderSchema), controller.trackOrder);
  router.get('/settings/public', controller.publicSettings);
  router.get('/uploads/signature', limiters.uploadSignature, controller.uploadSignature);
  return router;
}

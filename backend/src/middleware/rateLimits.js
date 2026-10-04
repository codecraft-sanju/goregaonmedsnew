//src/middleware/rateLimits.js
import { rateLimit } from 'express-rate-limit';

const limiter = (windowMinutes, limit, message) =>
  rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { success: false, error: { code: 'RATE_LIMITED', message } },
  });

export const createRateLimiters = () => ({
  createOrder: limiter(10, 10, 'Too many orders from this network. Please call +91 84338 18771.'),
  trackOrder: limiter(10, 30, 'Too many tracking attempts. Please try again in a few minutes.'),
  uploadSignature: limiter(10, 20, 'Too many uploads. Please try again in a few minutes.'),
  adminLogin: limiter(15, 5, 'Too many login attempts. Please wait 15 minutes.'),
});

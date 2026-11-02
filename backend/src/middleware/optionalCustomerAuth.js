//middleware/optionalCustomerAuth.js
import jwt from 'jsonwebtoken';
import { CUSTOMER_COOKIE } from './auth.js';
import { User } from '../models/User.js';

// This replaces the insecure optionalCustomerAuth in publicRoutes.js.
export const optionalCustomerAuth = (env) => async (req, _res, next) => {
  const token = req.cookies?.[CUSTOMER_COOKIE];
  if (!token) return next();
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
    if (payload.role !== 'customer') return next();
    const user = await User.findById(payload.sub)
      .select('sessionVersion email')
      .lean();
    if (user && user.sessionVersion === payload.version) {
      req.customer = { id: String(user._id), email: user.email };
    }
    return next();
  } catch (err) {
    // A bad/expired customer cookie is an anonymous request, not a valid session.
    // Avoid logging the token or returning sensitive JWT parser errors.
    return next();
  }
};

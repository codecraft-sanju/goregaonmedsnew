//src/middleware/auth.js
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { forbidden, unauthorized } from '../utils/AppError.js';
import { User } from '../models/User.js';

export const ADMIN_COOKIE = 'gm_admin';
export const SESSION_TTL_SECONDS = 12 * 60 * 60;

export function adminCookieOptions(env) {
  return {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'strict',
    path: '/',
  };
}

export function signAdminToken(env, username) {
  return jwt.sign({ role: 'admin' }, env.JWT_SECRET, {
    subject: username,
    expiresIn: SESSION_TTL_SECONDS,
    algorithm: 'HS256',
  });
}

export const requireAdmin = (env) => (req, _res, next) => {
  const token = req.cookies?.[ADMIN_COOKIE];
  if (!token) return next(unauthorized());
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
    if (payload.role !== 'admin' || payload.sub !== env.ADMIN_USERNAME) return next(unauthorized());
    req.admin = { username: payload.sub };
    return next();
  } catch {
    return next(unauthorized('Session expired. Please log in again.'));
  }
};

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export const requireTrustedOrigin = (env) => (req, _res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();
  const origin = req.get('origin');
  if (origin && origin !== env.frontendOrigin) return next(forbidden('Request origin not allowed'));
  if (!origin && env.isProduction) return next(forbidden('Request origin required'));
  return next();
};

export const CUSTOMER_COOKIE = 'gm_customer';
export const CUSTOMER_SESSION_TTL = 30 * 24 * 60 * 60; // 30 Days

export function signCustomerToken(env, userId, email, version) { 
  return jwt.sign({ role: 'customer', email, version }, env.JWT_SECRET, {
    subject: String(userId),
    expiresIn: CUSTOMER_SESSION_TTL,
    algorithm: 'HS256',
  });
}

// export const requireCustomer = (env) => async (req, _res, next) => { 
//   const token = req.cookies?.[CUSTOMER_COOKIE];
//   if (!token) return next(unauthorized('Please log in to view your orders.'));
//   try {
//     const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
//     if (payload.role !== 'customer') return next(unauthorized());
//     const user = await User.findById(payload.sub).select('sessionVersion').lean();
//     if (!user || user.sessionVersion !== payload.version) {
//         return next(unauthorized('Session expired or logged out. Please log in again.'));
//     }

//     req.customer = { id: payload.sub, email: payload.email }; 
//     return next();
//   } catch {
//     return next(unauthorized('Session expired. Please log in again.'));
//   }
// };

export const requireCustomer = (env) => async (req, res, next) => { 
  const token = req.cookies?.[CUSTOMER_COOKIE];
  if (!token) return next(unauthorized('Please log in to view your orders.'));
  
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
    if (payload.role !== 'customer') return next(unauthorized());
    const user = await User.findById(payload.sub).select('sessionVersion').lean();
    
    if (!user || user.sessionVersion !== payload.version) {
        return next(unauthorized('Session expired or logged out. Please log in again.'));
    }

    req.customer = { id: payload.sub, email: payload.email }; 
    return next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
       return next(unauthorized('Session expired. Please log in again.'));
    }
    return next(error); 
  }
};
export const GUEST_COOKIE = 'gm_guest';
export const GUEST_SESSION_TTL = 7 * 24 * 60 * 60; // 7 Days (Matches Redis TTL)

export function guestCookieOptions(env) {
  return {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'strict',
    path: '/',
    maxAge: GUEST_SESSION_TTL * 1000,
  };
}
export const guestSession = (env) => (req, res, next) => {
  if (req.customer?.id) {
    return next();
  }

  let guestId = req.cookies?.[GUEST_COOKIE];
  if (!guestId) {
    guestId = crypto.randomUUID();
    res.cookie(GUEST_COOKIE, guestId, guestCookieOptions(env));
  }
  
  req.guestId = guestId;
  next();
};

// export const optionalCustomerAuth = (env) => async (req, res, next) => {
//   const token = req.cookies?.[CUSTOMER_COOKIE];
  
//   if (!token) {
//     return next(); 
//   }

//   try {
//     const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
    
//     if (payload.role !== 'customer') {
//       return next(); 
//     }
//     const user = await User.findById(payload.sub).select('sessionVersion').lean();
    
//     if (!user || user.sessionVersion !== payload.version) {
     
//       res.clearCookie(CUSTOMER_COOKIE); 
//       return next();
//     }

//     // Valid Session
//     req.customer = { id: payload.sub, email: payload.email }; 
//     return next();
    
//   } catch (e) {
   
//     return next();
//   }
// };
export const optionalCustomerAuth = (env) => async (req, res, next) => {
  const token = req.cookies?.[CUSTOMER_COOKIE];
  if (!token) return next(); 

  try {
    const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
    if (payload.role !== 'customer') return next(); 
    
    const user = await User.findById(payload.sub).select('sessionVersion').lean();
    if (!user || user.sessionVersion !== payload.version) {
      res.clearCookie(CUSTOMER_COOKIE); 
      return next();
    }
    req.customer = { id: payload.sub, email: payload.email }; 
    return next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
        return next();
    }
    return next(error);
  }
};
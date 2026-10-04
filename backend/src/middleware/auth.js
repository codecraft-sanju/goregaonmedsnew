//src/middleware/auth.js
import jwt from 'jsonwebtoken';
import { forbidden, unauthorized } from '../utils/AppError.js';

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

/** CSRF defence in depth on top of SameSite=Strict: state changes must come from our frontend. */
export const requireTrustedOrigin = (env) => (req, _res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();
  const origin = req.get('origin');
  if (origin && origin !== env.frontendOrigin) return next(forbidden('Request origin not allowed'));
  if (!origin && env.isProduction) return next(forbidden('Request origin required'));
  return next();
};

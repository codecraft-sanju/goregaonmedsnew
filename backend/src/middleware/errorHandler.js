import { ZodError } from 'zod';
import { AppError } from '../utils/AppError.js';

export function notFoundHandler(_req, res) {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } });
}

export function createErrorHandler(logger = console) {
  // eslint-disable-next-line no-unused-vars
  return (error, req, res, _next) => {
    if (error instanceof ZodError) {
      const fields = error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }));
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: fields[0]?.message ?? 'Invalid input', fields },
      });
    }
    if (error instanceof AppError) {
      return res.status(error.status).json({ success: false, error: { code: error.code, message: error.message } });
    }
    if (error?.type === 'entity.parse.failed') {
      return res.status(400).json({ success: false, error: { code: 'INVALID_JSON', message: 'Malformed JSON body' } });
    }
    if (error?.type === 'entity.too.large') {
      return res.status(413).json({ success: false, error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request is too large' } });
    }
    logger.error(`[error] ${req.method} ${req.originalUrl}`, error);
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' } });
  };
}

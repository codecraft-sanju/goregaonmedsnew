// src/middleware/errorHandler.js
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError.js';
import { SystemLog } from '../models/SystemLog.js'; // DB Model

export function notFoundHandler(_req, res) {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } });
}

export function createErrorHandler(logger = console) {
  return (error, req, res, _next) => {
    if (error instanceof ZodError) {
      const fields = error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }));
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: fields[0]?.message ?? 'Invalid input', fields } });
    }
    if (error instanceof AppError) {
      return res.status(error.status).json({ success: false, error: { code: error.code, message: error.message } });
    }
    
    logger.error(`[error] ${req.method} ${req.originalUrl}`, error);
SystemLog.create({
      type: 'error',
      message: error.message || 'Internal API error',
      context: { 
        method: req.method, 
        route: req.route?.path ?? 'unknown',
        url: req.originalUrl,
        errorType: error.name
      }
    }).catch(err => logger.error('Failed to save log to DB', err));

    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' } });
  };
}
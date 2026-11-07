import { env } from '../config/env.js';

export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
  }
}

export function notFoundHandler(req, res, next) {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404, 'NOT_FOUND'));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';

  // Never leak stack traces or internal details in production.
  const payload = {
    success: false,
    error: {
      code,
      message: err.isOperational ? err.message : 'An unexpected error occurred.',
    },
  };

  if (err.details) {
    payload.error.details = err.details;
  }

  if (!env.isProduction) {
    payload.error.stack = err.stack;
  }

  if (!err.isOperational) {
    // eslint-disable-next-line no-console
    console.error('[unhandled error]', err);
  }

  res.status(statusCode).json(payload);
}

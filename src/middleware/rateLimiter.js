import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

export const loginRateLimiter = rateLimit({
  windowMs: env.security.loginRateLimitWindowMs,
  max: env.security.loginRateLimitMaxAttempts,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_LOGIN_ATTEMPTS',
      message: 'عدد محاولات تسجيل الدخول كبير جدًا. حاول مرة أخرى بعد قليل.',
    },
  },
});

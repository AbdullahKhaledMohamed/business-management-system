import 'dotenv/config';

/**
 * Centralized, validated environment configuration.
 * Fails fast at startup if a required variable is missing,
 * instead of silently falling back to an insecure default.
 */

function requireEnv(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  appBaseUrl: process.env.APP_BASE_URL || 'http://localhost:3000',

  databaseUrl: requireEnv('DATABASE_URL'),

  session: {
    secret: requireEnv('SESSION_SECRET'),
    maxAgeMs: Number(process.env.SESSION_MAX_AGE_MS || 86_400_000),
    cookieSecure: process.env.SESSION_COOKIE_SECURE === 'true',
  },

  security: {
    bcryptSaltRounds: Number(process.env.BCRYPT_SALT_ROUNDS || 12),
    loginRateLimitWindowMs: Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || 900_000),
    loginRateLimitMaxAttempts: Number(process.env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS || 5),
  },

  locale: {
    default: process.env.DEFAULT_LOCALE || 'ar',
    supported: (process.env.SUPPORTED_LOCALES || 'ar,en').split(','),
  },

  currency: {
    default: process.env.DEFAULT_CURRENCY || 'EGP',
    decimalPlaces: Number(process.env.CURRENCY_DECIMAL_PLACES || 2),
  },

  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },

  isProduction: (process.env.NODE_ENV || 'development') === 'production',
};

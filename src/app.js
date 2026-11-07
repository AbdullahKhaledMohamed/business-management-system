import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import pg from 'pg';

import { env } from './config/env.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.routes.js';
import categoriesRoutes from './routes/categories.routes.js';
import productsRoutes from './routes/products.routes.js';
import customersRoutes from './routes/customers.routes.js';
import inventoryRoutes from './routes/inventory.routes.js';
import salesRoutes from './routes/sales.routes.js';
import expensesRoutes from './routes/expenses.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import reportsRoutes from './routes/reports.routes.js';

const PgSession = connectPgSimple(session);

// Dedicated pg Pool for session storage (separate from the Prisma connection pool).
const sessionPool = new pg.Pool({ connectionString: env.databaseUrl });

export function createApp() {
  const app = express();

  // ---- Security headers ----
  app.use(helmet());

  // ---- CORS ----
  app.use(cors({ origin: env.cors.origin, credentials: true }));

  // ---- Request logging ----
  app.use(morgan(env.isProduction ? 'combined' : 'dev'));

  // ---- Body parsing ----
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  // ---- Sessions (PostgreSQL-backed) ----
  app.use(
    session({
      store: new PgSession({ pool: sessionPool, tableName: 'session', createTableIfMissing: true }),
      name: 'bms.sid',
      secret: env.session.secret,
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: {
        httpOnly: true,
        secure: env.session.cookieSecure,
        sameSite: 'lax',
        maxAge: env.session.maxAgeMs,
      },
    }),
  );

  // ---- Static frontend assets ----
  app.use(express.static('src/public'));
  app.use(express.static('src/views'));

  // ---- Health check (verifies the server boots correctly) ----
  app.get('/api/v1/health', (req, res) => {
    res.json({ success: true, status: 'ok', environment: env.nodeEnv });
  });

  // ---- API routes ----
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/categories', categoriesRoutes);
  app.use('/api/v1/products', productsRoutes);
  app.use('/api/v1/customers', customersRoutes);
  app.use('/api/v1/inventory', inventoryRoutes);
  app.use('/api/v1/sales', salesRoutes);
  app.use('/api/v1/expenses', expensesRoutes);
  app.use('/api/v1/dashboard', dashboardRoutes);
  app.use('/api/v1/reports', reportsRoutes);
  // app.use('/api/v1/users', usersRoutes);
  // ... (Phase 9 onward: full frontend UI, Arabic/English, RTL/LTR)

  // ---- Default route: redirect to the login page ----
  app.get('/', (req, res) => res.redirect('/login.html'));

  // ---- 404 + centralized error handling ----
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

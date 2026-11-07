import { PrismaClient } from '@prisma/client';
import { env } from './env.js';

/**
 * Prisma Client singleton.
 * In development, Node's module cache prevents re-instantiating the client
 * on every file change (which would exhaust PostgreSQL connections).
 */

const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.__prisma ??
  new PrismaClient({
    log: env.isProduction ? ['error', 'warn'] : ['query', 'error', 'warn'],
  });

if (!env.isProduction) {
  globalForPrisma.__prisma = prisma;
}

export async function connectDatabase() {
  await prisma.$connect();
  // eslint-disable-next-line no-console
  console.log('[database] PostgreSQL connection established via Prisma.');
}

export async function disconnectDatabase() {
  await prisma.$disconnect();
}

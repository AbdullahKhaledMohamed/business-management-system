import { prisma } from '../config/database.js';

/**
 * SINGLE SOURCE OF TRUTH for revenue/COGS/invoice-count over a date range.
 * Used by BOTH the dashboard (Phase 7) and the reports module (Phase 8),
 * so the two are guaranteed to always agree — per the explicit requirement
 * that dashboard and report calculations stay consistent.
 *
 * Revenue = SUM(totalAmount) of non-canceled invoices created in range.
 * COGS    = SUM(quantity * unitCost) of their sale items (historical cost).
 */
export async function getRevenueCogsAndCount({ from, to }) {
  const [revenueRows, cogsRows, countRows] = await Promise.all([
    prisma.$queryRaw`
      SELECT COALESCE(SUM("totalAmount"), 0) AS revenue
      FROM sales_invoices
      WHERE status != 'CANCELED' AND "createdAt" BETWEEN ${from} AND ${to}
    `,
    prisma.$queryRaw`
      SELECT COALESCE(SUM(it.quantity * it."unitCost"), 0) AS cogs
      FROM sale_items it
      JOIN sales_invoices inv ON inv.id = it."invoiceId"
      WHERE inv.status != 'CANCELED' AND inv."createdAt" BETWEEN ${from} AND ${to}
    `,
    prisma.$queryRaw`
      SELECT COUNT(*) AS count
      FROM sales_invoices
      WHERE status != 'CANCELED' AND "createdAt" BETWEEN ${from} AND ${to}
    `,
  ]);

  return {
    revenue: Number(revenueRows[0]?.revenue || 0),
    cogs: Number(cogsRows[0]?.cogs || 0),
    invoiceCount: Number(countRows[0]?.count || 0),
  };
}

import { prisma } from '../config/database.js';
import { resolveDateRange } from '../utils/dateRanges.js';
import { getTotalExpenses, getDailyExpenseTotals, getMonthlyExpenseTotals, getExpenseBreakdownByCategory } from './expense.service.js';
import { getLowStockProducts } from './product.service.js';
import { getRevenueCogsAndCount } from './financial.service.js';

/**
 * Full KPI summary for the dashboard's header cards.
 * Net profit is explicitly labeled an ESTIMATE in the API response —
 * this system has no tax, depreciation, or full accounting ledger.
 */
export async function getDashboardSummary({ period, customFrom, customTo }) {
  const range = resolveDateRange(period, customFrom, customTo);

  const [{ revenue, cogs, invoiceCount }, totalExpenses, customerCount, lowStockProducts] = await Promise.all([
    getRevenueCogsAndCount(range),
    getTotalExpenses({ dateFrom: range.from, dateTo: range.to }),
    prisma.customer.count(),
    getLowStockProducts(),
  ]);

  const grossProfit = revenue - cogs;
  const netProfitEstimate = grossProfit - totalExpenses;

  // Outstanding balance is a current snapshot, independent of the selected period.
  const outstandingInvoices = await prisma.salesInvoice.findMany({
    where: { status: { not: 'CANCELED' } },
    select: { totalAmount: true, amountPaid: true },
  });
  const totalOutstandingBalance = outstandingInvoices.reduce(
    (sum, inv) => sum + (Number(inv.totalAmount) - Number(inv.amountPaid)),
    0,
  );

  return {
    period: { name: period, from: range.from, to: range.to },
    revenue,
    costOfGoodsSold: cogs,
    grossProfit,
    totalExpenses,
    netProfitEstimate,
    isEstimate: true,
    salesInvoiceCount: invoiceCount,
    customerCount,
    lowStockProductCount: lowStockProducts.length,
    totalOutstandingBalance,
  };
}

export async function getSalesTrend({ period, customFrom, customTo }, granularity = 'day') {
  const { from, to } = resolveDateRange(period, customFrom, customTo);
  const trunc = granularity === 'month' ? 'month' : 'day';

  const rows = await prisma.$queryRaw`
    SELECT date_trunc(${trunc}, "createdAt") AS bucket, COALESCE(SUM("totalAmount"), 0) AS revenue, COUNT(*) AS invoice_count
    FROM sales_invoices
    WHERE status != 'CANCELED' AND "createdAt" BETWEEN ${from} AND ${to}
    GROUP BY bucket
    ORDER BY bucket ASC
  `;

  return rows.map((r) => ({ bucket: r.bucket, revenue: Number(r.revenue), invoiceCount: Number(r.invoice_count) }));
}

async function getCogsTrend({ from, to }, granularity = 'day') {
  const trunc = granularity === 'month' ? 'month' : 'day';
  const rows = await prisma.$queryRaw`
    SELECT date_trunc(${trunc}, inv."createdAt") AS bucket, COALESCE(SUM(it.quantity * it."unitCost"), 0) AS cogs
    FROM sale_items it
    JOIN sales_invoices inv ON inv.id = it."invoiceId"
    WHERE inv.status != 'CANCELED' AND inv."createdAt" BETWEEN ${from} AND ${to}
    GROUP BY bucket
    ORDER BY bucket ASC
  `;
  return rows.map((r) => ({ bucket: r.bucket, cogs: Number(r.cogs) }));
}

function mergeTrendsByBucket(revenueRows, cogsRows, expenseRows, expenseKey) {
  const bucketMap = new Map();

  const keyOf = (d) => new Date(d).toISOString();

  for (const r of revenueRows) {
    bucketMap.set(keyOf(r.bucket), { bucket: r.bucket, revenue: r.revenue, cogs: 0, expenses: 0 });
  }
  for (const r of cogsRows) {
    const k = keyOf(r.bucket);
    const existing = bucketMap.get(k) || { bucket: r.bucket, revenue: 0, cogs: 0, expenses: 0 };
    existing.cogs = r.cogs;
    bucketMap.set(k, existing);
  }
  for (const r of expenseRows) {
    const bucketDate = r.day ?? r.month;
    const k = keyOf(bucketDate);
    const existing = bucketMap.get(k) || { bucket: bucketDate, revenue: 0, cogs: 0, expenses: 0 };
    existing.expenses = r.totalAmount;
    bucketMap.set(k, existing);
  }

  return [...bucketMap.values()]
    .sort((a, b) => new Date(a.bucket) - new Date(b.bucket))
    .map((row) => ({
      bucket: row.bucket,
      revenue: Number(row.revenue),
      costOfGoodsSold: Number(row.cogs),
      expenses: Number(row.expenses),
      grossProfit: Number(row.revenue) - Number(row.cogs),
      netProfitEstimate: Number(row.revenue) - Number(row.cogs) - Number(row.expenses),
    }));
}

export async function getProfitTrend({ period, customFrom, customTo }, granularity = 'day') {
  const range = resolveDateRange(period, customFrom, customTo);

  const [revenueRows, cogsRows, expenseRows] = await Promise.all([
    getSalesTrend({ period, customFrom, customTo }, granularity),
    getCogsTrend(range, granularity),
    granularity === 'month' ? getMonthlyExpenseTotals({ dateFrom: range.from, dateTo: range.to }) : getDailyExpenseTotals({ dateFrom: range.from, dateTo: range.to }),
  ]);

  return mergeTrendsByBucket(revenueRows, cogsRows, expenseRows);
}

export async function getTopProducts({ period, customFrom, customTo }, limit = 10) {
  const { from, to } = resolveDateRange(period, customFrom, customTo);

  const rows = await prisma.$queryRaw`
    SELECT p.id, p.name, p.sku, SUM(it.quantity) AS total_quantity, SUM(it."lineTotal") AS total_revenue
    FROM sale_items it
    JOIN sales_invoices inv ON inv.id = it."invoiceId"
    JOIN products p ON p.id = it."productId"
    WHERE inv.status != 'CANCELED' AND inv."createdAt" BETWEEN ${from} AND ${to}
    GROUP BY p.id, p.name, p.sku
    ORDER BY total_quantity DESC
    LIMIT ${limit}
  `;

  return rows.map((r) => ({
    productId: r.id,
    name: r.name,
    sku: r.sku,
    totalQuantitySold: Number(r.total_quantity),
    totalRevenue: Number(r.total_revenue),
  }));
}

export async function getSalesByCategory({ period, customFrom, customTo }) {
  const { from, to } = resolveDateRange(period, customFrom, customTo);

  const rows = await prisma.$queryRaw`
    SELECT c.id, c.name, SUM(it."lineTotal") AS total_revenue, SUM(it.quantity) AS total_quantity
    FROM sale_items it
    JOIN sales_invoices inv ON inv.id = it."invoiceId"
    JOIN products p ON p.id = it."productId"
    JOIN categories c ON c.id = p."categoryId"
    WHERE inv.status != 'CANCELED' AND inv."createdAt" BETWEEN ${from} AND ${to}
    GROUP BY c.id, c.name
    ORDER BY total_revenue DESC
  `;

  return rows.map((r) => ({
    categoryId: r.id,
    categoryName: r.name,
    totalRevenue: Number(r.total_revenue),
    totalQuantitySold: Number(r.total_quantity),
  }));
}

export async function getExpenseBreakdown({ period, customFrom, customTo }) {
  const { from, to } = resolveDateRange(period, customFrom, customTo);
  return getExpenseBreakdownByCategory({ dateFrom: from, dateTo: to });
}

export async function compareSalesPeriods(periodA, periodB) {
  const rangeA = resolveDateRange(periodA);
  const rangeB = resolveDateRange(periodB);

  const [a, b] = await Promise.all([getRevenueCogsAndCount(rangeA), getRevenueCogsAndCount(rangeB)]);

  const percentChange = b.revenue === 0 ? null : ((a.revenue - b.revenue) / b.revenue) * 100;

  return {
    periodA: { name: periodA, ...a },
    periodB: { name: periodB, ...b },
    revenueChangePercent: percentChange,
  };
}

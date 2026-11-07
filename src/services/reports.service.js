import { prisma } from '../config/database.js';
import { resolvePagination, buildPaginationMeta } from '../utils/pagination.js';
import { resolveSort } from '../utils/sorting.js';
import { getRevenueCogsAndCount } from './financial.service.js';
import { getTotalExpenses } from './expense.service.js';

function dateFilter(dateFrom, dateTo) {
  return {
    ...(dateFrom ? { gte: dateFrom } : {}),
    ...(dateTo ? { lte: dateTo } : {}),
  };
}

function paginateInMemory(rows, query) {
  const { page, pageSize, skip, take } = resolvePagination(query);
  const totalItems = rows.length;
  const items = rows.slice(skip, skip + take);
  return { items, meta: buildPaginationMeta({ page, pageSize, totalItems }) };
}

// ---------------------------------------------------------------
// 1. Sales report — invoice-level, paginated at the DATABASE level
//    (this table can genuinely grow large, unlike the grouped reports below).
// ---------------------------------------------------------------
const SALES_SORT_FIELDS = { createdAt: 'createdAt', totalAmount: 'totalAmount', invoiceNumber: 'invoiceNumber' };

export async function getSalesReport(query) {
  const { page, pageSize, skip, take } = resolvePagination(query);
  const { field, order } = resolveSort(query, SALES_SORT_FIELDS, 'createdAt');

  const where = {
    ...(query.customerId ? { customerId: query.customerId } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.dateFrom || query.dateTo ? { createdAt: dateFilter(query.dateFrom, query.dateTo) } : {}),
  };

  const [items, totalItems] = await prisma.$transaction([
    prisma.salesInvoice.findMany({
      where,
      skip,
      take,
      orderBy: { [field]: order },
      include: { customer: { select: { id: true, name: true } } },
    }),
    prisma.salesInvoice.count({ where }),
  ]);

  return { items, meta: buildPaginationMeta({ page, pageSize, totalItems }) };
}

// ---------------------------------------------------------------
// 2-4. Grouped reports (by product / category / customer).
// These aggregate to one row per product/category/customer — a result set
// naturally bounded by the catalog or customer-base size, not transaction
// volume — so pagination/sorting is applied in-memory after a single
// parameterized GROUP BY query, rather than pushing LIMIT/OFFSET into SQL.
// ---------------------------------------------------------------

export async function getSalesByProductReport(query) {
  const rows = await prisma.$queryRaw`
    SELECT p.id, p.name, p.sku, c.name AS category_name,
           SUM(it.quantity) AS total_quantity, SUM(it."lineTotal") AS total_revenue
    FROM sale_items it
    JOIN sales_invoices inv ON inv.id = it."invoiceId"
    JOIN products p ON p.id = it."productId"
    LEFT JOIN categories c ON c.id = p."categoryId"
    WHERE inv.status != 'CANCELED'
      AND inv."createdAt" BETWEEN ${query.dateFrom || new Date('1970-01-01')} AND ${query.dateTo || new Date()}
    GROUP BY p.id, p.name, p.sku, c.name
  `;

  const mapped = rows.map((r) => ({
    productId: r.id,
    name: r.name,
    sku: r.sku,
    categoryName: r.category_name,
    totalQuantitySold: Number(r.total_quantity),
    totalRevenue: Number(r.total_revenue),
  }));

  const { field, order } = resolveSort(
    query,
    { totalQuantitySold: 'totalQuantitySold', totalRevenue: 'totalRevenue', name: 'name' },
    'totalRevenue',
  );
  mapped.sort((a, b) => (order === 'asc' ? a[field] > b[field] : a[field] < b[field]) ? -1 : 1);

  return paginateInMemory(mapped, query);
}

export async function getSalesByCategoryReport(query) {
  const rows = await prisma.$queryRaw`
    SELECT c.id, c.name, SUM(it."lineTotal") AS total_revenue, SUM(it.quantity) AS total_quantity
    FROM sale_items it
    JOIN sales_invoices inv ON inv.id = it."invoiceId"
    JOIN products p ON p.id = it."productId"
    JOIN categories c ON c.id = p."categoryId"
    WHERE inv.status != 'CANCELED'
      AND inv."createdAt" BETWEEN ${query.dateFrom || new Date('1970-01-01')} AND ${query.dateTo || new Date()}
    GROUP BY c.id, c.name
  `;

  const mapped = rows.map((r) => ({
    categoryId: r.id,
    categoryName: r.name,
    totalRevenue: Number(r.total_revenue),
    totalQuantitySold: Number(r.total_quantity),
  }));

  const { field, order } = resolveSort(
    query,
    { totalRevenue: 'totalRevenue', totalQuantitySold: 'totalQuantitySold', categoryName: 'categoryName' },
    'totalRevenue',
  );
  mapped.sort((a, b) => (order === 'asc' ? a[field] > b[field] : a[field] < b[field]) ? -1 : 1);

  return paginateInMemory(mapped, query);
}

export async function getSalesByCustomerReport(query) {
  const rows = await prisma.$queryRaw`
    SELECT c.id, c.name, COUNT(inv.id) AS invoice_count,
           SUM(inv."totalAmount") AS total_revenue,
           SUM(inv."totalAmount" - inv."amountPaid") AS outstanding_balance
    FROM sales_invoices inv
    JOIN customers c ON c.id = inv."customerId"
    WHERE inv.status != 'CANCELED'
      AND inv."createdAt" BETWEEN ${query.dateFrom || new Date('1970-01-01')} AND ${query.dateTo || new Date()}
    GROUP BY c.id, c.name
  `;

  const mapped = rows.map((r) => ({
    customerId: r.id,
    customerName: r.name,
    invoiceCount: Number(r.invoice_count),
    totalRevenue: Number(r.total_revenue),
    outstandingBalance: Number(r.outstanding_balance),
  }));

  const { field, order } = resolveSort(
    query,
    { totalRevenue: 'totalRevenue', invoiceCount: 'invoiceCount', outstandingBalance: 'outstandingBalance', customerName: 'customerName' },
    'totalRevenue',
  );
  mapped.sort((a, b) => (order === 'asc' ? a[field] > b[field] : a[field] < b[field]) ? -1 : 1);

  return paginateInMemory(mapped, query);
}

// ---------------------------------------------------------------
// 5. Outstanding customer balances — a current snapshot, independent of
//    any date range (per the documented business rule from Phase 1).
// ---------------------------------------------------------------
export async function getCustomerBalancesReport(query) {
  const rows = await prisma.$queryRaw`
    SELECT c.id, c.name, c.phone,
           COALESCE(SUM(inv."totalAmount"), 0) AS total_invoiced,
           COALESCE(SUM(inv."amountPaid"), 0) AS total_paid,
           COALESCE(SUM(inv."totalAmount" - inv."amountPaid"), 0) AS outstanding_balance
    FROM customers c
    LEFT JOIN sales_invoices inv ON inv."customerId" = c.id AND inv.status != 'CANCELED'
    GROUP BY c.id, c.name, c.phone
  `;

  let mapped = rows.map((r) => ({
    customerId: r.id,
    customerName: r.name,
    phone: r.phone,
    totalInvoiced: Number(r.total_invoiced),
    totalPaid: Number(r.total_paid),
    outstandingBalance: Number(r.outstanding_balance),
  }));

  if (query.onlyWithBalance) {
    mapped = mapped.filter((row) => row.outstandingBalance > 0);
  }

  const { field, order } = resolveSort(
    query,
    { outstandingBalance: 'outstandingBalance', totalInvoiced: 'totalInvoiced', customerName: 'customerName' },
    'outstandingBalance',
  );
  mapped.sort((a, b) => (order === 'asc' ? a[field] > b[field] : a[field] < b[field]) ? -1 : 1);

  return paginateInMemory(mapped, query);
}

// ---------------------------------------------------------------
// 6. Profit report — reuses the SAME shared calculation as the dashboard,
//    so figures never diverge between the two screens.
// ---------------------------------------------------------------
export async function getProfitReport({ dateFrom, dateTo }) {
  const from = dateFrom || new Date('1970-01-01');
  const to = dateTo || new Date();

  const [{ revenue, cogs, invoiceCount }, totalExpenses] = await Promise.all([
    getRevenueCogsAndCount({ from, to }),
    getTotalExpenses({ dateFrom: from, dateTo: to }),
  ]);

  const grossProfit = revenue - cogs;
  const netProfitEstimate = grossProfit - totalExpenses;

  return {
    dateFrom: from,
    dateTo: to,
    revenue,
    costOfGoodsSold: cogs,
    grossProfit,
    totalExpenses,
    netProfitEstimate,
    isEstimate: true,
    salesInvoiceCount: invoiceCount,
  };
}

// ---------------------------------------------------------------
// 7. Inventory valuation report.
// ---------------------------------------------------------------
export async function getInventoryReport(query) {
  const where = {
    ...(query.categoryId ? { categoryId: query.categoryId } : {}),
  };

  const products = await prisma.product.findMany({
    where,
    include: { category: { select: { id: true, name: true } } },
  });

  let mapped = products.map((p) => ({
    productId: p.id,
    sku: p.sku,
    name: p.name,
    categoryName: p.category?.name,
    stockQuantity: p.stockQuantity,
    minStockLevel: p.minStockLevel,
    isLowStock: p.stockQuantity <= p.minStockLevel,
    purchasePrice: Number(p.purchasePrice),
    valuation: p.stockQuantity * Number(p.purchasePrice),
    isActive: p.isActive,
  }));

  if (query.lowStockOnly) {
    mapped = mapped.filter((p) => p.isLowStock);
  }

  const totalValuation = mapped.reduce((sum, p) => sum + p.valuation, 0);

  const { field, order } = resolveSort(
    query,
    { name: 'name', stockQuantity: 'stockQuantity', valuation: 'valuation' },
    'name',
    'asc',
  );
  mapped.sort((a, b) => (order === 'asc' ? a[field] > b[field] : a[field] < b[field]) ? -1 : 1);

  const { items, meta } = paginateInMemory(mapped, query);
  return { items, meta, totalValuation };
}

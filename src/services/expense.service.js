import { prisma } from '../config/database.js';
import { resolvePagination, buildPaginationMeta } from '../utils/pagination.js';
import { mapPrismaError } from '../utils/prismaErrors.js';
import { AppError } from '../middleware/errorHandler.js';

export async function listExpenses(query) {
  const { page, pageSize, skip, take } = resolvePagination(query);

  const where = {
    ...(query.category ? { category: query.category } : {}),
    ...(query.search ? { description: { contains: query.search, mode: 'insensitive' } } : {}),
    ...(query.dateFrom || query.dateTo
      ? {
          expenseDate: {
            ...(query.dateFrom ? { gte: query.dateFrom } : {}),
            ...(query.dateTo ? { lte: query.dateTo } : {}),
          },
        }
      : {}),
  };

  const [items, totalItems] = await prisma.$transaction([
    prisma.expense.findMany({
      where,
      skip,
      take,
      orderBy: { expenseDate: 'desc' },
      include: { createdBy: { select: { id: true, fullName: true } } },
    }),
    prisma.expense.count({ where }),
  ]);

  return { items, meta: buildPaginationMeta({ page, pageSize, totalItems }) };
}

export async function getExpenseByIdOrThrow(id) {
  const expense = await prisma.expense.findUnique({ where: { id } });
  if (!expense) throw new AppError('المصروف غير موجود.', 404, 'NOT_FOUND');
  return expense;
}

export async function createExpense(data, createdByUserId) {
  try {
    return await prisma.expense.create({ data: { ...data, createdByUserId } });
  } catch (error) {
    throw mapPrismaError(error, { entityLabel: 'المصروف' });
  }
}

export async function updateExpense(id, data) {
  try {
    return await prisma.expense.update({ where: { id }, data });
  } catch (error) {
    throw mapPrismaError(error, { entityLabel: 'المصروف' });
  }
}

/**
 * Category breakdown — uses Prisma's native groupBy (a real GROUP BY query),
 * not an in-memory reduction.
 */
export async function getExpenseBreakdownByCategory({ dateFrom, dateTo } = {}) {
  const where = {
    ...(dateFrom || dateTo
      ? { expenseDate: { ...(dateFrom ? { gte: dateFrom } : {}), ...(dateTo ? { lte: dateTo } : {}) } }
      : {}),
  };

  const grouped = await prisma.expense.groupBy({
    by: ['category'],
    where,
    _sum: { amount: true },
    _count: { _all: true },
    orderBy: { _sum: { amount: 'desc' } },
  });

  return grouped.map((g) => ({
    category: g.category,
    totalAmount: Number(g._sum.amount || 0),
    count: g._count._all,
  }));
}

/**
 * Daily and monthly totals via native PostgreSQL date_trunc aggregate
 * queries — efficient even over large expense tables.
 */
export async function getDailyExpenseTotals({ dateFrom, dateTo } = {}) {
  const from = dateFrom || new Date('1970-01-01');
  const to = dateTo || new Date();

  const rows = await prisma.$queryRaw`
    SELECT date_trunc('day', "expenseDate") AS day, SUM(amount) AS total
    FROM expenses
    WHERE "expenseDate" BETWEEN ${from} AND ${to}
    GROUP BY day
    ORDER BY day ASC
  `;

  return rows.map((r) => ({ day: r.day, totalAmount: Number(r.total) }));
}

export async function getMonthlyExpenseTotals({ dateFrom, dateTo } = {}) {
  const from = dateFrom || new Date('1970-01-01');
  const to = dateTo || new Date();

  const rows = await prisma.$queryRaw`
    SELECT date_trunc('month', "expenseDate") AS month, SUM(amount) AS total
    FROM expenses
    WHERE "expenseDate" BETWEEN ${from} AND ${to}
    GROUP BY month
    ORDER BY month ASC
  `;

  return rows.map((r) => ({ month: r.month, totalAmount: Number(r.total) }));
}

export async function getTotalExpenses({ dateFrom, dateTo } = {}) {
  const where = {
    ...(dateFrom || dateTo
      ? { expenseDate: { ...(dateFrom ? { gte: dateFrom } : {}), ...(dateTo ? { lte: dateTo } : {}) } }
      : {}),
  };
  const result = await prisma.expense.aggregate({ where, _sum: { amount: true } });
  return Number(result._sum.amount || 0);
}

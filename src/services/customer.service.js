import { prisma } from '../config/database.js';
import { resolvePagination, buildPaginationMeta } from '../utils/pagination.js';
import { mapPrismaError } from '../utils/prismaErrors.js';
import { AppError } from '../middleware/errorHandler.js';

export async function listCustomers(query) {
  const { page, pageSize, skip, take } = resolvePagination(query);

  const where = query.search
    ? {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { phone: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
        ],
      }
    : undefined;

  const [items, totalItems] = await prisma.$transaction([
    prisma.customer.findMany({ where, skip, take, orderBy: { name: 'asc' } }),
    prisma.customer.count({ where }),
  ]);

  return { items, meta: buildPaginationMeta({ page, pageSize, totalItems }) };
}

export async function getCustomerByIdOrThrow(id) {
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) throw new AppError('العميل غير موجود.', 404, 'NOT_FOUND');
  return customer;
}

function normalizeEmail(data) {
  // Treat an empty string the same as "not provided".
  if (data.email === '') return { ...data, email: null };
  return data;
}

export async function createCustomer(data) {
  try {
    return await prisma.customer.create({ data: normalizeEmail(data) });
  } catch (error) {
    throw mapPrismaError(error, { entityLabel: 'العميل' });
  }
}

export async function updateCustomer(id, data) {
  try {
    return await prisma.customer.update({ where: { id }, data: normalizeEmail(data) });
  } catch (error) {
    throw mapPrismaError(error, { entityLabel: 'العميل' });
  }
}

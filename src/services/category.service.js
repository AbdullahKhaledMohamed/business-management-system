import { prisma } from '../config/database.js';
import { resolvePagination, buildPaginationMeta } from '../utils/pagination.js';
import { mapPrismaError } from '../utils/prismaErrors.js';
import { AppError } from '../middleware/errorHandler.js';

export async function listCategories(query) {
  const { page, pageSize, skip, take } = resolvePagination(query);

  const where = query.search
    ? { name: { contains: query.search, mode: 'insensitive' } }
    : undefined;

  const [items, totalItems] = await prisma.$transaction([
    prisma.category.findMany({ where, skip, take, orderBy: { name: 'asc' } }),
    prisma.category.count({ where }),
  ]);

  return { items, meta: buildPaginationMeta({ page, pageSize, totalItems }) };
}

export async function createCategory(data) {
  try {
    return await prisma.category.create({ data });
  } catch (error) {
    throw mapPrismaError(error, { entityLabel: 'الصنف', uniqueFieldLabels: { name: 'اسم الصنف' } });
  }
}

export async function updateCategory(id, data) {
  try {
    return await prisma.category.update({ where: { id }, data });
  } catch (error) {
    throw mapPrismaError(error, { entityLabel: 'الصنف', uniqueFieldLabels: { name: 'اسم الصنف' } });
  }
}

export async function getCategoryByIdOrThrow(id) {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) throw new AppError('الصنف غير موجود.', 404, 'NOT_FOUND');
  return category;
}

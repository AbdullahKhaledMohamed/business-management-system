import { prisma } from '../config/database.js';
import { resolvePagination, buildPaginationMeta } from '../utils/pagination.js';
import { mapPrismaError } from '../utils/prismaErrors.js';
import { AppError } from '../middleware/errorHandler.js';

const PRODUCT_UNIQUE_FIELDS = { sku: 'رمز المنتج (SKU)' };

export async function listProducts(query) {
  const { page, pageSize, skip, take } = resolvePagination(query);

  const where = {
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { sku: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {}),
    ...(query.categoryId ? { categoryId: query.categoryId } : {}),
    ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
  };

  const [items, totalItems] = await prisma.$transaction([
    prisma.product.findMany({
      where,
      skip,
      take,
      orderBy: { name: 'asc' },
      include: { category: { select: { id: true, name: true } } },
    }),
    prisma.product.count({ where }),
  ]);

  // Low-stock filtering happens in-memory because Prisma cannot compare
  // two columns of the same row (stockQuantity <= minStockLevel) in a `where`.
  const filtered = query.lowStockOnly ? items.filter((p) => p.stockQuantity <= p.minStockLevel) : items;

  return { items: filtered, meta: buildPaginationMeta({ page, pageSize, totalItems }) };
}

export async function getProductByIdOrThrow(id) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: { category: { select: { id: true, name: true } } },
  });
  if (!product) throw new AppError('المنتج غير موجود.', 404, 'NOT_FOUND');
  return product;
}

export async function createProduct(data, createdByUserId) {
  const { initialStock = 0, ...productData } = data;

  try {
    return await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: { ...productData, stockQuantity: initialStock },
      });

      if (initialStock > 0) {
        await tx.inventoryMovement.create({
          data: {
            productId: product.id,
            movementType: 'STOCK_IN',
            quantity: initialStock,
            referenceType: 'ProductCreation',
            referenceId: product.id,
            notes: 'رصيد افتتاحي عند إنشاء المنتج',
            createdByUserId,
          },
        });
      }

      return product;
    });
  } catch (error) {
    throw mapPrismaError(error, { entityLabel: 'المنتج', uniqueFieldLabels: PRODUCT_UNIQUE_FIELDS });
  }
}

export async function updateProduct(id, data) {
  try {
    return await prisma.product.update({ where: { id }, data });
  } catch (error) {
    throw mapPrismaError(error, { entityLabel: 'المنتج', uniqueFieldLabels: PRODUCT_UNIQUE_FIELDS });
  }
}

export async function getLowStockProducts() {
  // Fetched broadly then filtered in-memory for the same reason as above.
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: { category: { select: { id: true, name: true } } },
    orderBy: { name: 'asc' },
  });
  return products.filter((p) => p.stockQuantity <= p.minStockLevel);
}

import { prisma } from '../config/database.js';
import { resolvePagination, buildPaginationMeta } from '../utils/pagination.js';
import { AppError } from '../middleware/errorHandler.js';

export async function listMovements(query) {
  const { page, pageSize, skip, take } = resolvePagination(query);

  const where = {
    ...(query.productId ? { productId: query.productId } : {}),
    ...(query.movementType ? { movementType: query.movementType } : {}),
    ...(query.dateFrom || query.dateTo
      ? {
          createdAt: {
            ...(query.dateFrom ? { gte: query.dateFrom } : {}),
            ...(query.dateTo ? { lte: query.dateTo } : {}),
          },
        }
      : {}),
  };

  const [items, totalItems] = await prisma.$transaction([
    prisma.inventoryMovement.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        product: { select: { id: true, name: true, sku: true } },
        createdBy: { select: { id: true, fullName: true } },
      },
    }),
    prisma.inventoryMovement.count({ where }),
  ]);

  return { items, meta: buildPaginationMeta({ page, pageSize, totalItems }) };
}

/**
 * Stock-in: always increases quantity. Safe to increment directly —
 * there is no "negative" boundary to protect against on the way up.
 */
export async function stockIn({ productId, quantity, notes }, createdByUserId) {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id: productId } });
    if (!product) throw new AppError('المنتج غير موجود.', 404, 'NOT_FOUND');

    const updated = await tx.product.update({
      where: { id: productId },
      data: { stockQuantity: { increment: quantity } },
    });

    const movement = await tx.inventoryMovement.create({
      data: {
        productId,
        movementType: 'STOCK_IN',
        quantity,
        referenceType: 'ManualStockIn',
        notes,
        createdByUserId,
      },
    });

    return { product: updated, movement };
  });
}

/**
 * Stock adjustment (increase or decrease), with a mandatory documented reason.
 * A DECREASE uses an atomic conditional UPDATE (stockQuantity >= quantity in
 * the WHERE clause) so concurrent requests can never push stock negative —
 * PostgreSQL's row-level locking during the UPDATE makes this check-and-write
 * a single atomic operation, unlike a separate read-then-write.
 */
export async function adjustStock({ productId, direction, quantity, reason }, createdByUserId) {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id: productId } });
    if (!product) throw new AppError('المنتج غير موجود.', 404, 'NOT_FOUND');

    let updatedProduct;

    if (direction === 'INCREASE') {
      updatedProduct = await tx.product.update({
        where: { id: productId },
        data: { stockQuantity: { increment: quantity } },
      });
    } else {
      const result = await tx.product.updateMany({
        where: { id: productId, stockQuantity: { gte: quantity } },
        data: { stockQuantity: { decrement: quantity } },
      });

      if (result.count === 0) {
        throw new AppError(
          `الكمية المتاحة (${product.stockQuantity}) أقل من كمية التسوية المطلوبة (${quantity}).`,
          409,
          'INSUFFICIENT_STOCK',
        );
      }

      updatedProduct = await tx.product.findUnique({ where: { id: productId } });
    }

    const movement = await tx.inventoryMovement.create({
      data: {
        productId,
        movementType: 'ADJUSTMENT',
        quantity: direction === 'INCREASE' ? quantity : -quantity,
        referenceType: 'ManualAdjustment',
        notes: reason,
        createdByUserId,
      },
    });

    return { product: updatedProduct, movement };
  });
}

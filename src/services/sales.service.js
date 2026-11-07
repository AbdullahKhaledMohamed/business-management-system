import { prisma } from '../config/database.js';
import { resolvePagination, buildPaginationMeta } from '../utils/pagination.js';
import { AppError } from '../middleware/errorHandler.js';

function generateInvoiceNumber() {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 900 + 100); // 3-digit tail to reduce same-millisecond collisions
  return `INV-${year}-${Date.now()}${random}`;
}

/**
 * Creates a sales invoice with its items inside a single atomic transaction.
 * SERVER computes every price and total — unitPrice/unitCost are snapshotted
 * from the product's CURRENT prices; the client cannot influence them.
 * Stock is decremented with an atomic conditional UPDATE per item, so
 * concurrent sales of the same product can never oversell it.
 */
export async function createSalesInvoice({ customerId, items, discountAmount = 0, notes }, createdByUserId) {
  return prisma.$transaction(async (tx) => {
    const customer = await tx.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new AppError('العميل غير موجود.', 404, 'NOT_FOUND');

    // Fetch all products involved up-front (also validates they exist/are active).
    const productIds = [...new Set(items.map((i) => i.productId))];
    const products = await tx.product.findMany({ where: { id: { in: productIds } } });
    const productMap = new Map(products.map((p) => [p.id, p]));

    let subtotal = 0;
    const resolvedItems = [];

    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new AppError(`المنتج غير موجود (${item.productId}).`, 404, 'NOT_FOUND');
      }
      if (!product.isActive) {
        throw new AppError(`المنتج "${product.name}" غير متاح للبيع حاليًا.`, 409, 'PRODUCT_INACTIVE');
      }

      const unitPrice = Number(product.sellingPrice);
      const unitCost = Number(product.purchasePrice);
      const itemDiscount = item.discountAmount || 0;
      const lineTotal = unitPrice * item.quantity - itemDiscount;

      if (lineTotal < 0) {
        throw new AppError(`خصم السطر أكبر من إجمالي سطر المنتج "${product.name}".`, 422, 'INVALID_DISCOUNT');
      }

      resolvedItems.push({
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        unitPrice,
        unitCost,
        discountAmount: itemDiscount,
        lineTotal,
      });

      subtotal += lineTotal;
    }

    const totalAmount = subtotal - discountAmount;
    if (totalAmount < 0) {
      throw new AppError('إجمالي الخصم أكبر من إجمالي الفاتورة.', 422, 'INVALID_DISCOUNT');
    }

    // ---- Atomically decrement stock for every item BEFORE creating records ----
    for (const item of resolvedItems) {
      const result = await tx.product.updateMany({
        where: { id: item.productId, stockQuantity: { gte: item.quantity } },
        data: { stockQuantity: { decrement: item.quantity } },
      });
      if (result.count === 0) {
        const current = await tx.product.findUnique({ where: { id: item.productId } });
        throw new AppError(
          `الكمية المتاحة من "${item.productName}" (${current.stockQuantity}) أقل من الكمية المطلوبة (${item.quantity}).`,
          409,
          'INSUFFICIENT_STOCK',
        );
      }
    }

    const invoice = await tx.salesInvoice.create({
      data: {
        invoiceNumber: generateInvoiceNumber(),
        customerId,
        createdByUserId,
        status: 'CONFIRMED',
        subtotal,
        discountAmount,
        totalAmount,
        amountPaid: 0,
        items: {
          create: resolvedItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            unitCost: item.unitCost,
            discountAmount: item.discountAmount,
            lineTotal: item.lineTotal,
          })),
        },
      },
      include: { items: true, customer: true },
    });

    // ---- Record traceable inventory movements, referencing this invoice ----
    await tx.inventoryMovement.createMany({
      data: resolvedItems.map((item) => ({
        productId: item.productId,
        movementType: 'SALE',
        quantity: item.quantity,
        referenceType: 'SalesInvoice',
        referenceId: invoice.id,
        createdByUserId,
      })),
    });

    return invoice;
  });
}

export async function listSalesInvoices(query) {
  const { page, pageSize, skip, take } = resolvePagination(query);

  const where = {
    ...(query.customerId ? { customerId: query.customerId } : {}),
    ...(query.status ? { status: query.status } : {}),
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
    prisma.salesInvoice.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: { customer: { select: { id: true, name: true } } },
    }),
    prisma.salesInvoice.count({ where }),
  ]);

  return { items, meta: buildPaginationMeta({ page, pageSize, totalItems }) };
}

export async function getSalesInvoiceByIdOrThrow(id) {
  const invoice = await prisma.salesInvoice.findUnique({
    where: { id },
    include: {
      customer: true,
      createdBy: { select: { id: true, fullName: true } },
      items: { include: { product: { select: { id: true, name: true, sku: true } } } },
      customerPayments: { orderBy: { paymentDate: 'desc' } },
    },
  });
  if (!invoice) throw new AppError('الفاتورة غير موجودة.', 404, 'NOT_FOUND');
  return invoice;
}

function nextStatusAfterPayment(invoice, amountPaidNew) {
  const total = Number(invoice.totalAmount);
  if (amountPaidNew >= total) return 'PAID';
  if (amountPaidNew > 0) return 'PARTIALLY_PAID';
  return 'CONFIRMED';
}

/**
 * Records a payment against an invoice, inside a transaction that also
 * updates the invoice's amountPaid/status — never trusts a client-sent status.
 */
export async function recordPayment(invoiceId, { amount, paymentMethod, notes }, createdByUserId) {
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.salesInvoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new AppError('الفاتورة غير موجودة.', 404, 'NOT_FOUND');
    if (invoice.status === 'CANCELED') {
      throw new AppError('لا يمكن تسجيل دفعة على فاتورة ملغاة.', 409, 'INVOICE_CANCELED');
    }

    const outstanding = Number(invoice.totalAmount) - Number(invoice.amountPaid);
    if (amount > outstanding + 0.01) {
      throw new AppError(
        `المبلغ المدفوع (${amount}) أكبر من المبلغ المتبقي على الفاتورة (${outstanding.toFixed(2)}).`,
        422,
        'OVERPAYMENT',
      );
    }

    const newAmountPaid = Number(invoice.amountPaid) + amount;
    const newStatus = nextStatusAfterPayment(invoice, newAmountPaid);

    const payment = await tx.customerPayment.create({
      data: {
        customerId: invoice.customerId,
        invoiceId: invoice.id,
        amount,
        paymentMethod,
        notes,
        createdByUserId,
      },
    });

    const updatedInvoice = await tx.salesInvoice.update({
      where: { id: invoice.id },
      data: { amountPaid: newAmountPaid, status: newStatus },
    });

    return { payment, invoice: updatedInvoice };
  });
}

/**
 * Cancels an invoice and restores inventory via documented
 * CANCELLATION_REVERSAL movements. Canceled invoices are excluded
 * from revenue/COGS/KPI calculations everywhere else in the system.
 */
export async function cancelInvoice(invoiceId, createdByUserId) {
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.salesInvoice.findUnique({
      where: { id: invoiceId },
      include: { items: true },
    });
    if (!invoice) throw new AppError('الفاتورة غير موجودة.', 404, 'NOT_FOUND');
    if (invoice.status === 'CANCELED') {
      throw new AppError('الفاتورة ملغاة بالفعل.', 409, 'ALREADY_CANCELED');
    }

    for (const item of invoice.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stockQuantity: { increment: item.quantity } },
      });
    }

    await tx.inventoryMovement.createMany({
      data: invoice.items.map((item) => ({
        productId: item.productId,
        movementType: 'CANCELLATION_REVERSAL',
        quantity: item.quantity,
        referenceType: 'SalesInvoice',
        referenceId: invoice.id,
        notes: 'إلغاء فاتورة — استرجاع المخزون',
        createdByUserId,
      })),
    });

    return tx.salesInvoice.update({ where: { id: invoice.id }, data: { status: 'CANCELED' } });
  });
}

export async function getCustomerOutstandingBalance(customerId) {
  const invoices = await prisma.salesInvoice.findMany({
    where: { customerId, status: { not: 'CANCELED' } },
    select: { totalAmount: true, amountPaid: true },
  });
  return invoices.reduce((sum, inv) => sum + (Number(inv.totalAmount) - Number(inv.amountPaid)), 0);
}

export async function getCustomerSalesHistory(customerId, query) {
  const { page, pageSize, skip, take } = resolvePagination(query);

  const where = { customerId };
  const [items, totalItems] = await prisma.$transaction([
    prisma.salesInvoice.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
    prisma.salesInvoice.count({ where }),
  ]);

  return { items, meta: buildPaginationMeta({ page, pageSize, totalItems }) };
}

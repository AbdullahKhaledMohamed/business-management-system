import { z } from 'zod';
import { paginationQuery } from './common.validator.js';

const saleItemInput = z.object({
  productId: z.string({ required_error: 'المنتج مطلوب' }).uuid('المنتج غير صالح'),
  quantity: z.coerce.number({ required_error: 'الكمية مطلوبة' }).int().positive('الكمية يجب أن تكون أكبر من صفر'),
  discountAmount: z.coerce.number().nonnegative('قيمة الخصم يجب ألا تكون سالبة').optional().default(0),
});

export const createSaleSchema = z.object({
  query: z.any().optional(),
  params: z.any().optional(),
  body: z.object({
    customerId: z.string({ required_error: 'العميل مطلوب' }).uuid('العميل غير صالح'),
    discountAmount: z.coerce.number().nonnegative('قيمة الخصم يجب ألا تكون سالبة').optional().default(0),
    items: z.array(saleItemInput).min(1, 'يجب إضافة منتج واحد على الأقل للفاتورة'),
    notes: z.string().trim().max(1000).optional().nullable(),
  }),
});

export const listSalesSchema = z.object({
  body: z.any().optional(),
  params: z.any().optional(),
  query: z.object({
    ...paginationQuery,
    customerId: z.string().uuid().optional(),
    status: z.enum(['DRAFT', 'CONFIRMED', 'PARTIALLY_PAID', 'PAID', 'CANCELED']).optional(),
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
  }),
});

export const paymentSchema = z.object({
  query: z.any().optional(),
  params: z.object({ id: z.string().uuid('معرّف غير صالح.') }),
  body: z.object({
    amount: z.coerce.number({ required_error: 'المبلغ مطلوب' }).positive('المبلغ يجب أن يكون أكبر من صفر'),
    paymentMethod: z.enum(['CASH', 'CARD', 'BANK_TRANSFER', 'OTHER'], { required_error: 'طريقة الدفع مطلوبة' }),
    notes: z.string().trim().max(500).optional().nullable(),
  }),
});

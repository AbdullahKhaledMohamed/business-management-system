import { z } from 'zod';
import { paginationQuery } from './common.validator.js';

export const listMovementsSchema = z.object({
  body: z.any().optional(),
  params: z.any().optional(),
  query: z.object({
    ...paginationQuery,
    productId: z.string().uuid().optional(),
    movementType: z.enum(['STOCK_IN', 'SALE', 'ADJUSTMENT', 'CANCELLATION_REVERSAL', 'RETURN']).optional(),
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
  }),
});

export const stockInSchema = z.object({
  query: z.any().optional(),
  params: z.any().optional(),
  body: z.object({
    productId: z.string({ required_error: 'المنتج مطلوب' }).uuid('المنتج غير صالح'),
    quantity: z.coerce.number({ required_error: 'الكمية مطلوبة' }).int().positive('الكمية يجب أن تكون أكبر من صفر'),
    notes: z.string().trim().max(500).optional().nullable(),
  }),
});

export const adjustmentSchema = z.object({
  query: z.any().optional(),
  params: z.any().optional(),
  body: z.object({
    productId: z.string({ required_error: 'المنتج مطلوب' }).uuid('المنتج غير صالح'),
    direction: z.enum(['INCREASE', 'DECREASE'], { required_error: 'اتجاه التسوية مطلوب' }),
    quantity: z.coerce.number({ required_error: 'الكمية مطلوبة' }).int().positive('الكمية يجب أن تكون أكبر من صفر'),
    reason: z.string({ required_error: 'سبب التسوية مطلوب' }).trim().min(3, 'يرجى توضيح سبب التسوية').max(500),
  }),
});

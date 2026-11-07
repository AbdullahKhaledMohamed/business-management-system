import { z } from 'zod';
import { paginationQuery } from './common.validator.js';

export const listExpensesSchema = z.object({
  body: z.any().optional(),
  params: z.any().optional(),
  query: z.object({
    ...paginationQuery,
    category: z.string().trim().max(100).optional(),
    search: z.string().trim().max(200).optional(),
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
  }),
});

export const createExpenseSchema = z.object({
  query: z.any().optional(),
  params: z.any().optional(),
  body: z.object({
    category: z.string({ required_error: 'تصنيف المصروف مطلوب' }).trim().min(2).max(100),
    description: z.string({ required_error: 'وصف المصروف مطلوب' }).trim().min(2).max(500),
    amount: z.coerce.number({ required_error: 'المبلغ مطلوب' }).positive('المبلغ يجب أن يكون أكبر من صفر'),
    expenseDate: z.coerce.date({ required_error: 'تاريخ المصروف مطلوب' }),
    notes: z.string().trim().max(1000).optional().nullable(),
  }),
});

export const updateExpenseSchema = z.object({
  query: z.any().optional(),
  params: z.object({ id: z.string().uuid('معرّف غير صالح.') }),
  body: z.object({
    category: z.string().trim().min(2).max(100).optional(),
    description: z.string().trim().min(2).max(500).optional(),
    amount: z.coerce.number().positive('المبلغ يجب أن يكون أكبر من صفر').optional(),
    expenseDate: z.coerce.date().optional(),
    notes: z.string().trim().max(1000).optional().nullable(),
  }),
});

export const expenseTotalsQuerySchema = z.object({
  body: z.any().optional(),
  params: z.any().optional(),
  query: z.object({
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
  }),
});

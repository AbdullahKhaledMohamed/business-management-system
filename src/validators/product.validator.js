import { z } from 'zod';
import { paginationQuery } from './common.validator.js';

const skuSchema = z
  .string({ required_error: 'رمز المنتج (SKU) مطلوب' })
  .trim()
  .min(2, 'رمز المنتج قصير جدًا')
  .max(60)
  .regex(/^[A-Za-z0-9_-]+$/, 'رمز المنتج يجب أن يحتوي أحرف/أرقام/شرطات فقط');

export const listProductsSchema = z.object({
  body: z.any().optional(),
  params: z.any().optional(),
  query: z.object({
    ...paginationQuery,
    search: z.string().trim().max(200).optional(),
    categoryId: z.string().uuid().optional(),
    lowStockOnly: z.coerce.boolean().optional(),
    isActive: z.coerce.boolean().optional(),
  }),
});

export const createProductSchema = z.object({
  query: z.any().optional(),
  params: z.any().optional(),
  body: z.object({
    sku: skuSchema,
    name: z.string({ required_error: 'اسم المنتج مطلوب' }).trim().min(2).max(200),
    description: z.string().trim().max(2000).optional().nullable(),
    categoryId: z.string({ required_error: 'الصنف مطلوب' }).uuid('الصنف غير صالح'),
    purchasePrice: z.coerce.number({ required_error: 'سعر الشراء مطلوب' }).nonnegative('سعر الشراء يجب ألا يكون سالبًا'),
    sellingPrice: z.coerce.number({ required_error: 'سعر البيع مطلوب' }).nonnegative('سعر البيع يجب ألا يكون سالبًا'),
    minStockLevel: z.coerce.number().int().nonnegative().optional().default(0),
    initialStock: z.coerce.number().int().nonnegative().optional().default(0),
    isActive: z.boolean().optional().default(true),
  }),
});

// stockQuantity is intentionally NOT editable here — it only changes
// through traceable inventory movements (stock-in / adjustment / sale).
export const updateProductSchema = z.object({
  query: z.any().optional(),
  params: z.object({ id: z.string().uuid('معرّف غير صالح.') }),
  body: z.object({
    sku: skuSchema.optional(),
    name: z.string().trim().min(2).max(200).optional(),
    description: z.string().trim().max(2000).optional().nullable(),
    categoryId: z.string().uuid('الصنف غير صالح').optional(),
    purchasePrice: z.coerce.number().nonnegative().optional(),
    sellingPrice: z.coerce.number().nonnegative().optional(),
    minStockLevel: z.coerce.number().int().nonnegative().optional(),
    isActive: z.boolean().optional(),
  }),
});

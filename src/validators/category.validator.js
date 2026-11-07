import { z } from 'zod';
import { paginationQuery } from './common.validator.js';

export const listCategoriesSchema = z.object({
  body: z.any().optional(),
  params: z.any().optional(),
  query: z.object({
    ...paginationQuery,
    search: z.string().trim().max(200).optional(),
  }),
});

export const createCategorySchema = z.object({
  query: z.any().optional(),
  params: z.any().optional(),
  body: z.object({
    name: z.string({ required_error: 'اسم الصنف مطلوب' }).trim().min(2, 'اسم الصنف قصير جدًا').max(150),
    description: z.string().trim().max(1000).optional().nullable(),
  }),
});

export const updateCategorySchema = z.object({
  query: z.any().optional(),
  params: z.object({ id: z.string().uuid('معرّف غير صالح.') }),
  body: z.object({
    name: z.string().trim().min(2, 'اسم الصنف قصير جدًا').max(150).optional(),
    description: z.string().trim().max(1000).optional().nullable(),
  }),
});

import { z } from 'zod';
import { paginationQuery } from './common.validator.js';

export const listCustomersSchema = z.object({
  body: z.any().optional(),
  params: z.any().optional(),
  query: z.object({
    ...paginationQuery,
    search: z.string().trim().max(200).optional(),
  }),
});

export const createCustomerSchema = z.object({
  query: z.any().optional(),
  params: z.any().optional(),
  body: z.object({
    name: z.string({ required_error: 'اسم العميل مطلوب' }).trim().min(2).max(200),
    phone: z.string().trim().max(30).optional().nullable(),
    email: z.string().trim().email('البريد الإلكتروني غير صالح').max(150).optional().nullable().or(z.literal('')),
    address: z.string().trim().max(500).optional().nullable(),
  }),
});

export const updateCustomerSchema = z.object({
  query: z.any().optional(),
  params: z.object({ id: z.string().uuid('معرّف غير صالح.') }),
  body: z.object({
    name: z.string().trim().min(2).max(200).optional(),
    phone: z.string().trim().max(30).optional().nullable(),
    email: z.string().trim().email('البريد الإلكتروني غير صالح').max(150).optional().nullable().or(z.literal('')),
    address: z.string().trim().max(500).optional().nullable(),
  }),
});

import { z } from 'zod';
import { paginationQuery } from './common.validator.js';

const sortParams = {
  sortBy: z.string().trim().max(50).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
};

export const salesReportQuerySchema = z.object({
  body: z.any().optional(),
  params: z.any().optional(),
  query: z.object({
    ...paginationQuery,
    ...sortParams,
    customerId: z.string().uuid().optional(),
    status: z.enum(['DRAFT', 'CONFIRMED', 'PARTIALLY_PAID', 'PAID', 'CANCELED']).optional(),
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
  }),
});

export const groupedReportQuerySchema = z.object({
  body: z.any().optional(),
  params: z.any().optional(),
  query: z.object({
    ...paginationQuery,
    ...sortParams,
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
  }),
});

export const profitReportQuerySchema = z.object({
  body: z.any().optional(),
  params: z.any().optional(),
  query: z.object({
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
  }),
});

export const customerBalancesQuerySchema = z.object({
  body: z.any().optional(),
  params: z.any().optional(),
  query: z.object({
    ...paginationQuery,
    ...sortParams,
    onlyWithBalance: z.coerce.boolean().optional(),
  }),
});

export const inventoryReportQuerySchema = z.object({
  body: z.any().optional(),
  params: z.any().optional(),
  query: z.object({
    ...paginationQuery,
    ...sortParams,
    categoryId: z.string().uuid().optional(),
    lowStockOnly: z.coerce.boolean().optional(),
  }),
});

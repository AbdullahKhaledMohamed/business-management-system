import { z } from 'zod';

export const dashboardQuerySchema = z.object({
  body: z.any().optional(),
  params: z.any().optional(),
  query: z.object({
    period: z.enum(['today', 'this_week', 'this_month', 'this_year', 'custom']).optional().default('this_month'),
    customFrom: z.coerce.date().optional(),
    customTo: z.coerce.date().optional(),
    limit: z.coerce.number().int().positive().max(50).optional(),
  }),
});

export const comparisonQuerySchema = z.object({
  body: z.any().optional(),
  params: z.any().optional(),
  query: z.object({
    periodA: z.enum(['today', 'this_week', 'this_month', 'this_year']),
    periodB: z.enum(['today', 'this_week', 'this_month', 'this_year']),
  }),
});

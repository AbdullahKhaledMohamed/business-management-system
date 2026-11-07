import { z } from 'zod';

export const idParamSchema = z.object({
  body: z.any().optional(),
  query: z.any().optional(),
  params: z.object({
    id: z.string().uuid('معرّف غير صالح.'),
  }),
});

export const paginationQuery = {
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
};

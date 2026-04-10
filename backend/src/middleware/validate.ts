import { z, ZodSchema } from 'zod';
import { ValidationError } from './errorHandler';
import type { Request, Response, NextFunction } from 'express';

export const validate =
  (schema: ZodSchema, source: 'query' | 'body' = 'query') =>
  (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const r = req as unknown as Record<string, unknown>;
      r[source] = schema.parse(r[source]);
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        next(new ValidationError('Invalid request parameters', err.errors));
      } else {
        next(err);
      }
    }
  };

// ─── Reusable query schemas ──────────────────────────────────────────────────

const pagination = {
  page: z.coerce.number().int().min(1).max(1000).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
};

export const eventsQuerySchema = z.object({
  ...pagination,
  category: z.string().max(50).optional(),
  subcategory: z.string().max(50).optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
    .optional(),
  search: z.string().max(100).trim().optional(),
});

export const upcomingQuerySchema = z.object({
  ...pagination,
  cats: z.string().max(300).optional(),
});

export const paginationSchema = z.object(pagination);

export type EventsQuery = z.infer<typeof eventsQuerySchema>;
export type UpcomingQuery = z.infer<typeof upcomingQuerySchema>;
export type PaginationQuery = z.infer<typeof paginationSchema>;

const { z } = require('zod');
const { ValidationError } = require('./errorHandler');

/**
 * Validates req.query (or req.body) against a Zod schema.
 * Replaces req.query with the parsed/coerced result so routes get correct types.
 *
 * Usage:  router.get('/', validate(mySchema), handler)
 */
const validate = (schema, source = 'query') => (req, res, next) => {
  try {
    req[source] = schema.parse(req[source]);
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

const eventsQuerySchema = z.object({
  ...pagination,
  category: z.string().max(50).optional(),
  subcategory: z.string().max(50).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
  search: z.string().max(100).trim().optional(),
});

const upcomingQuerySchema = z.object({
  ...pagination,
  cats: z.string().max(300).optional(), // comma-separated category IDs
});

const paginationSchema = z.object(pagination);

module.exports = { validate, eventsQuerySchema, upcomingQuerySchema, paginationSchema };

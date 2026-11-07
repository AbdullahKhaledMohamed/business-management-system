import { ZodError } from 'zod';
import { AppError } from './errorHandler.js';

/**
 * Validates { body, query, params } against a Zod schema.
 * Usage: router.post('/login', validate(loginSchema), controller.login)
 */
export function validate(schema) {
  return (req, res, next) => {
    try {
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      req.body = parsed.body ?? req.body;
      req.query = parsed.query ?? req.query;
      req.params = parsed.params ?? req.params;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }));
        const validationError = new AppError('بيانات غير صالحة.', 422, 'VALIDATION_ERROR');
        validationError.details = details;
        next(validationError);
        return;
      }
      next(error);
    }
  };
}

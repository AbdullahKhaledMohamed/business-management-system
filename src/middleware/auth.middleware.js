import { AppError } from './errorHandler.js';

/**
 * Requires a valid, active session. Does NOT trust any role/userId
 * sent from the client — only what is stored server-side in req.session.
 */
export function requireAuth(req, res, next) {
  if (!req.session?.user) {
    return next(new AppError('يجب تسجيل الدخول للوصول لهذا المورد.', 401, 'UNAUTHENTICATED'));
  }
  next();
}

/**
 * Restricts access to one or more roles.
 * Usage: requireRole('ADMIN', 'ACCOUNTANT')
 * Must be used AFTER requireAuth.
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const currentRole = req.session?.user?.role;
    if (!currentRole || !allowedRoles.includes(currentRole)) {
      return next(new AppError('لا تملك الصلاحية الكافية لتنفيذ هذا الإجراء.', 403, 'FORBIDDEN'));
    }
    next();
  };
}

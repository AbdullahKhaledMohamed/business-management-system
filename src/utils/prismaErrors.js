import { AppError } from '../middleware/errorHandler.js';

/**
 * Maps known Prisma error codes to user-facing AppErrors in Arabic.
 * Call this inside a service's catch block:
 *   catch (error) { throw mapPrismaError(error, { uniqueField: 'sku' }); }
 */
export function mapPrismaError(error, { entityLabel = 'السجل', uniqueFieldLabels = {} } = {}) {
  if (error.code === 'P2002') {
    const field = Array.isArray(error.meta?.target) ? error.meta.target[0] : error.meta?.target;
    const label = uniqueFieldLabels[field] || field || 'القيمة';
    return new AppError(`${label} مستخدم بالفعل. يرجى اختيار قيمة أخرى.`, 409, 'DUPLICATE_VALUE');
  }

  if (error.code === 'P2025') {
    return new AppError(`${entityLabel} غير موجود.`, 404, 'NOT_FOUND');
  }

  if (error.code === 'P2003') {
    return new AppError('لا يمكن تنفيذ العملية بسبب ارتباط هذا السجل بسجلات أخرى.', 409, 'FOREIGN_KEY_CONSTRAINT');
  }

  return error;
}

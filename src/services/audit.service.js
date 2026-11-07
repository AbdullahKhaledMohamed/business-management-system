import { prisma } from '../config/database.js';

/**
 * Writes an audit log entry. This NEVER throws to the caller —
 * a logging failure must not break the business operation it describes.
 * Failures are logged to stderr instead.
 */
export async function recordAuditLog({ userId = null, action, entityType, entityId = null, details = null, ipAddress = null }) {
  try {
    await prisma.auditLog.create({
      data: { userId, action, entityType, entityId, details, ipAddress },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[audit] Failed to write audit log:', action, entityType, error.message);
  }
}

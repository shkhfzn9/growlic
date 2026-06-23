import * as auditRepo from './repository';
import { AuditAction, IAuditLog } from './types';

/**
 * Service function to log an admin action into the audit database.
 */
export async function logAction(
  restaurantId: string,
  userId: string | undefined,
  action: AuditAction,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  before?: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  after?: any
): Promise<IAuditLog> {
  // Defensive validation
  if (!restaurantId) {
    throw new Error('restaurantId is required to log an audit action');
  }
  if (!action) {
    throw new Error('action is required to log an audit action');
  }

  // Create audit log document in DB
  return await auditRepo.create({
    restaurantId,
    userId,
    action,
    before: before ? JSON.parse(JSON.stringify(before)) : undefined,
    after: after ? JSON.parse(JSON.stringify(after)) : undefined,
  });
}

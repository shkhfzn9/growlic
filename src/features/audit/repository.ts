import dbConnect from '@/lib/mongodb';
import AuditLog from './model';
import { IAuditLog, AuditAction } from './types';

/**
 * Normalizes a raw Mongoose document representing an AuditLog into a standard plain IAuditLog object.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeAuditLog(doc: any): IAuditLog {
  const plain = doc.toObject ? doc.toObject() : doc;
  return {
    _id: plain._id.toString(),
    restaurantId: plain.restaurantId,
    userId: plain.userId,
    action: plain.action as AuditAction,
    before: plain.before,
    after: plain.after,
    createdAt: plain.createdAt ? new Date(plain.createdAt).toISOString() : new Date().toISOString(),
  };
}

/**
 * Inserts a new audit log record into the database.
 */
export async function create(data: {
  restaurantId: string;
  userId?: string;
  action: AuditAction;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  before?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  after?: any;
}): Promise<IAuditLog> {
  await dbConnect();
  const doc = await AuditLog.create({
    restaurantId: data.restaurantId.toLowerCase(),
    userId: data.userId,
    action: data.action,
    before: data.before,
    after: data.after,
  });
  return normalizeAuditLog(doc);
}

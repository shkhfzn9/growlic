import dbConnect from '@/lib/mongodb';
import Admin, { Session } from './model';
import { IAdmin, ISession } from './types';

/**
 * Normalizes a raw Mongoose document representing an Admin into a standard plain IAdmin object.
 * Converts Mongoose ObjectIds to standard strings and parses timestamp dates.
 * 
 * @param doc The raw Mongoose document or plain object.
 * @returns A normalized, serialized IAdmin object.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeAdmin(doc: any): IAdmin {
  const plain = doc.toObject ? doc.toObject() : doc;
  return {
    _id: plain._id.toString(),
    email: plain.email,
    restaurantId: plain.restaurantId,
    restaurantName: plain.restaurantName,
    phone: plain.phone,
    designation: plain.designation,
    role: plain.role || 'staff',
    logoUrl: plain.logoUrl || '',
    primaryColor: plain.primaryColor || '#000000',
    welcomeMessage: plain.welcomeMessage || 'Welcome to our restaurant!',
    createdAt: plain.createdAt ? new Date(plain.createdAt).toISOString() : undefined,
    updatedAt: plain.updatedAt ? new Date(plain.updatedAt).toISOString() : undefined,
  };
}

/**
 * Normalizes a raw Mongoose document representing a Session into a standard plain ISession object.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeSession(doc: any): ISession {
  const plain = doc.toObject ? doc.toObject() : doc;
  return {
    _id: plain._id.toString(),
    userId: plain.userId,
    restaurantId: plain.restaurantId,
    tokenHash: plain.tokenHash,
    createdAt: plain.createdAt ? new Date(plain.createdAt).toISOString() : undefined,
    expiresAt: plain.expiresAt ? new Date(plain.expiresAt).toISOString() : '',
    revoked: plain.revoked,
  };
}

/**
 * Finds an Admin record by their unique email address within a specific restaurant scope.
 * 
 * @param restaurantId The identifier of the restaurant tenant (optional during initial auth lookup).
 * @param email The email to search for.
 * @returns The normalized IAdmin object if found, or null otherwise.
 */
export async function findByEmail(restaurantId: string | undefined, email: string): Promise<IAdmin | null> {
  await dbConnect();
  const query: any = { email: email.toLowerCase() };
  if (restaurantId) {
    query.restaurantId = restaurantId.toLowerCase();
  } else {
    query.restaurantId = { $exists: true };
  }
  const doc = await Admin.findOne(query);
  return doc ? normalizeAdmin(doc) : null;
}

/**
 * Finds an Admin record and returns both the normalized object and the password hash.
 * Used during authentication validations.
 * 
 * @param restaurantId The identifier of the restaurant tenant (optional during initial auth lookup).
 * @param email The email to search for.
 * @returns An object containing the IAdmin details and password hash, or null if not found.
 */
export async function findWithPasswordByEmail(restaurantId: string | undefined, email: string): Promise<{ admin: IAdmin; passwordHash: string } | null> {
  await dbConnect();
  const query: any = { email: email.toLowerCase() };
  if (restaurantId) {
    query.restaurantId = restaurantId.toLowerCase();
  } else {
    query.restaurantId = { $exists: true };
  }
  const doc = await Admin.findOne(query);
  if (!doc) return null;
  return {
    admin: normalizeAdmin(doc),
    passwordHash: doc.password,
  };
}

/**
 * Finds an Admin profile using the unique restaurant slug ID.
 * 
 * @param restaurantId The unique restaurant slug (e.g. tokyo-momos).
 * @returns The normalized IAdmin object if found, or null otherwise.
 */
export async function findByRestaurantId(restaurantId: string): Promise<IAdmin | null> {
  await dbConnect();
  const doc = await Admin.findOne({ restaurantId: restaurantId.toLowerCase() });
  return doc ? normalizeAdmin(doc) : null;
}

/**
 * Inserts a new Admin/Restaurant account profile into the database.
 * 
 * @param data Account properties including email, password hash, and restaurant metadata.
 * @returns The newly created, normalized IAdmin record.
 */
export async function create(data: {
  email: string;
  password: string;
  restaurantId: string;
  restaurantName: string;
  phone: string;
  designation: string;
  role?: 'owner' | 'manager' | 'staff';
}): Promise<IAdmin> {
  await dbConnect();
  const doc = await Admin.create({
    email: data.email.toLowerCase(),
    password: data.password,
    restaurantId: data.restaurantId.toLowerCase(),
    restaurantName: data.restaurantName.trim(),
    phone: data.phone.trim(),
    designation: data.designation.toLowerCase(),
    role: data.role || 'staff',
  });
  return normalizeAdmin(doc);
}

/**
 * Deletes an Admin record matched by their email address within a specific restaurant scope.
 * 
 * @param restaurantId The restaurant slug ID.
 * @param email The email address to delete.
 * @returns A promise that resolves to true if deleted, false otherwise.
 */
export async function deleteByEmail(restaurantId: string, email: string): Promise<boolean> {
  await dbConnect();
  const result = await Admin.deleteOne({ email: email.toLowerCase(), restaurantId: restaurantId.toLowerCase() });
  return result.deletedCount > 0;
}

/**
 * Updates the phone number and designation role fields on an existing Admin document within a specific restaurant scope.
 * 
 * @param restaurantId The restaurant slug ID.
 * @param id The Admin record's database identifier string.
 * @param phone The updated phone number.
 * @param designation The updated designation (e.g. owner, manager).
 * @returns The updated, normalized IAdmin record, or null if matching document doesn't exist.
 */
export async function updatePhoneAndDesignation(restaurantId: string, id: string, phone: string, designation: string): Promise<IAdmin | null> {
  await dbConnect();
  const doc = await Admin.findOneAndUpdate(
    { _id: id, restaurantId: restaurantId.toLowerCase() },
    { phone: phone.trim(), designation: designation.toLowerCase() },
    { new: true }
  );
  return doc ? normalizeAdmin(doc) : null;
}

/**
 * Creates a new session document in the database.
 */
export async function createSession(
  restaurantId: string,
  userId: string,
  tokenHash: string,
  expiresAt: Date
): Promise<ISession> {
  await dbConnect();
  const doc = await Session.create({
    restaurantId: restaurantId.toLowerCase(),
    userId,
    tokenHash,
    expiresAt,
    revoked: false,
  });
  return normalizeSession(doc);
}

/**
 * Finds an active session document by restaurantId and tokenHash.
 */
export async function findSessionByTokenHash(
  restaurantId: string,
  tokenHash: string
): Promise<ISession | null> {
  await dbConnect();
  const doc = await Session.findOne({
    restaurantId: restaurantId.toLowerCase(),
    tokenHash,
  });
  return doc ? normalizeSession(doc) : null;
}

/**
 * Revokes a session document by marking it as revoked: true.
 */
export async function revokeSession(
  restaurantId: string,
  tokenHash: string
): Promise<boolean> {
  await dbConnect();
  const result = await Session.updateOne(
    { restaurantId: restaurantId.toLowerCase(), tokenHash },
    { revoked: true }
  );
  return result.modifiedCount > 0;
}

/**
 * Updates restaurant branding configuration details (logoUrl, primaryColor, welcomeMessage).
 */
export async function updateBranding(
  restaurantId: string,
  data: {
    logoUrl?: string;
    primaryColor?: string;
    welcomeMessage?: string;
  }
): Promise<IAdmin | null> {
  await dbConnect();
  const doc = await Admin.findOneAndUpdate(
    { restaurantId: restaurantId.toLowerCase() },
    {
      $set: {
        logoUrl: data.logoUrl,
        primaryColor: data.primaryColor,
        welcomeMessage: data.welcomeMessage,
      }
    },
    { new: true }
  );
  return doc ? normalizeAdmin(doc) : null;
}


import dbConnect from '@/lib/mongodb';
import Admin from '@/models/Admin';
import { IAdmin } from '@/types';

/**
 * Normalizes a raw Mongoose document representing an Admin into a standard plain IAdmin object.
 * Converts Mongoose ObjectIds to standard strings and parses timestamp dates.
 * 
 * @param doc The raw Mongoose document or plain object.
 * @returns A normalized, serialized IAdmin object.
 */
export function normalizeAdmin(doc: any): IAdmin {
  const plain = doc.toObject ? doc.toObject() : doc;
  return {
    _id: plain._id.toString(),
    email: plain.email,
    restaurantId: plain.restaurantId,
    restaurantName: plain.restaurantName,
    phone: plain.phone,
    designation: plain.designation,
    createdAt: plain.createdAt ? new Date(plain.createdAt).toISOString() : undefined,
    updatedAt: plain.updatedAt ? new Date(plain.updatedAt).toISOString() : undefined,
  };
}

/**
 * Finds an Admin record by their unique email address.
 * 
 * @param email The email to search for.
 * @returns The normalized IAdmin object if found, or null otherwise.
 */
export async function findByEmail(email: string): Promise<IAdmin | null> {
  await dbConnect();
  const doc = await Admin.findOne({ email: email.toLowerCase() });
  return doc ? normalizeAdmin(doc) : null;
}

/**
 * Finds an Admin record and returns both the normalized object and the password hash.
 * Used during authentication validations.
 * 
 * @param email The email to search for.
 * @returns An object containing the IAdmin details and password hash, or null if not found.
 */
export async function findWithPasswordByEmail(email: string): Promise<{ admin: IAdmin; passwordHash: string } | null> {
  await dbConnect();
  const doc = await Admin.findOne({ email: email.toLowerCase() });
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
}): Promise<IAdmin> {
  await dbConnect();
  const doc = await Admin.create({
    email: data.email.toLowerCase(),
    password: data.password,
    restaurantId: data.restaurantId.toLowerCase(),
    restaurantName: data.restaurantName.trim(),
    phone: data.phone.trim(),
    designation: data.designation.toLowerCase(),
  });
  return normalizeAdmin(doc);
}

/**
 * Deletes an Admin record matched by their email address.
 * 
 * @param email The email address to delete.
 * @returns A promise that resolves to true if deleted, false otherwise.
 */
export async function deleteByEmail(email: string): Promise<boolean> {
  await dbConnect();
  const result = await Admin.deleteOne({ email: email.toLowerCase() });
  return result.deletedCount > 0;
}

/**
 * Updates the phone number and designation role fields on an existing Admin document.
 * 
 * @param id The Admin record's database identifier string.
 * @param phone The updated phone number.
 * @param designation The updated designation (e.g. owner, manager).
 * @returns The updated, normalized IAdmin record, or null if matching document doesn't exist.
 */
export async function updatePhoneAndDesignation(id: string, phone: string, designation: string): Promise<IAdmin | null> {
  await dbConnect();
  const doc = await Admin.findByIdAndUpdate(
    id,
    { phone: phone.trim(), designation: designation.toLowerCase() },
    { new: true }
  );
  return doc ? normalizeAdmin(doc) : null;
}

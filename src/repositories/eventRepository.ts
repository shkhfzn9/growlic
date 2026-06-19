import dbConnect from '@/lib/mongodb';
import Event from '@/models/Event';
import { IEvent } from '@/types';

/**
 * Normalizes a raw Mongoose document representing an Event into a standard IEvent plain object.
 * Converts DB properties to type-safe and serialized fields.
 * 
 * @param doc The raw Mongoose document.
 * @returns A standardized, plain interface structure of the event.
 */
export function normalizeEvent(doc: any): IEvent {
  const plain = doc.toObject ? doc.toObject() : doc;
  return {
    _id: plain._id.toString(),
    restaurantId: plain.restaurantId,
    type: plain.type,
    itemId: plain.itemId || '',
    nudgeType: plain.nudgeType || '',
    createdAt: plain.createdAt ? new Date(plain.createdAt).toISOString() : '',
  };
}

/**
 * Creates and inserts a new client log Event (nudge view, cart creation, or item click) in the database.
 * 
 * @param data Configuration values containing event type, optional target item ID, and nudge classification.
 * @returns The newly created and normalized IEvent object.
 */
export async function create(data: {
  restaurantId: string;
  type: 'modal_open' | 'cart_create' | 'nudge_show';
  itemId?: string;
  nudgeType?: string;
}): Promise<IEvent> {
  await dbConnect();
  const doc = await Event.create({
    restaurantId: data.restaurantId,
    type: data.type,
    itemId: data.itemId || '',
    nudgeType: data.nudgeType || '',
  });
  return normalizeEvent(doc);
}

/**
 * Retrieves all events logged under a specific restaurant within a given date range.
 * Used to compute dashboard analytics parameters.
 * 
 * @param restaurantId Scope parameter enforcing multi-tenant isolation.
 * @param start The start boundary Date object.
 * @param end The end boundary Date object.
 * @returns An array of matching, normalized IEvent records.
 */
export async function findInRange(
  restaurantId: string,
  start: Date,
  end: Date
): Promise<IEvent[]> {
  await dbConnect();
  const docs = await Event.find({
    restaurantId,
    createdAt: { $gte: start, $lte: end },
  });
  return docs.map(normalizeEvent);
}

/**
 * Performs a bulk insert of event log documents.
 * 
 * @param items Array of raw event parameters.
 * @returns An array of newly created, normalized event records.
 */
export async function insertMany(items: any[]): Promise<IEvent[]> {
  await dbConnect();
  const docs = await Event.insertMany(items);
  return docs.map(normalizeEvent);
}

/**
 * Deletes all event records belonging to a specific restaurant tenant.
 * 
 * @param restaurantId The restaurant slug ID.
 * @returns Resolves to true if records were deleted, false otherwise.
 */
export async function deleteByRestaurantId(restaurantId: string): Promise<boolean> {
  await dbConnect();
  const result = await Event.deleteMany({ restaurantId });
  return result.deletedCount > 0;
}

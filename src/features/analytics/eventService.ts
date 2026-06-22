import * as eventRepo from './eventRepository';
import { validateLogEventParams } from './validation';

/**
 * Creates and logs a client action event (e.g. nudge show, modal clicks) in the database.
 * Throws a ValidationError if the restaurantId or type parameters are missing.
 * 
 * @param restaurantId Scope parameter enforcing multi-tenant isolation.
 * @param type The action category ('modal_open', 'cart_create', 'nudge_show').
 * @param itemId Optional target item database identifier.
 * @param nudgeType Optional nudge classification (e.g., 'cross_sell', 'threshold_discount').
 * @returns Resolves to an object indicating success status and the generated event identifier string.
 */
export async function logEvent(
  restaurantId: string,
  type: 'modal_open' | 'cart_create' | 'nudge_show',
  itemId?: string,
  nudgeType?: string
): Promise<{ success: boolean; eventId?: string }> {
  validateLogEventParams(restaurantId, type);

  try {
    const event = await eventRepo.create({
      restaurantId,
      type,
      itemId,
      nudgeType,
    });
    return { success: true, eventId: event._id };
  } catch (error) {
    console.error('Error logging event in service:', error);
    return { success: false };
  }
}

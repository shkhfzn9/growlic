/**
 * WhatsApp Messaging & Link Generator Service
 * 
 * Provides phone normalization and click-to-chat link generation.
 * Abstracted so it can be swapped with automated WhatsApp Business API in the future.
 */

export interface WhatsAppNotificationPayload {
  type: 'placed' | 'ready';
  phone: string;
  customerName?: string;
  orderId: string;
  restaurantName: string;
  total?: number;
}

/**
 * Normalizes phone numbers to a clean international format without '+' or special characters.
 * Defaults to country code 91 (India) if a 10-digit number is provided.
 */
export function normalizePhoneNumber(rawPhone: string, defaultCountryPrefix = '91'): string {
  if (!rawPhone) return '';

  // Remove all non-numeric characters except leading '+'
  let cleaned = rawPhone.trim().replace(/[^\d+]/g, '');

  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  } else if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }

  // If standard 10-digit number, prepend default country prefix
  if (cleaned.length === 10) {
    cleaned = `${defaultCountryPrefix}${cleaned}`;
  }

  return cleaned;
}

/**
 * Validates whether the phone number contains a valid format.
 */
export function isValidPhoneNumber(rawPhone: string): boolean {
  const normalized = normalizePhoneNumber(rawPhone);
  // Valid international numbers are typically 10 to 15 digits
  return /^\d{10,15}$/.test(normalized);
}

/**
 * Generates pre-filled WhatsApp click-to-chat URL.
 * URL format: https://wa.me/<number>?text=<encoded_text>
 */
export function generateWhatsAppOrderLink(payload: WhatsAppNotificationPayload): string {
  const normalizedPhone = normalizePhoneNumber(payload.phone);
  if (!normalizedPhone) return '';

  const shortId = payload.orderId.length > 6 ? payload.orderId.slice(-6).toUpperCase() : payload.orderId;
  const greetingName = payload.customerName && payload.customerName.trim() ? payload.customerName.trim() : 'Valued Customer';

  let message = '';
  if (payload.type === 'placed') {
    message = `Hi ${greetingName}, thank you for your order at *${payload.restaurantName}*! Your order *#${shortId}* has been placed successfully.${payload.total ? ` Total: ₹${payload.total}.` : ''} Please pay at the counter.`;
  } else if (payload.type === 'ready') {
    message = `Hi ${greetingName}, great news! Your order *#${shortId}* at *${payload.restaurantName}* is *READY FOR PICKUP*! 🍽️ Enjoy your meal.`;
  }

  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}

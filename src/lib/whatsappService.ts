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
  items?: Array<{
    name: string;
    quantity: number;
    price?: number;
  }>;
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
  const greetingName = payload.customerName && payload.customerName.trim() ? payload.customerName.trim() : 'there';
  const cleanRestName = payload.restaurantName && payload.restaurantName.trim() && payload.restaurantName !== 'Restaurant'
    ? payload.restaurantName.trim()
    : 'our restaurant';

  const items = payload.items || [];
  const itemsList = items.length > 0
    ? items.map((i) => `- ${i.name} x ${i.quantity}`).join('\n')
    : '';
  const totalQty = items.reduce((sum, i) => sum + (i.quantity || 1), 0);

  let message = '';
  if (payload.type === 'placed') {
    if (itemsList) {
      message = `Hi ${greetingName}! 👋\n\nThank you for ordering at *${cleanRestName}*.\n\n*Order #${shortId}* has been placed ✅\n\n🧾 *Your order*\n${itemsList}\n\n*Total items:* ${totalQty}${payload.total !== undefined ? `\n*Total:* ₹${payload.total}` : ''}\n*Payment:* Please pay at the counter for the order to get placed.\n\n💬 We would love to hear your feedback! How was your experience with us?`;
    } else {
      message = `Hi ${greetingName}! 👋\n\nThank you for ordering at *${cleanRestName}*.\n\n*Order #${shortId}* has been placed ✅${payload.total !== undefined ? `\n*Total:* ₹${payload.total}` : ''}\n*Payment:* Please pay at the counter for the order to get placed.\n\n💬 We would love to hear your feedback! How was your experience with us?`;
    }
  } else if (payload.type === 'ready') {
    if (itemsList) {
      message = `Hi ${greetingName}! 👋\n\nGreat news! Your order *#${shortId}* at *${cleanRestName}* is *READY FOR PICKUP*! 🍽️\n\n🧾 *Your order*\n${itemsList}\n\n*Total items:* ${totalQty}${payload.total !== undefined ? `\n*Total:* ₹${payload.total}` : ''}\n\nEnjoy your meal! 🌟 We would love your feedback—please let us know how your experience was!`;
    } else {
      message = `Hi ${greetingName}! 👋\n\nGreat news! Your order *#${shortId}* at *${cleanRestName}* is *READY FOR PICKUP*! 🍽️${payload.total !== undefined ? `\n*Total:* ₹${payload.total}` : ''}\n\nEnjoy your meal! 🌟 We would love your feedback—please let us know how your experience was!`;
    }
  }

  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}

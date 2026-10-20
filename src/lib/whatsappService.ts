/**
 * WhatsApp Messaging & Link Generator Service
 * 
 * Provides phone normalization and click-to-chat link generation.
 * Supports tailored message formatting for Restaurants and Salons/Spas,
 * and appends the Growlic automation & free audit promotional footer to all messages.
 */

export interface WhatsAppNotificationPayload {
  type: 'placed' | 'ready' | 'updated' | 'confirmed';
  phone: string;
  customerName?: string;
  orderId: string;
  orderNumber?: number | string;
  restaurantName: string;
  total?: number;
  items?: Array<{
    name: string;
    quantity: number;
    price?: number;
  }>;
  businessCategory?: string;
  appointmentDetails?: {
    bookingDate?: string;
    bookingTime?: string;
    specialistName?: string;
    userNotes?: string;
  };
  growlicFormLink?: string;
}

/**
 * Resolves the Growlic free software audit and consultation landing link.
 * Defaults to the production URL https://growlic.vercel.app/audit so links
 * sent over WhatsApp always resolve properly on mobile devices.
 */
export function getGrowlicFormLink(customLink?: string): string {
  if (customLink && customLink.trim()) {
    return customLink.trim();
  }
  if (process.env.NEXT_PUBLIC_GROWLIC_FORM_LINK) {
    return process.env.NEXT_PUBLIC_GROWLIC_FORM_LINK.trim();
  }
  return 'https://growlic.vercel.app/audit';
}

/**
 * Checks whether the order or business corresponds to a Salon / Spa / Wellness appointment.
 */
export function isSalonBusiness(category?: string, appointmentDetails?: any): boolean {
  if (appointmentDetails && (appointmentDetails.bookingDate || appointmentDetails.bookingTime || appointmentDetails.specialistName)) {
    return true;
  }
  const cat = (category || '').toLowerCase();
  return (
    cat.includes('salon') ||
    cat.includes('saloon') ||
    cat.includes('spa') ||
    cat.includes('beauty') ||
    cat.includes('barber') ||
    cat.includes('hair') ||
    cat.includes('wellness')
  );
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

  const shortId = payload.orderNumber
    ? String(payload.orderNumber)
    : payload.orderId.length > 6
    ? payload.orderId.slice(-6).toUpperCase()
    : payload.orderId;

  const greetingName = payload.customerName && payload.customerName.trim() ? payload.customerName.trim() : 'there';
  const cleanRestName = payload.restaurantName && payload.restaurantName.trim() && payload.restaurantName !== 'Restaurant'
    ? payload.restaurantName.trim()
    : 'our establishment';

  const items = payload.items || [];
  const itemsList = items.length > 0
    ? items.map((i) => `- ${i.name} x ${i.quantity}`).join('\n')
    : '';
  const totalQty = items.reduce((sum, i) => sum + (i.quantity || 1), 0);

  const isSalon = isSalonBusiness(payload.businessCategory, payload.appointmentDetails);
  const formLink = getGrowlicFormLink(payload.growlicFormLink);

  const growlicFooter = `\n\n_Powered by Growlic_ ⚡\nCustom automation & software to grow your business.\nFill the form, get a *free audit* 👉 ${formLink}`;

  let message = '';

  if (isSalon) {
    const appDetails = payload.appointmentDetails;
    const bookingDate = appDetails?.bookingDate;
    const bookingTime = appDetails?.bookingTime;
    const specialistName = appDetails?.specialistName;
    const userNotes = appDetails?.userNotes;

    const detailsList: string[] = [];
    if (bookingDate) detailsList.push(`*Booking Date:* ${bookingDate}`);
    if (bookingTime) detailsList.push(`*Time Slot:* ${bookingTime}`);
    if (specialistName && specialistName !== 'Any Available Specialist') {
      detailsList.push(`*Stylist:* ${specialistName}`);
    } else if (specialistName) {
      detailsList.push(`*Stylist:* ${specialistName}`);
    }
    if (userNotes) detailsList.push(`*Notes:* ${userNotes}`);

    const detailsBlock = detailsList.join('\n');
    const servicesHeader = '*Services Booked:*';

    if (payload.type === 'ready' || payload.type === 'confirmed') {
      message = `Hi ${greetingName}!\n\nGreat news! Your booking *#Booking-${shortId}* at *${cleanRestName}* is *CONFIRMED*! 🎉\n\n${detailsBlock ? `${detailsBlock}\n\n` : ''}${servicesHeader}\n${itemsList || '- Salon Services'}\n\n*Total Services:* ${totalQty}${payload.total !== undefined ? `\n*Total Amount:* ₹${payload.total}` : ''}\n\nWe look forward to styling you! Please arrive 5 minutes prior to your slot.${growlicFooter}`;
    } else if (payload.type === 'updated') {
      message = `Hi ${greetingName}!\n\nYour appointment *#Booking-${shortId}* at *${cleanRestName}* has been *UPDATED*.\n\n${detailsBlock ? `${detailsBlock}\n\n` : ''}${servicesHeader}\n${itemsList || '- Salon Services'}\n\n*Total Services:* ${totalQty}${payload.total !== undefined ? `\n*Total Amount:* ₹${payload.total}` : ''}\n\nThank you for choosing *${cleanRestName}*!${growlicFooter}`;
    } else {
      // 'placed' / 'scheduled'
      message = `Hi ${greetingName}!\n\nThank you for booking your appointment at *${cleanRestName}*.\n\n*#Booking-${shortId}* has been received!\n\n${detailsBlock ? `${detailsBlock}\n\n` : ''}${servicesHeader}\n${itemsList || '- Salon Services'}\n\n*Total Services:* ${totalQty}${payload.total !== undefined ? `\n*Total Amount:* ₹${payload.total}` : ''}\n\nOur team has received your booking and will prepare your slot.${growlicFooter}`;
    }
  } else {
    // Restaurant / Cafe format
    if (payload.type === 'placed') {
      if (itemsList) {
        message = `Hi ${greetingName}!\n\nThank you for ordering at *${cleanRestName}*.\n\n*Order #${shortId}* has been placed.\n\n*Your order:*\n${itemsList}\n\n*Total items:* ${totalQty}${payload.total !== undefined ? `\n*Total:* ₹${payload.total}` : ''}\n*Payment:* Please pay at the counter for the order to get placed.\n\nWe would love to hear your feedback! How was your experience with us?${growlicFooter}`;
      } else {
        message = `Hi ${greetingName}!\n\nThank you for ordering at *${cleanRestName}*.\n\n*Order #${shortId}* has been placed.${payload.total !== undefined ? `\n*Total:* ₹${payload.total}` : ''}\n*Payment:* Please pay at the counter for the order to get placed.\n\nWe would love to hear your feedback! How was your experience with us?${growlicFooter}`;
      }
    } else if (payload.type === 'ready' || payload.type === 'confirmed') {
      if (itemsList) {
        message = `Hi ${greetingName}!\n\nGreat news! Your order *#${shortId}* at *${cleanRestName}* is *READY FOR PICKUP*!\n\n*Your order:*\n${itemsList}\n\n*Total items:* ${totalQty}${payload.total !== undefined ? `\n*Total:* ₹${payload.total}` : ''}\n\nEnjoy your meal! We would love your feedback - please let us know how your experience was!${growlicFooter}`;
      } else {
        message = `Hi ${greetingName}!\n\nGreat news! Your order *#${shortId}* at *${cleanRestName}* is *READY FOR PICKUP*!${payload.total !== undefined ? `\n*Total:* ₹${payload.total}` : ''}\n\nEnjoy your meal! We would love your feedback - please let us know how your experience was!${growlicFooter}`;
      }
    } else if (payload.type === 'updated') {
      if (itemsList) {
        message = `Hi ${greetingName}!\n\nYour order *#${shortId}* at *${cleanRestName}* has been *UPDATED*.\n\n*Updated order:*\n${itemsList}\n\n*Total items:* ${totalQty}${payload.total !== undefined ? `\n*Updated Total:* ₹${payload.total}` : ''}\n*Payment:* Please pay at the counter for the order to get processed.\n\nWe would love to hear your feedback! How was your experience with us?${growlicFooter}`;
      } else {
        message = `Hi ${greetingName}!\n\nYour order *#${shortId}* at *${cleanRestName}* has been *UPDATED*.${payload.total !== undefined ? `\n*Updated Total:* ₹${payload.total}` : ''}\n*Payment:* Please pay at the counter for the order to get processed.\n\nWe would love to hear your feedback! How was your experience with us?${growlicFooter}`;
      }
    }
  }

  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Shared customer phone normalization utility.
 * Used uniformly across:
 * - QR order flow (cart page)
 * - Admin Counter POS order form
 * - Database lookup server actions
 * - Client-side in-memory cache
 *
 * Ensures all phone numbers are stored, matched, and searched in the standard 10-digit format.
 * Handles pasted inputs with '+91', country code prefixes, spaces, hyphens, and leading trunk '0'.
 */
export function normalizeCustomerPhone(raw: string | undefined | null): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';

  // Extract all digit characters
  let digits = trimmed.replace(/\D/g, '');

  // Case 1: Pasted/entered with +91 or 91 country code (12 digits, e.g. +91 98765 43210 or 919876543210)
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }

  // Case 2: Pasted/entered with leading trunk '0' (11 digits, e.g. 09876543210)
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }

  // Case 3: Explicit '+91' prefix in raw text followed by digits exceeding 10
  if (trimmed.startsWith('+91') && digits.startsWith('91') && digits.length > 10) {
    return digits.slice(2, 12);
  }

  // Case 4: Any other input exceeding 10 digits that starts with '91'
  if (digits.length > 10 && digits.startsWith('91')) {
    return digits.slice(2, 12);
  }

  // Case 5: If more than 10 digits without 91 prefix, limit to first 10 digits
  if (digits.length > 10) {
    return digits.slice(0, 10);
  }

  return digits;
}

/**
 * Validates whether the given input forms a valid 10-digit customer phone number.
 */
export function isValidCustomerPhone(raw: string | undefined | null): boolean {
  const normalized = normalizeCustomerPhone(raw);
  return /^\d{10}$/.test(normalized);
}

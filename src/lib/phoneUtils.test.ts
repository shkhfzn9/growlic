import { describe, it, expect } from 'vitest';
import { normalizeCustomerPhone, isValidCustomerPhone } from './phoneUtils';

describe('normalizeCustomerPhone', () => {
  it('handles standard 10-digit number', () => {
    expect(normalizeCustomerPhone('9876543210')).toBe('9876543210');
  });

  it('handles pasted +91 with spaces', () => {
    expect(normalizeCustomerPhone('+91 98765 43210')).toBe('9876543210');
  });

  it('handles pasted +91 without spaces', () => {
    expect(normalizeCustomerPhone('+919876543210')).toBe('9876543210');
  });

  it('handles pasted 91 with spaces without plus', () => {
    expect(normalizeCustomerPhone('91 98765 43210')).toBe('9876543210');
  });

  it('handles pasted 12-digit number starting with 91', () => {
    expect(normalizeCustomerPhone('919876543210')).toBe('9876543210');
  });

  it('handles leading trunk zero (11 digits)', () => {
    expect(normalizeCustomerPhone('09876543210')).toBe('9876543210');
  });

  it('handles hyphens, dots, parentheses', () => {
    expect(normalizeCustomerPhone('+91 (987) 654-3210')).toBe('9876543210');
    expect(normalizeCustomerPhone('987-654-3210')).toBe('9876543210');
    expect(normalizeCustomerPhone('987.654.3210')).toBe('9876543210');
  });

  it('preserves 10-digit number that starts with 91', () => {
    // 9123456789 is a valid 10-digit number; it should NOT strip 91!
    expect(normalizeCustomerPhone('9123456789')).toBe('9123456789');
  });

  it('correctly handles +91 prepended to a number starting with 91', () => {
    expect(normalizeCustomerPhone('+91 9123456789')).toBe('9123456789');
  });

  it('handles partial numbers gracefully while typing', () => {
    expect(normalizeCustomerPhone('9')).toBe('9');
    expect(normalizeCustomerPhone('987')).toBe('987');
  });

  it('handles empty, null, or undefined', () => {
    expect(normalizeCustomerPhone('')).toBe('');
    expect(normalizeCustomerPhone('   ')).toBe('');
    expect(normalizeCustomerPhone(undefined)).toBe('');
    expect(normalizeCustomerPhone(null)).toBe('');
  });
});

describe('isValidCustomerPhone', () => {
  it('validates 10-digit phones', () => {
    expect(isValidCustomerPhone('9876543210')).toBe(true);
    expect(isValidCustomerPhone('+91 98765 43210')).toBe(true);
    expect(isValidCustomerPhone('09876543210')).toBe(true);
    expect(isValidCustomerPhone('98765')).toBe(false);
    expect(isValidCustomerPhone('')).toBe(false);
  });
});

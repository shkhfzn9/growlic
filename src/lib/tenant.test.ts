import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateRestaurantAccess, validateRestaurantId, requireTenant } from './tenant';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  verifyToken: vi.fn(),
}));

describe('tenant context validation', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('validateRestaurantAccess', () => {
    it('should throw an error if targetRestaurantId is empty', () => {
      const context = { restaurantId: 'cafe-alpha' };
      expect(() => validateRestaurantAccess(context, '')).toThrow('Target Restaurant ID is required');
    });

    it('should throw an error if tenant restaurantId does not match targetRestaurantId', () => {
      const context = { restaurantId: 'cafe-alpha' };
      expect(() => validateRestaurantAccess(context, 'cafe-beta')).toThrow('Forbidden: Tenant mismatch');
    });

    it('should not throw if tenant restaurantId matches targetRestaurantId case-insensitively', () => {
      const context = { restaurantId: 'Cafe-Alpha' };
      expect(() => validateRestaurantAccess(context, 'cafe-alpha')).not.toThrow();
    });
  });

  describe('validateRestaurantId', () => {
    it('should throw an error if restaurantId is not a string or empty', () => {
      expect(() => validateRestaurantId(null)).toThrow('Restaurant ID is required');
      expect(() => validateRestaurantId(123)).toThrow('Restaurant ID is required');
      expect(() => validateRestaurantId('   ')).toThrow('Restaurant ID is required');
    });

    it('should return trimmed lowercase restaurantId', () => {
      expect(validateRestaurantId('  Cafe-Alpha  ')).toBe('cafe-alpha');
    });
  });

  describe('requireTenant', () => {
    it('should throw unauthorized error if admin_token cookie is missing', async () => {
      const mockGet = vi.fn().mockReturnValue(undefined);
      vi.mocked(cookies).mockResolvedValue({
        get: mockGet,
      } as any);

      await expect(requireTenant()).rejects.toThrow('Unauthorized: No tenant session token provided');
    });

    it('should throw unauthorized error if token validation fails', async () => {
      const mockGet = vi.fn().mockReturnValue({ value: 'invalid-token' });
      vi.mocked(cookies).mockResolvedValue({
        get: mockGet,
      } as any);
      vi.mocked(verifyToken).mockReturnValue(null);

      await expect(requireTenant()).rejects.toThrow('Unauthorized: Invalid or expired tenant session');
    });

    it('should return decoded tenant context when token is valid', async () => {
      const mockGet = vi.fn().mockReturnValue({ value: 'valid-token' });
      vi.mocked(cookies).mockResolvedValue({
        get: mockGet,
      } as any);
      vi.mocked(verifyToken).mockReturnValue({
        restaurantId: 'cafe-alpha',
        restaurantName: 'Cafe Alpha',
        email: 'admin@cafealpha.com',
        role: 'tenant',
      });

      const context = await requireTenant();
      expect(context).toEqual({
        restaurantId: 'cafe-alpha',
        restaurantName: 'Cafe Alpha',
        email: 'admin@cafealpha.com',
      });
    });
  });
});

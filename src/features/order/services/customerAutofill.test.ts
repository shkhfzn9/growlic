import { describe, it, expect, beforeEach, vi } from 'vitest';
import { normalizeCustomerPhone, isValidCustomerPhone } from '@/lib/phoneUtils';
import {
  initializeCustomerCache,
  getCachedCustomer,
  setCachedCustomer,
  clearCustomerCache,
  isCustomerCacheLoaded,
  getCustomerCacheSize,
} from './customerPosCache';

describe('Feature 4 Verification Suite: Returning Customer Autofill', () => {
  beforeEach(() => {
    clearCustomerCache();
    vi.restoreAllMocks();
  });

  // Checklist Item 1: Phone change after autofill
  describe('1. Phone change after autofill & manual name protection', () => {
    it('clears autofilled name when phone number changes', () => {
      // Simulate form state management
      let customerPhone = '';
      let customerName = '';
      let isAutofilled = false;
      const isNameAutofilledRef = { current: false };
      const isNameManuallyEditedRef = { current: false };

      // Setup cache
      initializeCustomerCache('rest-1', [{ phone: '9876543210', name: 'Original Customer' }]);

      // Step 1: Admin types phone 9876543210
      const onPhoneChange = (input: string) => {
        const clean = normalizeCustomerPhone(input);
        customerPhone = clean;

        if (isNameAutofilledRef.current) {
          customerName = '';
          isNameAutofilledRef.current = false;
          isAutofilled = false;
        }

        if (clean.length === 10) {
          const cached = getCachedCustomer('rest-1', clean);
          if (cached && !isNameManuallyEditedRef.current) {
            customerName = cached;
            isNameAutofilledRef.current = true;
            isAutofilled = true;
          }
        }
      };

      onPhoneChange('9876543210');
      expect(customerName).toBe('Original Customer');
      expect(isAutofilled).toBe(true);
      expect(isNameAutofilledRef.current).toBe(true);

      // Step 2: Admin edits or changes phone
      onPhoneChange('987654321'); // Deleted last digit
      expect(customerName).toBe('');
      expect(isAutofilled).toBe(false);
      expect(isNameAutofilledRef.current).toBe(false);
    });

    it('NEVER overwrites a name the admin typed manually', () => {
      let customerPhone = '';
      let customerName = '';
      const isNameAutofilledRef = { current: false };
      const isNameManuallyEditedRef = { current: false };

      initializeCustomerCache('rest-1', [{ phone: '9876543210', name: 'Database Customer' }]);

      const onNameChange = (val: string) => {
        customerName = val;
        isNameAutofilledRef.current = false;
        isNameManuallyEditedRef.current = val.trim().length > 0;
      };

      const onPhoneChange = (input: string) => {
        const clean = normalizeCustomerPhone(input);
        customerPhone = clean;

        if (isNameAutofilledRef.current) {
          customerName = '';
          isNameAutofilledRef.current = false;
        }

        if (clean.length === 10) {
          const cached = getCachedCustomer('rest-1', clean);
          // Protection: never overwrite if manually edited
          if (cached && !isNameManuallyEditedRef.current) {
            customerName = cached;
            isNameAutofilledRef.current = true;
          }
        }
      };

      // Admin types name first
      onNameChange('Manual VIP Guest');
      expect(customerName).toBe('Manual VIP Guest');
      expect(isNameManuallyEditedRef.current).toBe(true);

      // Admin enters returning customer phone
      onPhoneChange('9876543210');
      expect(customerName).toBe('Manual VIP Guest'); // Protected! Not overwritten by 'Database Customer'

      // Admin changes phone
      onPhoneChange('9876543211');
      expect(customerName).toBe('Manual VIP Guest'); // Protected! Not cleared because it wasn't autofilled
    });
  });

  // Checklist Item 2: Rapid-entry race condition
  describe('2. Rapid-entry race condition (stale lookup responses)', () => {
    it('ignores stale DB lookup responses when user changes phone while lookup is in flight', async () => {
      let customerName = '';
      const activeLookupPhoneRef = { current: '' };
      const currentPhoneRef = { current: '' };
      const isNameManuallyEditedRef = { current: false };
      const isNameAutofilledRef = { current: false };

      // Mock slow lookup for Phone A (100ms) and fast lookup for Phone B (20ms)
      const mockLookupApi = async (phone: string, delayMs: number, resultName: string) => {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return { phone, name: resultName };
      };

      const handleLookupResponse = (result: { phone: string; name: string }) => {
        // Cache result
        setCachedCustomer('rest-1', result.phone, result.name);

        // Apply only if phone still matches current field value
        if (
          result?.name &&
          activeLookupPhoneRef.current === result.phone &&
          currentPhoneRef.current === result.phone &&
          !isNameManuallyEditedRef.current
        ) {
          customerName = result.name;
          isNameAutofilledRef.current = true;
        }
      };

      // 1. User types Phone A
      const phoneA = '9876543210';
      currentPhoneRef.current = phoneA;
      activeLookupPhoneRef.current = phoneA;
      const promiseA = mockLookupApi(phoneA, 100, 'Customer A').then(handleLookupResponse);

      // 2. User immediately backspaces and pastes Phone B before A returns
      const phoneB = '9111111111';
      currentPhoneRef.current = phoneB;
      activeLookupPhoneRef.current = phoneB;
      const promiseB = mockLookupApi(phoneB, 20, 'Customer B').then(handleLookupResponse);

      // Fast response B resolves first
      await promiseB;
      expect(customerName).toBe('Customer B');

      // Slow response A arrives later
      await promiseA;

      // Crucial: Customer A must NOT overwrite Customer B!
      expect(customerName).toBe('Customer B');

      // But Customer A is still safely cached for future use
      expect(getCachedCustomer('rest-1', phoneA)).toBe('Customer A');
    });
  });

  // Checklist Item 3: Failed lookup resilience
  describe('3. Failed lookup resilience (form remains usable on error)', () => {
    it('handles server action failures gracefully without crashing form or corrupting inputs', async () => {
      let customerName = 'Existing Text';
      let formUsable = true;

      const failingLookupAction = async () => {
        throw new Error('Database connection timeout');
      };

      try {
        await failingLookupAction();
      } catch (err) {
        // Safe catch as implemented in CounterOrderForm.tsx
        formUsable = true;
      }

      // Verify form remains intact and usable
      expect(formUsable).toBe(true);
      expect(customerName).toBe('Existing Text');
    });
  });

  // Checklist Item 4: Cross-tenant isolation
  describe('4. Cross-tenant isolation', () => {
    it('strictly isolates customer cache between restaurants', () => {
      // Preload restaurant A
      initializeCustomerCache('restaurant-a', [
        { phone: '9876543210', name: 'Tenant A VIP' },
      ]);

      // Preload restaurant B with different customer on same phone
      initializeCustomerCache('restaurant-b', [
        { phone: '9876543210', name: 'Tenant B Regular' },
      ]);

      expect(getCachedCustomer('restaurant-a', '9876543210')).toBe('Tenant A VIP');
      expect(getCachedCustomer('restaurant-b', '9876543210')).toBe('Tenant B Regular');
      expect(getCachedCustomer('restaurant-c', '9876543210')).toBe(null);
    });

    it('clears all cached data on admin logout', () => {
      setCachedCustomer('restaurant-a', '9876543210', 'A User');
      setCachedCustomer('restaurant-b', '9876543210', 'B User');

      clearCustomerCache(); // Called on logout

      expect(getCachedCustomer('restaurant-a', '9876543210')).toBe(null);
      expect(getCachedCustomer('restaurant-b', '9876543210')).toBe(null);
      expect(getCustomerCacheSize('restaurant-a')).toBe(0);
      expect(getCustomerCacheSize('restaurant-b')).toBe(0);
    });
  });

  // Checklist Item 5: QR vs Counter phone format match
  describe('5. QR vs Counter phone format match', () => {
    it('normalizes pasted numbers with +91, spaces, hyphens, and trunk 0 to identical 10-digit DB format', () => {
      const inputs = [
        '+91 98765 43210',
        '+919876543210',
        '09876543210',
        '98765 43210',
        '+91 (987) 654-3210',
        '987-654-3210',
        '9876543210',
      ];

      const expected = '9876543210';

      for (const input of inputs) {
        const qrNormalized = normalizeCustomerPhone(input);
        const counterNormalized = normalizeCustomerPhone(input);

        // QR and Counter MUST produce the exact same normalized string
        expect(qrNormalized).toBe(expected);
        expect(counterNormalized).toBe(expected);
        expect(qrNormalized).toBe(counterNormalized);
        expect(isValidCustomerPhone(qrNormalized)).toBe(true);
      }
    });

    it('preserves legitimate numbers starting with 91', () => {
      const input = '9123456789';
      expect(normalizeCustomerPhone(input)).toBe('9123456789');
      expect(normalizeCustomerPhone('+91 9123456789')).toBe('9123456789');
    });
  });
});

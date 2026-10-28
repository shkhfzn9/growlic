import { describe, it, expect, beforeEach } from 'vitest';
import {
  initializeCustomerCache,
  getCachedCustomer,
  setCachedCustomer,
  clearCustomerCache,
  isCustomerCacheLoaded,
  getCustomerCacheSize,
} from './customerPosCache';

describe('customerPosCache', () => {
  beforeEach(() => {
    clearCustomerCache();
  });

  it('initializes and looks up preloaded customers', () => {
    initializeCustomerCache('rest-1', [
      { phone: '9876543210', name: 'Alice Smith' },
      { phone: '9876543211', name: 'Bob Jones' },
    ]);

    expect(isCustomerCacheLoaded('rest-1')).toBe(true);
    expect(getCachedCustomer('rest-1', '9876543210')).toBe('Alice Smith');
    expect(getCachedCustomer('rest-1', '9876543211')).toBe('Bob Jones');
    expect(getCachedCustomer('rest-1', '9999999999')).toBe(null);
  });

  it('enforces multi-tenant isolation', () => {
    initializeCustomerCache('tenant-a', [
      { phone: '9876543210', name: 'Tenant A Customer' },
    ]);
    initializeCustomerCache('tenant-b', [
      { phone: '9876543210', name: 'Tenant B Customer' },
    ]);

    // Cross-tenant lookup must return respective tenant customer only
    expect(getCachedCustomer('tenant-a', '9876543210')).toBe('Tenant A Customer');
    expect(getCachedCustomer('tenant-b', '9876543210')).toBe('Tenant B Customer');

    // Non-existent in tenant-c
    expect(getCachedCustomer('tenant-c', '9876543210')).toBe(null);
  });

  it('updates cache dynamically via setCachedCustomer', () => {
    setCachedCustomer('rest-1', '9123456789', 'Charlie Brown');
    expect(getCachedCustomer('rest-1', '9123456789')).toBe('Charlie Brown');
  });

  it('clears specific tenant cache or all on logout', () => {
    setCachedCustomer('rest-1', '9876543210', 'Alice');
    setCachedCustomer('rest-2', '9876543210', 'Bob');

    // Clear single restaurant
    clearCustomerCache('rest-1');
    expect(getCachedCustomer('rest-1', '9876543210')).toBe(null);
    expect(getCachedCustomer('rest-2', '9876543210')).toBe('Bob');

    // Clear all (admin logout)
    clearCustomerCache();
    expect(getCachedCustomer('rest-2', '9876543210')).toBe(null);
    expect(getCustomerCacheSize('rest-2')).toBe(0);
  });
});

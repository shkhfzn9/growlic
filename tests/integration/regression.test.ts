import { describe, it, expect, beforeAll, vi } from 'vitest';
import { seedTestDatabase } from '../seed';
import * as orderService from '@/features/order/service';
import * as menuService from '@/features/menu/services/menuService';
import * as customerRepo from '@/features/customer/repository';
import * as authService from '@/features/auth/service';
import Order from '@/features/order/model';
import dbConnect from '@/lib/mongodb';

describe('COMPREHENSIVE QA & ADVERSARIAL REGRESSION SUITE', () => {
  let seededData: any;

  beforeAll(async () => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/growlic_test';
    seededData = await seedTestDatabase();
  });

  // 1. RESTORED ORIGINAL TEST-06: Case Sensitivity Normalization (MUST FAIL ON BUGGY APP CODE)
  it('TEST-06: Case Sensitivity Normalization - getAdminOrders("Tokyo-Momos"), ("tokyo-momos"), (" TOKYO-MOMOS ")', async () => {
    await orderService.createOrder({
      restaurantId: ' TOKYO-MOMOS ',
      customerName: 'Case Normalization Client',
      customerPhone: '9111111111',
      items: [{ menuItemId: seededData.menuTokyo._id.toString(), name: 'Momo', price: 100, quantity: 1 }],
      subtotal: 100,
      total: 100,
    });

    const ordersTokyo = await orderService.getAdminOrders('Tokyo-Momos');
    const ordersLower = await orderService.getAdminOrders('tokyo-momos');
    const ordersSpaced = await orderService.getAdminOrders(' TOKYO-MOMOS ');

    // Correct behavior: All 3 calls MUST return the exact same normalized order list.
    expect(ordersLower.orders.length).toBeGreaterThan(0);
    expect(ordersTokyo.orders.length).toBe(ordersLower.orders.length);
    expect(ordersSpaced.orders.length).toBe(ordersLower.orders.length);
  });

  // 2. REWRITTEN TEST-13: Price Tampering, Quantity Validation & Cross-Tenant Items (MUST FAIL ON BUGGY APP CODE)
  it('TEST-13a: Server-side Price Recomputation - Client-tampered item price must be rejected', async () => {
    const tamperedPayload = {
      restaurantId: 'tenant-a',
      customerName: 'Price Tamperer',
      customerPhone: '9777766665',
      items: [{ menuItemId: seededData.menuA._id.toString(), name: 'Hair Cut', price: 1, quantity: 1 }], // Actual price is 500
      subtotal: 1,
      total: 1,
    };

    // Correct behavior: Server must recompute total from DB price (500) or reject tampered price payload.
    const order = await orderService.createOrder(tamperedPayload);
    expect(order.total).toBe(500);
  });

  it('TEST-13b: Quantity Validation - Negative quantity (-1) must be rejected', async () => {
    const negativeQtyPayload = {
      restaurantId: 'tenant-a',
      customerName: 'Negative Qty User',
      customerPhone: '9777766666',
      items: [{ menuItemId: seededData.menuA._id.toString(), name: 'Hair Cut', price: 500, quantity: -1 }],
      subtotal: -500,
      total: -500,
    };

    // Correct behavior: Must reject negative quantity.
    await expect(orderService.createOrder(negativeQtyPayload)).rejects.toThrow();
  });

  it('TEST-13c: Cross-Tenant Items - Order for Tenant A cannot contain Tenant B menu items', async () => {
    const crossTenantItemPayload = {
      restaurantId: 'tenant-a',
      customerName: 'Cross Item Buyer',
      customerPhone: '9777766667',
      items: [{ menuItemId: seededData.menuB._id.toString(), name: 'Chicken Burger', price: 250, quantity: 1 }], // Tenant B item
      subtotal: 250,
      total: 250,
    };

    // Correct behavior: Must reject order containing item from different tenant.
    await expect(orderService.createOrder(crossTenantItemPayload)).rejects.toThrow();
  });

  // 3. ATOMICITY & MOCKED CUSTOMER-STATS FAILURE TEST
  it('TEST-14: Atomicity - Mocked customer-stats failure rolls back order creation (Consistency)', async () => {
    // Seed existing customer record first so updateStats is triggered
    await customerRepo.create({
      restaurantId: 'tenant-a',
      name: 'Atomicity Test User',
      phone: '9888811111',
      totalOrders: 1,
      totalSpent: 100,
    });

    const spy = vi.spyOn(customerRepo, 'incrementCustomerStats').mockRejectedValueOnce(new Error('Simulated DB Stats Failure'));

    const orderPayload = {
      restaurantId: 'tenant-a',
      customerName: 'Atomicity Test User',
      customerPhone: '9888811111',
      items: [{ menuItemId: seededData.menuA._id.toString(), name: 'Hair Cut', price: 500, quantity: 1 }],
      subtotal: 500,
      total: 500,
    };

    // Attempt creation with failing stats update - MUST reject and roll back
    await expect(orderService.createOrder(orderPayload)).rejects.toThrow('Simulated DB Stats Failure');

    // Verify consistency: Customer stats remain unchanged (100) and no order was committed
    const customer = await customerRepo.findByPhone('tenant-a', '9888811111');
    expect(customer?.totalSpent).toBe(100);

    const createdOrderInDb = await Order.findOne({ customerPhone: '9888811111' });
    expect(createdOrderInDb).toBeNull();
    spy.mockRestore();
  });

  // 4. NOSQL INJECTION ATTEMPT IN LOGIN
  it('TEST-15: NoSQL Injection in Login - Payload with {"$ne": null}', async () => {
    await expect(
      authService.authenticateAdmin('tenant_a@test.com', { '$ne': null } as any)
    ).rejects.toThrow();
  });

  // 5. EXISTING PASSED INTEGRATION TESTS
  it('TEST-04: DB Index Verification - Inspect raw listIndexes() output for activeSlotKey', async () => {
    await dbConnect();
    await Order.syncIndexes();
    const indexes = await Order.collection.getIndexes();
    console.log('[RAW INDEXES LOG] Order.collection.getIndexes():', JSON.stringify(indexes, null, 2));

    const hasActiveSlotKeyIndex = Object.keys(indexes).some((k) => k.includes('activeSlotKey'));
    expect(hasActiveSlotKeyIndex).toBe(true);
  });

  it('TEST-01: Double booking 20 parallel requests for same slot/stylist - Exactly 1 succeeds', async () => {
    const bookingPayload = {
      restaurantId: 'tenant-a',
      customerName: 'Parallel Customer',
      customerPhone: '9000000001',
      items: [{ menuItemId: seededData.menuA._id.toString(), name: 'Hair Cut', price: 500, quantity: 1 }],
      subtotal: 500,
      total: 500,
      appointmentDetails: {
        bookingDate: '2026-10-15',
        bookingTime: '02:30 PM',
        specialistName: 'Senior Hair Stylist',
        userNotes: 'Concurrency Test',
      },
    };

    const promises = Array.from({ length: 20 }).map(() =>
      orderService.createOrder(bookingPayload).then(
        (res) => ({ status: 'fulfilled', value: res }),
        (err) => ({ status: 'rejected', reason: err.message })
      )
    );

    const results = await Promise.all(promises);
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    console.log(`[CONCURRENCY LOG] Fulfilled: ${fulfilled.length}, Rejected: ${rejected.length}`);
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(19);
  });

  it('TEST-05: Cross-Tenant Order Isolation (READ) - Tenant A cannot read Tenant B order', async () => {
    const tenantBOrderId = String(seededData.orderB._id);
    const result = await orderService.getOrderById(tenantBOrderId, 'tenant-a');
    expect(result).toBeNull();
  });

  it('TEST-07: Cross-Tenant Order Isolation (WRITE) - Tenant A cannot update Tenant B order status', async () => {
    const tenantBOrderId = String(seededData.orderB._id);
    await expect(
      orderService.updateOrderStatus(tenantBOrderId, 'tenant-a', 'completed')
    ).rejects.toThrow();
  });
});

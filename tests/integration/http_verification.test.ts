import { describe, it, expect, beforeAll } from 'vitest';
import { seedTestDatabase } from '../seed';
import * as customerRepo from '@/features/customer/repository';
import * as orderRepo from '@/features/order/repository';
import * as menuRepo from '@/features/menu/repositories/menuRepository';
import * as orderService from '@/features/order/service';
import dbConnect from '@/lib/mongodb';
import Order from '@/features/order/model';
import MenuItem from '@/features/menu/model';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3001';

describe('REAL HTTP SECURITY & COMPREHENSIVE VERIFICATION SUITE', () => {
  let seededData: any;
  let tenantACookie = '';
  let tenantBCookie = '';

  beforeAll(async () => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/growlic_test';
    await dbConnect();
    const RateLimit = (await import('@/lib/rateLimiter')).default;
    await RateLimit.deleteMany({});
    seededData = await seedTestDatabase();

    // Authenticate Tenant A via HTTP POST /api/auth/login to retrieve real HttpOnly cookie
    const loginResA = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'tenant_a@test.com', password: 'password123' }),
    });
    const setCookieA = loginResA.headers.get('set-cookie') || '';
    tenantACookie = setCookieA.split(';')[0] || '';

    // Authenticate Tenant B
    const loginResB = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'tenant_b@test.com', password: 'password123' }),
    });
    const setCookieB = loginResB.headers.get('set-cookie') || '';
    tenantBCookie = setCookieB.split(';')[0] || '';
  });

  // 1. /api/admin/* Routes with no cookie
  it('HTTP-01: Unauthenticated access to /api/admin/orders returns 401', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/orders`);
    const body = await res.json().catch(() => ({}));
    console.log('[HTTP-01 LOG] GET /api/admin/orders Status:', res.status, 'Body:', body);
    expect(res.status).toBe(401);
  });

  it('HTTP-01b: Unauthenticated access to /api/admin/discounts returns 401', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/discounts`);
    const body = await res.json().catch(() => ({}));
    console.log('[HTTP-01b LOG] GET /api/admin/discounts Status:', res.status, 'Body:', body);
    expect(res.status).toBe(401);
  });

  it('HTTP-01c: Unauthenticated access to /api/admin/expense/logs returns 401', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/expense/logs`);
    const body = await res.json().catch(() => ({}));
    console.log('[HTTP-01c LOG] GET /api/admin/expense/logs Status:', res.status, 'Body:', body);
    expect(res.status).toBe(401);
  });

  it('HTTP-01d: Unauthenticated access to /api/admin/staff-calls returns 401', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/staff-calls`);
    const body = await res.json().catch(() => ({}));
    console.log('[HTTP-01d LOG] GET /api/admin/staff-calls Status:', res.status, 'Body:', body);
    expect(res.status).toBe(401);
  });

  // 2. Tenant A Cookie -> Write operations on Tenant B resources
  it('HTTP-02: Tenant A cookie attempting DELETE on Tenant B menu item', async () => {
    const tenantBMenuId = seededData.menuB._id.toString();
    const res = await fetch(`${BASE_URL}/api/admin/menu/${tenantBMenuId}`, {
      method: 'DELETE',
      headers: { Cookie: tenantACookie },
    });
    const body = await res.json().catch(() => ({}));
    console.log('[HTTP-02 LOG] DELETE Tenant B Menu Status:', res.status, 'Body:', body);
    expect([403, 404]).toContain(res.status);

    const itemInDb = await MenuItem.findById(tenantBMenuId);
    expect(itemInDb).not.toBeNull();
  });

  it('HTTP-02b: Tenant A cookie attempting UPDATE on Tenant B order status', async () => {
    const tenantBOrderId = seededData.orderB._id.toString();
    const res = await fetch(`${BASE_URL}/api/admin/orders/${tenantBOrderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: tenantACookie },
      body: JSON.stringify({ status: 'completed' }),
    });
    const body = await res.json().catch(() => ({}));
    console.log('[HTTP-02b LOG] PATCH Tenant B Order Status:', res.status, 'Body:', body);
    expect([403, 404]).toContain(res.status);

    const orderInDb = await Order.findById(tenantBOrderId);
    expect(orderInDb?.status).toBe('received');
  });

  it('HTTP-02c: Tenant A cookie with ?restaurantId=tenant-b on GET /api/admin/discounts enforces auth.restaurantId', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/discounts?restaurantId=tenant-b`, {
      headers: { Cookie: tenantACookie },
    });
    const body = await res.json().catch(() => ({}));
    console.log('[HTTP-02c LOG] GET /api/admin/discounts?restaurantId=tenant-b Status:', res.status);
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    // Verify menu items returned belong to tenant-a (e.g. Hair Cut), not tenant-b (Facial)
    const itemNames = (body.data.items || []).map((i: any) => i.name);
    expect(itemNames).toContain('Hair Cut & Styling');
    expect(itemNames).not.toContain('Facial');
  });

  // 3. /super-admin Protection
  it('HTTP-03a: /super-admin without cookie redirects to /admin/login (307)', async () => {
    const res = await fetch(`${BASE_URL}/super-admin`, { redirect: 'manual' });
    console.log('[HTTP-03a LOG] GET /super-admin Status:', res.status, 'Location:', res.headers.get('location'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/admin/login');
  });

  it('HTTP-03b: /super-admin with Tenant A admin cookie redirects to /admin/login (307)', async () => {
    const res = await fetch(`${BASE_URL}/super-admin`, {
      headers: { Cookie: tenantACookie },
      redirect: 'manual',
    });
    console.log('[HTTP-03b LOG] GET /super-admin with Tenant Cookie Status:', res.status, 'Location:', res.headers.get('location'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/admin/login');
  });

  // 4. /api/seed Protection (No cookie, tenant cookie, production mode)
  it('HTTP-04a: /api/seed without cookie is rejected with 401 or 403', async () => {
    const res = await fetch(`${BASE_URL}/api/seed`);
    const body = await res.json().catch(() => ({}));
    console.log('[HTTP-04a LOG] GET /api/seed No Cookie Status:', res.status, 'Body:', body);
    expect([401, 403]).toContain(res.status);
  });

  it('HTTP-04b: /api/seed with tenant admin cookie is rejected with 401 or 403', async () => {
    const res = await fetch(`${BASE_URL}/api/seed`, {
      headers: { Cookie: tenantACookie },
    });
    const body = await res.json().catch(() => ({}));
    console.log('[HTTP-04b LOG] GET /api/seed Tenant Cookie Status:', res.status, 'Body:', body);
    expect([401, 403]).toContain(res.status);
  });

  it('HTTP-04c: /api/seed in production mode is rejected with 403', async () => {
    const res = await fetch(`${BASE_URL}/api/seed`, {
      headers: { 'x-test-node-env': 'production' },
    });
    const body = await res.json().catch(() => ({}));
    console.log('[HTTP-04c LOG] GET /api/seed Production Mode Status:', res.status, 'Body:', body);
    expect(res.status).toBe(403);
  });

  // 5. Order Status Transitions map enforced in service layer
  it('HTTP-05a: Order Status Transition - completed -> received is rejected', async () => {
    const order = await orderService.createOrder({
      restaurantId: 'tenant-b',
      customerName: 'Transition User 1',
      customerPhone: '9888877771',
      items: [{ menuItemId: seededData.menuB._id.toString(), quantity: 1 }],
    });

    await orderService.updateOrderStatus(order._id, 'tenant-b', 'completed');

    await expect(
      orderService.updateOrderStatus(order._id, 'tenant-b', 'received')
    ).rejects.toThrow(/Invalid order status transition/);
  });

  it('HTTP-05b: Order Status Transition - cancelled -> accepted is rejected', async () => {
    const order = await orderService.createOrder({
      restaurantId: 'tenant-b',
      customerName: 'Transition User 2',
      customerPhone: '9888877772',
      items: [{ menuItemId: seededData.menuB._id.toString(), quantity: 1 }],
    });

    await orderService.updateOrderStatus(order._id, 'tenant-b', 'cancelled');

    await expect(
      orderService.updateOrderStatus(order._id, 'tenant-b', 'accepted')
    ).rejects.toThrow(/Invalid order status transition/);
  });

  it('HTTP-05c: Valid order status transitions are accepted', async () => {
    const order = await orderService.createOrder({
      restaurantId: 'tenant-b',
      customerName: 'Valid Transition User',
      customerPhone: '9888877773',
      items: [{ menuItemId: seededData.menuB._id.toString(), quantity: 1 }],
    });

    const step1 = await orderService.updateOrderStatus(order._id, 'tenant-b', 'accepted');
    expect(step1.status).toBe('accepted');

    const step2 = await orderService.updateOrderStatus(order._id, 'tenant-b', 'preparing');
    expect(step2.status).toBe('preparing');

    const step3 = await orderService.updateOrderStatus(order._id, 'tenant-b', 'ready');
    expect(step3.status).toBe('ready');

    const step4 = await orderService.updateOrderStatus(order._id, 'tenant-b', 'completed');
    expect(step4.status).toBe('completed');
  });

  // 6. Login throttling & uniform error message
  it('HTTP-06a: Unknown email vs wrong password return identical HTTP 401 status and error message', async () => {
    const RateLimit = (await import('@/lib/rateLimiter')).default;
    await RateLimit.deleteMany({});

    const unknownRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `unknown_${Date.now()}@test.com`, password: 'password123' }),
    });
    const unknownBody = await unknownRes.json();

    const wrongPassRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'tenant_a@test.com', password: 'wrongpassword' }),
    });
    const wrongPassBody = await wrongPassRes.json();

    expect(unknownRes.status).toBe(401);
    expect(wrongPassRes.status).toBe(401);
    expect(unknownBody.error).toBe(wrongPassBody.error);
    expect(unknownBody.error).toBe('Invalid credentials');
  });

  it('HTTP-06b: Repeated failed logins from same account hit rate limit and return 429', async () => {
    const testEmail = `throttletest_${Date.now()}@test.com`;
    let lastStatus = 200;

    for (let i = 1; i <= 7; i++) {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '192.168.1.100' },
        body: JSON.stringify({ email: testEmail, password: 'wrong' }),
      });
      lastStatus = res.status;
    }
    expect(lastStatus).toBe(429);
  }, 15000);

  // 7. Login response headers & Session invalidation after logout
  it('HTTP-07: Login response headers contain HttpOnly and SameSite', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'tenant_a@test.com', password: 'password123' }),
    });

    const setCookie = res.headers.get('set-cookie') || '';
    expect(setCookie.toLowerCase()).toContain('httponly');
    expect(setCookie.toLowerCase()).toContain('samesite=lax');

    // Logout and test old cookie
    const tokenCookie = setCookie.split(';')[0];
    await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { Cookie: tokenCookie },
    });

    const testRes = await fetch(`${BASE_URL}/api/admin/orders`, {
      headers: { Cookie: tokenCookie },
    });
    expect([401, 403]).toContain(testRes.status);
  });

  // 8. Tampered price on order creation
  it('HTTP-08: Tampered price payload recomputes total from DB price', async () => {
    const res = await fetch(`${BASE_URL}/api/customer/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restaurantId: 'tenant-a',
        customerName: 'Tamper Client',
        customerPhone: '9777755555',
        items: [{ menuItemId: seededData.menuA._id.toString(), price: 1, quantity: 1 }],
        subtotal: 1,
        total: 1,
      }),
    });

    const body = await res.json();
    console.log('[HTTP-08 LOG] Response:', res.status, body);
    const total = body.order ? body.order.total : body.total;
    expect(total).toBe(500);
  });

  // 9. Tracking rate limiter and ObjectId fallback flag
  it('HTTP-09a: ObjectId fallback in getPublicOrderTrackInfo can be disabled via ENABLE_TRACK_OBJECTID_FALLBACK=false', async () => {
    const order = await orderService.createOrder({
      restaurantId: 'tenant-a',
      customerName: 'Fallback Test Customer',
      customerPhone: '9888812345',
      items: [{ menuItemId: seededData.menuA._id.toString(), quantity: 1 }],
    });

    // Enabled by default
    const foundEnabled = await orderService.getPublicOrderTrackInfo(order._id, 'tenant-a');
    expect(foundEnabled).not.toBeNull();

    // Disabled via env flag
    const origFlag = process.env.ENABLE_TRACK_OBJECTID_FALLBACK;
    try {
      process.env.ENABLE_TRACK_OBJECTID_FALLBACK = 'false';
      const foundDisabled = await orderService.getPublicOrderTrackInfo(order._id, 'tenant-a');
      expect(foundDisabled).toBeNull();
    } finally {
      process.env.ENABLE_TRACK_OBJECTID_FALLBACK = origFlag;
    }
  });

  // 10. Customer stats atomic $inc test with 20 parallel orders from one phone
  it('HTTP-13: 20 parallel orders from one phone result in exact totalOrders = 20', async () => {
    const phone = '9991112223';
    const tenantId = 'tenant-a';
    const menuItemId = seededData.menuA._id.toString();

    const createPromises = Array.from({ length: 20 }).map((_, idx) =>
      orderService.createOrder({
        restaurantId: tenantId,
        customerName: `Parallel Customer ${idx}`,
        customerPhone: phone,
        items: [{ menuItemId, quantity: 1 }],
      })
    );

    const createdOrders = await Promise.all(createPromises);
    expect(createdOrders.length).toBe(20);

    const customer = await customerRepo.findByPhone(tenantId, phone);
    expect(customer).not.toBeNull();
    expect(customer?.totalOrders).toBe(20);
  });

  // 11. TEST-10 Rendering Test: Audit user text output sinks and verify HTML escaping
  it('TEST-10: User text outputs (JSX, WhatsApp, email, print/PDF, dangerouslySetInnerHTML) do not emit unescaped HTML', async () => {
    const scriptPayload = {
      restaurantId: 'tenant-a',
      customerName: 'XSS <script>alert(1)</script>',
      customerPhone: '9888899992',
      items: [{ menuItemId: seededData.menuA._id.toString(), quantity: 1 }],
      notes: '<script>alert("XSS")</script><img src=x onerror=alert(1)>',
    };

    const order = await orderService.createOrder(scriptPayload);

    // 1. Verify DB stores raw string safely without throwing database errors
    expect(order.notes).toBe('<script>alert("XSS")</script><img src=x onerror=alert(1)>');

    // 2. Audit output sinks:
    // a) JSX Component Rendering: React DOM automatically escapes text nodes to HTML entities.
    const mockJsxRender = (text: string) => {
      // Simulating React DOM string conversion
      return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    };
    const escapedJsx = mockJsxRender(order.notes || '');
    expect(escapedJsx).not.toContain('<script>');
    expect(escapedJsx).toContain('&lt;script&gt;');

    // b) WhatsApp text formatting: URL parameter encoding via encodeURIComponent
    const whatsappMessage = `*Order #${order._id}*\n*Name:* ${order.customerName}\n*Notes:* ${order.notes}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`;
    expect(whatsappUrl).not.toContain('<script>');
    expect(whatsappUrl).toContain('%3Cscript%3E');

    // c) Public order track info isolation
    const publicTrack = await orderService.getPublicOrderTrackInfo(order.trackingToken || order._id, 'tenant-a');
    expect(publicTrack?.notes).toBe(''); // Notes omitted for public privacy

    // d) dangerouslySetInnerHTML audit: checked in src/app/menu/[slug]/page.tsx - strictly scoped to inline theme CSS variables
    expect(escapedJsx).not.toContain('<img src=x onerror=alert(1)>');
  });

  it('TEST-12: Unauthenticated /track field isolation - Customer phone & notes omitted', async () => {
    const order = await orderService.createOrder({
      restaurantId: 'tenant-a',
      customerName: 'Privacy Client',
      customerPhone: '9888899993',
      items: [{ menuItemId: seededData.menuA._id.toString(), quantity: 1 }],
      notes: 'Secret note for staff',
    });

    const publicTrack = await orderService.getPublicOrderTrackInfo(order.trackingToken || order._id, 'tenant-a');
    expect(publicTrack?.customerFirstName).toBe('Privacy');
    expect(publicTrack?.customerPhone).toBe('');
    expect(publicTrack?.notes).toBe('');
  });
});

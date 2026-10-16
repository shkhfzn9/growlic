import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createOrder } from './service';
import * as orderRepo from './repository';
import * as customerRepo from '@/features/customer/repository';
import * as menuRepo from '@/features/menu/repositories/menuRepository';
import * as discountRepo from '@/features/discount/repository';
import { getAdminByRestaurantId } from '@/features/auth';

vi.mock('./repository');
vi.mock('@/features/customer/repository');
vi.mock('@/features/menu/repositories/menuRepository');
vi.mock('@/features/discount/repository');
vi.mock('@/features/auth');
vi.mock('@/lib/send-push', () => ({
  sendNewOrderPush: vi.fn().mockResolvedValue(true),
  sendStaffCallPush: vi.fn().mockResolvedValue(true),
}));

describe('order service - createOrder financial & discount verification', () => {
  const restaurantId = 'tokyo-momos';

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(orderRepo.sanitizeTenantId).mockImplementation((id) => id.trim().toLowerCase());
    vi.mocked(getAdminByRestaurantId).mockResolvedValue({
      _id: 'admin-1',
      restaurantId,
      restaurantName: 'Tokyo Momos',
      maintenanceModeEnabled: false,
      loyaltyEnabled: true,
      discountPercentage: 20,
    } as any);

    vi.mocked(discountRepo.getDiscountSettings).mockResolvedValue({
      restaurantId,
      masterEnabled: true,
      couponsEnabled: true,
      maxDiscountPerOrder: 0,
      allowStacking: true,
    } as any);

    vi.mocked(menuRepo.findByIds).mockResolvedValue([
      {
        _id: 'item-1',
        restaurantId,
        name: 'Steamed Momos',
        price: 200,
        available: true,
        active: true,
      } as any,
      {
        _id: 'item-2',
        restaurantId,
        name: 'Iced Tea',
        price: 100,
        available: true,
        active: true,
      } as any,
    ]);

    vi.mocked(customerRepo.incrementCustomerStats).mockResolvedValue({
      _id: 'cust-1',
      restaurantId,
      name: 'Alice',
      phone: '9876543210',
      totalOrders: 1,
      totalSpent: 300,
      hasPendingDiscount: false,
    } as any);

    vi.mocked(orderRepo.create).mockImplementation(async (data: any) => ({
      _id: 'order-999',
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
  });

  it('calculates full subtotal when no discount is claimed', async () => {
    const order = await createOrder({
      restaurantId,
      customerName: 'Alice',
      customerPhone: '9876543210',
      items: [
        { menuItemId: 'item-1', quantity: 2 }, // 2 * 200 = 400
        { menuItemId: 'item-2', quantity: 1 }, // 1 * 100 = 100
      ],
    });

    expect(order.subtotal).toBe(500);
    expect(order.total).toBe(500);
    expect(order.discount).toBe(0);
    expect(customerRepo.incrementCustomerStats).toHaveBeenCalledWith(
      restaurantId,
      'Alice',
      '9876543210',
      500
    );
  });

  it('preserves discounted total and records discount amount when coupon/discount is applied', async () => {
    vi.mocked(discountRepo.validateCoupon).mockResolvedValue({
      valid: true,
      discountAmount: 100,
      message: 'Coupon applied',
      coupon: { code: 'SAVE100' } as any,
    });
    vi.mocked(discountRepo.incrementCouponUsage).mockResolvedValue(undefined);

    const order = await createOrder({
      restaurantId,
      customerName: 'Alice',
      customerPhone: '9876543210',
      items: [
        { menuItemId: 'item-1', quantity: 2 }, // 400
        { menuItemId: 'item-2', quantity: 1 }, // 100
      ],
      subtotal: 500,
      total: 400, // ₹100 discount claimed
      couponCode: 'SAVE100',
    });

    expect(order.subtotal).toBe(500);
    expect(order.total).toBe(400);
    expect(order.discount).toBe(100);
    expect(order.couponCode).toBe('SAVE100');

    // Customer spent incremented with TRUE paid total
    expect(customerRepo.incrementCustomerStats).toHaveBeenCalledWith(
      restaurantId,
      'Alice',
      '9876543210',
      400
    );
  });

  it('resets customer loyalty pending discount only when discount is applied', async () => {
    vi.mocked(customerRepo.findByPhone).mockResolvedValue({
      _id: 'cust-1',
      restaurantId,
      name: 'Alice',
      phone: '9876543210',
      hasPendingDiscount: true,
    } as any);

    vi.mocked(customerRepo.incrementCustomerStats).mockResolvedValue({
      _id: 'cust-1',
      restaurantId,
      name: 'Alice',
      phone: '9876543210',
      hasPendingDiscount: true,
    } as any);

    // Case A: Discount applied (20% off 500 = 100)
    await createOrder({
      restaurantId,
      customerName: 'Alice',
      customerPhone: '9876543210',
      items: [{ menuItemId: 'item-1', quantity: 2 }, { menuItemId: 'item-2', quantity: 1 }],
      total: 400,
    });

    expect(customerRepo.resetPendingDiscount).toHaveBeenCalledWith(restaurantId, 'cust-1');

    vi.clearAllMocks();
    vi.mocked(orderRepo.sanitizeTenantId).mockImplementation((id) => id.trim().toLowerCase());
    vi.mocked(getAdminByRestaurantId).mockResolvedValue({
      _id: 'admin-1',
      restaurantId,
      maintenanceModeEnabled: false,
      loyaltyEnabled: true,
    } as any);
    vi.mocked(menuRepo.findByIds).mockResolvedValue([
      { _id: 'item-1', restaurantId, name: 'Steamed Momos', price: 200, available: true, active: true } as any,
    ]);
    vi.mocked(customerRepo.incrementCustomerStats).mockResolvedValue({
      _id: 'cust-1',
      hasPendingDiscount: true,
    } as any);
    vi.mocked(orderRepo.create).mockImplementation(async (d: any) => ({ _id: 'o-2', ...d }));

    // Case B: No discount claimed (full price paid), loyalty discount must NOT be wiped
    await createOrder({
      restaurantId,
      customerName: 'Alice',
      customerPhone: '9876543210',
      items: [{ menuItemId: 'item-1', quantity: 1 }],
    });

    expect(customerRepo.resetPendingDiscount).not.toHaveBeenCalled();
  });
});

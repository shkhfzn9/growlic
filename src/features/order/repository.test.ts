import { describe, it, expect, vi, beforeEach } from 'vitest';
import { findAll } from './repository';
import Order from './model';

vi.mock('@/lib/mongodb', () => ({
  default: vi.fn().mockResolvedValue(null),
}));

vi.mock('./model', () => {
  const query = {
    sort: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    then: vi.fn(function (this: any, callback) {
      return Promise.resolve(callback([
        {
          _id: { toString: () => 'order-123' },
          restaurantId: 'cafe-alpha',
          customerName: 'Bob',
          customerPhone: '1111111111',
          tableId: '5',
          items: [],
          subtotal: 100,
          total: 100,
          status: 'received',
          estimatedTime: 0,
          createdAt: '2026-06-20T10:00:00Z',
          updatedAt: '2026-06-20T10:00:00Z',
        }
      ]));
    }),
  };

  return {
    default: {
      countDocuments: vi.fn().mockResolvedValue(100),
      find: vi.fn().mockReturnValue(query),
    }
  };
});

describe('order repository - findAll paginated', () => {
  const restaurantId = 'cafe-alpha';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should compile query without optional skip/limit/status params', async () => {
    const result = await findAll(restaurantId);

    expect(Order.countDocuments).toHaveBeenCalledWith({ restaurantId });
    expect(Order.find).toHaveBeenCalledWith({ restaurantId });
    
    const mockQueryInstance = vi.mocked(Order.find)();
    expect(mockQueryInstance.sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(mockQueryInstance.skip).not.toHaveBeenCalled();
    expect(mockQueryInstance.limit).not.toHaveBeenCalled();

    expect(result.totalCount).toBe(100);
    expect(result.orders.length).toBe(1);
    expect(result.orders[0]._id).toBe('order-123');
    expect(result.orders[0].customerName).toBe('Bob');
  });

  it('should apply limit and skip parameters to Mongoose query builder', async () => {
    await findAll(restaurantId, 10, 20);

    expect(Order.countDocuments).toHaveBeenCalledWith({ restaurantId });
    expect(Order.find).toHaveBeenCalledWith({ restaurantId });

    const mockQueryInstance = vi.mocked(Order.find)();
    expect(mockQueryInstance.skip).toHaveBeenCalledWith(20);
    expect(mockQueryInstance.limit).toHaveBeenCalledWith(10);
  });

  it('should apply status filter query constraint if status !== all', async () => {
    await findAll(restaurantId, 50, 0, 'preparing');

    const expectedQuery = { restaurantId, status: 'preparing' };
    expect(Order.countDocuments).toHaveBeenCalledWith(expectedQuery);
    expect(Order.find).toHaveBeenCalledWith(expectedQuery);

    const mockQueryInstance = vi.mocked(Order.find)();
    expect(mockQueryInstance.skip).toHaveBeenCalledWith(0);
    expect(mockQueryInstance.limit).toHaveBeenCalledWith(50);
  });

  it('should ignore status filter query constraint if status === all', async () => {
    await findAll(restaurantId, 50, 0, 'all');

    const expectedQuery = { restaurantId };
    expect(Order.countDocuments).toHaveBeenCalledWith(expectedQuery);
    expect(Order.find).toHaveBeenCalledWith(expectedQuery);
  });
});

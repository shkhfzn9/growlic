'use server';

import { cookies } from 'next/headers';
import dbConnect from '@/lib/mongodb';
import Order from '@/models/Order';
import Customer from '@/models/Customer';
import { verifyToken } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

async function checkAdminAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;
  if (!token) {
    throw new Error('Unauthorized: No token provided');
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    throw new Error('Unauthorized: Invalid token');
  }

  return decoded;
}

export async function createOrder(data: {
  restaurantId: string;
  customerName: string;
  customerPhone: string;
  items: Array<{
    menuItemId: string;
    name: string;
    price: number;
    quantity: number;
    image?: string;
  }>;
  subtotal: number;
  total: number;
}) {
  try {
    await dbConnect();

    // Create the order
    const order = await Order.create({
      restaurantId: data.restaurantId,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      items: data.items,
      subtotal: data.subtotal,
      total: data.total,
      status: 'received',
    });

    // Check if customer profile exists, if not create, else update total spent & count
    let customer = await Customer.findOne({
      restaurantId: data.restaurantId,
      phone: data.customerPhone.trim(),
    });

    if (customer) {
      customer.totalOrders += 1;
      customer.totalSpent += data.total;
      await customer.save();
    } else {
      customer = await Customer.create({
        restaurantId: data.restaurantId,
        name: data.customerName.trim(),
        phone: data.customerPhone.trim(),
        totalOrders: 1,
        totalSpent: data.total,
      });
    }

    revalidatePath(`/admin/dashboard`);
    revalidatePath(`/admin/orders`);
    return JSON.parse(JSON.stringify(order));
  } catch (error) {
    console.error('Error creating order:', error);
    const message = error instanceof Error ? error.message : 'Failed to place order';
    throw new Error(message);
  }
}

export async function getOrderById(id: string) {
  try {
    await dbConnect();
    const order = await Order.findById(id);
    if (!order) {
      return null;
    }
    return JSON.parse(JSON.stringify(order));
  } catch (error) {
    console.error('Error fetching order by ID:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch order';
    throw new Error(message);
  }
}

export async function getAdminOrders() {
  try {
    const admin = await checkAdminAuth();
    await dbConnect();

    const orders = await Order.find({ restaurantId: admin.restaurantId }).sort({ createdAt: -1 });
    return JSON.parse(JSON.stringify(orders));
  } catch (error) {
    console.error('Error fetching admin orders:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch orders';
    throw new Error(message);
  }
}

export async function updateOrderStatus(id: string, status: string) {
  try {
    const admin = await checkAdminAuth();
    await dbConnect();

    const order = await Order.findById(id);
    if (!order || order.restaurantId !== admin.restaurantId) {
      throw new Error('Unauthorized or order not found');
    }

    order.status = status as 'received' | 'accepted' | 'preparing' | 'ready' | 'completed' | 'cancelled';
    await order.save();

    revalidatePath(`/track/${id}`);
    revalidatePath(`/admin/dashboard`);
    revalidatePath(`/admin/orders`);

    return JSON.parse(JSON.stringify(order));
  } catch (error) {
    console.error('Error updating order status:', error);
    const message = error instanceof Error ? error.message : 'Failed to update order status';
    throw new Error(message);
  }
}

export async function getDashboardMetrics() {
  try {
    const admin = await checkAdminAuth();
    await dbConnect();

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // Orders today
    const ordersTodayCount = await Order.countDocuments({
      restaurantId: admin.restaurantId,
      createdAt: { $gte: startOfToday, $lte: endOfToday },
    });

    // Revenue today
    const ordersToday = await Order.find({
      restaurantId: admin.restaurantId,
      status: { $ne: 'cancelled' },
      createdAt: { $gte: startOfToday, $lte: endOfToday },
    });
    const revenueToday = ordersToday.reduce((sum, order) => sum + order.total, 0);

    // Pending orders count (received, accepted, preparing, ready)
    const pendingOrdersCount = await Order.countDocuments({
      restaurantId: admin.restaurantId,
      status: { $in: ['received', 'accepted', 'preparing', 'ready'] },
    });

    // Total customers
    const totalCustomersCount = await Customer.countDocuments({
      restaurantId: admin.restaurantId,
    });

    // Recent orders table (last 5)
    const recentOrders = await Order.find({ restaurantId: admin.restaurantId })
      .sort({ createdAt: -1 })
      .limit(5);

    return {
      ordersToday: ordersTodayCount,
      revenueToday,
      pendingOrders: pendingOrdersCount,
      customers: totalCustomersCount,
      recentOrders: JSON.parse(JSON.stringify(recentOrders)),
    };
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch dashboard metrics';
    throw new Error(message);
  }
}

export async function updateOrderEstimatedTime(id: string, minutes: number) {
  try {
    const admin = await checkAdminAuth();
    await dbConnect();

    const order = await Order.findById(id);
    if (!order || order.restaurantId !== admin.restaurantId) {
      throw new Error('Unauthorized or order not found');
    }

    order.estimatedTime = minutes;
    order.status = 'accepted'; // Transition to accepted when ETA is set
    await order.save();

    revalidatePath(`/track/${id}`);
    revalidatePath(`/admin/dashboard`);
    revalidatePath(`/admin/orders`);

    return JSON.parse(JSON.stringify(order));
  } catch (error) {
    console.error('Error setting order ETA:', error);
    const message = error instanceof Error ? error.message : 'Failed to update ETA';
    throw new Error(message);
  }
}

import dbConnect from '@/lib/mongodb';
import Admin from '@/features/auth/model';
import Order from '@/features/order/model';
import Customer from '@/features/customer/model';
import MenuItem from '@/features/menu/model';
import bcrypt from 'bcryptjs';

export async function seedTestDatabase() {
  const uri = process.env.TEST_MONGODB_URI || process.env.MONGODB_URI || '';
  
  // Guard 9: Abort unless Mongo URI is localhost AND database name contains 'test'
  if (!uri.includes('localhost') && !uri.includes('127.0.0.1')) {
    throw new Error(`[TEST DB GUARD FAILED] MONGODB_URI "${uri}" must point to localhost.`);
  }
  if (!uri.includes('test')) {
    throw new Error(`[TEST DB GUARD FAILED] MONGODB_URI "${uri}" database name must contain "test". Current URI: ${uri}`);
  }

  await dbConnect();
  await Order.syncIndexes();

  // Clear existing collections in test database
  await Admin.deleteMany({});
  await Order.deleteMany({});
  await Customer.deleteMany({});
  await MenuItem.deleteMany({});

  const passwordHash = await bcrypt.hash('password123', 10);

  // Seed 3 Tenants: tenant-a, tenant-b, and mixed-case Tokyo-Momos with upsert logic to avoid parallel test conflicts
  const tenantA = await Admin.findOneAndUpdate(
    { email: 'tenant_a@test.com' },
    {
      email: 'tenant_a@test.com',
      password: passwordHash,
      restaurantId: 'tenant-a',
      restaurantName: 'Tenant A Salon',
      phone: '9876543210',
      whatsappNumber: '9876543210',
      designation: 'Owner',
      businessCategory: 'salon',
      role: 'owner',
    },
    { upsert: true, new: true }
  );

  const tenantB = await Admin.findOneAndUpdate(
    { email: 'tenant_b@test.com' },
    {
      email: 'tenant_b@test.com',
      password: passwordHash,
      restaurantId: 'tenant-b',
      restaurantName: 'Tenant B Restaurant',
      phone: '9876543211',
      whatsappNumber: '9876543211',
      designation: 'Owner',
      businessCategory: 'restaurant',
      role: 'owner',
    },
    { upsert: true, new: true }
  );

  const tokyoMomos = await Admin.findOneAndUpdate(
    { email: 'tokyo_momos@test.com' },
    {
      email: 'tokyo_momos@test.com',
      password: passwordHash,
      restaurantId: 'tokyo-momos',
      restaurantName: 'Tokyo Momos',
      phone: '9876543212',
      whatsappNumber: '9876543212',
      designation: 'Owner',
      businessCategory: 'restaurant',
      role: 'owner',
    },
    { upsert: true, new: true }
  );

  // Seed Menu Items
  const menuA = await MenuItem.create({
    restaurantId: 'tenant-a',
    name: 'Hair Cut & Styling',
    price: 500,
    category: 'Hair Care',
    available: true,
  });

  const menuB = await MenuItem.create({
    restaurantId: 'tenant-b',
    name: 'Chicken Burger',
    price: 250,
    category: 'Burgers',
    available: true,
  });

  const menuTokyo = await MenuItem.create({
    restaurantId: 'tokyo-momos',
    name: 'Steamed Momo',
    price: 100,
    category: 'Momos',
    available: true,
  });

  // Seed Order for Tenant B (to test cross-tenant access)
  const orderB = await Order.create({
    restaurantId: 'tenant-b',
    customerName: 'Bob TenantB Customer',
    customerPhone: '9998887771',
    items: [{ menuItemId: menuB._id.toString(), name: menuB.name, price: menuB.price, quantity: 1 }],
    subtotal: 250,
    total: 250,
    status: 'received',
  });

  // Seed pre-existing mixed-case legacy customer record for Tokyo-Momos
  await Customer.create({
    restaurantId: 'tokyo-momos',
    name: 'Mixed Case Legacy User',
    phone: '9123456789',
    totalOrders: 3,
    totalSpent: 1200,
  });

  return {
    tenantA: tenantA.toObject(),
    tenantB: tenantB.toObject(),
    tokyoMomos: tokyoMomos.toObject(),
    orderB: orderB.toObject(),
    menuA: menuA.toObject(),
    menuB: menuB.toObject(),
    menuTokyo: menuTokyo.toObject(),
  };
}

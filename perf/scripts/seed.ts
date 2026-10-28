import mongoose from 'mongoose';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PERF_CONFIG } from '../config';

const JWT_SECRET = process.env.JWT_SECRET || 'growlic_super_secret_jwt_key_98765';

// Define Mongoose schemas directly inside the test runner to prevent app runtime side effects
const AdminSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    password: { type: String, required: true },
    restaurantId: { type: String, required: true, unique: true, index: true },
    restaurantName: { type: String, required: true },
    phone: { type: String, required: true },
    whatsappNumber: { type: String, default: '' },
    designation: { type: String, required: true },
    businessCategory: { type: String, default: 'restaurant' },
    role: { type: String, default: 'owner' },
    logoUrl: { type: String, default: '' },
    primaryColor: { type: String, default: '#C0181A' },
    welcomeMessage: { type: String, default: 'Welcome to Tokyo Momos & Ramen!' },
    themePreset: { type: String, default: 'burgundy' },
    themeGradientDark: { type: String, default: '#8B0000' },
    themeGradientDarker: { type: String, default: '#6B0000' },
    themeAccentColor: { type: String, default: '#F5C518' },
    active: { type: Boolean, default: true },
    location: { type: String, default: 'Tokyo' },
    loyaltyEnabled: { type: Boolean, default: true },
    callStaffEnabled: { type: Boolean, default: true },
    stampsRequired: { type: Number, default: 8 },
    discountPercentage: { type: Number, default: 20 },
    maintenanceModeEnabled: { type: Boolean, default: false },
    maintenanceMessage: { type: String, default: 'Kitchen maintenance' },
    maintenanceEstimatedRestore: { type: String, default: '' },
  },
  { timestamps: true }
);

const SessionSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  restaurantId: { type: String, required: true },
  tokenHash: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  revoked: { type: Boolean, default: false },
});
SessionSchema.index({ restaurantId: 1, tokenHash: 1 });

const MenuSchema = new mongoose.Schema(
  {
    restaurantId: { type: String, required: true, index: true },
    category: { type: String, required: true, index: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    image: { type: String, default: '' },
    price: { type: Number, required: true },
    available: { type: Boolean, default: true },
    pairsWithCategories: { type: [String], default: [] },
    active: { type: Boolean, default: true },
    images: { type: [String], default: [] },
    preparation: { type: String, default: '' },
    ingredients: { type: [String], default: [] },
    nutrition: {
      calories: { type: Number, default: 0 },
      protein: { type: Number, default: 0 },
      carbs: { type: Number, default: 0 },
      fat: { type: Number, default: 0 },
    },
    spiceLevel: { type: Number, default: 0 },
    portionSize: { type: String, default: 'Regular' },
    prepTimeMin: { type: Number, default: 5 },
    prepTimeMax: { type: Number, default: 15 },
    chefNote: { type: String, default: '' },
    trackInventory: { type: Boolean, default: false },
    stockQuantity: { type: Number, default: -1 },
    lowStockThreshold: { type: Number, default: 5 },
  },
  { timestamps: true }
);
MenuSchema.index({ restaurantId: 1, category: 1 });

const CustomerSchema = new mongoose.Schema(
  {
    restaurantId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    phone: { type: String, required: true, index: true },
    totalOrders: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    averageOrderValue: { type: Number, default: 0 },
    lastOrderDate: { type: Date, default: null },
    firstOrderDate: { type: Date, default: null },
    favoriteCategory: { type: String, default: 'Ramen' },
    stampCount: { type: Number, default: 0 },
    lastStampDate: { type: Date, default: null },
    hasPendingDiscount: { type: Boolean, default: false },
    totalRedemptions: { type: Number, default: 0 },
  },
  { timestamps: true }
);
CustomerSchema.index({ restaurantId: 1, phone: 1 }, { unique: true });
CustomerSchema.index({ restaurantId: 1, totalSpent: -1 });
CustomerSchema.index({ restaurantId: 1, lastOrderDate: -1 });
CustomerSchema.index({ restaurantId: 1, createdAt: -1 });

const OrderItemSchema = new mongoose.Schema({
  menuItemId: { type: String, required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  image: { type: String, default: '' },
  originatedFromNudge: { type: Boolean, default: false },
  nudgeType: { type: String, default: null },
  nudgeRuleId: { type: String, default: null },
});

const OrderSchema = new mongoose.Schema(
  {
    restaurantId: { type: String, required: true, index: true },
    customerName: { type: String, default: 'Counter Guest' },
    customerPhone: { type: String, required: true, index: true },
    tableId: { type: String, default: null },
    orderType: { type: String, enum: ['dine_in', 'takeaway', 'delivery'], default: 'takeaway' },
    paymentMode: { type: String, enum: ['cash', 'online', 'credit'], default: 'cash' },
    source: { type: String, enum: ['qr_scan', 'admin_counter'], default: 'qr_scan', index: true },
    placed_at: { type: Date, default: Date.now },
    ready_at: { type: Date, default: null },
    prep_duration_seconds: { type: Number, default: null },
    whatsapp_notified: { type: Boolean, default: false },
    whatsapp_notified_at: { type: Date, default: null },
    items: { type: [OrderItemSchema], required: true },
    subtotal: { type: Number, required: true },
    total: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    couponCode: { type: String, default: null },
    status: {
      type: String,
      enum: ['received', 'scheduled', 'accepted', 'confirmed', 'in_progress', 'preparing', 'ready', 'completed', 'cancelled', 'rejected'],
      default: 'received',
      index: true,
    },
    notes: { type: String, default: '' },
    appointmentDetails: { type: Object, default: null },
    activeSlotKey: { type: String, default: null },
    estimatedTime: { type: Number, default: 0 },
    actualPrepTimeMinutes: { type: Number, default: 0 },
    delayMinutes: { type: Number, default: 0 },
    isDelayed: { type: Boolean, default: false, index: true },
    delayReason: { type: String, default: '' },
    rejectionReason: { type: String, default: '' },
    rejectedAt: { type: Date, default: null },
    trackingToken: { type: String, sparse: true, index: true },
  },
  { timestamps: true }
);

OrderSchema.index({ restaurantId: 1, createdAt: -1 });
OrderSchema.index({ restaurantId: 1, status: 1, createdAt: -1 });
OrderSchema.index({ restaurantId: 1, source: 1, createdAt: -1 });
OrderSchema.index({ restaurantId: 1, source: 1, status: 1, createdAt: -1 });
OrderSchema.index({ restaurantId: 1, customerPhone: 1, createdAt: -1 });
OrderSchema.index({ restaurantId: 1, customerPhone: 1, status: 1, createdAt: -1 });
OrderSchema.index({ restaurantId: 1, isDelayed: 1, createdAt: -1 });
OrderSchema.index({ restaurantId: 1, source: 1, isDelayed: 1, createdAt: -1 });

async function seed() {
  console.log('--- STARTING PERFORMANCE TEST SEEDING ---');
  console.log(`Connecting to isolated test DB: ${PERF_CONFIG.testMongoUri}`);

  const conn = await mongoose.connect(PERF_CONFIG.testMongoUri, {
    maxPoolSize: 10,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 5000,
  });

  const Admin = conn.model('Admin', AdminSchema);
  const Session = conn.model('Session', SessionSchema);
  const Menu = conn.model('Menu', MenuSchema);
  const Customer = conn.model('Customer', CustomerSchema);
  const Order = conn.model('Order', OrderSchema);

  // Clear previous test tenant data
  const tenantIds = PERF_CONFIG.tenants.map((t) => t.restaurantId);
  console.log('Purging existing test records for tenants:', tenantIds);
  await Admin.deleteMany({ restaurantId: { $in: tenantIds } });
  await Session.deleteMany({ restaurantId: { $in: tenantIds } });
  await Menu.deleteMany({ restaurantId: { $in: tenantIds } });
  await Customer.deleteMany({ restaurantId: { $in: tenantIds } });
  await Order.deleteMany({ restaurantId: { $in: tenantIds } });

  const categories = [
    'Ramen',
    'Momos & Dumplings',
    'Rice Bowls & Donburi',
    'Appetizers',
    'Drinks & Boba',
    'Desserts',
    'Sides',
    'Combos',
  ];

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  for (const tenant of PERF_CONFIG.tenants) {
    console.log(`\n========================================`);
    console.log(`Seeding Tenant: ${tenant.restaurantName} (${tenant.restaurantId})`);
    console.log(`========================================`);

    // 1. Create Admin
    const hashedPassword = await bcrypt.hash(tenant.password, 10);
    const adminDoc = await Admin.create({
      email: tenant.email,
      password: hashedPassword,
      restaurantId: tenant.restaurantId,
      restaurantName: tenant.restaurantName,
      phone: '+1-555-010-0000',
      whatsappNumber: '+1-555-010-0000',
      designation: 'Managing Owner',
      businessCategory: 'restaurant',
      role: 'owner',
      active: true,
      location: 'Tokyo',
      loyaltyEnabled: true,
      callStaffEnabled: true,
    });

    // 2. Create Valid JWT and Session
    const tokenPayload = {
      email: tenant.email,
      restaurantId: tenant.restaurantId,
      restaurantName: tenant.restaurantName,
      role: 'owner',
    };
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await Session.create({
      userId: adminDoc._id.toString(),
      restaurantId: tenant.restaurantId,
      tokenHash,
      expiresAt: new Date(now + 7 * dayMs),
      revoked: false,
    });
    console.log(`✓ Admin & Session created. Auth Token: Bearer ${token.substring(0, 16)}...`);

    // 3. Seed Menu Items (200 items)
    console.log(`Generating ${PERF_CONFIG.seedVolume.menuItems} menu items...`);
    const menuDocs = [];
    for (let i = 1; i <= PERF_CONFIG.seedVolume.menuItems; i++) {
      const category = categories[i % categories.length];
      const price = 5 + (i % 25) * 1.5;
      menuDocs.push({
        restaurantId: tenant.restaurantId,
        category,
        name: `${category} Item #${i}`,
        description: `Freshly prepared chef specialty ${category} with signature house umami sauce.`,
        price: parseFloat(price.toFixed(2)),
        available: true,
        active: true,
        portionSize: i % 2 === 0 ? 'Regular' : 'Large',
        prepTimeMin: 8,
        prepTimeMax: 18,
        spiceLevel: i % 4,
        nutrition: {
          calories: 350 + (i % 300),
          protein: 15 + (i % 25),
          carbs: 40 + (i % 50),
          fat: 10 + (i % 15),
        },
      });
    }
    const createdMenus = await Menu.insertMany(menuDocs);
    console.log(`✓ Seeded ${createdMenus.length} menu items.`);

    // 4. Seed Customers (3,000 customers)
    console.log(`Generating ${PERF_CONFIG.seedVolume.customers} customer profiles...`);
    const customerDocs = [];
    const customerPhones: { name: string; phone: string }[] = [];

    for (let i = 1; i <= PERF_CONFIG.seedVolume.customers; i++) {
      const phoneNum = `98${String(10000000 + i)}`;
      const name = `Customer ${i} ${tenant.restaurantId.substring(10)}`;
      customerPhones.push({ name, phone: phoneNum });

      const totalOrders = 1 + (i % 15);
      const avgValue = 22 + (i % 30);
      const totalSpent = totalOrders * avgValue;

      customerDocs.push({
        restaurantId: tenant.restaurantId,
        name,
        phone: phoneNum,
        totalOrders,
        totalSpent,
        averageOrderValue: avgValue,
        lastOrderDate: new Date(now - (i % 60) * dayMs),
        firstOrderDate: new Date(now - (60 + (i % 30)) * dayMs),
        favoriteCategory: categories[i % categories.length],
        stampCount: i % 8,
        lastStampDate: new Date(now - (i % 30) * dayMs),
        hasPendingDiscount: i % 5 === 0,
        totalRedemptions: Math.floor(i / 10),
      });
    }
    await Customer.insertMany(customerDocs);
    console.log(`✓ Seeded ${customerDocs.length} customer profiles.`);

    // 5. Seed Orders (20,000 orders)
    console.log(`Generating ${PERF_CONFIG.seedVolume.orders} realistic orders in batches...`);
    const BATCH_SIZE = 4000;
    let seededOrdersCount = 0;

    const statuses = [
      ...Array(92).fill('completed'),
      ...Array(3).fill('ready'),
      ...Array(2).fill('preparing'),
      ...Array(1).fill('received'),
      ...Array(1).fill('cancelled'),
      ...Array(1).fill('rejected'),
    ];

    for (let b = 0; b < PERF_CONFIG.seedVolume.orders; b += BATCH_SIZE) {
      const batchOrderDocs = [];
      const currentBatchSize = Math.min(BATCH_SIZE, PERF_CONFIG.seedVolume.orders - b);

      for (let j = 0; j < currentBatchSize; j++) {
        const orderIndex = b + j;
        const cust = customerPhones[orderIndex % customerPhones.length];
        const status = statuses[orderIndex % statuses.length];
        const isQr = orderIndex % 10 < 6; // 60% QR, 40% Admin Counter
        const source = isQr ? 'qr_scan' : 'admin_counter';
        const orderType = orderIndex % 3 === 0 ? 'dine_in' : 'takeaway';
        const paymentMode = orderIndex % 2 === 0 ? 'cash' : 'online';

        // Stagger over 90 days
        const daysAgo = (orderIndex % 90);
        // Stagger time within peak or service hours (e.g. 12:00 to 21:00)
        const hour = 12 + (orderIndex % 9);
        const minute = orderIndex % 60;
        const orderDate = new Date(now - daysAgo * dayMs);
        orderDate.setHours(hour, minute, 0, 0);

        // Pick 1-4 random menu items
        const numItems = 1 + (orderIndex % 3);
        const orderItems = [];
        let subtotal = 0;

        for (let k = 0; k < numItems; k++) {
          const menuItem = createdMenus[(orderIndex * 3 + k) % createdMenus.length];
          const qty = 1 + (k % 2);
          const itemTotal = menuItem.price * qty;
          subtotal += itemTotal;
          orderItems.push({
            menuItemId: menuItem._id.toString(),
            name: menuItem.name,
            price: menuItem.price,
            quantity: qty,
          });
        }

        const discount = orderIndex % 8 === 0 ? 5 : 0;
        const total = Math.max(0, subtotal - discount);

        const isDelayed = orderIndex % 12 === 0;
        const prepTime = 10 + (orderIndex % 20);
        const actualPrepTime = isDelayed ? prepTime + 8 : prepTime;

        batchOrderDocs.push({
          restaurantId: tenant.restaurantId,
          customerName: cust.name,
          customerPhone: cust.phone,
          tableId: orderType === 'dine_in' ? `T-${1 + (orderIndex % 12)}` : null,
          orderType,
          paymentMode,
          source,
          items: orderItems,
          subtotal: parseFloat(subtotal.toFixed(2)),
          total: parseFloat(total.toFixed(2)),
          discount,
          tax: 0,
          status,
          notes: orderIndex % 5 === 0 ? 'Extra spicy and chopsticks' : '',
          estimatedTime: prepTime,
          actualPrepTimeMinutes: actualPrepTime,
          delayMinutes: isDelayed ? 8 : 0,
          isDelayed,
          delayReason: isDelayed ? 'Kitchen rush' : '',
          placed_at: orderDate,
          ready_at: new Date(orderDate.getTime() + actualPrepTime * 60 * 1000),
          prep_duration_seconds: actualPrepTime * 60,
          trackingToken: `trk_${tenant.restaurantId}_${orderIndex}`,
          createdAt: orderDate,
          updatedAt: new Date(orderDate.getTime() + actualPrepTime * 60 * 1000),
        });
      }

      await Order.insertMany(batchOrderDocs);
      seededOrdersCount += batchOrderDocs.length;
      process.stdout.write(`  Inserted ${seededOrdersCount}/${PERF_CONFIG.seedVolume.orders} orders...\r`);
    }
    console.log(`\n✓ Successfully seeded ${seededOrdersCount} orders for ${tenant.restaurantId}.`);
  }

  // Summary counts verification
  console.log('\n--- VERIFYING SEEDED DATABASE TOTALS ---');
  const totalAdmins = await Admin.countDocuments({ restaurantId: { $in: tenantIds } });
  const totalMenus = await Menu.countDocuments({ restaurantId: { $in: tenantIds } });
  const totalCustomers = await Customer.countDocuments({ restaurantId: { $in: tenantIds } });
  const totalOrders = await Order.countDocuments({ restaurantId: { $in: tenantIds } });

  console.log(`Total Admins: ${totalAdmins}`);
  console.log(`Total Menu Items: ${totalMenus} (Expected: 600)`);
  console.log(`Total Customers: ${totalCustomers} (Expected: 9,000)`);
  console.log(`Total Orders: ${totalOrders} (Expected: 60,000)`);

  await conn.disconnect();
  console.log('--- SEEDING COMPLETED SUCCESSFULLY ---\n');
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});

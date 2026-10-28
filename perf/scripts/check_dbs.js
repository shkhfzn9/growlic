const mongoose = require('mongoose');

async function check() {
  const connDefault = await mongoose.createConnection('mongodb://localhost:27017/growlic').asPromise();
  const connTest = await mongoose.createConnection('mongodb://localhost:27017/growlic_perf_test').asPromise();

  console.log('=== DATABASE: growlic (default) ===');
  const collectionsDefault = await connDefault.db.listCollections().toArray();
  for (const c of collectionsDefault) {
    const count = await connDefault.db.collection(c.name).countDocuments();
    console.log(`- ${c.name}: ${count} docs`);
  }

  console.log('\n=== DATABASE: growlic_perf_test (test DB) ===');
  const collectionsTest = await connTest.db.listCollections().toArray();
  for (const c of collectionsTest) {
    const count = await connTest.db.collection(c.name).countDocuments();
    console.log(`- ${c.name}: ${count} docs`);
  }

  // Check if any test tenant records landed in default DB
  console.log('\n=== CHECKING TEST TENANTS IN DEFAULT DB (growlic) ===');
  const testTenants = ['perf_rest_001', 'perf_rest_002', 'perf_rest_003'];
  for (const t of testTenants) {
    const orders = await connDefault.db.collection('orders').countDocuments({ restaurantId: t });
    const customers = await connDefault.db.collection('customers').countDocuments({ restaurantId: t });
    const menus = await connDefault.db.collection('menus').countDocuments({ restaurantId: t });
    const admins = await connDefault.db.collection('admins').countDocuments({ restaurantId: t });
    console.log(`Tenant ${t}: orders=${orders}, customers=${customers}, menus=${menus}, admins=${admins}`);
  }

  // Also check non-test tenants in default DB
  console.log('\n=== CHECKING NON-TEST TENANTS IN DEFAULT DB (growlic) ===');
  const nonTestAdmins = await connDefault.db.collection('admins').find({ restaurantId: { $nin: testTenants } }).project({ restaurantId: 1, email: 1 }).toArray();
  console.log('Non-test admins in growlic:', nonTestAdmins);

  const nonTestOrders = await connDefault.db.collection('orders').countDocuments({ restaurantId: { $nin: testTenants } });
  console.log('Non-test orders in growlic:', nonTestOrders);

  await connDefault.close();
  await connTest.close();
}

check().catch(console.error);

/**
 * Growlic FCM Backend Integration Test Script
 * 
 * Description:
 * Verifies that:
 * 1. Mongoose database model updates are successfully applied.
 * 2. Next.js environment configuration variables load correctly.
 * 3. Firebase Admin SDK initializes and loads credentials.
 * 4. DB token updates (`updatePushTokens`) function correctly.
 * 
 * How to run:
 * npx tsx src/scripts/test-fcm-integration.ts
 */

import { loadEnvConfig } from '@next/env';

// Load environment variables before importing features
const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function test() {
  console.log('=== GROWLIC FCM BACKEND INTEGRATION TEST ===');

  // 1. Check Env
  console.log('\n[1/4] Checking Environment Variables...');
  const credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  console.log('- GOOGLE_APPLICATION_CREDENTIALS:', credentialPath);
  if (!credentialPath) {
    console.error('❌ Error: GOOGLE_APPLICATION_CREDENTIALS is not defined in .env.local');
    process.exit(1);
  }

  // 2. Database Connection and Model Schema Verification
  console.log('\n[2/4] Connecting to MongoDB and verifying schema...');
  const dbConnect = (await import('../lib/mongodb')).default;
  await dbConnect();
  
  const { Admin } = await import('../features/auth/model');
  const mongooseInstance = require('mongoose');
  console.log('✅ Connected to MongoDB:', mongooseInstance.connection.name);

  // Check if we can find any restaurant/admin record
  const sampleAdmin = await Admin.findOne();
  if (!sampleAdmin) {
    console.warn('⚠️ Warning: No restaurant/admin record found in database to test token update. Seeding a mock admin first...');
    await Admin.create({
      email: 'mock-test-restaurant@growlic.com',
      password: 'MockPassword123!',
      restaurantId: 'mock-test-restaurant',
      restaurantName: 'Mock Test Restaurant',
      phone: '1234567890',
      designation: 'manager',
      role: 'manager',
    });
    console.log('✅ Mock admin seeded.');
  }

  // Retrieve restaurant ID to use
  const targetAdmin = await Admin.findOne() as any;
  const targetId = targetAdmin.restaurantId;
  console.log('Target Restaurant for Token Update:', targetId);

  // 3. Test Token Update helper
  console.log('\n[3/4] Testing token registration update helper...');
  const { updatePushTokens } = await import('../features/auth/service');
  
  const testPushToken = 'ExponentPushToken[mock-test-token]';
  const testFcmToken = 'fcm-mock-test-token';
  
  const updated = await updatePushTokens(targetId, testPushToken, testFcmToken);
  if (updated && updated.expoPushToken === testPushToken && updated.fcmToken === testFcmToken) {
    console.log('✅ DB Update Succeeded. Normalizer returned updated values:');
    console.log('  - expoPushToken:', updated.expoPushToken);
    console.log('  - fcmToken:', updated.fcmToken);
  } else {
    console.error('❌ DB Update Failed or values did not match.');
    process.exit(1);
  }

  // Clean up if we used mock-test-restaurant
  if (targetId === 'mock-test-restaurant') {
    await Admin.deleteOne({ restaurantId: 'mock-test-restaurant' });
    console.log('🧹 Cleaned up mock-test-restaurant from DB.');
  }

  // 4. Test Firebase Admin SDK & FCM Module Loading
  console.log('\n[4/4] Verifying Firebase Admin SDK initialization...');
  try {
    const { fcm } = await import('../lib/firebase-admin');
    console.log('✅ Firebase Messaging (fcm) initialized successfully!');
    
    // Output sample payload structure for orders
    const { sendNewOrderPush } = await import('../lib/send-push');
    console.log('✅ sendNewOrderPush function successfully imported.');
    
    console.log('\n=== INTEGRATION TEST COMPLETED SUCCESSFULLY ===');
    console.log('The backend code compiles, environment variable resolves, Mongoose updates successfully, and Firebase SDK is functional.');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Firebase SDK Initialization Error:', error.message || error);
    process.exit(1);
  }
}

test().catch((err) => {
  console.error('Test suite failed with unexpected error:', err);
  process.exit(1);
});

import { loadEnvConfig } from '@next/env';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function run() {
  console.log('=== GROWLIC FCM DIAGNOSTIC TOOL ===\n');

  // 1. Connect database
  console.log('[1/3] Connecting to MongoDB...');
  const dbConnect = (await import('../lib/mongodb')).default;
  await dbConnect();
  
  const { Admin } = await import('../features/auth/model');
  console.log('✅ Connected to MongoDB.');

  // 2. Fetch admin records
  console.log('\n[2/3] Querying Registered Admin Tokens...');
  const admins = await Admin.find({});
  if (admins.length === 0) {
    console.error('❌ No Admin records found in the database.');
    process.exit(1);
  }

  console.log(`Found ${admins.length} admin record(s):\n`);
  for (const admin of admins) {
    console.log(`Restaurant Name: ${admin.restaurantName}`);
    console.log(`Restaurant ID:   ${admin.restaurantId}`);
    console.log(`Email:           ${admin.email}`);
    console.log(`Expo Push Token: ${admin.expoPushToken || '❌ None (Not registered)'}`);
    console.log(`FCM Token:       ${admin.fcmToken ? admin.fcmToken.substring(0, 30) + '...' : '❌ None (Not registered)'}`);
    console.log('--------------------------------------------------');
  }

  // Find target admin (growlic-demo or first record)
  const target = admins.find(a => a.restaurantId === 'growlic-demo') || admins[0];
  console.log(`\nTargeting "${target.restaurantId}" for test push send.`);

  if (!target.fcmToken) {
    console.error('❌ Cannot send test push: FCM Token is missing from database.');
    console.log('👉 Action Required: Log out of the mobile app and log back in, then re-run this script.');
    process.exit(1);
  }

  // 3. Send test notification
  console.log('\n[3/3] Sending test FCM message...');
  try {
    const { fcm } = await import('../lib/firebase-admin');
    const message = {
      token: target.fcmToken,
      notification: {
        title: 'Diagnostic Test!',
        body: 'FCM push is working correctly!',
      },
      android: {
        priority: 'high' as const,
        notification: {
          channelId: 'orders',
          sound: 'alarm',
        },
      },
      data: {
        channelId: 'orders',
      },
    };

    const response = await fcm.send(message);
    console.log('✅ FCM Send Success! Response:', response);
    console.log('\n👉 If the device did not ring or show a notification:');
    console.log('   - Check if you granted notification permissions on the device.');
    console.log('   - Verify that growlic_mobile/google-services.json matches the Firebase Project of this server.');
  } catch (error: any) {
    console.error('❌ FCM Send Failed.');
    console.error('   Firebase Error:', error.message || error);
    if (error.code === 'messaging/registration-token-not-registered') {
      console.log('\n👉 Action Required: The token is invalid/stale (NotRegistered). Log out and log back in on the mobile app to sync the new token.');
    }
  }
  process.exit(0);
}

run().catch((err) => {
  console.error('Diagnostic failed with error:', err);
  process.exit(1);
});

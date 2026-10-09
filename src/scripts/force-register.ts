import { loadEnvConfig } from '@next/env';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function run() {
  console.log('=== FORCE REGISTER TOKENS ===\n');

  const dbConnect = (await import('../lib/mongodb')).default;
  await dbConnect();
  
  const { Admin } = await import('../features/auth/model');
  console.log('✅ Connected to MongoDB.');

  const targetId = 'tokyo-momos';
  const expoToken = 'ExponentPushToken[AhK1EBEJjOoUTdslA0YdXH]';
  const fcmToken = 'eaTAVBycSe6N3hNNq2QSZj:APA91bF6CDFmjycFDrBximhS8EY-IGPLgw3-ko_Dw2j5HEBiPXFAPAFqU7v3iXI4coKVoRlGEr1L_SU_Bcj132n_ORpslxcwSY0RglGkW3OnLjvpltXWHB4';

  const result = await Admin.findOneAndUpdate(
    { restaurantId: targetId },
    {
      $set: {
        expoPushToken: expoToken,
        fcmToken: fcmToken,
      }
    },
    { new: true }
  );

  if (result) {
    console.log(`✅ Successfully updated tokens for "${targetId}":`);
    console.log(' - expoPushToken:', result.expoPushToken);
    console.log(' - fcmToken:', result.fcmToken);
  } else {
    console.error(`❌ Restaurant "${targetId}" not found in database.`);
  }
  process.exit(0);
}

run().catch((err) => {
  console.error('Failed to force-register tokens:', err);
  process.exit(1);
});

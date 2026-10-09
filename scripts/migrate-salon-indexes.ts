import dbConnect from '../src/lib/mongodb';
import Order from '../src/features/order/model';

export async function migrateSalonIndexes() {
  await dbConnect();

  console.log('[MIGRATION] Checking for pre-existing active salon bookings...');
  const activeBookings = await Order.find({
    status: { $in: ['received', 'accepted', 'preparing', 'ready', 'completed'] },
    'appointmentDetails.bookingDate': { $exists: true, $ne: null },
  });

  const slotMap = new Map<string, string[]>();
  const duplicatesFound: Array<{ key: string; orderIds: string[] }> = [];

  for (const app of activeBookings) {
    const details = app.appointmentDetails;
    if (details?.bookingDate && details?.bookingTime && details?.specialistName) {
      const slotKey = `${app.restaurantId}:${details.bookingDate}:${details.bookingTime}:${details.specialistName.trim().toLowerCase()}`;
      if (!slotMap.has(slotKey)) {
        slotMap.set(slotKey, []);
      }
      slotMap.get(slotKey)!.push(app._id.toString());
    }
  }

  for (const [key, ids] of slotMap.entries()) {
    if (ids.length > 1) {
      duplicatesFound.push({ key, orderIds: ids });
      console.warn(`[MIGRATION DUP WARNING] Duplicate active bookings found for slot "${key}": ${ids.join(', ')}`);
    }
  }

  console.log(`[MIGRATION REPORT] Total active slot keys scanned: ${slotMap.size}, Duplicates found: ${duplicatesFound.length}`);

  // Backfill activeSlotKey for existing non-duplicate active bookings
  for (const [key, ids] of slotMap.entries()) {
    if (ids.length === 1) {
      await Order.updateOne({ _id: ids[0] }, { $set: { activeSlotKey: key } });
    }
  }

  console.log('[MIGRATION] Building activeSlotKey partial unique index on MongoDB...');
  await Order.syncIndexes();
  const indexes = await Order.collection.getIndexes();
  console.log('[MIGRATION SUCCESS] Current MongoDB collection indexes:', JSON.stringify(indexes, null, 2));

  return { duplicatesFound, indexCount: Object.keys(indexes).length };
}

if (require.main === module) {
  migrateSalonIndexes()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[MIGRATION FAILED]:', err);
      process.exit(1);
    });
}

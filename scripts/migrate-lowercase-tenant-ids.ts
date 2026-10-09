import dbConnect from '../src/lib/mongodb';
import mongoose from 'mongoose';

/**
 * Migration Script: Lowercase all existing restaurantId values across all database collections.
 * 
 * Target Collections Touched:
 * 1. admins
 * 2. orders
 * 3. customers
 * 4. menuitems
 * 5. staffcalls
 * 6. discounts
 * 7. expenses
 * 8. sops
 * 9. consultations
 * 10. audits
 * 11. analytics
 */
export async function migrateLowercaseTenantIds() {
  await dbConnect();
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection failed.');
  }

  const collectionsTouched = [
    'admins',
    'orders',
    'customers',
    'menuitems',
    'staffcalls',
    'discounts',
    'expenses',
    'sops',
    'consultations',
    'audits',
    'analytics',
  ];

  const report: Record<string, { totalScanned: number; updatedCount: number }> = {};

  for (const collName of collectionsTouched) {
    const collection = db.collection(collName);
    const docs = await collection.find({ restaurantId: { $exists: true } }).toArray();

    let updatedCount = 0;
    for (const doc of docs) {
      if (doc.restaurantId && typeof doc.restaurantId === 'string') {
        const clean = doc.restaurantId.trim().toLowerCase();
        if (clean !== doc.restaurantId) {
          await collection.updateOne({ _id: doc._id }, { $set: { restaurantId: clean } });
          updatedCount++;
        }
      }
    }

    report[collName] = {
      totalScanned: docs.length,
      updatedCount,
    };
    console.log(`[TENANT ID MIGRATION] Collection "${collName}": Scanned ${docs.length}, Updated ${updatedCount}`);
  }

  return { collectionsTouched, report };
}

if (require.main === module) {
  migrateLowercaseTenantIds()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[TENANT ID MIGRATION FAILED]:', err);
      process.exit(1);
    });
}

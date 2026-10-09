import dbConnect from '../src/lib/mongodb';
import Order from '../src/features/order/model';
import crypto from 'crypto';

export async function backfillTrackingTokens() {
  await dbConnect();
  const ordersWithoutToken = await Order.find({
    $or: [
      { trackingToken: { $exists: false } },
      { trackingToken: null },
      { trackingToken: '' },
    ],
  });

  console.log(`[BACKFILL] Found ${ordersWithoutToken.length} orders missing trackingToken.`);

  let count = 0;
  for (const order of ordersWithoutToken) {
    const token = crypto.randomBytes(16).toString('hex');
    await Order.updateOne({ _id: order._id }, { $set: { trackingToken: token } });
    count++;
  }

  console.log(`[BACKFILL] Successfully updated ${count} orders with new trackingTokens.`);
  return count;
}

if (require.main === module) {
  backfillTrackingTokens()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[BACKFILL ERROR]', err);
      process.exit(1);
    });
}

import mongoose, { Schema, Document, Model } from 'mongoose';
import dbConnect from '@/lib/mongodb';

export interface IRateLimitDocument extends Document {
  key: string;
  hits: number;
  resetAt: Date;
  expiresAt: Date;
}

const RateLimitSchema: Schema = new Schema<IRateLimitDocument>(
  {
    key: { type: String, required: true, unique: true, index: true },
    hits: { type: Number, default: 0 },
    resetAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

RateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

if (process.env.NODE_ENV === 'development') {
  delete mongoose.models.RateLimit;
}

const RateLimit: Model<IRateLimitDocument> =
  mongoose.models.RateLimit || mongoose.model<IRateLimitDocument>('RateLimit', RateLimitSchema);

export async function checkAndIncrementRateLimit(
  key: string,
  maxHits: number,
  windowSeconds: number
): Promise<{ allowed: boolean; currentHits: number; resetAt: Date }> {
  await dbConnect();
  const now = new Date();

  let doc = await RateLimit.findOne({ key });
  if (!doc || doc.resetAt <= now) {
    const newResetAt = new Date(now.getTime() + windowSeconds * 1000);
    doc = await RateLimit.findOneAndUpdate(
      { key },
      {
        $set: { hits: 1, resetAt: newResetAt, expiresAt: newResetAt },
      },
      { returnDocument: 'after', upsert: true }
    );
  } else {
    doc = await RateLimit.findOneAndUpdate(
      { key },
      { $inc: { hits: 1 } },
      { returnDocument: 'after' }
    ) || doc;
  }

  const hits = doc ? doc.hits : 1;
  const reset = doc ? doc.resetAt : now;
  const allowed = hits <= maxHits;
  return { allowed, currentHits: hits, resetAt: reset };
}

export async function clearRateLimit(key: string): Promise<void> {
  await dbConnect();
  await RateLimit.deleteOne({ key });
}

export default RateLimit;

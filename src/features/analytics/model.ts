import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IEventDocument extends Document {
  restaurantId: string;
  type: 'modal_open' | 'cart_create' | 'nudge_show';
  itemId?: string;
  nudgeType?: string;
  createdAt: Date;
}

const EventSchema: Schema = new Schema<IEventDocument>(
  {
    restaurantId: { type: String, required: true, index: true },
    type: { type: String, required: true, enum: ['modal_open', 'cart_create', 'nudge_show'], index: true },
    itemId: { type: String, default: '' },
    nudgeType: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now, index: true },
  }
);

EventSchema.index({ restaurantId: 1, createdAt: -1 });

const Event: Model<IEventDocument> = mongoose.models.Event || mongoose.model<IEventDocument>('Event', EventSchema);

export default Event;

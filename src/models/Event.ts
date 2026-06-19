import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IEvent extends Document {
  restaurantId: string;
  type: 'modal_open' | 'cart_create' | 'nudge_show';
  itemId?: string;
  nudgeType?: string;
  createdAt: Date;
}

const EventSchema: Schema = new Schema<IEvent>(
  {
    restaurantId: { type: String, required: true, index: true },
    type: { type: String, required: true, enum: ['modal_open', 'cart_create', 'nudge_show'], index: true },
    itemId: { type: String, default: '' },
    nudgeType: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now, index: true },
  }
);

const Event: Model<IEvent> = mongoose.models.Event || mongoose.model<IEvent>('Event', EventSchema);

export default Event;

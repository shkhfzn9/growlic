export interface IEvent {
  _id: string;
  restaurantId: string;
  type: 'modal_open' | 'cart_create' | 'nudge_show';
  itemId?: string;
  nudgeType?: string;
  createdAt: string;
}

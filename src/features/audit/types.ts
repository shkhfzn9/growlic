export type AuditAction =
  | 'MENU_PRICE_CHANGED'
  | 'MENU_UPDATED'
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'ORDER_STATUS_CHANGED';

export interface IAuditLog {
  _id: string;
  restaurantId: string;
  userId?: string;
  action: AuditAction;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  before?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  after?: any;
  createdAt: string;
}

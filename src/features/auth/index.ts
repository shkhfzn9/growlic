export {
  authenticateAdmin,
  registerRestaurant,
  getAdminByRestaurantId,
  validateSession,
  revokeSession,
  hasPermission,
  can,
  updateRestaurantBranding,
} from './service';

export type { IAdmin, ISession } from './types';

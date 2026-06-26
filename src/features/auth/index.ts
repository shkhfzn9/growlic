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

// Page Components
export { default as LoginPage } from './components/LoginPage';
export { default as RegisterPage } from './components/RegisterPage';
export { default as SettingsPage } from './components/SettingsPage';
export { default as SuperAdminRestaurantsPage } from './components/SuperAdminRestaurantsPage';

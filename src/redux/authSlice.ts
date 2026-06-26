import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface AuthState {
  token: string | null;
  userRole: 'admin' | null;
  role: string | null;
  isLoggedIn: boolean;
  restaurantId: string | null;
  restaurantName: string | null;
  email: string | null;
}

const initialState: AuthState = {
  token: null,
  userRole: null,
  role: null,
  isLoggedIn: false,
  restaurantId: null,
  restaurantName: null,
  email: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess: (
      state,
      action: PayloadAction<{ token: string; restaurantId: string; restaurantName: string; email: string; role: string }>
    ) => {
      const { token, restaurantId, restaurantName, email, role } = action.payload;
      state.token = token;
      state.restaurantId = restaurantId;
      state.restaurantName = restaurantName;
      state.email = email;
      state.role = role;
      state.userRole = 'admin';
      state.isLoggedIn = true;

      if (typeof window !== 'undefined') {
        localStorage.setItem('admin_token', token);
        localStorage.setItem('admin_restaurant_id', restaurantId);
        localStorage.setItem('admin_restaurant_name', restaurantName);
        localStorage.setItem('admin_email', email);
        localStorage.setItem('admin_role', role);
      }
    },
    logout: (state) => {
      state.token = null;
      state.restaurantId = null;
      state.restaurantName = null;
      state.email = null;
      state.role = null;
      state.userRole = null;
      state.isLoggedIn = false;

      if (typeof window !== 'undefined') {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_restaurant_id');
        localStorage.removeItem('admin_restaurant_name');
        localStorage.removeItem('admin_email');
        localStorage.removeItem('admin_role');
      }
    },
    hydrateAuth: (state) => {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('admin_token');
        const restaurantId = localStorage.getItem('admin_restaurant_id');
        const restaurantName = localStorage.getItem('admin_restaurant_name');
        const email = localStorage.getItem('admin_email');
        const role = localStorage.getItem('admin_role');

        if (token && restaurantId && restaurantName) {
          state.token = token;
          state.restaurantId = restaurantId;
          state.restaurantName = restaurantName;
          state.email = email;
          state.role = role || 'restaurant_admin';
          state.userRole = 'admin';
          state.isLoggedIn = true;
        }
      }
    },
  },
});

export const { loginSuccess, logout, hydrateAuth } = authSlice.actions;
export default authSlice.reducer;

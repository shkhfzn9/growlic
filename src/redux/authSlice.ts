import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface AuthState {
  token: string | null;
  userRole: 'admin' | null;
  isLoggedIn: boolean;
  restaurantId: string | null;
  restaurantName: string | null;
  email: string | null;
}

const initialState: AuthState = {
  token: null,
  userRole: null,
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
      action: PayloadAction<{ token: string; restaurantId: string; restaurantName: string; email: string }>
    ) => {
      const { token, restaurantId, restaurantName, email } = action.payload;
      state.token = token;
      state.restaurantId = restaurantId;
      state.restaurantName = restaurantName;
      state.email = email;
      state.userRole = 'admin';
      state.isLoggedIn = true;

      if (typeof window !== 'undefined') {
        localStorage.setItem('admin_token', token);
        localStorage.setItem('admin_restaurant_id', restaurantId);
        localStorage.setItem('admin_restaurant_name', restaurantName);
        localStorage.setItem('admin_email', email);
      }
    },
    logout: (state) => {
      state.token = null;
      state.restaurantId = null;
      state.restaurantName = null;
      state.email = null;
      state.userRole = null;
      state.isLoggedIn = false;

      if (typeof window !== 'undefined') {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_restaurant_id');
        localStorage.removeItem('admin_restaurant_name');
        localStorage.removeItem('admin_email');
      }
    },
    hydrateAuth: (state) => {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('admin_token');
        const restaurantId = localStorage.getItem('admin_restaurant_id');
        const restaurantName = localStorage.getItem('admin_restaurant_name');
        const email = localStorage.getItem('admin_email');

        if (token && restaurantId && restaurantName) {
          state.token = token;
          state.restaurantId = restaurantId;
          state.restaurantName = restaurantName;
          state.email = email;
          state.userRole = 'admin';
          state.isLoggedIn = true;
        }
      }
    },
  },
});

export const { loginSuccess, logout, hydrateAuth } = authSlice.actions;
export default authSlice.reducer;

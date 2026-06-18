import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type OrderStatus = 'received' | 'accepted' | 'preparing' | 'ready' | 'completed' | 'cancelled';

export interface OrderState {
  currentOrder: {
    _id: string;
    restaurantId: string;
    customerName: string;
    customerPhone: string;
    items: Array<{
      menuItemId: string;
      name: string;
      price: number;
      quantity: number;
      image?: string;
    }>;
    subtotal: number;
    total: number;
    status: OrderStatus;
    createdAt: string;
  } | null;
  loading: boolean;
  error: string | null;
}

const initialState: OrderState = {
  currentOrder: null,
  loading: false,
  error: null,
};

const orderSlice = createSlice({
  name: 'order',
  initialState,
  reducers: {
    setCurrentOrder: (state, action: PayloadAction<OrderState['currentOrder']>) => {
      state.currentOrder = action.payload;
      if (typeof window !== 'undefined' && action.payload) {
        localStorage.setItem('last_order_id', action.payload._id);
      }
    },
    updateOrderStatusState: (state, action: PayloadAction<OrderStatus>) => {
      if (state.currentOrder) {
        state.currentOrder.status = action.payload;
      }
    },
    setOrderLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setOrderError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearOrder: (state) => {
      state.currentOrder = null;
      if (typeof window !== 'undefined') {
        localStorage.removeItem('last_order_id');
      }
    },
  },
});

export const { setCurrentOrder, updateOrderStatusState, setOrderLoading, setOrderError, clearOrder } =
  orderSlice.actions;
export default orderSlice.reducer;

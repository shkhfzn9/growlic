import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  category: string;
  originatedFromNudge?: boolean;
  nudgeType?: 'cross_sell' | 'threshold_discount' | 'combo_freebie';
  nudgeRuleId?: string;
}

export interface CartState {
  items: CartItem[];
  subtotal: number;
  total: number;
  restaurantId: string | null;
  restaurantName: string | null;
  tableId?: string | null;
}

const initialState: CartState = {
  items: [],
  subtotal: 0,
  total: 0,
  restaurantId: null,
  restaurantName: null,
  tableId: null,
};

const calculateTotals = (state: CartState) => {
  state.subtotal = state.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  state.total = state.subtotal; // MVP order totals match subtotal
};

const persistCartToStorage = (state: CartState) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('qr_cart', JSON.stringify({
      items: state.items,
      restaurantId: state.restaurantId,
      restaurantName: state.restaurantName,
      tableId: state.tableId,
    }));
  }
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addItem: (state, action: PayloadAction<{ item: Omit<CartItem, 'quantity'>; restaurantId: string; restaurantName: string }>) => {
      const { item, restaurantId, restaurantName } = action.payload;
      
      // If adding item from a different restaurant, clear previous cart
      if (state.restaurantId && state.restaurantId !== restaurantId) {
        state.items = [];
      }
      
      state.restaurantId = restaurantId;
      state.restaurantName = restaurantName;

      const existingItem = state.items.find((i) => i.id === item.id);
      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        state.items.push({ ...item, quantity: 1 });
      }

      calculateTotals(state);
      persistCartToStorage(state);
    },
    removeItem: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((item) => item.id !== action.payload);
      calculateTotals(state);
      persistCartToStorage(state);
    },
    updateQuantity: (
      state,
      action: PayloadAction<{ id: string; quantity: number }>
    ) => {
      const { id, quantity } = action.payload;
      const existingItem = state.items.find((item) => item.id === id);
      
      if (existingItem) {
        if (quantity <= 0) {
          state.items = state.items.filter((item) => item.id !== id);
        } else {
          existingItem.quantity = quantity;
        }
      }

      calculateTotals(state);
      persistCartToStorage(state);
    },
    clearCart: (state) => {
      state.items = [];
      state.subtotal = 0;
      state.total = 0;
      state.restaurantId = null;
      state.restaurantName = null;
      persistCartToStorage(state);
    },
    setTableId: (state, action: PayloadAction<string | null>) => {
      state.tableId = action.payload;
      persistCartToStorage(state);
    },
    hydrateCart: (state) => {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('qr_cart');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (parsed.items && Array.isArray(parsed.items)) {
              state.items = parsed.items;
              state.restaurantId = parsed.restaurantId || null;
              state.restaurantName = parsed.restaurantName || null;
              state.tableId = parsed.tableId || null;
              calculateTotals(state);
            }
          } catch (e) {
            console.error('Error hydrating cart from storage', e);
          }
        }
      }
    },
  },
});

export const { addItem, removeItem, updateQuantity, clearCart, setTableId, hydrateCart } = cartSlice.actions;
export default cartSlice.reducer;

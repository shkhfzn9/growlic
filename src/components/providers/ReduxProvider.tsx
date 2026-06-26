'use client';

import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { store } from '@/redux/store';
import { hydrateCart } from '@/redux/cartSlice';
import { hydrateAuth } from '@/redux/authSlice';

export function ReduxProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Hydrate state from localStorage safely after client mounts
    store.dispatch(hydrateCart());
    store.dispatch(hydrateAuth());
  }, []);

  return <Provider store={store}>{children}</Provider>;
}

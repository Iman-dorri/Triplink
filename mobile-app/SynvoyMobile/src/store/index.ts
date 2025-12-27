import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import tripsReducer from './slices/tripsSlice';
import alertsReducer from './slices/alertsSlice';
import shoppingReducer from './slices/shoppingSlice';
import connectionsReducer from './slices/connectionsSlice';
import notificationsReducer from './slices/notificationsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    trips: tripsReducer,
    alerts: alertsReducer,
    shopping: shoppingReducer,
    connections: connectionsReducer,
    notifications: notificationsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;





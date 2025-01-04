import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import puzzleReducer from './slices/puzzleSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    puzzle: puzzleReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
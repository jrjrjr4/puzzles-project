import { configureStore } from '@reduxjs/toolkit';
import puzzleReducer from './slices/puzzleSlice';

export const store = configureStore({
  reducer: {
    puzzle: puzzleReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
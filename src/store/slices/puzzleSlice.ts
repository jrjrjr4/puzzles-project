import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { PuzzleState, Puzzle } from '../../types/puzzle';

const initialState: PuzzleState = {
  currentPuzzle: null,
  userRatings: {
    overall: 1200,
    categories: {},
  },
};

const puzzleSlice = createSlice({
  name: 'puzzle',
  initialState,
  reducers: {
    setCurrentPuzzle: (state, action: PayloadAction<Puzzle | null>) => {
      state.currentPuzzle = action.payload;
    },
    updateRatings: (state, action: PayloadAction<PuzzleState['userRatings']>) => {
      state.userRatings = action.payload;
    },
  },
});

export const { setCurrentPuzzle, updateRatings } = puzzleSlice.actions;
export default puzzleSlice.reducer;
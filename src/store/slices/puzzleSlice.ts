import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { PuzzleState, Puzzle } from '../../types/puzzle';

const initialState: PuzzleState = {
  currentPuzzle: null,
  userRatings: {
    overall: 1200,
    categories: {
      'Forks': 1450,      // Strong
      'Pins': 1380,       // Strong
      'Tactics': 1350,    // Strong
      'Defense': 1150,    // Weak
      'Mate in 3': 1100,  // Weak
      'Sacrifice': 1050,  // Weak
      'Skewers': 1200,
      'Endgame': 1200,
      'Mate in 2': 1200,
    },
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
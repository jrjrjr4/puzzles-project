import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface PuzzleState {
  currentPuzzle: null | {
    id: string;
    fen: string;
    moves: string[];
    rating: number;
    category: string;
  };
  userRatings: {
    overall: number;
    categories: Record<string, number>;
  };
}

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
    setCurrentPuzzle: (state, action: PayloadAction<PuzzleState['currentPuzzle']>) => {
      state.currentPuzzle = action.payload;
    },
    updateRatings: (state, action: PayloadAction<PuzzleState['userRatings']>) => {
      state.userRatings = action.payload;
    },
  },
});

export const { setCurrentPuzzle, updateRatings } = puzzleSlice.actions;
export default puzzleSlice.reducer;
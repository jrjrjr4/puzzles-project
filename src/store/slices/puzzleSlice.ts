import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Puzzle } from '../../types/puzzle';
import { calculateNewRating } from '../../utils/ratings';
import { saveUserRatings, saveCurrentPuzzle, addSeenPuzzle, loadUserRatings, loadSeenPuzzles, loadCurrentPuzzle } from '../../utils/persistence';

interface PuzzleState {
  currentPuzzle: Puzzle | null;
  usedPuzzleIds: string[];
  userRatings: {
    overall: {
      rating: number;
      ratingDeviation: number;
    };
    categories: {
      [category: string]: {
        rating: number;
        ratingDeviation: number;
      };
    };
  };
  lastRatingUpdates: {
    overall: {
      oldRating: number;
      newRating: number;
    };
    categories: {
      [category: string]: {
        oldRating: number;
        newRating: number;
      };
    };
  } | null;
}

const initialState: PuzzleState = {
  currentPuzzle: null,
  usedPuzzleIds: [],
  userRatings: {
    overall: {
      rating: 1200,
      ratingDeviation: 350
    },
    categories: {}
  },
  lastRatingUpdates: null
};

export const loadPersistedState = createAsyncThunk(
  'puzzle/loadPersistedState',
  async () => {
    const [ratings, seenPuzzles, currentPuzzle] = await Promise.all([
      loadUserRatings(),
      loadSeenPuzzles(),
      loadCurrentPuzzle()
    ]);
    return {
      ratings,
      seenPuzzles: Array.from(seenPuzzles),
      currentPuzzle
    };
  }
);

export const puzzleSlice = createSlice({
  name: 'puzzle',
  initialState,
  reducers: {
    setCurrentPuzzle: (state, action: PayloadAction<Puzzle | null>) => {
      if (action.payload) {
        const puzzle: Puzzle = {
          ...action.payload,
          rating: Number(action.payload.rating) || 1200,
          ratingDeviation: Number(action.payload.ratingDeviation) || 350,
          themes: action.payload.themes || ['tactics'],
          moves: Array.isArray(action.payload.moves) ? action.payload.moves : [],
          id: String(action.payload.id)
        };
        state.currentPuzzle = puzzle;
        if (!state.usedPuzzleIds.includes(puzzle.id)) {
          state.usedPuzzleIds.push(puzzle.id);
          addSeenPuzzle(puzzle.id);
        }
        saveCurrentPuzzle(puzzle);
      } else {
        state.currentPuzzle = null;
        saveCurrentPuzzle(null);
      }
    },
    updateRatingsAfterPuzzle: (state, action: PayloadAction<{ success: boolean }>) => {
      if (!state.currentPuzzle) return;

      const puzzleRating = Number(state.currentPuzzle.rating) || 1200;
      const puzzleRD = Number(state.currentPuzzle.ratingDeviation) || 350;

      // Update overall rating
      const oldOverallRating = state.userRatings.overall.rating;
      const oldOverallRD = state.userRatings.overall.ratingDeviation;
      const { newRating: newOverallRating, newRD: newOverallRD } = calculateNewRating(
        oldOverallRating,
        oldOverallRD,
        puzzleRating,
        puzzleRD,
        action.payload.success
      );

      // Update category ratings
      const categoryUpdates: { [category: string]: { oldRating: number; newRating: number } } = {};
      state.currentPuzzle.themes.forEach(theme => {
        if (!theme) return;
        
        const oldCategoryRating = state.userRatings.categories[theme]?.rating || 1200;
        const oldCategoryRD = state.userRatings.categories[theme]?.ratingDeviation || 350;
        const { newRating, newRD } = calculateNewRating(
          oldCategoryRating,
          oldCategoryRD,
          puzzleRating,
          puzzleRD,
          action.payload.success
        );

        state.userRatings.categories[theme] = {
          rating: newRating,
          ratingDeviation: newRD
        };

        categoryUpdates[theme] = {
          oldRating: oldCategoryRating,
          newRating: newRating
        };
      });

      // Update state
      state.userRatings.overall.rating = newOverallRating;
      state.userRatings.overall.ratingDeviation = newOverallRD;
      state.lastRatingUpdates = {
        overall: {
          oldRating: oldOverallRating,
          newRating: newOverallRating
        },
        categories: categoryUpdates
      };

      // Persist ratings
      saveUserRatings(state.userRatings);
    }
  },
  extraReducers: (builder) => {
    builder.addCase(loadPersistedState.fulfilled, (state, action) => {
      if (action.payload.ratings) {
        state.userRatings = action.payload.ratings;
      }
      if (action.payload.seenPuzzles) {
        state.usedPuzzleIds = action.payload.seenPuzzles;
      }
      if (action.payload.currentPuzzle) {
        const puzzle = {
          ...action.payload.currentPuzzle,
          rating: Number(action.payload.currentPuzzle.rating) || 1200,
          ratingDeviation: Number(action.payload.currentPuzzle.ratingDeviation) || 350,
          themes: action.payload.currentPuzzle.themes || ['tactics'],
          moves: Array.isArray(action.payload.currentPuzzle.moves) ? action.payload.currentPuzzle.moves : [],
          id: String(action.payload.currentPuzzle.id)
        };
        state.currentPuzzle = puzzle;
      }
    });
  }
});

export const { setCurrentPuzzle, updateRatingsAfterPuzzle } = puzzleSlice.actions;
export default puzzleSlice.reducer;
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { PuzzleState, Puzzle } from '../../types/puzzle';
import { calculateRatingChange, calculateAverageRating, BASE_RD } from '../../utils/ratings';

interface RatingWithDeviation {
  rating: number;
  ratingDeviation: number;
}

interface PuzzleState {
  currentPuzzle: null | {
    id: string;
    fen: string;
    moves: string[];
    rating: number;
    ratingDeviation: number;
    themes: string[];
  };
  userRatings: {
    overall: RatingWithDeviation;
    categories: Record<string, RatingWithDeviation>;
  };
  lastRatingUpdates: {
    overall: RatingUpdate;
    categories: Record<string, RatingUpdate>;
  } | null;
}

const initialState: PuzzleState = {
  currentPuzzle: null,
  userRatings: {
    overall: { rating: 1200, ratingDeviation: BASE_RD },
    categories: {},
  },
  lastRatingUpdates: null,
};

const puzzleSlice = createSlice({
  name: 'puzzle',
  initialState,
  reducers: {
    setCurrentPuzzle: (state, action) => {
      state.currentPuzzle = action.payload;
      state.lastRatingUpdates = null;
    },
    updateRatingsAfterPuzzle: (state, action: PayloadAction<{ success: boolean }>) => {
      if (!state.currentPuzzle) {
        console.log('No current puzzle, skipping rating update');
        return;
      }

      const score = action.payload.success ? 1 : 0;
      console.log('Calculating rating updates with score:', score);
      
      const updates: PuzzleState['lastRatingUpdates'] = {
        overall: calculateRatingChange(
          state.userRatings.overall.rating,
          state.userRatings.overall.ratingDeviation,
          state.currentPuzzle.rating,
          state.currentPuzzle.ratingDeviation,
          score
        ),
        categories: {}
      };

      console.log('Overall rating update:', updates.overall);

      // Update overall rating
      state.userRatings.overall = {
        rating: updates.overall.newRating,
        ratingDeviation: updates.overall.newRD
      };

      // Update category ratings
      state.currentPuzzle.themes.forEach(theme => {
        console.log(`Updating category ${theme}`);
        const categoryRating = state.userRatings.categories[theme] || {
          rating: 1200,
          ratingDeviation: BASE_RD
        };

        const update = calculateRatingChange(
          categoryRating.rating,
          categoryRating.ratingDeviation,
          state.currentPuzzle!.rating,
          state.currentPuzzle!.ratingDeviation,
          score
        );

        state.userRatings.categories[theme] = {
          rating: update.newRating,
          ratingDeviation: update.newRD
        };

        updates.categories[theme] = update;
      });

      state.lastRatingUpdates = updates;
      console.log('Final lastRatingUpdates:', updates);
    }
  }
});

export const { setCurrentPuzzle, updateRatingsAfterPuzzle } = puzzleSlice.actions;
export default puzzleSlice.reducer;
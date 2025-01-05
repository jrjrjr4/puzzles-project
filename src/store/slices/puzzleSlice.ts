import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { PuzzleState, Puzzle } from '../../types/puzzle';
import { calculateRatingChange, calculateAverageRating, BASE_RD } from '../../utils/ratings';
import { themeToCategory } from '../../data/categories';

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
      if (!action.payload) {
        console.warn('Attempted to set null puzzle');
        return;
      }
      
      try {
        state.currentPuzzle = {
          ...action.payload,
          themes: action.payload.themes || ['Tactics'],
          rating: Number(action.payload.rating) || 1200,
          ratingDeviation: Number(action.payload.ratingDeviation) || BASE_RD,
        };
        state.lastRatingUpdates = null;
      } catch (error) {
        console.error('Error setting current puzzle:', error);
        state.currentPuzzle = null;
      }
    },
    updateRatingsAfterPuzzle: (state, action: PayloadAction<{ success: boolean }>) => {
      if (!state.currentPuzzle) {
        console.log('No current puzzle, skipping rating update');
        return;
      }

      try {
        const score = action.payload.success ? 1 : 0;
        
        // Map puzzle themes to our categories
        const themes = state.currentPuzzle.themes
          .map(theme => themeToCategory[theme])
          .filter((theme): theme is string => !!theme);

        // If no mapped themes, use 'Tactics'
        const categoriesToUpdate = themes.length > 0 ? themes : ['Tactics'];

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

        // Update overall rating
        state.userRatings.overall = {
          rating: updates.overall.newRating,
          ratingDeviation: updates.overall.newRD
        };

        // Update category ratings
        categoriesToUpdate.forEach(category => {
          if (!category) return;
          
          const categoryRating = state.userRatings.categories[category] || {
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

          state.userRatings.categories[category] = {
            rating: update.newRating,
            ratingDeviation: update.newRD
          };

          updates.categories[category] = update;
        });

        state.lastRatingUpdates = updates;
      } catch (error) {
        console.error('Error updating ratings:', error);
      }
    }
  }
});

export const { setCurrentPuzzle, updateRatingsAfterPuzzle } = puzzleSlice.actions;
export default puzzleSlice.reducer;
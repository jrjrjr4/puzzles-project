import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Puzzle } from '../../types/puzzle';
import { calculateRatingChange, BASE_RD } from '../../utils/ratings';
import { mapThemeToCategory } from '../../utils/puzzles';

interface RatingWithDeviation {
  rating: number;
  ratingDeviation: number;
}

interface RatingUpdate {
  oldRating: number;
  newRating: number;
  oldRD: number;
  newRD: number;
  change: number;
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
      console.log('Setting current puzzle:', action.payload);
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
        console.log('Current puzzle set to:', state.currentPuzzle);
        state.lastRatingUpdates = null;
      } catch (error) {
        console.error('Error setting current puzzle:', error);
        state.currentPuzzle = null;
      }
    },
    updateRatingsAfterPuzzle: (state, action: PayloadAction<{ success: boolean }>) => {
      console.log('Updating ratings after puzzle. Success:', action.payload.success);
      
      if (!state.currentPuzzle) {
        console.log('No current puzzle, skipping rating update');
        return;
      }

      try {
        const score = action.payload.success ? 1 : 0;
        console.log('Current puzzle themes:', state.currentPuzzle.themes);
        
        // Map puzzle themes to our categories
        const themes = state.currentPuzzle.themes
          .map(theme => mapThemeToCategory(theme))
          .filter((theme): theme is string => theme !== undefined);

        console.log('Mapped themes to categories:', themes);

        const updates: {
          overall: RatingUpdate;
          categories: Record<string, RatingUpdate>;
        } = {
          overall: calculateRatingChange(
            state.userRatings.overall.rating,
            state.userRatings.overall.ratingDeviation,
            state.currentPuzzle.rating,
            state.currentPuzzle.ratingDeviation,
            score
          ),
          categories: {}
        };

        console.log('Overall rating update:', {
          old: state.userRatings.overall.rating,
          new: updates.overall.newRating,
          change: updates.overall.newRating - state.userRatings.overall.rating
        });

        // Update overall rating
        state.userRatings.overall = {
          rating: updates.overall.newRating,
          ratingDeviation: updates.overall.newRD
        };

        // Update category ratings
        themes.forEach(category => {
          console.log(`Processing category: ${category}`);
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

          console.log(`Category ${category} rating update:`, {
            old: categoryRating.rating,
            new: update.newRating,
            change: update.newRating - categoryRating.rating
          });

          state.userRatings.categories[category] = {
            rating: update.newRating,
            ratingDeviation: update.newRD
          };

          updates.categories[category] = update;
        });

        state.lastRatingUpdates = updates;
        console.log('Final rating updates:', updates);

        // Save to localStorage
        console.log('Saving ratings to localStorage:', state.userRatings);
        localStorage.setItem('chess_puzzle_ratings', JSON.stringify(state.userRatings));

      } catch (error) {
        console.error('Error updating ratings:', error);
      }
    }
  }
});

export const { setCurrentPuzzle, updateRatingsAfterPuzzle } = puzzleSlice.actions;
export default puzzleSlice.reducer;
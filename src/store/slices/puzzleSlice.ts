import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Puzzle } from '../../types/puzzle';
import { calculateRatingChange, calculateAverageRating, BASE_RD } from '../../utils/ratings';
import { themeToCategory } from '../../data/categories';
import { supabase } from '../../utils/supabase';

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
    updateRatingsAfterPuzzle: (state, action: PayloadAction<{ success: boolean; userId?: string }>) => {
      console.group('🎯 Updating Ratings After Puzzle');
      console.log('Success:', action.payload.success);
      console.log('User ID:', action.payload.userId || 'anonymous');
      
      if (!state.currentPuzzle) {
        console.warn('⚠️ No current puzzle, skipping rating update');
        console.groupEnd();
        return;
      }

      try {
        const score = action.payload.success ? 1 : 0;
        console.log('Puzzle details:', {
          id: state.currentPuzzle.id,
          rating: state.currentPuzzle.rating,
          themes: state.currentPuzzle.themes
        });
        
        const categoriesToUpdate = state.currentPuzzle.themes.length > 0 
          ? state.currentPuzzle.themes 
          : ['Tactics'];

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
        categoriesToUpdate.forEach(category => {
          if (!category) return;
          
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
        console.log('💾 Saving to localStorage:', state.userRatings);
        localStorage.setItem('chess_puzzle_ratings', JSON.stringify(state.userRatings));

        // If user is logged in, save to Supabase
        if (action.payload.userId) {
          console.log('🔄 Saving to Supabase for user:', action.payload.userId);
          const saveRatings = async () => {
            try {
              const { error } = await supabase
                .from('user_ratings')
                .upsert({
                  user_id: action.payload.userId,
                  ratings: state.userRatings,
                  updated_at: new Date().toISOString()
                });

              if (error) {
                console.error('❌ Error saving ratings to Supabase:', error);
              } else {
                console.log('✅ Successfully saved ratings to Supabase');
              }
            } catch (err) {
              console.error('❌ Error in saveRatings:', err);
            }
          };
          
          saveRatings();
        }

      } catch (error) {
        console.error('❌ Error updating ratings:', error);
      } finally {
        console.groupEnd();
      }
    },
    loadUserRatings: (state, action: PayloadAction<{ ratings: PuzzleState['userRatings'] }>) => {
      console.group('📥 Loading User Ratings');
      console.log('Previous ratings:', state.userRatings);
      console.log('New ratings:', action.payload.ratings);
      state.userRatings = action.payload.ratings;
      console.groupEnd();
    }
  }
});

export const { setCurrentPuzzle, updateRatingsAfterPuzzle, loadUserRatings } = puzzleSlice.actions;
export default puzzleSlice.reducer;

// Add async thunk to load ratings
export const fetchUserRatings = (userId: string) => async (dispatch: any) => {
  console.group('🔄 Fetching User Ratings');
  console.log('Fetching ratings for user:', userId);
  
  try {
    const { data, error } = await supabase
      .from('user_ratings')
      .select('ratings')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('❌ Error fetching user ratings:', error);
      return;
    }

    if (data?.ratings) {
      console.log('✅ Successfully loaded ratings from Supabase:', data.ratings);
      dispatch(loadUserRatings({ ratings: data.ratings }));
    } else {
      console.log('ℹ️ No existing ratings found for user');
    }
  } catch (err) {
    console.error('❌ Error in fetchUserRatings:', err);
  } finally {
    console.groupEnd();
  }
};
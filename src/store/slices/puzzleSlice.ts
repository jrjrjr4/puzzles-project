import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Puzzle } from '../../types/puzzle';
import { calculateRatingChange, calculateAverageRating, BASE_RD } from '../../utils/ratings';
import { themeToCategory } from '../../data/categories';
import { supabase } from '../../utils/supabase';
import { categories } from '../../data/categories';

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
    loaded: boolean;
    overall: RatingWithDeviation | null;
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
    loaded: false,
    overall: null,
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
        state.currentPuzzle = null;
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
    loadLastPuzzle: (state) => {
      // This is now just a placeholder - actual loading happens in the thunk
      console.log('Loading last puzzle from state');
    },
    updateRatingsAfterPuzzle: (state, action: PayloadAction<{ success: boolean; userId?: string }>) => {
      console.group('🎯 Updating Ratings After Puzzle');
      console.log('Success:', action.payload.success);
      console.log('User ID:', action.payload.userId || 'anonymous');
      
      if (!state.currentPuzzle || !state.userRatings.overall) {
        console.warn('⚠️ No current puzzle or ratings not loaded, skipping rating update');
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
        console.log('Final ratings state:', JSON.stringify(state.userRatings, null, 2));

        // Create a deep copy of the ratings for saving
        const ratingsToSave = JSON.parse(JSON.stringify(state.userRatings));

        // Save to localStorage
        try {
          localStorage.setItem('chess_puzzle_ratings', JSON.stringify(ratingsToSave));
          console.log('💾 Successfully saved to localStorage');
        } catch (err) {
          console.error('❌ Failed to save to localStorage:', err);
        }

        // If user is logged in, save to Supabase
        if (action.payload.userId) {
          console.log('🔄 Saving to Supabase for user:', action.payload.userId);
          
          // Create a Promise to handle the async operation
          const saveRatings = async () => {
            try {
              // Check if a record exists first
              const { data: existingData, error: checkError } = await supabase
                .from('user_ratings')
                .select('id')
                .eq('user_id', action.payload.userId)
                .single();

              if (checkError && checkError.code !== 'PGRST116') {
                console.error('❌ Error checking existing record:', checkError);
                return;
              }

              if (existingData) {
                // Update existing record
                console.log('Updating existing record');
                const { error: updateError } = await supabase
                  .from('user_ratings')
                  .update({
                    ratings: ratingsToSave,
                    updated_at: new Date().toISOString()
                  })
                  .eq('user_id', action.payload.userId);

                if (updateError) {
                  console.error('❌ Error updating ratings:', updateError);
                } else {
                  console.log('✅ Successfully updated ratings in Supabase');
                }
              } else {
                // Insert new record
                console.log('Creating new record');
                const { error: insertError } = await supabase
                  .from('user_ratings')
                  .insert({
                    user_id: action.payload.userId,
                    ratings: ratingsToSave,
                    updated_at: new Date().toISOString()
                  });

                if (insertError) {
                  console.error('❌ Error inserting ratings:', insertError);
                } else {
                  console.log('✅ Successfully inserted ratings in Supabase');
                }
              }

              // Verify the save
              const { data: verifyData, error: verifyError } = await supabase
                .from('user_ratings')
                .select('ratings')
                .eq('user_id', action.payload.userId)
                .single();

              if (verifyError) {
                console.error('❌ Error verifying save:', verifyError);
              } else {
                console.log('✅ Verified saved ratings:', verifyData.ratings);
              }
            } catch (err) {
              console.error('❌ Error in saveRatings:', err);
            }
          };

          // Execute the save operation
          saveRatings();
        }

      } catch (error) {
        console.error('❌ Error updating ratings:', error);
      } finally {
        console.groupEnd();
      }
    },
    loadUserRatings: (state, action: PayloadAction<{ ratings: any }>) => {
      console.log('Loading user ratings:', JSON.stringify(action.payload.ratings, null, 2));
      
      // For first-time users or when ratings are empty, set default ratings for all categories
      const defaultRating = {
        rating: 1200,
        ratingDeviation: BASE_RD
      };

      // Get all category names from the categories array
      const allCategories = categories.map((c: { name: string }) => c.name);
      
      // Create a default categories object with 1200 rating for each category
      const defaultCategories: Record<string, RatingWithDeviation> = {};
      allCategories.forEach((category: string) => {
        defaultCategories[category] = { ...defaultRating };
      });

      // Ensure we have valid ratings object with all required properties
      const newRatings = {
        loaded: true,
        overall: action.payload.ratings.overall || defaultRating,
        categories: {
          ...defaultCategories,  // Start with default ratings for all categories
          ...action.payload.ratings.categories  // Override with any existing ratings
        }
      };

      // Update state
      state.userRatings = newRatings;
      
      // Also save to localStorage as backup
      try {
        localStorage.setItem('chess_puzzle_ratings', JSON.stringify(newRatings));
        console.log('✅ Saved ratings to localStorage');
      } catch (err) {
        console.error('❌ Failed to save to localStorage:', err);
      }
      
      console.groupEnd();
    }
  }
});

export const { setCurrentPuzzle, updateRatingsAfterPuzzle, loadUserRatings, loadLastPuzzle } = puzzleSlice.actions;
export default puzzleSlice.reducer;

// Add async thunk to load ratings
export const fetchUserRatings = (userId: string) => async (dispatch: any) => {
  console.group('🔄 Fetching User Ratings');
  console.log('Fetching ratings for user:', userId);
  
  try {
    // First, check if the table exists by trying to get the count
    const { error: tableCheckError } = await supabase
      .from('user_ratings')
      .select('id', { count: 'exact', head: true });

    if (tableCheckError) {
      console.error('❌ Table check error:', {
        message: tableCheckError.message,
        details: tableCheckError.details,
        hint: tableCheckError.hint
      });
      return;
    }

    // Then try to fetch the user's ratings
    const { data, error } = await supabase
      .from('user_ratings')
      .select('ratings')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('❌ Error fetching user ratings:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      
      // If no record exists, create one with default ratings
      if (error.code === 'PGRST116') {
        console.log('Creating initial ratings record for user');
        
        // Create default ratings for all categories
        const defaultRating = { rating: 1200, ratingDeviation: BASE_RD };
        const defaultCategories: Record<string, RatingWithDeviation> = {};
        categories.forEach((c: { name: string }) => {
          defaultCategories[c.name] = { ...defaultRating };
        });

        const defaultRatings = {
          overall: defaultRating,
          categories: defaultCategories
        };
        
        const { error: insertError } = await supabase
          .from('user_ratings')
          .insert({
            user_id: userId,
            ratings: defaultRatings,
            updated_at: new Date().toISOString()
          });

        if (insertError) {
          console.error('❌ Error creating initial ratings:', insertError);
        } else {
          console.log('✅ Created initial ratings');
          dispatch(loadUserRatings({ ratings: defaultRatings }));
        }
      }
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

// Add async thunk to save current puzzle
export const saveCurrentPuzzle = (userId: string, puzzle: PuzzleState['currentPuzzle']) => async () => {
  if (!userId) {
    console.log('No user ID provided, skipping puzzle save');
    return;
  }

  try {
    const { error } = await supabase
      .from('user_current_puzzle')
      .upsert({
        user_id: userId,
        puzzle_data: puzzle,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      console.error('Error saving current puzzle:', error);
    } else {
      console.log('Successfully saved current puzzle');
    }
  } catch (err) {
    console.error('Error in saveCurrentPuzzle:', err);
  }
};

// Add async thunk to fetch last puzzle
export const fetchLastPuzzle = (userId: string) => async (dispatch: any) => {
  if (!userId) {
    console.log('No user ID provided, skipping puzzle fetch');
    return;
  }

  try {
    const { data, error } = await supabase
      .from('user_current_puzzle')
      .select('puzzle_data')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log('No saved puzzle found');
      } else {
        console.error('Error fetching last puzzle:', error);
      }
      return;
    }

    if (data?.puzzle_data) {
      console.log('Restored last puzzle:', data.puzzle_data);
      dispatch(setCurrentPuzzle(data.puzzle_data));
    }
  } catch (err) {
    console.error('Error in fetchLastPuzzle:', err);
  }
};
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Puzzle } from '../../types/puzzle';
import { calculateRatingChange, calculateAverageRating, BASE_RD } from '../../utils/ratings';
import { themeToCategory } from '../../data/categories';
import { supabase } from '../../utils/supabase';
import { categories } from '../../data/categories';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { RootState } from '../../store/store';

interface RatingWithDeviation {
  rating: number;
  ratingDeviation: number;
  attempts: number;
}

interface RatingUpdate {
  oldRating: number;
  newRating: number;
  oldRD: number;
  newRD: number;
  change: number;
  attempts: number;
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
      console.group('🧩 [PuzzleSlice] Setting Current Puzzle');
      console.time('puzzleStateUpdate');
      
      if (!action.payload) {
        console.warn('⚠️ Attempted to set null puzzle');
        state.currentPuzzle = null;
        console.timeEnd('puzzleStateUpdate');
        console.groupEnd();
        return;
      }
      
      try {
        const oldPuzzleId = state.currentPuzzle?.id;
        state.currentPuzzle = {
          ...action.payload,
          themes: action.payload.themes || ['Tactics'],
          rating: Number(action.payload.rating) || 1200,
          ratingDeviation: Number(action.payload.ratingDeviation) || BASE_RD,
        };
        
        if (state.currentPuzzle) {
          console.log('State transition:', {
            from: oldPuzzleId,
            to: state.currentPuzzle.id,
            themes: state.currentPuzzle.themes,
            rating: state.currentPuzzle.rating
          });
        }
        
        state.lastRatingUpdates = null;
        console.timeEnd('puzzleStateUpdate');
      } catch (error) {
        console.error('❌ Error setting current puzzle:', error);
        state.currentPuzzle = null;
      }
      console.groupEnd();
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

        // Initialize overall rating with attempts if not present
        if (!state.userRatings.overall.attempts) {
          state.userRatings.overall.attempts = 0;
        }

        const updates: PuzzleState['lastRatingUpdates'] = {
          overall: calculateRatingChange(
            state.userRatings.overall.rating,
            state.userRatings.overall.ratingDeviation,
            state.currentPuzzle.rating,
            state.currentPuzzle.ratingDeviation,
            score,
            state.userRatings.overall.attempts
          ),
          categories: {}
        };

        console.log('Overall rating update:', {
          old: state.userRatings.overall.rating,
          new: updates.overall.newRating,
          change: updates.overall.newRating - state.userRatings.overall.rating,
          attempts: updates.overall.attempts
        });

        // Update overall rating with attempts
        state.userRatings.overall = {
          rating: updates.overall.newRating,
          ratingDeviation: updates.overall.newRD,
          attempts: updates.overall.attempts
        };

        // Update category ratings with attempts tracking
        categoriesToUpdate.forEach(category => {
          if (!category) return;
          
          console.log(`Processing category: ${category}`);
          
          const categoryRating = state.userRatings.categories[category] || {
            rating: 1600,
            ratingDeviation: BASE_RD,
            attempts: 0
          };

          const update = calculateRatingChange(
            categoryRating.rating,
            categoryRating.ratingDeviation,
            state.currentPuzzle!.rating,
            state.currentPuzzle!.ratingDeviation,
            score,
            categoryRating.attempts
          );

          console.log(`Category ${category} rating update:`, {
            old: categoryRating.rating,
            new: update.newRating,
            change: update.newRating - categoryRating.rating,
            attempts: update.attempts
          });

          state.userRatings.categories[category] = {
            rating: update.newRating,
            ratingDeviation: update.newRD,
            attempts: update.attempts
          };

          updates.categories[category] = update;
        });

        state.lastRatingUpdates = updates;
        console.log('Final ratings state:', JSON.stringify(state.userRatings, null, 2));

        // Create a deep copy of the ratings for saving
        const ratingsToSave = JSON.parse(JSON.stringify(state.userRatings));

        // Save to localStorage
        try {
          // Save to general localStorage for anonymous users
          localStorage.setItem('chess_puzzle_ratings', JSON.stringify(ratingsToSave));
          console.log('💾 Successfully saved to localStorage');
          
          // If this is a guest user, also save to their specific storage
          if (action.payload.userId) {
            // Check if guest and save to specific storage
            const saveGuestRatings = async () => {
              const user = await supabase.auth.getUser();
              if (user.data.user?.user_metadata?.is_guest) {
                localStorage.setItem(`guest_ratings_${action.payload.userId}`, JSON.stringify(ratingsToSave));
                console.log('💾 Successfully saved guest ratings to localStorage');
              }
            };
            saveGuestRatings();
          }
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
      
      // Create default ratings for all categories
      const defaultRating = { rating: 1200, ratingDeviation: BASE_RD, attempts: 0 };
      const defaultCategories: Record<string, RatingWithDeviation> = {};
      categories.forEach((c: { name: string }) => {
        defaultCategories[c.name] = { ...defaultRating };
      });

      const defaultRatings = {
        overall: defaultRating,
        categories: defaultCategories
      };

      // Ensure we have valid ratings object with all required properties
      const newRatings = {
        loaded: true,
        overall: action.payload.ratings.overall || defaultRatings.overall,
        categories: {
          ...defaultRatings.categories,  // Start with default ratings for all categories
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
        const initialRatings = {
          overall: {
            rating: 1600,
            ratingDeviation: BASE_RD,
            attempts: 0
          },
          categories: {}
        };
        
        const { error: insertError } = await supabase
          .from('user_ratings')
          .insert({
            user_id: userId,
            ratings: initialRatings,
            updated_at: new Date().toISOString()
          });

        if (insertError) {
          console.error('❌ Error creating initial ratings:', insertError);
        } else {
          console.log('✅ Created initial ratings');
          dispatch(loadUserRatings({ ratings: initialRatings }));
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
  if (!puzzle) return;

  console.log('Saving current puzzle:', puzzle.id, 'for user:', userId);

  try {
    // Check if this is a guest user
    const { data: { user } } = await supabase.auth.getUser();
    const isGuest = user?.user_metadata?.is_guest;

    if (isGuest) {
      // Save to guest-specific localStorage
      localStorage.setItem(`guest_last_puzzle_${userId}`, JSON.stringify(puzzle));
      console.log('💾 Saved last puzzle to guest localStorage');
      return;
    }

    // First check if record exists
    const { data: existingRecord } = await supabase
      .from('user_progress')
      .select('user_id')
      .eq('user_id', userId)
      .single();

    let error;
    if (existingRecord) {
      // Update existing record
      const { error: updateError } = await supabase
        .from('user_progress')
        .update({
          last_puzzle: puzzle,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);
      error = updateError;
    } else {
      // Insert new record
      const { error: insertError } = await supabase
        .from('user_progress')
        .insert({
          user_id: userId,
          last_puzzle: puzzle,
          updated_at: new Date().toISOString()
        });
      error = insertError;
    }

    if (error) {
      console.error('❌ Error saving current puzzle:', error);
    } else {
      console.log('✅ Successfully saved current puzzle to Supabase');
    }
  } catch (error) {
    console.error('❌ Error in saveCurrentPuzzle:', error);
  }
};

// Add async thunk to fetch last puzzle
export const fetchLastPuzzle = (userId: string) => async (dispatch: any) => {
  console.log('Fetching last puzzle for user:', userId);

  try {
    // Check if this is a guest user
    const { data: { user } } = await supabase.auth.getUser();
    const isGuest = user?.user_metadata?.is_guest;

    if (isGuest) {
      // Try to load from guest-specific localStorage first
      const savedPuzzle = localStorage.getItem(`guest_last_puzzle_${userId}`);
      if (savedPuzzle) {
        const puzzle = JSON.parse(savedPuzzle);
        console.log('📖 Loaded last puzzle from guest localStorage:', puzzle);
        dispatch(setCurrentPuzzle(puzzle));
        return;
      }
    }

    // If not a guest or no saved puzzle, fetch from Supabase
    const { data, error } = await supabase
      .from('user_progress')
      .select('last_puzzle')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('❌ Error fetching last puzzle:', error);
      return;
    }

    if (data?.last_puzzle) {
      console.log('📖 Loaded last puzzle from Supabase:', data.last_puzzle);
      dispatch(setCurrentPuzzle(data.last_puzzle));
    } else {
      console.log('No last puzzle found');
      dispatch(setCurrentPuzzle(null));
    }
  } catch (error) {
    console.error('❌ Error in fetchLastPuzzle:', error);
  }
};

export const updateRatingsAfterPuzzleAsync = createAsyncThunk(
  'puzzle/updateRatingsAfterPuzzleAsync',
  async ({ success, userId }: { success: boolean; userId?: string }, { getState }) => {
    const state = getState() as RootState;
    const currentPuzzle = state.puzzle.currentPuzzle;
    const userRatings = state.puzzle.userRatings;
    const isGuest = state.auth.user?.user_metadata?.is_guest;

    if (!currentPuzzle || !userRatings.overall) {
      console.warn('⚠️ No current puzzle or ratings not loaded, skipping rating update');
      return;
    }

    try {
      const score = success ? 1 : 0;
      console.log('Puzzle details:', {
        id: currentPuzzle.id,
        rating: currentPuzzle.rating,
        themes: currentPuzzle.themes
      });
      
      const categoriesToUpdate = currentPuzzle.themes.length > 0 
        ? currentPuzzle.themes 
        : ['Tactics'];

      const updates: PuzzleState['lastRatingUpdates'] = {
        overall: calculateRatingChange(
          userRatings.overall.rating,
          userRatings.overall.ratingDeviation,
          currentPuzzle.rating,
          currentPuzzle.ratingDeviation,
          score,
          userRatings.overall.attempts
        ),
        categories: {}
      };

      console.log('Overall rating update:', {
        old: userRatings.overall.rating,
        new: updates.overall.newRating,
        change: updates.overall.newRating - userRatings.overall.rating,
        attempts: updates.overall.attempts
      });

      // Update category ratings
      categoriesToUpdate.forEach(category => {
        if (!category) return;
        
        console.log(`Processing category: ${category}`);
        
        const categoryRating = userRatings.categories[category] || {
          rating: 1600,
          ratingDeviation: BASE_RD,
          attempts: 0
        };

        const update = calculateRatingChange(
          categoryRating.rating,
          categoryRating.ratingDeviation,
          currentPuzzle.rating,
          currentPuzzle.ratingDeviation,
          score,
          categoryRating.attempts
        );

        console.log(`Category ${category} rating update:`, {
          old: categoryRating.rating,
          new: update.newRating,
          change: update.newRating - categoryRating.rating,
          attempts: update.attempts
        });

        updates.categories[category] = update;
      });

      // If this is a guest user, update the guest session in localStorage
      if (isGuest) {
        const guestSession = localStorage.getItem('guestSession');
        if (guestSession) {
          const session = JSON.parse(guestSession);
          session.ratings = {
            overall: {
              rating: updates.overall.newRating,
              ratingDeviation: updates.overall.newRD,
              attempts: updates.overall.attempts
            },
            categories: Object.fromEntries(
              Object.entries(updates.categories).map(([category, update]) => [
                category,
                {
                  rating: update.newRating,
                  ratingDeviation: update.newRD,
                  attempts: update.attempts
                }
              ])
            )
          };
          session.solvedPuzzles = [...(session.solvedPuzzles || []), currentPuzzle.id];
          session.lastPuzzleState = currentPuzzle;
          localStorage.setItem('guestSession', JSON.stringify(session));
          console.log('💾 Successfully saved guest session to localStorage');
        }
      }
      // If user is logged in, save to Supabase
      else if (userId) {
        console.log('🔄 Saving to Supabase for user:', userId);
        
        // Create a Promise to handle the async operation
        const { error } = await supabase
          .from('user_ratings')
          .upsert({
            user_id: userId,
            ratings: {
              overall: {
                rating: updates.overall.newRating,
                ratingDeviation: updates.overall.newRD,
                attempts: updates.overall.attempts
              },
              categories: Object.fromEntries(
                Object.entries(updates.categories).map(([category, update]) => [
                  category,
                  {
                    rating: update.newRating,
                    ratingDeviation: update.newRD,
                    attempts: update.attempts
                  }
                ])
              )
            },
            updated_at: new Date().toISOString()
          });

        if (error) {
          console.error('❌ Error saving ratings to Supabase:', error);
        } else {
          console.log('✅ Successfully saved ratings to Supabase');
        }
      }

      return updates;
    } catch (error) {
      console.error('❌ Error updating ratings:', error);
      throw error;
    }
  }
);
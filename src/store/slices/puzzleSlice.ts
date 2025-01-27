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
  previousPuzzleId: string | null;
  lastUpdatedThemes: string[];
}

const initialState: PuzzleState = {
  currentPuzzle: null,
  userRatings: {
    loaded: false,
    overall: null,
    categories: {},
  },
  lastRatingUpdates: null,
  previousPuzzleId: null,
  lastUpdatedThemes: [],
};

const puzzleSlice = createSlice({
  name: 'puzzle',
  initialState,
  reducers: {
    setCurrentPuzzle: (state, action: PayloadAction<PuzzleState['currentPuzzle']>) => {
      const start = performance.now();
      
      // Skip state update if we're setting null puzzle during initialization
      if (!action.payload && !state.currentPuzzle) {
        console.log('🔄 Skipping null puzzle update during initialization');
        return;
      }

      // Only log warning if we're explicitly setting null when we had a puzzle
      if (!action.payload && state.currentPuzzle) {
        console.warn('⚠️ Setting null puzzle when we had a puzzle');
      }

      console.log('🧩 [PuzzleSlice] Setting Current Puzzle');
      if (action.payload) {
        console.log('State transition:', {
          from: state.currentPuzzle?.id,
          to: action.payload.id,
          themes: action.payload.themes,
          rating: action.payload.rating
        });
      }

      state.currentPuzzle = action.payload;
      const end = performance.now();
      console.log('puzzleStateUpdate:', end - start, 'ms');
    },
    loadLastPuzzle: (state) => {
      // This is now just a placeholder - actual loading happens in the thunk
      console.log('Loading last puzzle from state');
    },
    updateRatings: (state, action: PayloadAction<{
      userId: string;
      currentPuzzle: PuzzleState['currentPuzzle'];
      score: number;
    }>) => {
      const { userId, currentPuzzle, score } = action.payload;
      if (!currentPuzzle || !state.userRatings || !state.userRatings.overall) return;

      // Check if this is a guest user
      const isGuest = userId.startsWith('guest_');

      // Calculate rating changes
      const userRatings = {
        ...state.userRatings,
        overall: state.userRatings.overall // TypeScript now knows this is non-null
      };
      
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
          userRatings.overall.attempts || 0
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

      // Update state with new ratings
      if (state.userRatings.overall) {
        state.userRatings.overall = {
          rating: updates.overall.newRating,
          ratingDeviation: updates.overall.newRD,
          attempts: (state.userRatings.overall.attempts || 0) + 1
        };
      }

      Object.entries(updates.categories).forEach(([category, update]) => {
        state.userRatings.categories[category] = {
          rating: update.newRating,
          ratingDeviation: update.newRD,
          attempts: (state.userRatings.categories[category]?.attempts || 0) + 1
        };
      });

      state.lastRatingUpdates = updates;

      // Save to localStorage for all users as backup
      try {
        localStorage.setItem('chess_puzzle_ratings', JSON.stringify(state.userRatings));
        console.log('💾 Successfully saved to localStorage');
      } catch (err) {
        console.error('❌ Failed to save to localStorage:', err);
      }

      // For guest users, update the guest session
      if (isGuest) {
        try {
          const guestSession = localStorage.getItem('guestSession');
          if (guestSession) {
            const session = JSON.parse(guestSession);
            session.ratings = state.userRatings;
            session.solvedPuzzles = [...(session.solvedPuzzles || []), currentPuzzle.id];
            session.lastPuzzleState = currentPuzzle;
            localStorage.setItem('guestSession', JSON.stringify(session));
            console.log('💾 Successfully saved guest session to localStorage');
          }
        } catch (err) {
          console.error('❌ Failed to save guest session:', err);
        }
        return;
      }

      // For logged-in users, save to Supabase
      if (userId && !isGuest) {
        console.log('🔄 Saving to Supabase for user:', userId);
        
        // Create a Promise to handle the async operation
        const saveRatings = async () => {
          try {
            const { error } = await supabase
              .from('user_ratings')
              .upsert({
                user_id: userId,
                ratings: state.userRatings,
                updated_at: new Date().toISOString()
              });

            if (error) {
              console.error('❌ Error saving ratings:', error);
            } else {
              console.log('✅ Successfully saved ratings to Supabase');
            }
          } catch (err) {
            console.error('❌ Error in saveRatings:', err);
          }
        };

        saveRatings();
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

export const { setCurrentPuzzle, updateRatings, loadUserRatings, loadLastPuzzle } = puzzleSlice.actions;
export default puzzleSlice.reducer;

// Add async thunk to save current puzzle
export const saveCurrentPuzzle = (userId: string, puzzle: PuzzleState['currentPuzzle']) => async () => {
  if (!puzzle) {
    console.log('No puzzle to save');
    return;
  }

  console.log('Saving current puzzle:', puzzle.id, 'for user:', userId);

  // Check if this is a guest user by userId prefix
  const isGuest = userId?.startsWith('guest_') || userId === '558bb524-a3ba-4ecc-9a8a-158c13c5cb58';

  if (isGuest) {
    try {
      // Save to guest-specific localStorage
      localStorage.setItem(`guest_last_puzzle_${userId}`, JSON.stringify(puzzle));
      console.log('💾 Saved last puzzle to guest localStorage');
      
      // Also update the guest session
      const guestSession = localStorage.getItem('guestSession');
      if (guestSession) {
        const session = JSON.parse(guestSession);
        session.lastPuzzleState = puzzle;
        localStorage.setItem('guestSession', JSON.stringify(session));
        console.log('💾 Updated guest session with last puzzle');
      }
    } catch (err) {
      console.error('❌ Failed to save guest puzzle to localStorage:', err);
    }
    return; // Early return for guest users
  }

  // Only proceed with Supabase operations for non-guest users
  try {
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

// Add async thunk to fetch user ratings
export const fetchUserRatings = (userId: string) => async (dispatch: any) => {
  console.group('🔄 Fetching User Ratings');
  console.log('Fetching ratings for user:', userId);
  
  // Check if this is a guest user by userId prefix - no need to check Supabase
  const isGuest = userId.startsWith('guest_');

  if (isGuest) {
    // For guest users, load from localStorage
    try {
      const guestSession = localStorage.getItem('guestSession');
      if (guestSession) {
        const session = JSON.parse(guestSession);
        console.log('✅ Loaded guest ratings from localStorage:', session.ratings);
        dispatch(loadUserRatings({ ratings: session.ratings }));
      } else {
        // Create default ratings for guest
        const defaultRating = { rating: 1600, ratingDeviation: 350, attempts: 0 };
        const defaultCategories = {
          'Mate': { ...defaultRating },
          'Fork': { ...defaultRating },
          'Pin': { ...defaultRating },
          'Defense': { ...defaultRating },
          'Endgame': { ...defaultRating },
          'Deflection': { ...defaultRating },
          'Quiet Move': { ...defaultRating },
          'Kingside Attack': { ...defaultRating },
          'Discovered Attack': { ...defaultRating },
          'Capturing Defender': { ...defaultRating }
        };
        
        const defaultRatings = {
          overall: { rating: 1600, ratingDeviation: 350 },
          categories: defaultCategories
        };
        
        dispatch(loadUserRatings({ ratings: defaultRatings }));
      }
    } catch (err) {
      console.error('❌ Error loading guest ratings:', err);
    }
    console.groupEnd();
    return;
  }

  // Only proceed with Supabase operations for non-guest users
  try {
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

// Add async thunk to fetch last puzzle
export const fetchLastPuzzle = (userId: string) => async (dispatch: any) => {
  console.log('Fetching last puzzle for user:', userId);

  try {
    // Check if this is a guest user by userId prefix
    const isGuest = userId.startsWith('guest_');

    if (isGuest) {
      // Try to load from guest-specific localStorage first
      const savedPuzzle = localStorage.getItem(`guest_last_puzzle_${userId}`);
      if (savedPuzzle) {
        const puzzle = JSON.parse(savedPuzzle);
        console.log('✅ Loaded last puzzle from guest localStorage:', puzzle);
        dispatch(setCurrentPuzzle(puzzle));
        return;
      } else {
        console.log('No saved puzzle found for guest user');
        dispatch(setCurrentPuzzle(null));
        return;
      }
    }

    // If not a guest, fetch from Supabase
    const { data, error } = await supabase
      .from('user_progress')
      .select('last_puzzle')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('❌ Error fetching last puzzle:', error);
      dispatch(setCurrentPuzzle(null));
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
    dispatch(setCurrentPuzzle(null));
  }
};

export const updateRatingsAfterPuzzleAsync = createAsyncThunk(
  'puzzle/updateRatingsAfterPuzzleAsync',
  async ({ success, userId }: { success: boolean; userId?: string }, { getState }) => {
    const state = getState() as RootState;
    const currentPuzzle = state.puzzle.currentPuzzle;
    const userRatings = state.puzzle.userRatings;
    const isGuest = userId?.startsWith('guest_');

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
        try {
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
        } catch (err) {
          console.error('❌ Failed to save guest session:', err);
        }
        return updates;
      }

      // For logged-in users, save to Supabase
      if (userId && !isGuest) {
        console.log('🔄 Saving to Supabase for user:', userId);
        
        try {
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
        } catch (err) {
          console.error('❌ Error saving to Supabase:', err);
        }
      }

      return updates;
    } catch (error) {
      console.error('❌ Error updating ratings:', error);
      throw error;
    }
  }
);
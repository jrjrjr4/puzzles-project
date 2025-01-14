import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../utils/supabase';
import { setUser, setLoading } from '../store/slices/authSlice';
import { fetchUserRatings, loadUserRatings } from '../store/slices/puzzleSlice';
import { AppDispatch } from '../store/store';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch<AppDispatch>();
  const ratingsLoaded = useRef(false);

  const loadRatings = (session: Session | null) => {
    if (ratingsLoaded.current) {
      console.log('Ratings already loaded, skipping');
      return;
    }

    if (session?.user) {
      console.log('Loading ratings for user:', session.user.id);
      dispatch(fetchUserRatings(session.user.id));
    } else {
      // Load from localStorage for anonymous users
      console.log('Loading ratings from localStorage for anonymous user');
      const savedRatings = localStorage.getItem('chess_puzzle_ratings');
      if (savedRatings) {
        try {
          const parsedRatings = JSON.parse(savedRatings);
          console.log('Found saved ratings:', parsedRatings);
          dispatch(loadUserRatings({ ratings: parsedRatings }));
        } catch (err) {
          console.error('❌ Error parsing saved ratings:', err);
          // Use default ratings if parsing fails
          dispatch(loadUserRatings({
            ratings: {
              overall: { rating: 1200, ratingDeviation: 350 },
              categories: {}
            }
          }));
        }
      } else {
        console.log('No saved ratings found, using defaults');
        dispatch(loadUserRatings({
          ratings: {
            overall: { rating: 1200, ratingDeviation: 350 },
            categories: {}
          }
        }));
      }
    }
    ratingsLoaded.current = true;
  };

  useEffect(() => {
    console.group('🔐 Auth Provider Initialization');
    
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', session ? 'User logged in' : 'No session');
      dispatch(setUser(session?.user ?? null));
      loadRatings(session);
      dispatch(setLoading(false));
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.group('🔄 Auth State Change');
      console.log('Event:', _event);
      console.log('Session:', session ? 'User logged in' : 'User logged out');
      
      dispatch(setUser(session?.user ?? null));
      
      // Only reload ratings if the auth state actually changed (login/logout)
      if (_event === 'SIGNED_IN' || _event === 'SIGNED_OUT') {
        ratingsLoaded.current = false; // Reset the flag
        loadRatings(session);
      }
      
      console.groupEnd();
    });

    console.groupEnd();
    return () => subscription.unsubscribe();
  }, [dispatch]);

  return <>{children}</>;
} 
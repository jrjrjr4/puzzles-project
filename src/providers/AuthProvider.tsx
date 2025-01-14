import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../utils/supabase';
import { setUser, setLoading } from '../store/slices/authSlice';
import { fetchUserRatings, loadUserRatings } from '../store/slices/puzzleSlice';
import { AppDispatch } from '../store/store';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    console.group('🔐 Auth Provider Initialization');
    
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', session ? 'User logged in' : 'No session');
      
      dispatch(setUser(session?.user ?? null));
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
      
      if (session?.user) {
        console.log('👤 User logged in - loading ratings for:', session.user.id);
        dispatch(fetchUserRatings(session.user.id));
      } else {
        console.log('👋 User logged out - loading from localStorage');
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
      console.groupEnd();
    });

    console.groupEnd();
    return () => subscription.unsubscribe();
  }, [dispatch]);

  return <>{children}</>;
} 
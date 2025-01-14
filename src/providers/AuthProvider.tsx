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

  const loadRatings = async (session: Session | null) => {
    if (ratingsLoaded.current) {
      console.log('Ratings already loaded, skipping');
      return;
    }

    if (session?.user) {
      // Check if this is a guest user
      const isGuest = session.user.user_metadata?.is_guest;
      console.log('Loading ratings for user:', session.user.id, isGuest ? '(guest)' : '');
      
      if (isGuest) {
        // For guest users, try to load from localStorage first
        const savedRatings = localStorage.getItem(`guest_ratings_${session.user.id}`);
        if (savedRatings) {
          try {
            const parsedRatings = JSON.parse(savedRatings);
            console.log('Found saved guest ratings:', parsedRatings);
            dispatch(loadUserRatings({ ratings: parsedRatings }));
            return;
          } catch (err) {
            console.error('❌ Error parsing saved guest ratings:', err);
          }
        }
      }
      
      // If not a guest or no saved ratings, fetch from Supabase
      dispatch(fetchUserRatings(session.user.id));
    } else {
      // Clear any existing ratings from localStorage when logged out
      localStorage.removeItem('chess_puzzle_ratings');
      
      // Set default ratings for anonymous users
      console.log('Setting default ratings for anonymous user');
      dispatch(loadUserRatings({
        ratings: {
          overall: { rating: 1200, ratingDeviation: 350 },
          categories: {}
        }
      }));
    }
    ratingsLoaded.current = true;
  }

  useEffect(() => {
    console.log('🔐 Auth Provider Initialization');

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth State Change');
      console.log('Event:', event);
      console.log('Session:', session ? 'User logged in' : 'User logged out');

      // Reset ratingsLoaded flag on sign in/out to ensure fresh load
      if (event === 'SIGNED_OUT' || event === 'SIGNED_IN') {
        localStorage.removeItem('chess_puzzle_ratings');
        ratingsLoaded.current = false;
      }

      dispatch(setLoading(true));
      dispatch(setUser(session?.user || null));
      await loadRatings(session);
      dispatch(setLoading(false));
    });

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', session ? 'Session found' : 'No session');
      dispatch(setUser(session?.user || null));
      loadRatings(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [dispatch]);

  return <>{children}</>;
} 
import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../utils/supabase';
import { setUser, setLoading } from '../store/slices/authSlice';
import { fetchUserRatings, loadUserRatings } from '../store/slices/puzzleSlice';
import { AppDispatch } from '../store/store';

const GUEST_SESSION_KEY = 'guestSession';

interface GuestSession {
  guestId: string;
  ratings: {
    overall: { rating: number; ratingDeviation: number };
    categories: Record<string, { rating: number; ratingDeviation: number }>;
  };
  lastPuzzleState: any;
  solvedPuzzles: string[];
}

const createGuestSession = (): GuestSession => {
  return {
    guestId: `guest_${Math.random().toString(36).substring(2, 15)}`,
    ratings: {
      overall: { rating: 1200, ratingDeviation: 350 },
      categories: {}
    },
    lastPuzzleState: null,
    solvedPuzzles: []
  };
};

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
        const savedSession = localStorage.getItem(GUEST_SESSION_KEY);
        if (savedSession) {
          try {
            const guestSession: GuestSession = JSON.parse(savedSession);
            console.log('Found saved guest session:', guestSession);
            dispatch(loadUserRatings({ ratings: guestSession.ratings }));
            return;
          } catch (err) {
            console.error('❌ Error parsing saved guest session:', err);
          }
        }
      }
      
      // If not a guest or no saved ratings, fetch from Supabase
      dispatch(fetchUserRatings(session.user.id));
    } else {
      // Create new guest session if none exists
      let guestSession = localStorage.getItem(GUEST_SESSION_KEY);
      
      if (!guestSession) {
        const newGuestSession = createGuestSession();
        localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(newGuestSession));
        guestSession = JSON.stringify(newGuestSession);
      }
      
      const parsedSession: GuestSession = JSON.parse(guestSession);
      dispatch(loadUserRatings({ ratings: parsedSession.ratings }));
      
      // Set guest user in auth state
      dispatch(setUser({
        id: parsedSession.guestId,
        email: undefined,
        user_metadata: { is_guest: true },
        app_metadata: {},
        aud: 'guest',
        created_at: new Date().toISOString(),
        role: 'authenticated',
        updated_at: new Date().toISOString()
      }));
    }
    ratingsLoaded.current = true;
  }

  useEffect(() => {
    console.log('🔐 Auth Provider Initialization');

    // Check for existing session first
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', session ? 'Session found' : 'No session');
      
      if (session) {
        dispatch(setUser(session.user));
        loadRatings(session);
      } else {
        // No session, load guest session
        loadRatings(null);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth State Change');
      console.log('Event:', event);
      console.log('Session:', session ? 'User logged in' : 'User logged out');

      dispatch(setLoading(true));

      if (session) {
        dispatch(setUser(session.user));
        await loadRatings(session);
      } else {
        // On sign out, load guest session
        await loadRatings(null);
      }

      dispatch(setLoading(false));
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [dispatch]);

  return <>{children}</>;
} 
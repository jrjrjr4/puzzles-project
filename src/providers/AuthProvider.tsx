import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../utils/supabase';
import { setUser, setLoading, setError } from '../store/slices/authSlice';
import { fetchUserRatings, loadUserRatings, setCurrentPuzzle } from '../store/slices/puzzleSlice';
import { AppDispatch } from '../store/store';

const GUEST_SESSION_KEY = 'guestSession';

interface GuestSession {
  guestId: string;
  ratings: {
    overall: { rating: number; ratingDeviation: number };
    categories: Record<string, { 
      rating: number; 
      ratingDeviation: number;
      attempts: number;
    }>;
  };
  lastPuzzleState: any;
  solvedPuzzles: string[];
}

const createGuestSession = (): GuestSession => {
  const defaultRating = { rating: 1600, ratingDeviation: 350, attempts: 0 };
  const defaultCategories: Record<string, typeof defaultRating> = {
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

  return {
    guestId: `guest_${Math.random().toString(36).substring(2, 15)}`,
    ratings: {
      overall: { rating: 1600, ratingDeviation: 350 },
      categories: defaultCategories
    },
    lastPuzzleState: null,
    solvedPuzzles: []
  };
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch<AppDispatch>();
  const ratingsLoaded = useRef(false);
  const authStateChangeEnabled = useRef(false);
  const lastUserId = useRef<string | null>(null);

  const setupGuestSession = async () => {
    const newGuestSession = createGuestSession();
    const guestUser = {
      id: newGuestSession.guestId,
      email: undefined,
      user_metadata: { is_guest: true },
      app_metadata: {},
      aud: 'guest',
      created_at: new Date().toISOString(),
      role: 'authenticated',
      updated_at: new Date().toISOString()
    };
    
    dispatch(loadUserRatings({ ratings: newGuestSession.ratings }));
    dispatch(setUser(guestUser));
    lastUserId.current = guestUser.id;
    ratingsLoaded.current = true;
    dispatch(setCurrentPuzzle(null));
  };

  const loadRatings = async (session: Session | null) => {
    const isGuest = !session?.user || session.user.user_metadata?.is_guest;
    const wasGuest = !lastUserId.current || lastUserId.current.startsWith('guest_');
    const userChanged = session?.user?.id !== lastUserId.current;
    
    if (ratingsLoaded.current && !userChanged && isGuest === wasGuest) {
      return;
    }

    try {
      if (session?.user && !isGuest) {
        await dispatch(fetchUserRatings(session.user.id));
        ratingsLoaded.current = true;
        lastUserId.current = session.user.id;
        dispatch(setCurrentPuzzle(null));
      } else {
        await setupGuestSession();
      }
    } catch (error) {
      console.error('Error loading ratings:', error);
      await setupGuestSession();
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        dispatch(setLoading(true));
        
        // Try to get existing session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          throw sessionError;
        }

        if (session?.user) {
          dispatch(setUser(session.user));
          await loadRatings(session);
        } else {
          await setupGuestSession();
        }

      } catch (error) {
        console.error('Auth initialization error:', error);
        await setupGuestSession();
      } finally {
        if (mounted) {
          authStateChangeEnabled.current = true;
          dispatch(setLoading(false));
        }
      }
    };

    // Initialize auth immediately
    initializeAuth();

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!authStateChangeEnabled.current) return;

      if (event === 'SIGNED_IN' && session?.user) {
        dispatch(setUser(session.user));
        await loadRatings(session);
      } else if (event === 'SIGNED_OUT') {
        await setupGuestSession();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [dispatch]);

  return <>{children}</>;
} 
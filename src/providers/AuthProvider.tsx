import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../utils/supabase';
import { setUser, setLoading, setError } from '../store/slices/authSlice';
import { fetchUserRatings, loadUserRatings, setCurrentPuzzle } from '../store/slices/puzzleSlice';
import { AppDispatch } from '../store/store';

interface GuestSession {
  guestId: string;
  ratings: {
    overall: { rating: number; ratingDeviation: number };
    categories: Record<
      string,
      { rating: number; ratingDeviation: number; attempts: number }
    >;
  };
  lastPuzzleState: any;
  solvedPuzzles: string[];
}

const GUEST_SESSION_KEY = 'guestSession';

const setupGuestSession = async (dispatch: AppDispatch) => {
  const storedSession = localStorage.getItem(GUEST_SESSION_KEY);
  if (storedSession) {
    const session: GuestSession = JSON.parse(storedSession);
    console.log('Using existing guest session:', session.guestId);
    dispatch(loadUserRatings({ ratings: session.ratings }));
    dispatch(
      setUser({
        id: session.guestId,
        email: undefined,
        app_metadata: {},
        user_metadata: { is_guest: true },
        aud: 'authenticated',
        created_at: new Date().toISOString()
      })
    );
    dispatch(setCurrentPuzzle(null));
  } else {
    const newSession: GuestSession = {
      guestId: `guest_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      ratings: {
        overall: { rating: 1600, ratingDeviation: 350 },
        categories: {
          'Mate': { rating: 1600, ratingDeviation: 350, attempts: 0 },
          'Fork': { rating: 1600, ratingDeviation: 350, attempts: 0 },
          'Pin': { rating: 1600, ratingDeviation: 350, attempts: 0 },
          'Defense': { rating: 1600, ratingDeviation: 350, attempts: 0 },
          'Endgame': { rating: 1600, ratingDeviation: 350, attempts: 0 },
          'Deflection': { rating: 1600, ratingDeviation: 350, attempts: 0 },
          'Quiet Move': { rating: 1600, ratingDeviation: 350, attempts: 0 },
          'Kingside Attack': { rating: 1600, ratingDeviation: 350, attempts: 0 },
          'Discovered Attack': { rating: 1600, ratingDeviation: 350, attempts: 0 },
          'Capturing Defender': { rating: 1600, ratingDeviation: 350, attempts: 0 },
        }
      },
      lastPuzzleState: null,
      solvedPuzzles: []
    };
    localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(newSession));
    console.log('Created new guest session:', newSession.guestId);
    dispatch(loadUserRatings({ ratings: newSession.ratings }));
    dispatch(
      setUser({
        id: newSession.guestId,
        email: undefined,
        app_metadata: {},
        user_metadata: { is_guest: true },
        aud: 'authenticated',
        created_at: new Date().toISOString()
      })
    );
    dispatch(setCurrentPuzzle(null));
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch<AppDispatch>();
  const ratingsLoaded = useRef(false);
  const authStateChangeEnabled = useRef(false);
  const lastUserId = useRef<string | null>(null);

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
        await setupGuestSession(dispatch);
        ratingsLoaded.current = true;
      }
    } catch (error) {
      console.error('Error loading ratings:', error);
      await setupGuestSession(dispatch);
      ratingsLoaded.current = true;
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
          await setupGuestSession(dispatch);
        }

      } catch (error) {
        console.error('Auth initialization error:', error);
        await setupGuestSession(dispatch);
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
        await setupGuestSession(dispatch);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [dispatch]);

  const updateGuestRatings = (newRatings: any) => {
    const storedSession = localStorage.getItem(GUEST_SESSION_KEY);
    if (storedSession) {
      const session = JSON.parse(storedSession);
      session.ratings = newRatings;
      localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(session));
      console.log('Updated guest session with new ratings.');
    }
  };

  return <>{children}</>;
} 
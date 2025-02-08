import { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../utils/supabase';
import { setUser, setLoading, setError } from '../store/slices/authSlice';
import { fetchUserRatings, loadUserRatings, setCurrentPuzzle } from '../store/slices/puzzleSlice';
import { AppDispatch } from '../store/store';
import { LoadingSpinner } from '../components/LoadingSpinner';

const GUEST_SESSION_KEY = 'guestSession';
const INIT_TIMEOUT = 30000; // 30 second timeout

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
  // Create default ratings for all categories
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

const safeLocalStorageGet = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.warn('LocalStorage access error - this is expected in some browsers:', error);
    return null;
  }
};

const safeLocalStorageSet = (key: string, value: string): boolean => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn('LocalStorage write error - this is expected in some browsers:', error);
    return false;
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch<AppDispatch>();
  const ratingsLoaded = useRef(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const initializationAttempts = useRef(0);
  const maxInitAttempts = 3;
  const authStateChangeEnabled = useRef(false);
  const lastUserId = useRef<string | null>(null);

  const setupGuestSession = async () => {
    let guestSession = safeLocalStorageGet(GUEST_SESSION_KEY);
    
    if (!guestSession) {
      const newGuestSession = createGuestSession();
      safeLocalStorageSet(GUEST_SESSION_KEY, JSON.stringify(newGuestSession));
      guestSession = JSON.stringify(newGuestSession);
    }
    
    try {
      const parsedSession: GuestSession = JSON.parse(guestSession);
      dispatch(loadUserRatings({ ratings: parsedSession.ratings }));
      
      const guestUser = {
        id: parsedSession.guestId,
        email: undefined,
        user_metadata: { is_guest: true },
        app_metadata: {},
        aud: 'guest',
        created_at: new Date().toISOString(),
        role: 'authenticated',
        updated_at: new Date().toISOString()
      };
      
      dispatch(setUser(guestUser));
      lastUserId.current = guestUser.id;
      ratingsLoaded.current = true;
      dispatch(setCurrentPuzzle(null));
    } catch (err) {
      console.error('Error setting up guest session:', err);
      const newGuestSession = createGuestSession();
      safeLocalStorageSet(GUEST_SESSION_KEY, JSON.stringify(newGuestSession));
      return setupGuestSession();
    }
  };

  const loadRatings = async (session: Session | null) => {
    const isGuest = !session?.user || session.user.user_metadata?.is_guest;
    const wasGuest = !lastUserId.current || lastUserId.current.startsWith('guest_');
    const userChanged = session?.user?.id !== lastUserId.current;
    
    if (ratingsLoaded.current && !userChanged && isGuest === wasGuest) {
      return;
    }

    try {
      if (session?.user) {
        if (isGuest) {
          const savedSession = safeLocalStorageGet(GUEST_SESSION_KEY);
          if (savedSession) {
            try {
              const guestSession: GuestSession = JSON.parse(savedSession);
              dispatch(loadUserRatings({ ratings: guestSession.ratings }));
              ratingsLoaded.current = true;
              lastUserId.current = session.user.id;
              dispatch(setCurrentPuzzle(null));
              return;
            } catch (err) {
              console.error('Error loading guest ratings:', err);
            }
          }
        }
        
        await dispatch(fetchUserRatings(session.user.id));
        ratingsLoaded.current = true;
        lastUserId.current = session.user.id;
        dispatch(setCurrentPuzzle(null));
      } else {
        await setupGuestSession();
      }
    } catch (error) {
      console.error('Error loading ratings:', error);
      throw error;
    }
  }

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    const initializeAuth = async () => {
      try {
        dispatch(setLoading(true));
        
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Auth session error:', sessionError);
          dispatch(setError(sessionError.message));
          return;
        }

        if (session) {
          console.log('Auth: User session found', {
            provider: session.user?.app_metadata?.provider,
            email: session.user?.email
          });
          dispatch(setUser(session.user));
          await loadRatings(session);
        } else {
          console.log('Auth: No active session, using guest mode');
          await loadRatings(null);
        }

        if (mounted) {
          authStateChangeEnabled.current = true;
          setIsInitializing(false);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        dispatch(setError(error instanceof Error ? error.message : 'Unknown error'));
        
        if (initializationAttempts.current < maxInitAttempts) {
          initializationAttempts.current += 1;
          setTimeout(initializeAuth, 1000);
        } else {
          if (mounted) {
            authStateChangeEnabled.current = true;
            setIsInitializing(false);
          }
        }
      } finally {
        if (mounted) {
          dispatch(setLoading(false));
        }
      }
    };

    timeoutId = setTimeout(() => {
      if (mounted && isInitializing) {
        console.error('Auth initialization timed out');
        setIsInitializing(false);
        authStateChangeEnabled.current = true;
        dispatch(setError('Authentication initialization timed out'));
      }
    }, INIT_TIMEOUT);

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!authStateChangeEnabled.current) return;

      console.log('Auth: State changed', {
        event,
        provider: session?.user?.app_metadata?.provider,
        email: session?.user?.email
      });

      if (event === 'SIGNED_IN') {
        if (session?.user?.app_metadata?.provider === 'google') {
          console.log('Auth: Successfully signed in with Google');
        }
        dispatch(setUser(session?.user || null));
        await loadRatings(session);
      } else if (event === 'SIGNED_OUT') {
        console.log('Auth: User signed out');
        dispatch(setUser(null));
        await loadRatings(null);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [dispatch]);

  if (isInitializing) {
    return <LoadingSpinner />;
  }

  return <>{children}</>;
} 
import { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../utils/supabase';
import { setUser, setLoading, setError } from '../store/slices/authSlice';
import { fetchUserRatings, loadUserRatings, setCurrentPuzzle } from '../store/slices/puzzleSlice';
import { AppDispatch } from '../store/store';
import { LoadingSpinner } from '../components/LoadingSpinner';

const GUEST_SESSION_KEY = 'guestSession';
const INIT_TIMEOUT = 10000; // 10 second timeout

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

const safeLocalStorageGet = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.error('❌ LocalStorage access error:', error);
    return null;
  }
};

const safeLocalStorageSet = (key: string, value: string): boolean => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.error('❌ LocalStorage write error:', error);
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

  const setupGuestSession = async () => {
    console.log('🔄 Setting up guest session');
    let guestSession = safeLocalStorageGet(GUEST_SESSION_KEY);
    
    if (!guestSession) {
      const newGuestSession = createGuestSession();
      if (safeLocalStorageSet(GUEST_SESSION_KEY, JSON.stringify(newGuestSession))) {
        guestSession = JSON.stringify(newGuestSession);
        console.log('✨ Created new guest session');
      }
    }
    
    if (guestSession) {
      try {
        const parsedSession: GuestSession = JSON.parse(guestSession);
        dispatch(loadUserRatings({ ratings: parsedSession.ratings }));
        
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
        
        ratingsLoaded.current = true;
        console.log('✅ Guest session loaded successfully');

        // Clear current puzzle to trigger auto-load
        dispatch(setCurrentPuzzle(null));
      } catch (err) {
        console.error('❌ Error parsing guest session:', err);
        throw err;
      }
    } else {
      console.error('❌ Failed to create or load guest session');
      throw new Error('Failed to create or load guest session');
    }
  };

  const loadRatings = async (session: Session | null) => {
    console.log('📊 loadRatings called with session:', session?.user?.id);
    
    if (ratingsLoaded.current) {
      console.log('⏭️ Ratings already loaded, skipping');
      return;
    }

    try {
      if (session?.user) {
        const isGuest = session.user.user_metadata?.is_guest;
        console.log('👤 Loading ratings for user:', session.user.id, isGuest ? '(guest)' : '');
        
        if (isGuest) {
          const savedSession = safeLocalStorageGet(GUEST_SESSION_KEY);
          if (savedSession) {
            try {
              const guestSession: GuestSession = JSON.parse(savedSession);
              console.log('📝 Found saved guest session:', guestSession);
              dispatch(loadUserRatings({ ratings: guestSession.ratings }));
              ratingsLoaded.current = true;
              
              // Clear current puzzle to trigger auto-load
              dispatch(setCurrentPuzzle(null));
              return;
            } catch (err) {
              console.error('❌ Error parsing guest session:', err);
            }
          }
        }
        
        console.log('🔄 Fetching ratings from Supabase for user:', session.user.id);
        await dispatch(fetchUserRatings(session.user.id));
        ratingsLoaded.current = true;
        
        // Clear current puzzle to trigger auto-load
        dispatch(setCurrentPuzzle(null));
      } else {
        await setupGuestSession();
      }
    } catch (error) {
      console.error('❌ Error in loadRatings:', error);
      throw error;
    }
  }

  useEffect(() => {
    console.log('🔐 Auth Provider Initialization - Attempt:', initializationAttempts.current + 1);
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    const initializeAuth = async () => {
      try {
        dispatch(setLoading(true));
        console.log('🔍 Checking for existing session...');
        
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('❌ Session error:', sessionError);
          dispatch(setError(sessionError.message));
          return;
        }

        console.log('📡 Session check result:', session ? 'Active session found' : 'No active session');
        
        if (session) {
          console.log('🔑 Setting user:', session.user.id);
          dispatch(setUser(session.user));
          await loadRatings(session);
        } else {
          console.log('👤 No session, initializing guest mode');
          await loadRatings(null);
        }

        if (mounted) {
          console.log('✅ Initialization complete');
          authStateChangeEnabled.current = true;
          setIsInitializing(false);
        }
      } catch (error) {
        console.error('❌ Auth initialization error:', error);
        dispatch(setError(error instanceof Error ? error.message : 'Unknown error'));
        
        if (initializationAttempts.current < maxInitAttempts) {
          console.log('🔄 Retrying initialization...');
          initializationAttempts.current += 1;
          setTimeout(initializeAuth, 1000);
        } else {
          console.error('❌ Max initialization attempts reached');
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

    // Set a timeout to prevent infinite loading
    timeoutId = setTimeout(() => {
      if (mounted && isInitializing) {
        console.error('⏰ Auth initialization timed out');
        setIsInitializing(false);
        authStateChangeEnabled.current = true;
        dispatch(setError('Authentication initialization timed out'));
      }
    }, INIT_TIMEOUT);

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth State Change');
      console.log('Event:', event);
      console.log('Session:', session ? 'User logged in' : 'User logged out');

      if (!mounted || !authStateChangeEnabled.current) {
        console.log('⚠️ Skipping auth state change - component unmounted or initialization incomplete');
        return;
      }

      dispatch(setLoading(true));

      try {
        if (event === 'SIGNED_OUT') {
          console.log('🚪 User signed out, transitioning to guest mode');
          ratingsLoaded.current = false; // Reset ratings loaded flag
          dispatch(setCurrentPuzzle(null)); // Clear current puzzle
          await setupGuestSession();
        } else if (session) {
          console.log('👤 Setting user on auth change:', session.user.id);
          dispatch(setUser(session.user));
          dispatch(setCurrentPuzzle(null)); // Clear current puzzle
          await loadRatings(session);
        } else {
          console.log('🔄 Loading guest session on auth change');
          ratingsLoaded.current = false; // Reset ratings loaded flag
          dispatch(setCurrentPuzzle(null)); // Clear current puzzle
          await loadRatings(null);
        }
      } catch (error) {
        console.error('❌ Auth state change error:', error);
        dispatch(setError(error instanceof Error ? error.message : 'Unknown error'));
      } finally {
        if (mounted) {
          dispatch(setLoading(false));
        }
      }
    });

    return () => {
      console.log('🧹 Cleaning up AuthProvider');
      mounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [dispatch]);

  if (isInitializing) {
    console.log('⌛ Showing loading spinner...');
    return <LoadingSpinner />;
  }

  return <>{children}</>;
} 
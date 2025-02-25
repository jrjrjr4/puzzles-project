import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../utils/supabase';
import { setUser, setLoading, setError, setAuthInitialized } from '../store/slices/authSlice';
import { fetchUserRatings, loadUserRatings, setCurrentPuzzle, fetchLastPuzzle } from '../store/slices/puzzleSlice';
import { AppDispatch, RootState } from '../store/store';
import { LoadingSpinner } from '../components/LoadingSpinner';

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
  try {
    // console.log('🔄 Setting up guest session...');
    const storedSession = localStorage.getItem(GUEST_SESSION_KEY);
    
    if (storedSession) {
      const session: GuestSession = JSON.parse(storedSession);
      // console.log('✅ Using existing guest session:', session.guestId);
      
      // Load guest ratings first
      await dispatch(loadUserRatings({ ratings: session.ratings }));
      
      // Set user state after ratings are loaded
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
      
      // Try to restore last puzzle state if available
      if (session.lastPuzzleState) {
        // console.log('✅ Restoring last puzzle state for guest');
        dispatch(setCurrentPuzzle(session.lastPuzzleState));
      } else {
        dispatch(setCurrentPuzzle(null));
      }
    } else {
      // Create a new guest session with default values
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
      // console.log('✅ Created new guest session:', newSession.guestId);
      
      // Load ratings first
      await dispatch(loadUserRatings({ ratings: newSession.ratings }));
      
      // Set user after ratings
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
    
    return true;
  } catch (error) {
    // console.error('❌ Error setting up guest session:', error);
    dispatch(setError('Failed to set up guest session'));
    return false;
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch<AppDispatch>();
  const [isInitializing, setIsInitializing] = useState(true);
  const [loadingPhase, setLoadingPhase] = useState<string>('Initializing');
  const ratingsLoaded = useRef(false);
  const authStateChangeEnabled = useRef(false);
  const lastUserId = useRef<string | null>(null);

  // Define a sequential loading process
  const loadUserData = async (session: Session | null) => {
    try {
      const isGuest = !session?.user || session.user.user_metadata?.is_guest;
      const wasGuest = !lastUserId.current || lastUserId.current.startsWith('guest_');
      const userChanged = session?.user?.id !== lastUserId.current;
      
      // Skip loading if nothing changed and we already loaded ratings
      if (ratingsLoaded.current && !userChanged && isGuest === wasGuest) {
        return true;
      }
      
      // console.log('🔄 Loading user data...');
      
      if (session?.user && !isGuest) {
        // STEP 1: Load authenticated user ratings
        // console.log('🔄 Step 1: Loading ratings for authenticated user:', session.user.id);
        setLoadingPhase('Loading ratings');
        await dispatch(fetchUserRatings(session.user.id));
        
        // STEP 2: Fetch last puzzle state
        // console.log('🔄 Step 2: Loading last puzzle for user:', session.user.id);
        setLoadingPhase('Loading last puzzle');
        await dispatch(fetchLastPuzzle(session.user.id));
        
        // Update tracking refs
        ratingsLoaded.current = true;
        lastUserId.current = session.user.id;
        return true;
      } else {
        // For guest users, use the setup function
        // console.log('🔄 Setting up guest user data');
        setLoadingPhase('Setting up guest session');
        const result = await setupGuestSession(dispatch);
        ratingsLoaded.current = result;
        return result;
      }
    } catch (error) {
      // console.error('❌ Error loading user data:', error);
      dispatch(setError('Failed to load user data'));
      
      // Fall back to guest session on error
      // console.log('🔄 Falling back to guest session after error');
      setLoadingPhase('Setting up guest fallback');
      const result = await setupGuestSession(dispatch);
      ratingsLoaded.current = result;
      return result;
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // console.log('🔄 Starting auth initialization');
        setLoadingPhase('Checking authentication');
        dispatch(setLoading(true));
        
        // Try to get existing session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          // console.error('❌ Session error:', sessionError);
          throw sessionError;
        }

        if (session?.user) {
          // console.log('✅ Found existing session for user:', session.user.id);
          dispatch(setUser(session.user));
          await loadUserData(session);
        } else {
          // console.log('ℹ️ No existing session, setting up guest');
          await setupGuestSession(dispatch);
        }

      } catch (error) {
        // console.error('❌ Auth initialization error:', error);
        dispatch(setError('Authentication failed. Using guest mode.'));
        await setupGuestSession(dispatch);
      } finally {
        if (mounted) {
          authStateChangeEnabled.current = true;
          dispatch(setLoading(false));
          dispatch(setAuthInitialized(true));
          setIsInitializing(false);
          // console.log('✅ Auth initialization complete');
        }
      }
    };

    // Initialize auth immediately
    initializeAuth();

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!authStateChangeEnabled.current) return;
      // console.log('🔄 Auth state change detected:', event);

      try {
        if (event === 'SIGNED_IN' && session) {
          // console.log('✅ User signed in:', session.user.id);
          dispatch(setUser(session.user));
          dispatch(setLoading(true));
          await loadUserData(session);
        } else if (event === 'SIGNED_OUT') {
          // console.log('ℹ️ User signed out, setting up guest');
          dispatch(setUser(null));
          await setupGuestSession(dispatch);
        }
      } catch (error) {
        console.error('❌ Error during auth state change:', error);
        dispatch(setError('Error during authentication change'));
      } finally {
        dispatch(setLoading(false));
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [dispatch]);

  // Show loading state during initialization
  if (isInitializing) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-white/90 dark:bg-gray-900/90 z-50">
        <LoadingSpinner />
        <p className="mt-4 text-gray-700 dark:text-gray-300">{loadingPhase}...</p>
      </div>
    );
  }

  return <>{children}</>;
} 
import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { User } from '@supabase/supabase-js';
import { supabase } from '../../utils/supabase';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  authInitialized: boolean;
}

const initialState: AuthState = {
  user: null,
  loading: true,
  error: null,
  authInitialized: false,
};

const AUTH_TIMEOUT = 15000; // 15 seconds timeout

// Debug logger
const debugLog = (message: string, data?: any) => {
  console.log(`🔐 Auth Debug: ${message}`, data ? data : '');
};

export const signInWithGoogle = createAsyncThunk(
  'auth/signInWithGoogle',
  async (_, { dispatch, signal }) => {
    const startTime = Date.now();
    debugLog('Starting Google Sign In process');
    
    try {
      dispatch(setLoading(true));
      debugLog('Auth state set to loading');
      
      // Create an AbortController for timeout handling
      const timeoutId = setTimeout(() => {
        const duration = Date.now() - startTime;
        debugLog(`Sign in timed out after ${duration}ms`);
        dispatch(setError('Sign in timed out. Please try again.'));
        throw new Error('Sign in timeout');
      }, AUTH_TIMEOUT);

      debugLog('Initiating Supabase OAuth call', {
        redirectUrl: `${window.location.origin}/auth/callback`
      });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      });
      
      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;
      
      if (error) {
        debugLog(`Auth Error after ${duration}ms:`, { error });
        dispatch(setError(error.message));
        throw error;
      }

      debugLog(`Auth Success after ${duration}ms:`, { 
        provider: data?.provider,
        url: data?.url
      });

      return data;
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to sign in with Google';
      debugLog('Auth Error:', { 
        message: errorMessage,
        error,
        stack: error instanceof Error ? error.stack : undefined
      });
      dispatch(setError(errorMessage));
      throw error;
    } finally {
      dispatch(setLoading(false));
      debugLog('Auth loading state cleared');
    }
  }
);

// Helper to check storage access
const checkStorageAccess = () => {
  try {
    localStorage.setItem('auth_test', 'test');
    localStorage.removeItem('auth_test');
    return true;
  } catch (e) {
    debugLog('Storage access error:', e);
    return false;
  }
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User | null>) => {
      debugLog('Setting user:', { 
        userId: action.payload?.id,
        email: action.payload?.email,
        provider: action.payload?.app_metadata?.provider
      });
      state.user = action.payload;
      state.loading = false;
      state.error = null;
      state.authInitialized = true;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      debugLog('Setting loading state:', action.payload);
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      debugLog('Setting error state:', action.payload);
      state.error = action.payload;
      state.loading = false;
    },
    setAuthInitialized: (state, action: PayloadAction<boolean>) => {
      debugLog('Setting auth initialized:', action.payload);
      state.authInitialized = action.payload;
    },
  },
});

// Check storage access on module load
debugLog('Checking storage access:', checkStorageAccess());

export const { setUser, setLoading, setError, setAuthInitialized } = authSlice.actions;
export default authSlice.reducer;
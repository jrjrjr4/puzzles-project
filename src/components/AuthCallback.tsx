import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { supabase } from '../utils/supabase';
import { setUser, setError } from '../store/slices/authSlice';

export default function AuthCallback() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the hash fragment from the URL (remove the leading '#' if it exists)
        const hashFragment = window.location.hash.startsWith('#')
          ? window.location.hash.substring(1)
          : window.location.hash;

        // Try to get tokens from either hash or search params
        const params = new URLSearchParams(hashFragment || window.location.search);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (!accessToken) {
          throw new Error('Access token is missing');
        }

        // Properly establish the session with both tokens
        const { data: { session }, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || ''
        });

        if (sessionError) throw sessionError;
        if (!session?.user) throw new Error('No user data found');

        // Update Redux store with user data
        dispatch(setUser(session.user));

        // Navigate to home page
        navigate('/', { replace: true });

      } catch (error) {
        console.error('Auth error:', error);
        dispatch(setError(error instanceof Error ? error.message : 'Authentication failed'));
        navigate('/', { replace: true });
      }
    };

    handleCallback();
  }, [navigate, dispatch]);

  // Return null since we're navigating away immediately
  return null;
} 
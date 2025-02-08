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
      console.group('🔐 Auth Callback Processing');
      try {
        console.log('Auth callback started', {
          url: window.location.href,
          search: window.location.search,
          hash: window.location.hash,
          state: window.history.state
        });

        // Get the hash fragment from the URL (remove the leading '#' if it exists)
        const hashFragment = window.location.hash.startsWith('#') 
          ? window.location.hash.substring(1)
          : window.location.hash;

        console.log('URL components:', {
          fullUrl: window.location.href,
          hash: hashFragment,
          pathname: window.location.pathname,
          origin: window.location.origin
        });

        if (!hashFragment && !window.location.search) {
          console.warn('No auth tokens found in URL or search params');
          throw new Error('No authentication tokens found');
        }

        // Try to get tokens from either hash or search params
        const params = new URLSearchParams(hashFragment || window.location.search);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        console.log('Auth tokens found:', {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken
        });

        if (!accessToken) {
          throw new Error('Access token is missing');
        }

        console.log('Setting Supabase session...');
        // Set the session in Supabase
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || ''
        });

        if (sessionError) {
          console.error('Session set error:', sessionError);
          throw sessionError;
        }

        if (!sessionData.session) {
          throw new Error('Failed to establish session');
        }

        const { user } = sessionData.session;

        if (!user) {
          throw new Error('No user data in session');
        }

        console.log('Session successfully established:', {
          email: user.email,
          provider: user.app_metadata?.provider,
          id: user.id
        });

        // Update Redux store with user data
        dispatch(setUser(user));

        // Redirect to home page after a short delay
        console.log('Redirecting to home page...');
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 500);

      } catch (error) {
        console.error('Error processing auth callback:', error);
        dispatch(setError(error instanceof Error ? error.message : 'Authentication failed'));
        
        // Redirect to login page after error
        console.log('Redirecting to login page due to error...');
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 500);
      } finally {
        console.groupEnd();
      }
    };

    handleCallback();
  }, [navigate, dispatch]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="flex flex-col items-center gap-4 p-8 bg-white rounded-lg shadow-lg">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <div className="text-gray-600 font-medium">Completing sign-in...</div>
        <div className="text-sm text-gray-500">Please wait while we set up your session</div>
      </div>
    </div>
  );
} 
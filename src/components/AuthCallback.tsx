import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      console.group('🔐 Auth Callback Processing');
      try {
        // Get the hash fragment from the URL (remove the leading '#' if it exists)
        const hashFragment = window.location.hash.startsWith('#') 
          ? window.location.hash.substring(1)
          : window.location.hash;

        console.log('Processing callback URL:', {
          fullUrl: window.location.href,
          hash: hashFragment,
          pathname: window.location.pathname
        });

        if (hashFragment && hashFragment.includes('access_token')) {
          // Parse the hash fragment
          const params = new URLSearchParams(hashFragment);
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');
          const expiresIn = params.get('expires_in');
          const expiresAt = params.get('expires_at');

          console.log('Parsed auth data:', { 
            hasAccessToken: !!accessToken,
            hasRefreshToken: !!refreshToken,
            expiresIn,
            expiresAt
          });

          if (accessToken) {
            // Set the session in Supabase
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || ''
            });

            console.log('Session set result:', {
              success: !!data.session,
              error: error?.message,
              user: data.session?.user?.email
            });

            if (error) throw error;

            // Small delay to ensure session is properly set
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } else {
          console.warn('No auth tokens found in URL');
        }
      } catch (error) {
        console.error('Error processing auth callback:', error);
      } finally {
        // Always redirect back to the home page
        console.log('Redirecting to home page');
        navigate('/');
        console.groupEnd();
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <div className="text-gray-600">Processing sign-in...</div>
      </div>
    </div>
  );
} 
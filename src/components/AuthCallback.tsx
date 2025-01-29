import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      console.group('🔐 Auth Callback');
      try {
        // Get the hash fragment from the URL
        const hashFragment = window.location.hash;
        console.log('Hash fragment:', hashFragment);

        if (hashFragment) {
          // Parse the hash fragment
          const params = new URLSearchParams(hashFragment.substring(1));
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');

          console.log('Parsed tokens:', { 
            hasAccessToken: !!accessToken,
            hasRefreshToken: !!refreshToken 
          });

          if (accessToken) {
            // Set the session in Supabase
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || ''
            });

            console.log('Session set result:', {
              success: !!data.session,
              error: error?.message
            });

            if (error) throw error;
          }
        }
      } catch (error) {
        console.error('Error in auth callback:', error);
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
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
} 
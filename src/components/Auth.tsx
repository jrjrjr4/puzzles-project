import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { supabase } from '../utils/supabase';
import { setError } from '../store/slices/authSlice';
import { setUser } from '../store/slices/authSlice';

export function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const dispatch = useDispatch();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (!email) {
        throw new Error('Please enter your email address');
      }
      if (!password) {
        throw new Error('Please choose a password');
      }
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin
        }
      });
      if (error) throw error;
      if (data?.user?.identities?.length === 0) {
        throw new Error('This email is already registered. Please sign in instead.');
      }
      alert('Check your email for the confirmation link!');
    } catch (error) {
      console.error('Signup error:', error);
      dispatch(setError(error instanceof Error ? error.message : 'An error occurred during signup'));
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
    } catch (error) {
      dispatch(setError((error as Error).message));
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    try {
      setLoading(true);
      
      // Generate a unique guest ID
      const guestId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      
      // Create default ratings for the guest
      const defaultRatings = {
        loaded: true,
        overall: { rating: 1600, ratingDeviation: 350 },
        categories: {}
      };

      // Store guest data in localStorage
      localStorage.setItem('guestCredentials', JSON.stringify({
        id: guestId,
        isGuest: true
      }));
      
      // Store initial ratings
      localStorage.setItem(`guest_ratings_${guestId}`, JSON.stringify(defaultRatings));
      
      // Dispatch the guest user to Redux
      dispatch(setUser({
        id: guestId,
        user_metadata: { is_guest: true },
        email: null,
        role: 'guest'
      } as any));

    } catch (error) {
      dispatch(setError((error as Error).message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
          {email ? 'Choose a password' : 'Enter your email'}
        </h2>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium leading-6 text-gray-900">
              Email address
            </label>
            <div className="mt-2">
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 px-3"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium leading-6 text-gray-900">
              Password
            </label>
            <div className="mt-2">
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 px-3"
                placeholder="At least 6 characters"
              />
            </div>
          </div>

          <div className="flex flex-col space-y-4">
            <button
              onClick={handleSignIn}
              disabled={loading}
              className="flex w-full justify-center rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              {loading ? 'Loading...' : 'Sign in'}
            </button>
            <button
              onClick={handleSignUp}
              disabled={loading}
              type="button"
              className="flex w-full justify-center rounded-md bg-white px-3 py-1.5 text-sm font-semibold leading-6 text-blue-600 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              {loading ? 'Loading...' : 'Create account'}
            </button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-gray-500">or</span>
              </div>
            </div>
            <button
              onClick={handleGuestLogin}
              disabled={loading}
              type="button"
              className="flex w-full justify-center rounded-md bg-gray-50 px-3 py-1.5 text-sm font-semibold leading-6 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-100"
            >
              {loading ? 'Loading...' : 'Continue as Guest'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 
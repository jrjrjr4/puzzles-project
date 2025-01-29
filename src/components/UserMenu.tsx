import React, { useState, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store/store';
import { User, LogOut, Settings, UserCircle, LogIn, X } from 'lucide-react';
import { supabase } from '../utils/supabase';
import { loadUserRatings } from '../store/slices/puzzleSlice';
import { categories } from '../data/categories';

export default function UserMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [showSwitchUserModal, setShowSwitchUserModal] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const { user } = useSelector((state: RootState) => state.auth);
  const isGuest = user?.user_metadata?.is_guest;
  const dispatch = useDispatch();

  // Debug current user state
  useEffect(() => {
    console.group('👤 Current User State');
    console.log('User:', user ? {
      id: user.id,
      email: user.email,
      isGuest: isGuest,
      metadata: user.user_metadata
    } : 'No user');
    console.groupEnd();
  }, [user, isGuest]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setShowSignInModal(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debug modal state changes with more detail
  useEffect(() => {
    console.group('🔐 Auth Modal Debug');
    console.log('Modal State:', {
      showSignInModal,
      showSwitchUserModal,
      isSignUp,
      isLoading,
      modalRef: modalRef.current ? 'exists' : 'null'
    });
    console.groupEnd();
  }, [showSignInModal, showSwitchUserModal, isSignUp, isLoading]);

  const handleSignOut = async () => {
    console.group('🚪 Sign Out Process');
    try {
      console.log('Current user before sign out:', user?.email, isGuest ? '(guest)' : '');
      
      // Sign out from Supabase
      await supabase.auth.signOut();
      console.log('Successfully signed out from Supabase');
      
      // Get existing guest session or create new one
      let guestSession = localStorage.getItem('guestSession');
      if (!guestSession) {
        console.log('Creating new guest session...');
        const newGuestSession = {
          guestId: `guest_${Math.random().toString(36).substring(2, 15)}`,
          ratings: {
            overall: { rating: 1600, ratingDeviation: 350 },
            categories: {}
          },
          lastPuzzleState: null,
          solvedPuzzles: []
        };
        localStorage.setItem('guestSession', JSON.stringify(newGuestSession));
        guestSession = JSON.stringify(newGuestSession);
        console.log('New guest session created:', newGuestSession.guestId);
      } else {
        console.log('Using existing guest session');
      }

      // Close the menu
      setIsOpen(false);
      console.log('Sign out process completed');
    } catch (error) {
      console.error('❌ Error during sign out:', error);
    }
    console.groupEnd();
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    console.group('🔐 Sign In Process');
    console.log('Attempting to sign in with email:', email);
    
    setError(null);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      console.log('Sign in successful:', data.user?.email);
      console.log('Previous guest session will be preserved');

      // Close both modals
      setShowSignInModal(false);
      setShowSwitchUserModal(false);
      setIsOpen(false);
      setEmail('');
      setPassword('');
    } catch (error: any) {
      console.error('❌ Sign in error:', error.message);
      setError(error.message);
    } finally {
      setIsLoading(false);
      console.groupEnd();
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    console.group('📝 Sign Up Process');
    
    setError(null);
    setIsLoading(true);

    try {
      // Clean up the email by trimming whitespace and converting to lowercase
      const rawEmail = email;
      const cleanEmail = email.trim().toLowerCase();
      
      // Debug email processing
      console.log('Email validation debug:', {
        rawEmail,
        cleanEmail,
        length: cleanEmail.length,
        containsSpaces: cleanEmail.includes(' '),
        characters: Array.from(cleanEmail).map(c => ({
          char: c,
          code: c.charCodeAt(0)
        }))
      });

      if (!cleanEmail) {
        throw new Error('Please enter your email address');
      }

      // Supabase-specific email validation
      // Only allow letters, numbers, and common email special characters
      const emailLocalPart = cleanEmail.split('@')[0];
      const emailDomain = cleanEmail.split('@')[1];
      
      // Validate local part (before @)
      if (emailLocalPart.length < 3) {
        throw new Error('Email username must be at least 3 characters long');
      }
      
      if (!/^[a-z0-9][a-z0-9._-]*[a-z0-9]$/.test(emailLocalPart)) {
        throw new Error('Email username can only contain letters, numbers, dots, hyphens and underscores, and must start and end with a letter or number');
      }

      // Validate domain part (after @)
      if (!/^[a-z0-9][a-z0-9.-]*[a-z0-9]\.[a-z]{2,}$/.test(emailDomain)) {
        throw new Error('Invalid email domain format');
      }

      console.log('Email validation details:', {
        localPart: emailLocalPart,
        domain: emailDomain,
        localValid: /^[a-z0-9][a-z0-9._-]*[a-z0-9]$/.test(emailLocalPart),
        domainValid: /^[a-z0-9][a-z0-9.-]*[a-z0-9]\.[a-z]{2,}$/.test(emailDomain)
      });

      if (!password) {
        throw new Error('Please choose a password');
      }
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      console.log('Attempting Supabase signup with:', {
        email: cleanEmail,
        passwordLength: password.length
      });

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            email_confirm: true,
            email_validated: true,
            preferred_username: emailLocalPart
          }
        }
      });

      if (error) {
        console.error('Supabase signup error details:', {
          message: error.message,
          status: error.status,
          name: error.name,
          stack: error.stack,
          originalEmail: cleanEmail
        });

        // Handle specific Supabase error cases
        if (error.message.toLowerCase().includes('email') && error.message.toLowerCase().includes('invalid')) {
          // Try signing in instead - the email might already be registered
          console.log('Attempting sign in as fallback...');
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password
          });

          if (signInError) {
            console.error('Sign in fallback failed:', signInError);
            throw new Error('This email address cannot be used. Please try a different email address or check if you already have an account.');
          }

          if (signInData?.user) {
            console.log('Successfully signed in instead of signing up');
            setShowSignInModal(false);
            setEmail('');
            setPassword('');
            return;
          }
        }

        // If we get here, neither signup nor signin worked
        if (error.status === 400) {
          throw new Error('Unable to create account. Please try a different email address.');
        } else if (error.status === 422) {
          throw new Error('Email validation failed. Please check your email format.');
        }
        throw error;
      }
      
      if (data?.user?.identities?.length === 0) {
        throw new Error('This email is already registered. Please sign in instead.');
      }

      console.log('Signup successful:', {
        user: data?.user?.id,
        email: data?.user?.email,
        confirmationSent: true
      });

      alert('Please check your email for the confirmation link to complete your registration!');
      setShowSignInModal(false);
      setEmail('');
      setPassword('');
    } catch (error: any) {
      console.error('❌ Sign up error:', {
        message: error.message,
        type: typeof error,
        isAuthError: error.name === 'AuthApiError',
        fullError: error
      });
      setError(error.message);
    } finally {
      setIsLoading(false);
      console.groupEnd();
    }
  };

  const handleResetRatings = async () => {
    console.group('🔄 Reset Ratings Process');
    try {
      // Create default ratings with 1600 for all categories
      const defaultRating = { rating: 1600, ratingDeviation: 350 };
      const defaultCategories: Record<string, typeof defaultRating> = {};
      categories.forEach((c: { name: string }) => {
        defaultCategories[c.name] = { ...defaultRating };
      });

      const defaultRatings = {
        loaded: true,
        overall: defaultRating,
        categories: defaultCategories
      };

      // Update Redux state
      dispatch(loadUserRatings({ ratings: defaultRatings }));

      if (isGuest) {
        // Update guest session in localStorage
        const guestSession = localStorage.getItem('guestSession');
        if (guestSession) {
          const session = JSON.parse(guestSession);
          session.ratings = defaultRatings;
          localStorage.setItem('guestSession', JSON.stringify(session));
          console.log('💾 Successfully reset guest ratings');
        }
      } else if (user?.id) {
        // Update ratings in Supabase for logged-in users
        const { error } = await supabase
          .from('user_ratings')
          .upsert({
            user_id: user.id,
            ratings: defaultRatings,
            updated_at: new Date().toISOString()
          });

        if (error) {
          console.error('❌ Error resetting ratings in Supabase:', error);
          throw error;
        }
        console.log('✅ Successfully reset ratings in Supabase');
      }

      setIsOpen(false);
    } catch (error) {
      console.error('❌ Error resetting ratings:', error);
    }
    console.groupEnd();
  };

  const handleGoogleSignIn = async () => {
    console.group('🔑 Google Sign In');
    console.log('Starting Google sign-in process...');
    try {
      setError(null);
      setIsLoading(true);

      // Determine if we're in development or production
      const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const redirectUrl = isDevelopment 
        ? `${window.location.origin}/auth/callback`
        : 'https://puzzles-project.vercel.app/auth/callback';

      console.log('OAuth environment:', {
        isDevelopment,
        redirectUrl,
        currentOrigin: window.location.origin,
        hostname: window.location.hostname
      });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl
        }
      });

      console.log('Google sign-in response:', { data, error });

      if (error) throw error;
    } catch (error: any) {
      console.error('Google sign in error:', error.message);
      setError(error.message);
    } finally {
      setIsLoading(false);
      console.groupEnd();
    }
  };

  // Separate component for Google button to ensure it's always rendered
  const GoogleSignInButton = () => {
    console.log('Rendering Google Sign In button');
    return (
      <div className="mb-6">
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </button>
      </div>
    );
  };

  // Function to render auth modal content
  const renderAuthModalContent = () => {
    console.group('🎨 Rendering Modal Content');
    console.log('Modal State:', {
      isSignUp,
      showSignInModal,
      showSwitchUserModal
    });

    const content = (
      <>
        <h2 className="text-2xl font-bold mb-6 text-center">
          {isSignUp ? 'Create your account' : 'Sign in to your account'}
        </h2>

        <GoogleSignInButton />

        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or continue with email</span>
          </div>
        </div>

        <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="mt-6 space-y-6">
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{error}</h3>
                </div>
              </div>
            </div>
          )}

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
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 px-3"
                placeholder={isSignUp ? 'At least 6 characters' : ''}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full justify-center rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (isSignUp ? 'Creating account...' : 'Signing in...') : (isSignUp ? 'Create account' : 'Sign in')}
            </button>
          </div>

          <div className="text-sm text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
              }}
              className="font-semibold text-blue-600 hover:text-blue-500"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>
        </form>
      </>
    );

    console.groupEnd();
    return content;
  };

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <UserCircle className="w-6 h-6 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">
            {isGuest ? 'Guest' : user?.email?.split('@')[0] || 'Guest'}
          </span>
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
            {isGuest ? (
              <>
                <div className="px-4 py-2 text-xs text-gray-500">
                  Playing as Guest
                </div>
                <hr className="my-1" />
                <button
                  onClick={handleResetRatings}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Reset Ratings
                </button>
                <button
                  onClick={() => {
                    setIsSignUp(true);
                    setShowSignInModal(true);
                    setIsOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <User className="w-4 h-4" />
                  Sign up
                </button>
                <button
                  onClick={() => {
                    setIsSignUp(false);
                    setShowSignInModal(true);
                    setIsOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  Sign in
                </button>
              </>
            ) : user ? (
              <>
                <button
                  onClick={handleResetRatings}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Reset Ratings
                </button>
                <button
                  onClick={() => {
                    setShowSwitchUserModal(true);
                    setIsOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <User className="w-4 h-4" />
                  Switch User
                </button>
                <hr className="my-1" />
                <button
                  onClick={handleSignOut}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  setShowSignInModal(true);
                  setIsOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                Sign in
              </button>
            )}
          </div>
        )}
      </div>

      {/* Sign In Modal */}
      {showSignInModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div ref={modalRef} className="bg-white rounded-lg p-6 w-full max-w-md relative">
            <button
              onClick={() => {
                console.log('Closing auth modal');
                setShowSignInModal(false);
                setError(null);
                setEmail('');
                setPassword('');
              }}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
            
            {renderAuthModalContent()}
          </div>
        </div>
      )}

      {/* Switch User Modal */}
      {showSwitchUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div ref={modalRef} className="bg-white rounded-lg p-6 w-96 relative">
            <button
              onClick={() => setShowSwitchUserModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-semibold mb-4">Switch User</h2>
            <form onSubmit={handleSignIn}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              {error && (
                <div className="mb-4 text-sm text-red-600">
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {isLoading ? 'Switching...' : 'Switch User'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
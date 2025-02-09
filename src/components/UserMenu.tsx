import React, { useState, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store/store';
import { AppDispatch } from '../store/store';
import { User, LogOut, Settings, UserCircle, LogIn, X } from 'lucide-react';
import { supabase } from '../utils/supabase';
import { loadUserRatings } from '../store/slices/puzzleSlice';
import { categories } from '../data/categories';
import { signInWithGoogle, authSlice } from '../store/slices/authSlice';

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
  const dispatch = useDispatch<AppDispatch>();

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

      // Clear user state in Redux
      dispatch(authSlice.actions.setUser(null));
      dispatch(authSlice.actions.setError(null));
      
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

  /**
   * Handles sign in with Google.
   */
  const handleGoogleSignIn = async (): Promise<void> => {
    console.group('🔐 Google Sign In Process');
    try {
      await dispatch(signInWithGoogle()).unwrap();
      console.log('Google sign in successful');
      setShowSignInModal(false);
    } catch (error: any) {
      console.error('Google sign in failed:', error.message);
      setError(error.message);
    } finally {
      console.groupEnd();
    }
  };

  const handleSwitchUser = async () => {
    console.group('🔄 Switch User Process');
    try {
      // Sign out from Supabase
      await supabase.auth.signOut();
      // Clear user state in Redux and reset any error
      dispatch(authSlice.actions.setUser(null));
      dispatch(authSlice.actions.setError(null));
      // Open the sign-in modal, ensuring the Google sign-in button is visible
      setShowSignInModal(true);

      
      // Close the switch user modal if it's open
      setShowSwitchUserModal(false);
      console.log('User signed out successfully, ready to sign in again.');
    } catch (error: any) {
      console.error('Error switching user:', error.message);
      dispatch(authSlice.actions.setError(error.message));
    } finally {
      console.groupEnd();
    }
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

        {(showSignInModal || showSwitchUserModal) && (
          <div className="p-4 bg-gray-100 rounded-lg shadow-md">
            <button 
              onClick={handleGoogleSignIn}
              className="gsi-material-button w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-800 font-medium py-2 px-4 rounded-md border border-gray-300 shadow-sm transition-colors"
            >
              <div className="gsi-material-button-icon w-5 h-5">
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{display: 'block'}}>
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  <path fill="none" d="M0 0h48v48H0z"></path>
                </svg>
              </div>
              <span className="gsi-material-button-contents text-base">Sign in with Google</span>
            </button>
          </div>
        )}

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

        <div className="mt-4">
          <button
            type="button"
            onClick={handleSwitchUser}
            className="w-full flex justify-center rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Switch User
          </button>
        </div>
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

      {(showSignInModal || showSwitchUserModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div ref={modalRef} className="bg-white rounded-lg p-6 w-full max-w-md relative">
            <button
              onClick={() => {
                console.log('Closing auth modal');
                setShowSignInModal(false);
                setShowSwitchUserModal(false);
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
    </>
  );
}
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

      setShowSignInModal(false);
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
                <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Profile
                </button>
                <button
                  onClick={handleResetRatings}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Reset Ratings
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
          <div ref={modalRef} className="bg-white rounded-lg p-6 w-96 relative">
            <button
              onClick={() => setShowSignInModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-semibold mb-4">Sign in</h2>
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
                {isLoading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
} 
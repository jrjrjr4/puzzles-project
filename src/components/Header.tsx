import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Sword, LogOut } from 'lucide-react';
import { RootState } from '../store/store';
import { supabase } from '../utils/supabase';
import { setUser } from '../store/slices/authSlice';

export default function Header() {
  const dispatch = useDispatch();
  const userRatings = useSelector((state: RootState) => state.puzzle.userRatings);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    dispatch(setUser(null));
  };

  return (
    <header className="w-full bg-white shadow-md">
      <div className="container mx-auto px-4 py-4 flex items-center">
        <div className="w-1/3">
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
        <div className="w-1/3 flex items-center justify-center space-x-2">
          <Sword className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-800">Chess Training</h1>
        </div>
        <div className="w-1/3 flex justify-end">
          <div className="text-gray-600">
            Rating: {userRatings.loaded && userRatings.overall ? (
              <>
                <span className="font-semibold">{Math.round(userRatings.overall.rating)}</span>
                <span className="text-sm text-gray-500 ml-1">
                  ±{Math.round(userRatings.overall.ratingDeviation)}
                </span>
              </>
            ) : (
              <span className="text-gray-400">Loading...</span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
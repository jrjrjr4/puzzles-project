import React from 'react';
import { useSelector } from 'react-redux';
import { Sword } from 'lucide-react';
import { RootState } from '../store/store';
import NavigationMenu from './NavigationMenu';

export default function Header() {
  const userRatings = useSelector((state: RootState) => state.puzzle.userRatings);

  return (
    <header className="w-full bg-white shadow-md">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center space-x-2">
              <Sword className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-800">Chess Training</h1>
            </div>
            <div className="hidden sm:block">
              <NavigationMenu />
            </div>
          </div>

          {/* Overall Rating - Desktop */}
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-gray-600">Overall:</span>
            {userRatings.loaded && userRatings.overall ? (
              <span className="font-semibold text-lg text-blue-600">{Math.round(userRatings.overall.rating)}</span>
            ) : (
              <span className="text-gray-400">Loading...</span>
            )}
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="sm:hidden mt-4 flex justify-between items-center">
          <NavigationMenu />
          <div className="flex items-center gap-2">
            <span className="text-gray-600">Overall:</span>
            {userRatings.loaded && userRatings.overall ? (
              <span className="font-semibold text-lg text-blue-600">{Math.round(userRatings.overall.rating)}</span>
            ) : (
              <span className="text-gray-400">Loading...</span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
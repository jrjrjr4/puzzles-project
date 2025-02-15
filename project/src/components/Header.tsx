import React from 'react';
import { useSelector } from 'react-redux';
import { Sword } from 'lucide-react';
import { RootState } from '../store/store';

export default function Header() {
  const userRatings = useSelector((state: RootState) => state.puzzle.userRatings);

  return (
    <header className="w-full bg-white shadow-md">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Sword className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-800">Chess Training</h1>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-gray-600">
            Rating: <span className="font-semibold">{userRatings.overall}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';

export default function ThemeRatings() {
  const userRatings = useSelector((state: RootState) => state.puzzle.userRatings);

  if (!userRatings?.categories || Object.keys(userRatings.categories).length === 0) {
    return null;
  }

  // Get all themes with their ratings and sort by rating
  const themeRatings = Object.entries(userRatings.categories)
    .filter(([_, data]) => data.attempts > 0)
    .sort((a, b) => b[1].rating - a[1].rating)
    .slice(0, 10); // Take top 10

  const ThemeRow = ({ theme, rating, attempts }: { theme: string, rating: number, attempts: number }) => (
    <div className="flex justify-between items-center py-2 border-b last:border-b-0">
      <span className="text-gray-700">{theme}</span>
      <div className="flex gap-4">
        <span className="text-sm text-gray-500">{attempts} puzzles</span>
        <span className="font-medium w-16 text-right">{Math.round(rating)}</span>
      </div>
    </div>
  );

  return (
    <div className="mt-6 bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Top Theme Ratings</h2>
      <div className="border rounded-md p-3 bg-gray-50">
        {themeRatings.map(([theme, data]) => (
          <ThemeRow 
            key={theme} 
            theme={theme} 
            rating={data.rating} 
            attempts={data.attempts}
          />
        ))}
      </div>
    </div>
  );
} 
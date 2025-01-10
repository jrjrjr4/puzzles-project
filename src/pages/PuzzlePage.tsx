import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import ThemeRatings from '../components/ThemeRatings';
import CategoryRatings from '../components/CategoryRatings';

export default function PuzzlePage() {
  const lastRatingUpdates = useSelector((state: RootState) => state.puzzle.lastRatingUpdates);
  const userRatings = useSelector((state: RootState) => state.puzzle.userRatings);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main chess board area */}
          <div className="lg:col-span-8">
            {/* Chess board and controls */}
          </div>

          {/* Sidebar with ratings */}
          <div className="lg:col-span-4 space-y-4">
            {/* Rating Updates Section */}
            {lastRatingUpdates && (
              <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
                <h2 className="text-lg font-medium mb-3 sm:mb-4">Rating Updates:</h2>
                <div className="space-y-2">
                  {Object.entries(lastRatingUpdates.categories).map(([category, update]) => (
                    <div key={category} className="flex justify-between text-sm sm:text-base">
                      <span>{category}:</span>
                      <span>
                        {Math.round(update.oldRating)} → {Math.round(update.newRating)} 
                        ({update.newRating > update.oldRating ? '+' : ''}
                        {Math.round(update.newRating - update.oldRating)})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Categories/Ratings component */}
            <CategoryRatings />
          </div>
        </div>
      </div>
    </div>
  );
} 
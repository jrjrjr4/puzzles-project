import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { getRatingConfidence } from '../utils/puzzles';
import { themeToCategory } from '../data/categories';

export default function PuzzleInfo() {
  const puzzle = useSelector((state: RootState) => state.puzzle.currentPuzzle);

  if (!puzzle) {
    return null;
  }

  const rating = typeof puzzle.rating === 'number' ? puzzle.rating : 1200;
  const ratingDeviation = typeof puzzle.ratingDeviation === 'number' ? puzzle.ratingDeviation : 350;
  const confidence = getRatingConfidence(ratingDeviation);

  // Map themes to categories
  const displayThemes = (puzzle.themes || ['tactics'])
    .map(theme => {
      const lowercaseTheme = theme.toLowerCase().trim();
      const mappedTheme = themeToCategory[lowercaseTheme];
      return mappedTheme || (theme.charAt(0).toUpperCase() + theme.slice(1).toLowerCase());
    })
    .filter((theme, index, self) => self.indexOf(theme) === index);

  return (
    <div className="bg-white rounded-xl shadow-lg p-4">
      <h2 className="text-xl font-semibold text-gray-800 mb-3">Puzzle Info</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {/* Puzzle ID Section */}
        <div className="min-w-[120px]">
          <div className="text-sm text-gray-500">Puzzle ID</div>
          <div className="font-medium">{puzzle.id}</div>
        </div>

        {/* Rating Section */}
        <div className="min-w-[140px]">
          <div className="text-sm text-gray-500">Rating</div>
          <div className="font-medium">
            {rating.toLocaleString()}
            <span className="text-sm text-gray-500 ml-2">
              ±{Math.round(ratingDeviation)}
            </span>
          </div>
          <div className="text-sm text-gray-500">
            Confidence: {confidence}
          </div>
        </div>

        {/* Popularity Section */}
        <div className="min-w-[140px]">
          <div className="text-sm text-gray-500">Popularity</div>
          <div className="font-medium">
            {puzzle.popularity}%
            <span className="text-sm text-gray-500 ml-2">
              ({puzzle.nbPlays.toLocaleString()} plays)
            </span>
          </div>
        </div>

        {/* Themes Section - spans full width */}
        <div className="col-span-2 md:col-span-3">
          <div className="text-sm text-gray-500">Themes</div>
          <div className="flex flex-wrap gap-2 mt-1">
            {displayThemes.map((theme) => (
              <span
                key={theme}
                className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
              >
                {theme}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 
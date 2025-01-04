import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { getRatingConfidence } from '../utils/puzzles';

export default function PuzzleInfo() {
  const puzzle = useSelector((state: RootState) => state.puzzle.currentPuzzle);

  if (!puzzle) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Puzzle Information</h2>
      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-gray-600">ID:</span>
          <span className="font-medium">{puzzle.id}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Rating:</span>
          <span className="font-medium">{puzzle.rating}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Rating Confidence:</span>
          <span className="font-medium">{getRatingConfidence(puzzle.ratingDeviation)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Popularity:</span>
          <span className="font-medium">{puzzle.popularity}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Times Played:</span>
          <span className="font-medium">{puzzle.nbPlays.toLocaleString()}</span>
        </div>
        <div>
          <span className="text-gray-600 block mb-1">Themes:</span>
          <div className="flex flex-wrap gap-2">
            {puzzle.themes.map(theme => (
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
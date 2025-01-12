import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Chessboard from './Chessboard';
import CategoryRatings from './CategoryRatings';
import PuzzleInfo from './PuzzleInfo';
import { parsePuzzleCsv } from '../utils/puzzles';
import { setCurrentPuzzle } from '../store/slices/puzzleSlice';
import { getNextPuzzle } from '../utils/puzzleSelector';
import { RootState } from '../store/store';

export default function GameSection() {
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const userRatings = useSelector((state: RootState) => state.puzzle.userRatings);
  const [usedPuzzleIds] = useState<Set<string>>(new Set());

  const loadNextPuzzle = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('Fetching puzzle CSV...');
      const response = await fetch('/filtered_puzzles.csv');
      if (!response.ok) {
        throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`);
      }

      const csvContent = await response.text();
      console.log('Parsing puzzles...');
      console.log('First few lines:', csvContent.split('\n').slice(0, 2));

      const puzzles = parsePuzzleCsv(csvContent);
      console.log(`Parsed ${puzzles.length} puzzles`);
      
      // Convert user ratings to the format expected by puzzle selector
      const themeRatings: { [theme: string]: number } = {};
      Object.entries(userRatings.categories).forEach(([theme, data]) => {
        themeRatings[theme] = data.rating;
      });
      
      // Get next puzzle using our selection system
      const selectedPuzzle = getNextPuzzle(themeRatings, puzzles, usedPuzzleIds);
      console.log('Selected puzzle:', selectedPuzzle);

      if (selectedPuzzle) {
        usedPuzzleIds.add(selectedPuzzle.id);
        dispatch(setCurrentPuzzle(selectedPuzzle));
      } else {
        setError('No suitable puzzle found');
      }
    } catch (error) {
      console.error('Failed to load puzzle:', error);
      setError(error instanceof Error ? error.message : 'Failed to load puzzle');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex gap-8 min-h-[calc(100vh-12rem)]">
      <div className="flex-1 flex flex-col items-start">
        <div className="w-full mb-6">
          <button
            onClick={loadNextPuzzle}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : 'Load Next Puzzle'}
          </button>
          {error && (
            <div className="mt-2 p-2 text-sm text-red-600 bg-red-100 rounded">
              {error}
            </div>
          )}
        </div>
        <div className="w-[min(100%,800px)]">
          <Chessboard />
        </div>
      </div>
      <div className="w-[400px] flex-shrink-0">
        <PuzzleInfo />
        <CategoryRatings />
      </div>
    </div>
  );
}
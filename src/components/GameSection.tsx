import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import Chessboard from './Chessboard';
import CategoryRatings from './CategoryRatings';
import PuzzleInfo from './PuzzleInfo';
import { parsePuzzleCsv, getRandomPuzzle } from '../utils/puzzles';
import { setCurrentPuzzle } from '../store/slices/puzzleSlice';

export default function GameSection() {
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(false);

  const loadRandomPuzzle = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/lichess_puzzles_trim.csv');
      const csvContent = await response.text();
      const puzzles = parsePuzzleCsv(csvContent);
      const randomPuzzle = getRandomPuzzle(puzzles);
      dispatch(setCurrentPuzzle(randomPuzzle));
    } catch (error) {
      console.error('Failed to load puzzle:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex gap-8 min-h-[calc(100vh-12rem)]">
      <div className="flex-1 flex flex-col items-start">
        <button
          onClick={loadRandomPuzzle}
          disabled={isLoading}
          className="mb-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'Loading...' : 'Load Random Puzzle'}
        </button>
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
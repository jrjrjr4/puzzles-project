import React, { useState, useEffect, useRef } from 'react';
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
  const [rightPanelWidth, setRightPanelWidth] = useState(420);
  const isDragging = useRef(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    // Prevent text selection while dragging
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.current) return;
    
    // Calculate new width based on mouse position
    const newWidth = Math.max(
      380, // increased minimum width
      Math.min(
        800, // increased maximum width
        window.innerWidth - e.clientX // distance from right edge
      )
    );
    
    setRightPanelWidth(newWidth);
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  // Clean up event listeners
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

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
    <div className="flex flex-col lg:flex-row h-[calc(100vh-12rem)]">
      <div className="flex-1 flex flex-col items-start overflow-auto min-w-0">
        <div className="w-full mb-4 flex justify-center">
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
        <div className="w-full max-w-[800px] mx-auto">
          <Chessboard />
        </div>
      </div>

      {/* Resizer handle */}
      <div
        className="hidden lg:block w-1 bg-gray-200 hover:bg-blue-400 cursor-col-resize transition-colors"
        onMouseDown={handleMouseDown}
      />

      <div 
        className="w-full lg:flex-shrink-0 overflow-y-auto"
        style={{ width: `${rightPanelWidth}px` }}
      >
        <div className="sticky top-0 bg-gray-50 z-10">
          <PuzzleInfo />
        </div>
        <CategoryRatings />
      </div>
    </div>
  );
}
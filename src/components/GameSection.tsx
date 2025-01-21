import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Chessboard from './Chessboard';
import CategoryRatings from './CategoryRatings';
import PuzzleInfo from './PuzzleInfo';
import { parsePuzzleCsv } from '../utils/puzzles';
import { setCurrentPuzzle, loadLastPuzzle, saveCurrentPuzzle, fetchLastPuzzle } from '../store/slices/puzzleSlice';
import { getNextPuzzle } from '../utils/puzzleSelector';
import { RootState, AppDispatch } from '../store/store';

export default function GameSection() {
  const dispatch = useDispatch<AppDispatch>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const userRatings = useSelector((state: RootState) => state.puzzle.userRatings);
  const currentPuzzle = useSelector((state: RootState) => state.puzzle.currentPuzzle);
  const user = useSelector((state: RootState) => state.auth.user);
  const [usedPuzzleIds] = useState<Set<string>>(new Set());
  const [rightPanelWidth] = useState(520);
  const [boardSize, setBoardSize] = useState(0);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startSize = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [puzzleSolved, setPuzzleSolved] = useState(false);
  const [puzzleFailed, setPuzzleFailed] = useState(false);
  const isInitializing = useRef(false);
  const isLoadingPuzzle = useRef(false);

  // Load the last puzzle on mount
  useEffect(() => {
    let mounted = true;

    async function initializePuzzle() {
      if (isInitializing.current || !mounted) return;
      
      try {
        isInitializing.current = true;
        
        if (user?.id && !currentPuzzle) {
          await dispatch(fetchLastPuzzle(user.id));
          if (!mounted) return;
          
          // Check if we have a puzzle after fetching
          if (!currentPuzzle && mounted) {
            await loadNextPuzzle();
          }
        } else if (!currentPuzzle && mounted) {
          await loadNextPuzzle();
        }
      } finally {
        isInitializing.current = false;
      }
    }

    initializePuzzle();

    return () => {
      mounted = false;
    };
  }, [dispatch, user?.id]);

  // Save puzzle when it changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (user?.id && currentPuzzle) {
        dispatch(saveCurrentPuzzle(user.id, currentPuzzle));
      }
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [dispatch, user?.id, currentPuzzle]);

  // Calculate initial board size and update on window resize
  useEffect(() => {
    const calculateBoardSize = () => {
      if (!containerRef.current) return;
      const containerWidth = containerRef.current.offsetWidth;
      const isMobile = window.innerWidth < 768;
      const maxSize = isMobile ? Math.min(containerWidth - 32, window.innerHeight - 200) : 600;
      setBoardSize(maxSize);
    };

    calculateBoardSize();
    window.addEventListener('resize', calculateBoardSize);
    return () => window.removeEventListener('resize', calculateBoardSize);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    startY.current = e.clientY;
    startSize.current = boardSize;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.current) return;
    const deltaY = e.clientY - startY.current;
    const newSize = Math.max(300, Math.min(800, startSize.current + deltaY));
    setBoardSize(newSize);
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  const loadNextPuzzle = async () => {
    if (isLoadingPuzzle.current) return;
    
    try {
      isLoadingPuzzle.current = true;
      setIsLoading(true);
      setError(null);
      setPuzzleSolved(false);
      setPuzzleFailed(false);
      
      const response = await fetch('/filtered_puzzles.csv');
      if (!response.ok) {
        throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`);
      }
      const csvContent = await response.text();
      const puzzles = parsePuzzleCsv(csvContent);
      
      const themeRatings: { [theme: string]: number } = {};
      Object.entries(userRatings.categories).forEach(([theme, data]) => {
        themeRatings[theme] = data.rating;
      });
      
      const selectedPuzzle = getNextPuzzle(themeRatings, puzzles, usedPuzzleIds);

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
      isLoadingPuzzle.current = false;
    }
  };

  const handlePuzzleComplete = (solved: boolean) => {
    setPuzzleSolved(solved);
    setPuzzleFailed(!solved);
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen pb-4 md:pb-8">
      <div className="flex-1 flex flex-col items-start overflow-auto min-w-0 relative">
        {(puzzleSolved || puzzleFailed) && (
          <div className="absolute top-4 left-4 z-10">
            <button
              onClick={loadNextPuzzle}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-base font-medium shadow-md hover:shadow-lg transition-all"
            >
              {isLoading ? 'Loading...' : 'Next Puzzle'}
            </button>
          </div>
        )}
        <div ref={containerRef} className="w-full flex items-center justify-center relative px-2 md:px-4">
          <div style={{ width: boardSize ? `${boardSize}px` : '100%', maxWidth: '100%' }} className="relative">
            {boardSize > 0 && <Chessboard size={boardSize} onPuzzleComplete={handlePuzzleComplete} />}
            <div
              className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize group hidden md:block"
              onMouseDown={handleMouseDown}
            >
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-gray-300 group-hover:bg-blue-400 transition-colors transform rotate-45" />
            </div>
          </div>
        </div>
        {error && (
          <div className="w-full text-center mt-4">
            <div className="inline-block p-2 text-sm text-red-600 bg-red-100 rounded">
              {error}
            </div>
          </div>
        )}
      </div>

      <div className="mt-2 md:mt-0 md:ml-4 md:w-[520px] md:flex-shrink-0">
        <div 
          className="w-full overflow-y-auto max-h-[calc(100vh-8rem)] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent bg-white rounded-xl shadow-lg"
        >
          <div className="hidden md:block sticky top-0 bg-gray-50 z-10">
            <PuzzleInfo />
          </div>
          <div>
            <CategoryRatings />
          </div>
          <div className="md:hidden bg-gray-50">
            <PuzzleInfo />
          </div>
        </div>
      </div>
    </div>
  );
}
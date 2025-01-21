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
  const isAuthLoading = useSelector((state: RootState) => state.auth.loading);
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
  const lastUserId = useRef<string | null>(null);
  const [cachedPuzzles, setCachedPuzzles] = useState<ReturnType<typeof parsePuzzleCsv>>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const loadingTimeoutRef = useRef<NodeJS.Timeout>();

  // Load the last puzzle on mount or when user changes
  useEffect(() => {
    let mounted = true;
    console.log('🔄 [Mount] GameSection mounting with user:', user?.id);
    console.log('📊 [Mount] Current puzzle state:', currentPuzzle?.id);
    console.log('🔒 [Mount] isInitializing:', isInitializing.current);
    console.log('🏷️ [Mount] lastUserId:', lastUserId.current);

    // Skip initialization if auth is still loading
    if (isAuthLoading) {
      console.log('⏳ [Mount] Auth still loading, skipping initialization');
      return;
    }

    // Reset initialization state on mount if we don't have a puzzle
    if (!currentPuzzle) {
      isInitializing.current = false;
    }

    async function initializePuzzle() {
      console.log('⏳ [Initialize] Starting initialization check');
      console.log('👤 [Initialize] Current user:', user?.id);
      console.log('🎯 [Initialize] Current puzzle:', currentPuzzle?.id);
      
      // Skip if already initializing
      if (isInitializing.current) {
        console.log('⚠️ [Initialize] Skipping - Already initializing');
        return;
      }

      // Skip if component unmounted
      if (!mounted) {
        console.log('⚠️ [Initialize] Skipping - Component unmounted');
        return;
      }
      
      // Skip if we already have a puzzle for this user
      if (currentPuzzle && user?.id === lastUserId.current) {
        console.log('✅ [Initialize] Skipping - Already have puzzle for current user');
        return;
      }

      // Skip if we have a puzzle but no user (anonymous mode)
      if (currentPuzzle && !user?.id && !lastUserId.current) {
        console.log('✅ [Initialize] Skipping - Have puzzle for anonymous user');
        return;
      }
      
      try {
        console.log('🔄 [Initialize] Starting puzzle initialization');
        isInitializing.current = true;
        setIsLoading(true);
        
        // Only clear puzzle state if we're changing users
        if (user?.id !== lastUserId.current) {
          console.log('🧹 [Initialize] Clearing puzzle state - User changed');
          dispatch(setCurrentPuzzle(null));
          lastUserId.current = user?.id || null;
        }
        
        if (user?.id) {
          console.log('📖 [Initialize] Fetching last puzzle for user:', user.id);
          const result = await dispatch(fetchLastPuzzle(user.id)) as any;
          console.log('📦 [Initialize] Fetch result:', result?.payload?.id);
          
          if (!mounted) {
            console.log('⚠️ [Initialize] Aborted - Component unmounted during fetch');
            return;
          }
          
          if (!result?.payload && mounted) {
            console.log('🎯 [Initialize] No last puzzle found, loading new puzzle');
            await loadNextPuzzle();
          }
        } else if (!currentPuzzle && mounted) {
          console.log('🎯 [Initialize] Anonymous user, loading new puzzle');
          await loadNextPuzzle();
        }
      } catch (error) {
        console.error('❌ [Initialize] Error:', error);
        if (mounted) {
          setError(error instanceof Error ? error.message : 'Failed to initialize puzzle');
        }
      } finally {
        if (mounted) {
          console.log('✨ [Initialize] Cleanup - Still mounted');
          setIsLoading(false);
          isInitializing.current = false;
        }
      }
    }

    // Start initialization immediately if needed
    if (!currentPuzzle || user?.id !== lastUserId.current) {
      initializePuzzle();
    }

    return () => {
      mounted = false;
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [dispatch, user?.id, currentPuzzle, isAuthLoading]);

  // Save puzzle when it changes
  useEffect(() => {
    if (!user?.id || !currentPuzzle) return;
    
    const timeoutId = setTimeout(() => {
      dispatch(saveCurrentPuzzle(user.id, currentPuzzle));
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

    // Calculate size immediately
    calculateBoardSize();
    
    // Recalculate after a short delay to ensure container is properly rendered
    const initialTimer = setTimeout(calculateBoardSize, 100);

    // Add resize listener
    window.addEventListener('resize', calculateBoardSize);
    
    return () => {
      window.removeEventListener('resize', calculateBoardSize);
      clearTimeout(initialTimer);
    };
  }, [currentPuzzle]); // Add currentPuzzle as dependency to recalculate when puzzle changes

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

  // Load puzzles on mount
  useEffect(() => {
    async function loadPuzzles() {
      try {
        const response = await fetch('/filtered_puzzles.csv');
        if (!response.ok) {
          throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`);
        }
        const csvContent = await response.text();
        setCachedPuzzles(parsePuzzleCsv(csvContent));
      } catch (error) {
        console.error('Failed to load puzzles:', error);
        setError(error instanceof Error ? error.message : 'Failed to load puzzles');
      } finally {
        setIsInitialLoad(false);
      }
    }
    loadPuzzles();
  }, []);

  const loadNextPuzzle = async () => {
    // Debug log for next puzzle button click
    console.log('🎯 [Next Puzzle] Button clicked');
    
    // Prevent multiple simultaneous puzzle loads
    if (isLoadingPuzzle.current) {
      console.log('⚠️ [Next Puzzle] Blocked - Already loading puzzle');
      return;
    }
    
    // Clear any existing loading timeout
    if (loadingTimeoutRef.current) {
      console.log('🧹 [Next Puzzle] Clearing existing loading timeout');
      clearTimeout(loadingTimeoutRef.current);
    }
    
    try {
      console.log('🔄 [Next Puzzle] Starting puzzle load');
      isLoadingPuzzle.current = true;
      setIsLoading(true);
      setError(null);
      
      if (cachedPuzzles.length === 0) {
        throw new Error('No puzzles available');
      }
      
      const themeRatings: { [theme: string]: number } = {};
      Object.entries(userRatings.categories).forEach(([theme, data]) => {
        themeRatings[theme] = data.rating;
      });
      
      const selectedPuzzle = getNextPuzzle(themeRatings, cachedPuzzles, usedPuzzleIds);

      if (selectedPuzzle) {
        usedPuzzleIds.add(selectedPuzzle.id);
        console.log(`✅ [Next Puzzle] Selected puzzle: ${selectedPuzzle.id}`);
        
        // Set a loading timeout to ensure state updates are synchronized
        await new Promise<void>((resolve) => {
          loadingTimeoutRef.current = setTimeout(() => {
            if (isLoadingPuzzle.current) {
              console.log(`🎮 [Next Puzzle] Setting current puzzle: ${selectedPuzzle.id}`);
              dispatch(setCurrentPuzzle(selectedPuzzle));
              setPuzzleSolved(false);
              setPuzzleFailed(false);
              resolve();
            } else {
              console.log('⚠️ [Next Puzzle] Cancelled - Loading state cleared');
              resolve();
            }
          }, 500); // Increased delay to ensure proper state synchronization
        });
      } else {
        setError('No suitable puzzle found');
      }
    } catch (error) {
      console.error('Failed to load puzzle:', error);
      setError(error instanceof Error ? error.message : 'Failed to load puzzle');
    } finally {
      // Add a small delay before clearing loading states to prevent flashing
      setTimeout(() => {
        console.log('✨ [Next Puzzle] Cleaning up loading states');
        setIsLoading(false);
        isLoadingPuzzle.current = false;
      }, 100);
    }
  };

  const handlePuzzleComplete = (solved: boolean) => {
    // Set puzzle completion states
    setPuzzleSolved(solved);
    setPuzzleFailed(!solved);
    
    // Reset loading states when puzzle is completed
    setIsLoading(false);
    isLoadingPuzzle.current = false;
    
    // Clear any pending loading timeouts
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen pb-4 md:pb-8">
      <div className="flex-1 flex flex-col items-start overflow-auto min-w-0 relative">
        {/* Show loading state on initial load */}
        {isInitialLoad ? (
          <div className="w-full aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
            <div className="text-gray-500">Loading puzzles...</div>
          </div>
        ) : (
          <>
            {(puzzleSolved || puzzleFailed) && (
              <div className="absolute top-4 left-4 z-10">
                <button
                  onClick={loadNextPuzzle}
                  disabled={isLoadingPuzzle.current}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-base font-medium shadow-md hover:shadow-lg transition-all"
                >
                  {isLoadingPuzzle.current ? 'Loading...' : 'Next Puzzle'}
                </button>
              </div>
            )}
            <div ref={containerRef} className="w-full flex items-center justify-center relative px-2 md:px-4">
              <div style={{ width: boardSize ? `${boardSize}px` : '100%', maxWidth: '100%' }} className="relative">
                {/* Always show board when we have a puzzle */}
                {boardSize > 0 && currentPuzzle && (
                  <Chessboard size={boardSize} onPuzzleComplete={handlePuzzleComplete} />
                )}
                <div
                  className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize group hidden md:block"
                  onMouseDown={handleMouseDown}
                >
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-gray-300 group-hover:bg-blue-400 transition-colors transform rotate-45" />
                </div>
              </div>
            </div>
          </>
        )}
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
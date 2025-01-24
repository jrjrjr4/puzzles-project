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
  const lastRatingUpdates = useSelector((state: RootState) => state.puzzle.lastRatingUpdates);
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
  const [precomputedNextPuzzle, setPrecomputedNextPuzzle] = useState<ReturnType<typeof parsePuzzleCsv>[0] | null>(null);
  const [previousPuzzle, setPreviousPuzzle] = useState<ReturnType<typeof parsePuzzleCsv>[0] | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Add performance measurement
  const transitionStartTime = useRef<number | null>(null);

  // Add transition handling
  const [isTransitioningBoard, setIsTransitioningBoard] = useState(false);
  const transitionTimeoutRef = useRef<NodeJS.Timeout>();

  // Effect to log state changes
  useEffect(() => {
    console.group('🔄 [GameSection] State Update');
    console.log('Current Puzzle:', currentPuzzle?.id);
    console.log('Is Loading:', isLoading);
    console.log('Is Transitioning:', isTransitioning);
    console.log('Precomputed Next:', precomputedNextPuzzle?.id);
    console.log('Previous Puzzle:', previousPuzzle?.id);
    if (transitionStartTime.current) {
      console.log('Transition Time:', Date.now() - transitionStartTime.current, 'ms');
    }
    console.groupEnd();
  }, [currentPuzzle, isLoading, isTransitioning, precomputedNextPuzzle, previousPuzzle]);

  // Effect to precompute next puzzle when ratings are updated
  useEffect(() => {
    if (lastRatingUpdates && cachedPuzzles.length > 0) {
      console.log('🎯 [Precompute] Computing next puzzle after ratings update');
      const themeRatings: { [theme: string]: number } = {};
      Object.entries(userRatings.categories).forEach(([theme, data]) => {
        themeRatings[theme] = data.rating;
      });
      
      const nextPuzzle = getNextPuzzle(themeRatings, cachedPuzzles, usedPuzzleIds);
      if (nextPuzzle) {
        console.log('✨ [Precompute] Next puzzle ready:', nextPuzzle.id);
        setPrecomputedNextPuzzle(nextPuzzle);
      }
    }
  }, [lastRatingUpdates, cachedPuzzles, userRatings.categories, usedPuzzleIds]);

  // Load puzzles on mount
  useEffect(() => {
    async function loadPuzzles() {
      try {
        const response = await fetch('/filtered_puzzles.csv');
        if (!response.ok) {
          throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`);
        }
        const csvContent = await response.text();
        const puzzles = parsePuzzleCsv(csvContent);
        setCachedPuzzles(puzzles);
        
        // If we're a guest user with no puzzle, load one now that we have puzzles
        if (user?.user_metadata?.is_guest && !currentPuzzle && !isInitializing.current) {
          console.log('🎲 [Load] Guest user detected, loading initial puzzle');
          loadNextPuzzle();
        }
      } catch (error) {
        console.error('Failed to load puzzles:', error);
        setError(error instanceof Error ? error.message : 'Failed to load puzzles');
      } finally {
        setIsInitialLoad(false);
      }
    }
    loadPuzzles();
  }, []);

  // Modified initialization logic to check for cached puzzles
  useEffect(() => {
    let mounted = true;
    console.log('🔄 [Mount] GameSection mounting with user:', user?.id);
    console.log('📊 [Mount] Current puzzle state:', currentPuzzle?.id);
    console.log('🔒 [Mount] isInitializing:', isInitializing.current);
    console.log('🏷️ [Mount] lastUserId:', lastUserId.current);
    console.log('📚 [Mount] Cached puzzles:', cachedPuzzles.length);

    // Skip initialization if auth is still loading or we don't have puzzles yet
    if (isAuthLoading || cachedPuzzles.length === 0) {
      console.log('⏳ [Mount] Skipping initialization - Auth loading or no puzzles yet');
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
        
        // For guest users, skip fetching last puzzle and just load a new one
        if (user?.user_metadata?.is_guest) {
          console.log('👥 [Initialize] Guest user detected, loading new puzzle');
          await loadNextPuzzle();
        } else if (user?.id) {
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
  }, [dispatch, user?.id, currentPuzzle, isAuthLoading, cachedPuzzles.length]);

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

  // Effect to handle puzzle transitions
  useEffect(() => {
    if (currentPuzzle?.id) {
      setIsTransitioningBoard(true);
      // Clear any existing transition timeout
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
      // Set a short timeout to ensure smooth transition
      transitionTimeoutRef.current = setTimeout(() => {
        setIsTransitioningBoard(false);
      }, 50);
    }
    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, [currentPuzzle?.id]);

  const loadNextPuzzle = async () => {
    console.log('🎯 [Next] Loading next puzzle');
    setPuzzleSolved(false); // Reset puzzle completion state
    setPuzzleFailed(false);
    setIsTransitioning(true);
    setIsTransitioningBoard(true);
    transitionStartTime.current = Date.now();

    try {
      if (cachedPuzzles.length === 0) {
        setError('Loading puzzles...');
        return;
      }

      console.log('📊 [Next Puzzle] Current State:', {
        currentPuzzleId: currentPuzzle?.id,
        precomputedId: precomputedNextPuzzle?.id,
        isLoading: isLoading,
        cachedPuzzlesCount: cachedPuzzles.length
      });

      let nextPuzzle;

      // For guest users' first puzzle, pick a random one
      const isGuest = user?.user_metadata?.is_guest;
      const isFirstPuzzle = !currentPuzzle && isGuest;
      
      if (isFirstPuzzle) {
        console.log('🎲 [Next Puzzle] Selecting random puzzle for guest first time');
        const randomIndex = Math.floor(Math.random() * Math.min(cachedPuzzles.length, 100));
        nextPuzzle = cachedPuzzles[randomIndex];
      } else if (precomputedNextPuzzle) {
        console.log('✨ [Next Puzzle] Using precomputed puzzle:', precomputedNextPuzzle.id);
        nextPuzzle = precomputedNextPuzzle;
        setPrecomputedNextPuzzle(null);
      } else {
        console.log('🔄 [Next Puzzle] Computing new puzzle');
        const themeRatings: { [theme: string]: number } = {};
        Object.entries(userRatings.categories).forEach(([theme, data]) => {
          themeRatings[theme] = data.rating;
        });
        nextPuzzle = getNextPuzzle(themeRatings, cachedPuzzles, usedPuzzleIds);
      }

      if (!nextPuzzle) {
        console.log('❌ [Next Puzzle] Failed to get next puzzle');
        setError('Loading next puzzle...');
        return;
      }

      // Clear any existing error
      setError(null);

      // Add puzzle to used set
      usedPuzzleIds.add(nextPuzzle.id);

      // Set previous puzzle before updating current
      setPreviousPuzzle(currentPuzzle ? {
        ...currentPuzzle,
        popularity: 0,
        nbPlays: 0,
        gameUrl: '',
        openingTags: []
      } : null);

      // Update the current puzzle
      dispatch(setCurrentPuzzle(nextPuzzle));

      // Start transition timeout
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
      transitionTimeoutRef.current = setTimeout(() => {
        setIsTransitioningBoard(false);
      }, 300);

    } catch (error) {
      console.error('❌ [Next Puzzle] Error:', error);
      setError('Loading next puzzle...');
    } finally {
      const transitionTime = Date.now() - (transitionStartTime.current || Date.now());
      console.log('✨ [Next Puzzle] Transition complete in', transitionTime, 'ms');
      setIsTransitioning(false);
      transitionStartTime.current = null;
    }
  };

  const handlePuzzleComplete = (solved: boolean) => {
    if (solved) {
      setPuzzleSolved(true);
      setPuzzleFailed(false);
    } else {
      setPuzzleSolved(false);
      setPuzzleFailed(true);
    }
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
            <div className="text-gray-500 flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <div>Loading puzzles...</div>
            </div>
          </div>
        ) : (
          <>
            <div ref={containerRef} className="w-full flex items-center justify-center relative px-2 md:px-4">
              <div 
                style={{ 
                  width: boardSize ? `${boardSize}px` : '100%', 
                  maxWidth: '100%',
                  opacity: isTransitioningBoard ? 0 : 1,
                  transition: 'opacity 0.05s ease-in-out'
                }} 
                className="relative"
              >
                {boardSize > 0 && currentPuzzle && (
                  <Chessboard size={boardSize} onPuzzleComplete={handlePuzzleComplete} />
                )}
                {!currentPuzzle && !isInitialLoad && (
                  <div className="w-full aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  </div>
                )}
                {(puzzleSolved || puzzleFailed) && !isTransitioning && (
                  <div className="flex justify-center mt-4 items-center gap-2">
                    <button
                      onClick={loadNextPuzzle}
                      disabled={isLoadingPuzzle.current}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-lg font-medium shadow-md hover:shadow-lg transition-all"
                    >
                      {isLoadingPuzzle.current ? 'Loading...' : 'Next Puzzle'}
                    </button>
                    {puzzleSolved && (
                      <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {puzzleFailed && (
                      <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </div>
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
        {error && !currentPuzzle && (
          <div className="w-full text-center mt-4">
            <div className="inline-block p-2 text-sm text-gray-600 bg-gray-100 rounded">
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
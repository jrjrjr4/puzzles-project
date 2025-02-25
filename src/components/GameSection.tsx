import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Chessboard from './Chessboard';
import ChessBoardWrapper from './ChessBoardWrapper';
import CategoryRatings from './CategoryRatings';
import PuzzleInfo from './PuzzleInfo';
import { parsePuzzleCsv } from '../utils/puzzles';
import { setCurrentPuzzle, saveCurrentPuzzle, fetchLastPuzzle, updateRatingsAfterPuzzleAsync } from '../store/slices/puzzleSlice';
import { getNextPuzzle } from '../utils/puzzleSelector';
import { RootState, AppDispatch, store } from '../store/store';
import { Puzzle } from '../types/puzzle';

// Define the structure of currentPuzzle from Redux store
interface CurrentPuzzleType {
  id: string;
  fen: string;
  moves: string[];
  rating: number;
  ratingDeviation: number;
  themes: string[];
}

// Helper function to safely check if a puzzle has an ID
function hasPuzzleId(puzzle: any): puzzle is CurrentPuzzleType {
  return puzzle !== null && 
         typeof puzzle === 'object' && 
         'id' in puzzle && 
         typeof puzzle.id === 'string';
}

// Safe accessor function for puzzle ID
function getPuzzleId(puzzle: any): string | undefined {
  return hasPuzzleId(puzzle) ? puzzle.id : undefined;
}

export default function GameSection() {
  const dispatch = useDispatch<AppDispatch>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const userRatings = useSelector((state: RootState) => state.puzzle.userRatings);
  const currentPuzzle = useSelector((state: RootState) => state.puzzle.currentPuzzle) as CurrentPuzzleType | null;
  const lastRatingUpdates = useSelector((state: RootState) => state.puzzle.lastRatingUpdates);
  const user = useSelector((state: RootState) => state.auth.user);
  const authInitialized = useSelector((state: RootState) => state.auth.authInitialized);
  const [usedPuzzleIds] = useState<Set<string>>(new Set());
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
  const [cachedPuzzles, setCachedPuzzles] = useState<Puzzle[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isTransitioningBoard, setIsTransitioningBoard] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Loading...');
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const debugRef = useRef({ initialized: false, lastContainerWidth: 0 });
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const precomputedNextPuzzle = useRef<Puzzle | null>(null);
  const [shouldResetPuzzle, setShouldResetPuzzle] = useState(false);
  
  // Debug function to track board size calculation
  const debugLog = (message: string) => {
    // Only log critical messages in production, more verbose in development
    if (process.env.NODE_ENV === 'development' && false) { // Disabled even in development
      console.log(`📏 [BoardSize] ${message}`);
    }
  };

  // Calculate and set board size based on container dimensions
  const calculateAndSetBoardSize = () => {
    if (!containerRef.current) {
      debugLog('No container ref');
      
      // Set up a retry if container ref isn't available yet
      if (!timerRef.current) {
        timerRef.current = setTimeout(() => {
          debugLog('Retrying board size calculation');
          timerRef.current = null;
          calculateAndSetBoardSize();
        }, 200);
      }
      return;
    }
    
    // Get container width (accounting for padding)
    const container = containerRef.current;
    const containerStyle = window.getComputedStyle(container);
    const paddingLeft = parseFloat(containerStyle.paddingLeft);
    const paddingRight = parseFloat(containerStyle.paddingRight);
    const containerWidth = container.clientWidth - paddingLeft - paddingRight;
    
    debugRef.current.lastContainerWidth = containerWidth;
    
    debugLog(`Container dimensions: ${containerWidth}px`);
    
    // Use a fallback size if container width is too small or not available
    if (containerWidth <= 20) {
      debugLog(`Container width too small (${containerWidth}px), using fallback sizing`);
      
      // Use window width as fallback with a safe margin
      const windowWidth = Math.max(window.innerWidth - 40, 300);
      const fallbackSize = window.innerWidth < 768 ? 
        windowWidth : 
        Math.min(Math.floor(windowWidth * 0.6), 600);
      
      debugLog(`Using fallback size: ${fallbackSize}px`);
      
      if (fallbackSize > 0 && fallbackSize !== boardSize) {
        setBoardSize(fallbackSize);
        
        // Try again after a short delay to see if proper dimensions are available
        if (!timerRef.current) {
          timerRef.current = setTimeout(() => {
            debugLog('Retrying after fallback calculation');
            timerRef.current = null;
            calculateAndSetBoardSize();
          }, 500);
        }
      }
      return;
    }
    
    let newBoardSize: number;
    
    if (window.innerWidth < 768) {
      // Mobile: Use 100% of container width
      newBoardSize = Math.floor(containerWidth);
      debugLog(`Mobile view, setting board size to ${newBoardSize}px`);
    } else {
      // Desktop: Use 80% of container width, but cap at 600px
      newBoardSize = Math.min(Math.floor(containerWidth * 0.8), 600);
      debugLog(`Desktop view, setting board size to ${newBoardSize}px`);
    }
    
    // Only update if size has changed to avoid unnecessary re-renders
    if (newBoardSize !== boardSize && newBoardSize > 0) {
      debugLog(`Updating board size from ${boardSize} to ${newBoardSize}`);
      setBoardSize(newBoardSize);
    } else if (newBoardSize <= 0) {
      // This is a critical error worth logging
      console.warn(`[BoardSize] Calculated invalid board size: ${newBoardSize}px`);
      
      // If we calculated an invalid size, try again after a delay
      if (!timerRef.current) {
        timerRef.current = setTimeout(() => {
          debugLog('Retrying after invalid size calculation');
          timerRef.current = null;
          calculateAndSetBoardSize();
        }, 300);
      }
    }
  };
  
  // Set up ResizeObserver for container
  useEffect(() => {
    debugLog('Setting up ResizeObserver');
    
    // Initial calculation attempt
    const initialCalculation = () => {
      debugLog('Running initial board size calculation');
      calculateAndSetBoardSize();
      
      // Make multiple attempts to ensure we get a valid size
      // This helps in cases where layout isn't fully rendered yet
      const attemptTimes = [100, 300, 500, 1000];
      
      attemptTimes.forEach(delay => {
        setTimeout(() => {
          if (boardSize <= 0) {
            debugLog(`Additional calculation attempt after ${delay}ms`);
            calculateAndSetBoardSize();
          }
        }, delay);
      });
    };
    
    if (typeof ResizeObserver === 'undefined') {
      console.warn('[BoardSize] ResizeObserver not supported, using resize event fallback');
      
      // Calculate initial size
      initialCalculation();
      
      // Add resize event listener as fallback
      window.addEventListener('resize', calculateAndSetBoardSize);
      return () => {
        window.removeEventListener('resize', calculateAndSetBoardSize);
      };
    }
    
    if (!resizeObserverRef.current) {
      resizeObserverRef.current = new ResizeObserver(entries => {
        debugLog('ResizeObserver triggered');
        calculateAndSetBoardSize();
      });
    }
    
    if (containerRef.current) {
      // Start observing the container
      resizeObserverRef.current.observe(containerRef.current);
      debugLog('Now observing container');
      
      // Run initial calculation
      initialCalculation();
    } else {
      // If containerRef isn't available yet, set up a retry
      debugLog('Container ref not available, setting up retry');
      const retryTimeout = setTimeout(() => {
        debugLog('Retrying observer setup');
        if (containerRef.current && resizeObserverRef.current) {
          resizeObserverRef.current.observe(containerRef.current);
          initialCalculation();
        }
      }, 200);
      
      return () => {
        clearTimeout(retryTimeout);
      };
    }
    
    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        debugLog('Disconnected ResizeObserver');
      }
      
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);
  
  // Calculate board size as early as possible in the render cycle
  useEffect(() => {
    // Only log significant board size changes
    if (boardSize > 0) {
      debugLog(`boardSize state updated to ${boardSize}px`);
    }
  }, [boardSize]);

  // Use useLayoutEffect to calculate the board size before the painting phase
  useLayoutEffect(() => {
    debugLog('Running layout effect for initial size calculation');
    
    // Immediately try to calculate the board size
    calculateAndSetBoardSize();
    
    // Set a backup timer with a very short delay
    const immediateTimer = setTimeout(() => {
      if (boardSize <= 0) {
        debugLog('Immediate layout effect retry');
        calculateAndSetBoardSize();
      }
    }, 50);
    
    return () => clearTimeout(immediateTimer);
  }, []);

  // Precompute the next puzzle before it's needed
  useEffect(() => {
    if (!userRatings?.categories || !cachedPuzzles.length || isLoading || !lastRatingUpdates) return;
    
    // Only precompute if we haven't already or the ratings have changed
    if (precomputedNextPuzzle.current) return;
    
    // Create formatted theme ratings object for getNextPuzzle function
    const themeRatings: Record<string, number> = {};
    
    // Add all category ratings to the theme ratings
    Object.entries(userRatings.categories).forEach(([category, rating]) => {
      themeRatings[category] = typeof rating === 'number' ? rating : 1500;
    });
    
    // Only keep puzzles not already used
    const availablePuzzles = cachedPuzzles.filter(puzzle => 
      puzzle && puzzle.id && !usedPuzzleIds.has(puzzle.id)
    );
    
    // Get a precomputed puzzle
    precomputedNextPuzzle.current = getNextPuzzle(themeRatings, availablePuzzles, usedPuzzleIds);
    
    // Only log in development
    if (process.env.NODE_ENV === 'development' && false) { // Disabled even in development
      console.log('🧩 Precomputed next puzzle:', precomputedNextPuzzle.current?.id);
    }
  }, [lastRatingUpdates, cachedPuzzles, userRatings.categories, usedPuzzleIds]);

  // Load puzzles on mount
  useEffect(() => {
    async function loadPuzzles() {
      try {
        setLoadingMessage('Fetching puzzle database...');
        const response = await fetch('/filtered_puzzles.csv');
        if (!response.ok) {
          throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`);
        }
        
        setLoadingMessage('Processing puzzles...');
        const csvContent = await response.text();
        const puzzles = parsePuzzleCsv(csvContent);
        setCachedPuzzles(puzzles);
        // Critical info worth keeping in a minimal form
        if (process.env.NODE_ENV === 'development') {
          // Disable verbose logging
          // console.log(`📚 Loaded ${puzzles.length} puzzles from CSV`);
        }
        
        // If we're a guest user with no puzzle, load one now that we have puzzles
        if (user?.user_metadata?.is_guest && !currentPuzzle && !isInitializing.current && authInitialized) {
          // Disable debug logging
          // console.log('🎲 [Load] Guest user detected, loading initial puzzle');
          loadNextPuzzle();
        }
      } catch (error) {
        console.error('❌ Failed to load puzzles:', error);
        setError(error instanceof Error ? error.message : 'Failed to load puzzles');
      } finally {
        setIsInitialLoad(false);
      }
    }
    
    loadPuzzles();
  }, []);

  // Handle puzzle initialization based on auth state
  useEffect(() => {
    // Only proceed once auth is initialized and puzzles are loaded
    if (!authInitialized || cachedPuzzles.length === 0) {
      return;
    }
    
    let mounted = true;
    // console.log('🎮 [GameSection] Auth initialized, checking puzzle state');
    
    const initializeGameState = async () => {
      // Don't initialize if we already have a current puzzle
      if (hasPuzzleId(currentPuzzle)) {
        // console.log('✅ [GameSection] Using persisted puzzle:', getPuzzleId(currentPuzzle));
        return;
      }
      
      // Don't initialize if already initializing
      if (isInitializing.current) {
        // console.log('⏳ [GameSection] Already initializing, skipping');
        return;
      }
      
      try {
        // console.log('🔄 [GameSection] Initializing game state');
        isInitializing.current = true;
        setIsLoading(true);
        setLoadingMessage('Getting a puzzle for you...');
        
        // If we have a persisted puzzle in Redux, we're done
        if (hasPuzzleId(currentPuzzle)) {
          // console.log('✅ [GameSection] Already have persisted puzzle:', getPuzzleId(currentPuzzle));
          return;
        }
        
        // Load a new puzzle if we don't have one yet
        await loadNextPuzzle();
        
      } catch (error) {
        console.error('❌ [GameSection] Error initializing game state:', error);
        setError(error instanceof Error ? error.message : 'Failed to initialize game');
      } finally {
        if (mounted) {
          isInitializing.current = false;
          setIsLoading(false);
        }
      }
    };
    
    // Start initialization process
    initializeGameState();
    
    return () => {
      mounted = false;
    };
  }, [authInitialized, cachedPuzzles.length, currentPuzzle]);

  // Save puzzle when it changes
  useEffect(() => {
    if (!user?.id || !currentPuzzle) return;
    
    const timeoutId = setTimeout(() => {
      // console.log('💾 [GameSection] Saving current puzzle state');
      dispatch(saveCurrentPuzzle(user.id, currentPuzzle));
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [dispatch, user?.id, currentPuzzle]);

  const loadNextPuzzle = async () => {
    if (isLoadingPuzzle.current) {
      // console.log('⚠️ [Load] Already loading puzzle, skipping request');
      return;
    }
    
    try {
      isLoadingPuzzle.current = true;
      setIsLoading(true);
      setLoadingMessage('Finding the perfect puzzle for you...');
      
      // Reduced debug logging
      setIsTransitioningBoard(true);
      
      // Clear previous states
      setPuzzleSolved(false);
      setPuzzleFailed(false);
      
      // Short delay to allow the board transition effect
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Use precomputed puzzle if available, otherwise get a new one
      let nextPuzzle;
      if (precomputedNextPuzzle.current) {
        // Keep this log as it's helpful for troubleshooting
        // console.log('✅ [Load] Using precomputed puzzle:', precomputedNextPuzzle.current.id);
        nextPuzzle = precomputedNextPuzzle.current;
        precomputedNextPuzzle.current = null;
      } else if (cachedPuzzles.length > 0) {
        // Reduced logging
        
        // Create ratings object in the format expected by getNextPuzzle
        const themeRatings: { [theme: string]: number } = {};
        Object.entries(userRatings.categories).forEach(([theme, data]) => {
          themeRatings[theme] = data.rating;
        });
        
        nextPuzzle = await getNextPuzzle(
          themeRatings,
          cachedPuzzles,
          usedPuzzleIds
        );
      }
      
      if (!nextPuzzle) {
        console.error('❌ [Load] Failed to get next puzzle');
        throw new Error('Failed to get next puzzle');
      }
      
      // Mark as used to avoid repetition
      usedPuzzleIds.add(nextPuzzle.id);
      
      // Update Redux state
      dispatch(setCurrentPuzzle({
        id: nextPuzzle.id,
        fen: nextPuzzle.fen,
        moves: nextPuzzle.moves,
        rating: nextPuzzle.rating,
        ratingDeviation: nextPuzzle.ratingDeviation || 0,
        themes: nextPuzzle.themes,
        ...(nextPuzzle.popularity !== undefined && { popularity: nextPuzzle.popularity }),
        ...(nextPuzzle.nbPlays !== undefined && { nbPlays: nextPuzzle.nbPlays }),
        ...(nextPuzzle.gameUrl && { gameUrl: nextPuzzle.gameUrl }),
        ...(nextPuzzle.openingTags && { openingTags: nextPuzzle.openingTags })
      }));
      
    } catch (error) {
      console.error('❌ [Load] Error loading puzzle:', error);
      setError(error instanceof Error ? error.message : 'Failed to load puzzle');
    } finally {
      isLoadingPuzzle.current = false;
      setIsLoading(false);
      setIsTransitioningBoard(false);
    }
  };

  const handlePuzzleComplete = async (solved: boolean) => {
    if (solved) {
      setPuzzleSolved(true);
      setPuzzleFailed(false);
    } else {
      setPuzzleSolved(false);
      setPuzzleFailed(true);
    }
    
    if (!currentPuzzle) return;
    
    try {
      // Keep a minimal log about puzzle completion
      if (process.env.NODE_ENV === 'development' && false) { // Disabled even in development
        console.log(`🎯 [Complete] Puzzle ${solved ? 'solved' : 'failed'}: ${getPuzzleId(currentPuzzle) || 'unknown'}`);
      }
      
      // Update ratings based on result
      await dispatch(
        updateRatingsAfterPuzzleAsync({
          success: solved,
          userId: user?.id
        })
      );
      
    } catch (error) {
      console.error('❌ [Complete] Error updating ratings:', error);
      setError('Failed to update ratings');
    }
  };

  const handlePuzzleReset = () => {
    // Reset flag after the puzzle has been reset
    setShouldResetPuzzle(false);
  };

  const handleNextPuzzle = async () => {
    await loadNextPuzzle();
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen pb-4 md:pb-8">
      <div className="flex-1 flex flex-col items-start overflow-auto min-w-0 relative">
        {/* Global loading state or error */}
        {isInitialLoad ? (
          <div className="w-full aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
            <div className="text-gray-500 flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <div>{loadingMessage}</div>
            </div>
          </div>
        ) : (
          <>
            <div 
              ref={containerRef} 
              className="w-full flex items-center justify-center relative px-2 md:px-4"
              style={{ minHeight: "300px" }} // Add minimum height to container
            >
              {/* Debug info removed for production */}
              
              <div 
                style={{ 
                  width: boardSize ? `${boardSize}px` : '100%', 
                  maxWidth: '100%',
                  opacity: isTransitioningBoard ? 0 : 1,
                  transition: 'opacity 0.15s ease-in-out'
                }} 
                className="relative"
              >
                {boardSize > 0 && currentPuzzle ? (
                  <ChessBoardWrapper 
                    size={boardSize} 
                    onPuzzleComplete={handlePuzzleComplete}
                    containerRef={containerRef}
                    shouldResetPuzzle={shouldResetPuzzle}
                    onPuzzleReset={handlePuzzleReset}
                  />
                ) : currentPuzzle ? (
                  // Fallback rendering when we have a puzzle but no valid board size yet
                  <div className="w-full aspect-square bg-gray-100 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                      <p className="text-gray-500">Preparing chessboard...</p>
                      {/* Force a recalculation */}
                      {setTimeout(() => calculateAndSetBoardSize(), 100) && null}
                    </div>
                  </div>
                ) : boardSize > 0 ? (
                  <div className="w-full aspect-square bg-yellow-50 flex items-center justify-center">
                    <p className="text-gray-500">Board size calculated ({boardSize}px) but no puzzle loaded</p>
                  </div>
                ) : (
                  <div className="w-full aspect-square bg-red-50 flex items-center justify-center">
                    <p className="text-gray-500">Board size is zero or invalid: {boardSize}</p>
                    {/* Force a recalculation */}
                    {setTimeout(() => calculateAndSetBoardSize(), 100) && null}
                  </div>
                )}
                
                {(!currentPuzzle || isLoading) && !isInitialLoad && (
                  <div className="w-full aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                      <div className="text-gray-500">{loadingMessage}</div>
                    </div>
                  </div>
                )}
                
                {/* Error message */}
                {error && (
                  <div className="absolute inset-0 bg-red-100 bg-opacity-80 flex items-center justify-center rounded-lg">
                    <div className="text-red-600 max-w-md p-4">
                      <h3 className="font-bold text-lg mb-2">Error</h3>
                      <p>{error}</p>
                      <button 
                        className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                        onClick={() => setError(null)}
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              {puzzleSolved && (
                <div className="absolute inset-0 bg-green-100 bg-opacity-80 flex items-center justify-center rounded-lg">
                  <div className="text-green-700 max-w-md p-4 text-center">
                    <h3 className="font-bold text-2xl mb-2">Correct!</h3>
                    <p className="mb-4">Well done, you solved the puzzle.</p>
                    <button 
                      className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
                      onClick={() => {
                        setPuzzleSolved(false);
                        loadNextPuzzle();
                      }}
                    >
                      Next Puzzle
                    </button>
                  </div>
                </div>
              )}
              
              {puzzleFailed && (
                <div className="absolute inset-0 bg-red-100 bg-opacity-80 flex items-center justify-center rounded-lg">
                  <div className="text-red-700 max-w-md p-4 text-center">
                    <h3 className="font-bold text-2xl mb-2">Incorrect</h3>
                    <p className="mb-4">That wasn't the correct move.</p>
                    <div className="flex gap-2 justify-center">
                      <button 
                        className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700"
                        onClick={() => {
                          setPuzzleFailed(false);
                          setShouldResetPuzzle(true);
                        }}
                      >
                        Try Again
                      </button>
                      <button 
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                        onClick={() => {
                          setPuzzleFailed(false);
                          loadNextPuzzle();
                        }}
                      >
                        Next Puzzle
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="w-full px-2 md:px-4 mt-4">
              <PuzzleInfo />
            </div>
          </>
        )}
      </div>
      
      <div className="md:w-1/3 p-2 md:p-4 md:min-w-[300px] md:max-w-[400px]">
        <h2 className="text-xl font-bold mb-4">Your Ratings</h2>
        {userRatings?.loaded === false ? (
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-24 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-24 bg-gray-200 rounded w-full mb-2"></div>
          </div>
        ) : (
          <CategoryRatings lastRatingUpdates={lastRatingUpdates || { categories: {} }} />
        )}
      </div>
    </div>
  );
}
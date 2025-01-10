import React, { useState, useRef, useEffect } from 'react';
import { Chessboard as ReactChessboard } from 'react-chessboard';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store/store';
import { createChessGame } from '../utils/chess';
import { Square, Piece } from 'react-chessboard/dist/chessboard/types';
import { updateRatingsAfterPuzzle } from '../store/slices/puzzleSlice';

function formatMove(move: string): string {
  return `${move.slice(0, 2)} → ${move.slice(2, 4)}`;
}

// Define a consistent highlight color
const HIGHLIGHT_COLOR = { backgroundColor: 'rgba(134, 239, 172, 0.4)' }; // Light green with transparency

export default function Chessboard() {
  const currentPuzzle = useSelector((state: RootState) => state.puzzle.currentPuzzle);
  const [game, setGame] = useState(createChessGame());
  const [currentMoveIndex, setCurrentMoveIndex] = useState(1);
  const [puzzleStatus, setPuzzleStatus] = useState<'ongoing' | 'correct' | 'incorrect'>('ongoing');
  const [highlightedSquares, setHighlightedSquares] = useState<{ [square: string]: { backgroundColor: string } }>({});
  const [isAnimating, setIsAnimating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [boardWidth, setBoardWidth] = useState(800);
  const [transitionDuration, setTransitionDuration] = useState(300);
  const dispatch = useDispatch();
  const lastRatingUpdates = useSelector((state: RootState) => state.puzzle.lastRatingUpdates);

  // Get board orientation from FEN - show the side to move at the bottom
  const boardOrientation = currentPuzzle?.fen ? 
    (currentPuzzle.fen.split(' ')[1] === 'w' ? 'black' : 'white') : 
    'white';

  // Update game when puzzle changes and show opponent's first move
  useEffect(() => {
    async function setupPuzzle() {
      try {
        if (currentPuzzle?.fen && currentPuzzle.moves.length > 0) {
          // First, set up the initial position with no animation
          setTransitionDuration(0);
          const newGame = createChessGame(currentPuzzle.fen);
          setGame(newGame);
          setHighlightedSquares({});
          setCurrentMoveIndex(1);
          setPuzzleStatus('ongoing');
          
          // Wait a brief moment to ensure the initial position is set
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Then set up the animation for the opponent's first move
          const firstMove = currentPuzzle.moves[0];
          const [from, to] = [firstMove.slice(0, 2), firstMove.slice(2, 4)];
          
          // Set the animation duration for the piece movement (reduced from 800ms to 600ms)
          setTransitionDuration(600);
          
          // Keep the 1.5 second wait before the move
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Make opponent's first move with animation
          setIsAnimating(true);
          const moveResult = newGame.move({ from, to, promotion: 'q' });
          
          // Highlight the squares of opponent's move
          setHighlightedSquares({
            [from]: HIGHLIGHT_COLOR,
            [to]: HIGHLIGHT_COLOR
          });

          setGame(newGame);
          setIsAnimating(false);
        } else {
          // Reset to initial state if no puzzle
          setTransitionDuration(0);
          setGame(createChessGame());
          setHighlightedSquares({});
          setPuzzleStatus('ongoing');
          setIsAnimating(false);
        }
      } catch (error) {
        console.error('Error setting up puzzle:', error);
        setGame(createChessGame());
        setHighlightedSquares({});
        setPuzzleStatus('ongoing');
        setIsAnimating(false);
      }
    }
    
    setupPuzzle();
  }, [currentPuzzle]);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        setBoardWidth(Math.min(width, 800));
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  function onDrop(sourceSquare: Square, targetSquare: Square, piece: Piece): boolean {
    if (!currentPuzzle || puzzleStatus !== 'ongoing' || isAnimating) return false;

    try {
      const move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      });

      if (move === null) return false;

      // Update highlight color here
      setHighlightedSquares({
        [sourceSquare]: HIGHLIGHT_COLOR,
        [targetSquare]: HIGHLIGHT_COLOR
      });

      // Check if the move matches the expected puzzle move
      const expectedMove = currentPuzzle.moves[currentMoveIndex];
      const moveString = `${sourceSquare}${targetSquare}`;

      if (moveString !== expectedMove) {
        setPuzzleStatus('incorrect');
        console.log('Dispatching rating update for incorrect move');
        dispatch(updateRatingsAfterPuzzle({ success: false }));
        return true;
      }

      // If this was the last move, puzzle is complete
      if (currentMoveIndex === currentPuzzle.moves.length - 1) {
        setPuzzleStatus('correct');
        console.log('Dispatching rating update for correct puzzle completion');
        dispatch(updateRatingsAfterPuzzle({ success: true }));
        return true;
      }

      // Make the opponent's next move
      setIsAnimating(true);
      setTimeout(() => {
        const opponentMove = currentPuzzle.moves[currentMoveIndex + 1];
        const [from, to] = [opponentMove.slice(0, 2), opponentMove.slice(2, 4)];
        const opponentMoveResult = game.move({
          from,
          to,
          promotion: 'q',
        });
        console.log('Opponent move result:', opponentMoveResult);

        // Update highlight color here
        setHighlightedSquares({
          [from]: HIGHLIGHT_COLOR,
          [to]: HIGHLIGHT_COLOR
        });

        const newGame = createChessGame(game.fen());
        console.log('Position after opponent move:', newGame.fen());
        setGame(newGame);
        setCurrentMoveIndex(currentMoveIndex + 2);
        setIsAnimating(false);
      }, 1667); // Reduced from 5000ms to 1667ms (1/3 of original)

      return true;
    } catch (error) {
      console.error('Move error:', error);
      setIsAnimating(false);
      return false;
    }
  }

  function renderPuzzleSolution() {
    if (!currentPuzzle) return null;
    
    const moves = currentPuzzle.moves;
    const movesList = [];
    
    // Start with opponent's first move
    movesList.push(
      <div key="first" className="flex gap-2 text-sm">
        <span className="text-gray-500">Initial:</span>
        <span className="text-red-600">{formatMove(moves[0])}</span>
      </div>
    );
    
    // Then show the rest of the sequence
    for (let i = 1; i < moves.length; i += 2) {
      const moveNumber = Math.ceil(i / 2);
      const playerMove = formatMove(moves[i]);
      const opponentMove = i + 1 < moves.length ? formatMove(moves[i + 1]) : null;
      
      movesList.push(
        <div key={i} className="flex gap-2 text-sm">
          <span className="text-gray-500">{moveNumber}.</span>
          <span className="text-blue-600">{playerMove}</span>
          {opponentMove && (
            <span className="text-red-600">{opponentMove}</span>
          )}
        </div>
      );
    }
    
    return (
      <div className="mt-2 space-y-1">
        <div className="text-sm font-medium text-gray-700">Correct sequence:</div>
        {movesList}
      </div>
    );
  }

  function renderRatingUpdates() {
    if (!lastRatingUpdates) return null;

    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-lg text-sm font-mono">
        <h3 className="font-medium mb-2 text-gray-700">Rating Updates:</h3>
        
        {/* Overall Rating */}
        <div className="mb-3">
          <div className="font-medium text-blue-600">Overall:</div>
          <div className="ml-4">
            {lastRatingUpdates.overall.oldRating} → {lastRatingUpdates.overall.newRating}
            <span className="text-gray-500 ml-2">
              ({lastRatingUpdates.overall.change > 0 ? '+' : ''}{lastRatingUpdates.overall.change})
            </span>
            <div className="text-xs text-gray-500">
              RD: {Math.round(lastRatingUpdates.overall.oldRD)} → {Math.round(lastRatingUpdates.overall.newRD)}
            </div>
          </div>
        </div>

        {/* Category Updates */}
        <div>
          <div className="font-medium text-blue-600">Categories:</div>
          {Object.entries(lastRatingUpdates.categories).length === 0 ? (
            <div className="ml-4 text-gray-500">No categories updated</div>
          ) : (
            Object.entries(lastRatingUpdates.categories).map(([category, update]) => (
              <div key={category} className="ml-4 mb-2">
                <div className="font-medium">{category}:</div>
                <div className="ml-2">
                  {update.oldRating} → {update.newRating}
                  <span className="text-gray-500 ml-2">
                    ({update.change > 0 ? '+' : ''}{update.change})
                  </span>
                  <div className="text-xs text-gray-500">
                    RD: {Math.round(update.oldRD)} → {Math.round(update.newRD)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div ref={containerRef} className="w-full aspect-square">
        <ReactChessboard
          position={game.fen()}
          onPieceDrop={onDrop}
          boardWidth={boardWidth}
          boardOrientation={boardOrientation}
          customSquareStyles={highlightedSquares}
          animationDuration={transitionDuration}
          customBoardStyle={{
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          }}
        />
      </div>
      <div className="flex justify-between items-center">
        <div className="text-sm font-medium">
          {isAnimating ? (
            <span className="text-blue-600">Opponent is moving...</span>
          ) : (
            <span className={game.turn() === 'w' ? 'text-gray-800' : 'text-gray-800'}>
              {game.turn() === 'w' ? 'White' : 'Black'} to move
            </span>
          )}
        </div>
      </div>
      {!currentPuzzle && (
        <div className="p-4 bg-blue-100 text-blue-800 rounded-lg text-center">
          Click "Load Random Puzzle" to start solving!
        </div>
      )}
      {puzzleStatus !== 'ongoing' && (
        <>
          <div className={`p-4 rounded-lg ${
            puzzleStatus === 'correct' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            <div className="text-center font-semibold">
              {puzzleStatus === 'correct' ? 'Puzzle Solved!' : 'Incorrect Move'}
            </div>
            {puzzleStatus === 'incorrect' && renderPuzzleSolution()}
          </div>
          {renderRatingUpdates()}
        </>
      )}
    </div>
  );
}
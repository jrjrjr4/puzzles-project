import React, { useState, useEffect } from 'react';
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

function formatRatingChange(oldRating: number, newRating: number): string {
  const change = Math.round(newRating - oldRating);
  const sign = change >= 0 ? '+' : '';
  return `${Math.round(oldRating)} → ${Math.round(newRating)} (${sign}${change})`;
}

interface ChessboardProps {
  size?: number;
}

export default function Chessboard({ size = 600 }: ChessboardProps) {
  const currentPuzzle = useSelector((state: RootState) => state.puzzle.currentPuzzle);
  const user = useSelector((state: RootState) => state.auth.user);
  const [game, setGame] = useState(() => createChessGame());
  const [currentMoveIndex, setCurrentMoveIndex] = useState(1);
  const [puzzleStatus, setPuzzleStatus] = useState<'ongoing' | 'correct' | 'incorrect'>('ongoing');
  const [highlightedSquares, setHighlightedSquares] = useState<{ [square: string]: { backgroundColor: string } }>({});
  const [isAnimating, setIsAnimating] = useState(false);
  const [transitionDuration, setTransitionDuration] = useState(300);
  const [isLoading, setIsLoading] = useState(true);
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
          // Disable animations initially
          setTransitionDuration(0);
          setIsAnimating(false);
          
          // Reset the game with the puzzle position
          const newGame = createChessGame();
          newGame.load(currentPuzzle.fen);
          setGame(newGame);
          setCurrentMoveIndex(1);
          setPuzzleStatus('ongoing');
          setHighlightedSquares({});
          
          // Make the first move (opponent's move)
          const firstMove = currentPuzzle.moves[0];
          await new Promise(resolve => setTimeout(resolve, 100));
          newGame.move({
            from: firstMove.slice(0, 2),
            to: firstMove.slice(2, 4),
            promotion: firstMove[4]
          });
          
          // Highlight the move
          setHighlightedSquares({
            [firstMove.slice(0, 2)]: HIGHLIGHT_COLOR,
            [firstMove.slice(2, 4)]: HIGHLIGHT_COLOR
          });
          
          // Re-enable animations
          setTransitionDuration(300);
          setGame(newGame);
        }
      } catch (error) {
        console.error('Error setting up puzzle:', error);
      } finally {
        setIsLoading(false);
      }
    }

    setupPuzzle();
  }, [currentPuzzle]);

  // Don't show anything until we have loaded the initial state
  if (isLoading) {
    return (
      <div className="w-full aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-gray-500">Loading puzzle...</div>
      </div>
    );
  }

  // Show welcome message only for true first-time users (not during loading)
  if (!isLoading && !currentPuzzle && !localStorage.getItem('has_played')) {
    // Mark that the user has seen the welcome message
    localStorage.setItem('has_played', 'true');
    return (
      <div className="w-full aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center p-8">
          <h3 className="text-xl font-semibold text-gray-700 mb-4">Welcome to Chess Puzzles!</h3>
          <p className="text-gray-600 mb-4">Click "Load Next Puzzle" to start solving puzzles and improving your chess skills.</p>
        </div>
      </div>
    );
  }

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
        dispatch(updateRatingsAfterPuzzle({ success: false, userId: user?.id }));
        return true;
      }

      // If this was the last move, puzzle is complete
      if (currentMoveIndex === currentPuzzle.moves.length - 1) {
        setPuzzleStatus('correct');
        console.log('Dispatching rating update for correct puzzle completion');
        dispatch(updateRatingsAfterPuzzle({ success: true, userId: user?.id }));
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
      }, 500); // Reduced from 1000ms to 500ms for faster opponent moves

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
      <div className="p-4 bg-gray-100 rounded-lg space-y-2">
        <div className="font-medium text-gray-700">Rating Updates:</div>
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span>Overall:</span>
            <span className="font-medium">
              {formatRatingChange(
                lastRatingUpdates.overall.oldRating,
                lastRatingUpdates.overall.newRating
              )}
            </span>
          </div>
          {Object.entries(lastRatingUpdates.categories).map(([theme, update]) => (
            <div key={theme} className="flex justify-between text-sm">
              <span>{theme}:</span>
              <span className="font-medium">
                {formatRatingChange(update.oldRating, update.newRating)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="w-full aspect-square">
        <ReactChessboard
          position={game.fen()}
          onPieceDrop={onDrop}
          boardWidth={size}
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
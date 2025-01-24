import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Chess } from 'chess.js';
import { Chessboard as ReactChessboard } from 'react-chessboard';
import { RootState, AppDispatch } from '../store/store';
import { updateRatingsAfterPuzzle } from '../store/slices/puzzleSlice';

interface ChessboardProps {
  size?: number;
  onPuzzleComplete?: (solved: boolean) => void;
}

interface CustomSquareStyles {
  [square: string]: { backgroundColor: string };
}

const HIGHLIGHT_COLOR = { backgroundColor: 'rgba(134, 239, 172, 0.4)' }; // Light green with transparency

export default function Chessboard({ size = 600, onPuzzleComplete }: ChessboardProps) {
  const dispatch = useDispatch<AppDispatch>();
  const [game, setGame] = useState(new Chess());
  const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>('white');
  const [highlightedSquares, setHighlightedSquares] = useState<CustomSquareStyles>({});
  const [isAnimating, setIsAnimating] = useState(false);
  const [transitionDuration, setTransitionDuration] = useState(150);
  const [puzzleSolved, setPuzzleSolved] = useState(false);
  const [puzzleFailed, setPuzzleFailed] = useState(false);
  const currentPuzzle = useSelector((state: RootState) => state.puzzle.currentPuzzle);
  const user = useSelector((state: RootState) => state.auth.user);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Update game when puzzle changes and show opponent's first move
  useEffect(() => {
    async function setupPuzzle() {
      try {
        if (currentPuzzle?.fen && currentPuzzle.moves.length > 0) {
          // Disable animations initially
          setTransitionDuration(0);
          setIsAnimating(true);
          
          // Reset the game with the puzzle position
          const newGame = new Chess();
          newGame.load(currentPuzzle.fen);
          setGame(newGame);
          setCurrentMoveIndex(1);
          setPuzzleSolved(false);
          setPuzzleFailed(false);
          setHighlightedSquares({});
          
          // Set board orientation to match the side that needs to move after the first move
          setBoardOrientation(currentPuzzle.fen.split(' ')[1] === 'w' ? 'black' : 'white');
          
          // Wait for state updates to complete
          await new Promise(resolve => setTimeout(resolve, 300));
          
          // Make the first move (opponent's move)
          const firstMove = currentPuzzle.moves[0];
          const [fromSquare, toSquare] = [firstMove.slice(0, 2), firstMove.slice(2, 4)];
          newGame.move({
            from: fromSquare,
            to: toSquare,
            promotion: firstMove[4] || 'q'
          });
          
          // Update game state with the new position
          setGame(new Chess(newGame.fen()));
          
          // Highlight the move
          setHighlightedSquares({
            [fromSquare]: HIGHLIGHT_COLOR,
            [toSquare]: HIGHLIGHT_COLOR
          });
          
          // Re-enable animations after a short delay
          await new Promise(resolve => setTimeout(resolve, 100));
          setTransitionDuration(150);
          setIsAnimating(false);
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
  if (isLoading && !currentPuzzle) {
    return (
      <div className="w-full aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-gray-500">Loading puzzle...</div>
      </div>
    );
  }

  const onDrop = (sourceSquare: string, targetSquare: string) => {
    if (!currentPuzzle || isAnimating) return false;

    try {
      const move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      });

      if (move === null) return false;

      // Highlight the move
      setHighlightedSquares({
        [sourceSquare]: HIGHLIGHT_COLOR,
        [targetSquare]: HIGHLIGHT_COLOR
      });

      if (currentPuzzle && currentMoveIndex < currentPuzzle.moves.length) {
        const expectedMove = currentPuzzle.moves[currentMoveIndex];
        const moveString = `${sourceSquare}${targetSquare}`;
        if (moveString === expectedMove) {
          // Correct move
          setCurrentMoveIndex(currentMoveIndex + 1);
          if (currentMoveIndex + 1 >= currentPuzzle.moves.length) {
            // Puzzle completed
            setPuzzleSolved(true);
            setPuzzleFailed(false);
            dispatch(updateRatingsAfterPuzzle({ success: true, userId: user?.id }));
            onPuzzleComplete?.(true);
          } else {
            // Make opponent's next move
            setIsAnimating(true);
            setTimeout(() => {
              const opponentMove = currentPuzzle.moves[currentMoveIndex + 1];
              const [fromSquare, toSquare] = [opponentMove.slice(0, 2), opponentMove.slice(2, 4)];
              game.move({
                from: fromSquare,
                to: toSquare,
                promotion: opponentMove[4] || 'q'
              });
              
              // Highlight opponent's move
              setHighlightedSquares({
                [fromSquare]: HIGHLIGHT_COLOR,
                [toSquare]: HIGHLIGHT_COLOR
              });

              setCurrentMoveIndex(currentMoveIndex + 2);
              setIsAnimating(false);
              setGame(new Chess(game.fen()));
            }, 500);
          }
        } else {
          // Incorrect move
          setPuzzleSolved(false);
          setPuzzleFailed(true);
          dispatch(updateRatingsAfterPuzzle({ success: false, userId: user?.id }));
          onPuzzleComplete?.(false);
        }
      }

      return true;
    } catch (error) {
      console.error('Error making move:', error);
      return false;
    }
  };

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
    </div>
  );
}
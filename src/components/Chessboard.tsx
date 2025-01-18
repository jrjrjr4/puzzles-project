import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Chess } from 'chess.js';
import { Chessboard as ReactChessboard } from 'react-chessboard';
import { RootState, AppDispatch } from '../store/store';
import { updateRatingsAfterPuzzle } from '../store/slices/puzzleSlice';

interface ChessboardProps {
  size?: number;
}

interface CustomSquareStyles {
  [square: string]: { backgroundColor: string };
}

export default function Chessboard({ size = 600 }: ChessboardProps) {
  const dispatch = useDispatch<AppDispatch>();
  const [game, setGame] = useState(new Chess());
  const [boardOrientation] = useState<'white' | 'black'>('white');
  const [highlightedSquares, setHighlightedSquares] = useState<CustomSquareStyles>({});
  const [isAnimating, setIsAnimating] = useState(false);
  const [transitionDuration, setTransitionDuration] = useState(150);
  const [puzzleSolved, setPuzzleSolved] = useState(false);
  const [puzzleFailed, setPuzzleFailed] = useState(false);
  const currentPuzzle = useSelector((state: RootState) => state.puzzle.currentPuzzle);
  const user = useSelector((state: RootState) => state.auth.user);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const onDrop = (sourceSquare: string, targetSquare: string) => {
    try {
      const move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      });

      if (move === null) return false;

      if (currentPuzzle && currentMoveIndex < currentPuzzle.moves.length) {
        const expectedMove = currentPuzzle.moves[currentMoveIndex];
        if (move.san === expectedMove) {
          // Correct move
          setCurrentMoveIndex(currentMoveIndex + 1);
          if (currentMoveIndex + 1 >= currentPuzzle.moves.length) {
            // Puzzle completed
            setPuzzleSolved(true);
            setPuzzleFailed(false);
            dispatch(updateRatingsAfterPuzzle({ success: true, userId: user?.id }));
          }
        } else {
          // Incorrect move
          setPuzzleSolved(false);
          setPuzzleFailed(true);
          dispatch(updateRatingsAfterPuzzle({ success: false, userId: user?.id }));
        }
      }

      return true;
    } catch (error) {
      console.error('Error making move:', error);
      return false;
    }
  };

  function renderGameStatus() {
    if (!currentPuzzle) return null;

    return (
      <div className="text-center">
        {puzzleSolved && (
          <div className="bg-green-100 text-green-800 p-4 rounded-lg mb-4">
            Puzzle Solved!
          </div>
        )}
        {puzzleFailed && (
          <div className="bg-red-100 text-red-800 p-4 rounded-lg mb-4">
            Try again!
          </div>
        )}
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
      {renderGameStatus()}
    </div>
  );
}
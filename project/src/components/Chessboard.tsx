import React, { useState, useEffect, useRef } from 'react';
import { Chessboard as ReactChessboard } from 'react-chessboard';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { createChessGame } from '../utils/chess';

export default function Chessboard() {
  const currentPuzzle = useSelector((state: RootState) => state.puzzle.currentPuzzle);
  const [isLoading, setIsLoading] = useState(false);
  const [game, setGame] = useState(createChessGame(currentPuzzle?.fen));
  const [displayPosition, setDisplayPosition] = useState(currentPuzzle?.fen || 'start');
  const [orientation, setOrientation] = useState<'white' | 'black'>(
    currentPuzzle?.fen ? (currentPuzzle.fen.split(' ')[1] === 'b' ? 'black' : 'white') : 'white'
  );
  const [customSquares, setCustomSquares] = useState({});
  const animationTimeout = useRef<NodeJS.Timeout>();

  // Define highlight color constant to ensure consistency
  const HIGHLIGHT_COLOR = { backgroundColor: 'rgba(255, 255, 0, 0.5)' }; // Brighter yellow with higher opacity

  useEffect(() => {
    if (currentPuzzle?.fen) {
      setIsLoading(true);
      
      const isBlackToMove = currentPuzzle.fen.split(' ')[1] === 'b';
      const newOrientation = isBlackToMove ? 'black' : 'white';
      
      setOrientation(newOrientation);
      setDisplayPosition(currentPuzzle.fen);
      setGame(createChessGame(currentPuzzle.fen));
      setIsLoading(false);
      setCustomSquares({});
      
      setTimeout(() => {
        if (currentPuzzle.moves && currentPuzzle.moves.length > 0) {
          const firstMove = currentPuzzle.moves[0];
          const from = firstMove.slice(0, 2);
          const to = firstMove.slice(2, 4);
          
          // Set initial highlight
          const highlightSquares = {
            [from]: HIGHLIGHT_COLOR,
            [to]: HIGHLIGHT_COLOR
          };
          setCustomSquares(highlightSquares);

          const newGame = createChessGame(currentPuzzle.fen);
          newGame.move({ from, to, promotion: 'q' });
          setDisplayPosition(newGame.fen());
          
          animationTimeout.current = setTimeout(() => {
            setGame(newGame);
            // Keep the same highlight after move
            setCustomSquares(highlightSquares);
          }, 2000);
        }
      }, 2000);
    }
    
    return () => {
      if (animationTimeout.current) {
        clearTimeout(animationTimeout.current);
      }
    };
  }, [currentPuzzle]);

  function onDrop(sourceSquare: string, targetSquare: string) {
    try {
      const move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      });

      if (move === null) return false;
      setGame(createChessGame(game.fen()));
      setDisplayPosition(game.fen());
      setCustomSquares({
        [sourceSquare]: HIGHLIGHT_COLOR,
        [targetSquare]: HIGHLIGHT_COLOR
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  return (
    <div className="w-full aspect-square">
      {!isLoading && (
        <ReactChessboard
          position={displayPosition}
          onPieceDrop={onDrop}
          boardWidth={500}
          boardOrientation={orientation}
          animationDuration={2000}
          customBoardStyle={{
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          }}
          customSquares={customSquares}
        />
      )}
    </div>
  );
}
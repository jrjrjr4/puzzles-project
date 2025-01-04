import React, { useState, useRef, useEffect } from 'react';
import { Chessboard as ReactChessboard } from 'react-chessboard';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { createChessGame } from '../utils/chess';

export default function Chessboard() {
  const currentPuzzle = useSelector((state: RootState) => state.puzzle.currentPuzzle);
  const [game, setGame] = useState(createChessGame(currentPuzzle?.fen));
  const containerRef = useRef<HTMLDivElement>(null);
  const [boardWidth, setBoardWidth] = useState(800);

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

  function onDrop(sourceSquare: string, targetSquare: string) {
    try {
      const move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      });

      if (move === null) return false;
      setGame(createChessGame(game.fen()));
      return true;
    } catch (error) {
      return false;
    }
  }

  return (
    <div ref={containerRef} className="w-full aspect-square">
      <ReactChessboard
        position={game.fen()}
        onPieceDrop={onDrop}
        boardWidth={boardWidth}
        customBoardStyle={{
          borderRadius: '8px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        }}
      />
    </div>
  );
}
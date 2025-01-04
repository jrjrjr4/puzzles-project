import React, { useState } from 'react';
import { Chessboard as ReactChessboard } from 'react-chessboard';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { createChessGame } from '../utils/chess';

export default function Chessboard() {
  const currentPuzzle = useSelector((state: RootState) => state.puzzle.currentPuzzle);
  const [game, setGame] = useState(createChessGame(currentPuzzle?.fen));

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
    <div className="w-full aspect-square">
      <ReactChessboard
        position={game.fen()}
        onPieceDrop={onDrop}
        boardWidth={500}
        customBoardStyle={{
          borderRadius: '8px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        }}
      />
    </div>
  );
}
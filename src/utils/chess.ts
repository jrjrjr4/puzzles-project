import { Chess } from 'chess.js';

// Standard starting position FEN
export const DEFAULT_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export const createChessGame = (fen: string = DEFAULT_FEN): Chess => {
  try {
    return new Chess(fen);
  } catch (error) {
    console.warn('Invalid FEN provided, using default position:', error);
    return new Chess(DEFAULT_FEN);
  }
};
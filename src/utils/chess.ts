import { Chess } from 'chess.js';

export function createChessGame(fen?: string) {
  const chess = new Chess();
  if (fen) {
    chess.load(fen);
  }
  return chess;
}
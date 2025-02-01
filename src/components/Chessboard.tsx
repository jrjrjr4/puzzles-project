import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Chess, Square } from 'chess.js';
import { Chessboard as ReactChessboard } from 'react-chessboard';
import { RootState, AppDispatch } from '../store/store';
import { updateRatingsAfterPuzzleAsync } from '../store/slices/puzzleSlice';
import { supabase } from '../utils/supabase';

interface ChessboardProps {
  size?: number;
  onPuzzleComplete?: (solved: boolean) => void;
}

interface CustomSquareStyles {
  [square: string]: {
    backgroundColor?: string;
    background?: string;
  };
}

const HIGHLIGHT_COLOR = { backgroundColor: 'rgba(134, 239, 172, 0.4)' }; // Light green with transparency
const SELECTED_COLOR = { 
  backgroundColor: 'rgba(20, 85, 255, 0.5)' // Blue with transparency
};

// Create a radial gradient for the dot
const LEGAL_MOVE_STYLE = {
  background: `radial-gradient(circle at center, rgba(20, 85, 255, 0.3) 25%, transparent 26%)`
};

// Create corner indicators for captures using right triangles
const CAPTURE_MOVE_STYLE = {
  background: `
    linear-gradient(to bottom right, rgba(20, 85, 255, 0.3) 50%, transparent 50%) 0 0,
    linear-gradient(to bottom left, rgba(20, 85, 255, 0.3) 50%, transparent 50%) 100% 0,
    linear-gradient(to top right, rgba(20, 85, 255, 0.3) 50%, transparent 50%) 0 100%,
    linear-gradient(to top left, rgba(20, 85, 255, 0.3) 50%, transparent 50%) 100% 100%
  `,
  backgroundRepeat: 'no-repeat',
  backgroundSize: '25% 25%'
};

export default function Chessboard({ size = 600, onPuzzleComplete }: ChessboardProps) {
  const dispatch = useDispatch<AppDispatch>();
  const [game, setGame] = useState(new Chess());
  const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>('white');
  const [highlightedSquares, setHighlightedSquares] = useState<CustomSquareStyles>({});
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalMoves, setLegalMoves] = useState<CustomSquareStyles>({});
  const [isAnimating, setIsAnimating] = useState(false);
  const [transitionDuration, setTransitionDuration] = useState(150);
  const [puzzleSolved, setPuzzleSolved] = useState(false);
  const [puzzleFailed, setPuzzleFailed] = useState(false);
  const currentPuzzle = useSelector((state: RootState) => state.puzzle.currentPuzzle);
  const user = useSelector((state: RootState) => state.auth.user);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Update game when puzzle changes and show opponent's first move with detailed debugging
  useEffect(() => {
    async function setupPuzzle() {
      console.debug('setupPuzzle triggered', { timestamp: Date.now(), currentPuzzle });
      try {
        if (currentPuzzle?.fen && currentPuzzle.moves.length > 0) {
          console.debug('setupPuzzle: Valid puzzle detected. Starting setup.');

          // Disable animations initially
          setTransitionDuration(0);
          setIsAnimating(true);

          // Reset the game with the puzzle position
          const newGame = new Chess();
          newGame.load(currentPuzzle.fen);
          console.debug('setupPuzzle: Loaded puzzle FEN', { loadedFEN: newGame.fen() });

          setGame(newGame);
          setCurrentMoveIndex(1);
          setPuzzleSolved(false);
          setPuzzleFailed(false);
          setHighlightedSquares({});
          setSelectedSquare(null);
          setLegalMoves({});

          // Set board orientation
          const sideToMove = currentPuzzle.fen.split(' ')[1];
          const newOrientation = sideToMove === 'w' ? 'black' : 'white';
          setBoardOrientation(newOrientation);
          console.debug('setupPuzzle: Board orientation set', { sideToMove, newOrientation });

          // Make the first move (opponent's move)
          const firstMove = currentPuzzle.moves[0];
          const fromSquare = firstMove.slice(0, 2);
          const toSquare = firstMove.slice(2, 4);
          newGame.move({
            from: fromSquare,
            to: toSquare,
            promotion: firstMove[4] || 'q'
          });
          console.debug('setupPuzzle: Opponent move made', { fromSquare, toSquare, postMoveFEN: newGame.fen() });

          // Update game state with the new position and highlight the move
          setGame(new Chess(newGame.fen()));
          setHighlightedSquares({
            [fromSquare]: HIGHLIGHT_COLOR,
            [toSquare]: HIGHLIGHT_COLOR
          });
          console.debug('setupPuzzle: Highlight set', { highlightedSquares: { [fromSquare]: HIGHLIGHT_COLOR, [toSquare]: HIGHLIGHT_COLOR } });

          // Re-enable animations on next frame to avoid flash
          requestAnimationFrame(() => {
            setTransitionDuration(150);
            setIsAnimating(false);
            console.debug('setupPuzzle: Animations re-enabled', { transitionDuration: 150, isAnimating: false });
          });
        } else {
          console.debug('setupPuzzle: Skipped setup due to invalid puzzle', { currentPuzzle });
        }
      } catch (error) {
        console.error('Error setting up puzzle:', error);
      } finally {
        setIsLoading(false);
        console.debug('setupPuzzle: Final block executed', { isLoading: false });
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

  const makeMove = async (sourceSquare: Square, targetSquare: Square) => {
    if (!currentPuzzle || isAnimating) return false;

    try {
      const move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      });

      if (move === null) return false;

      // Clear selection and legal moves
      setSelectedSquare(null);
      setLegalMoves({});

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
            const result = await dispatch(updateRatingsAfterPuzzleAsync({ success: true, userId: user?.id })).unwrap();
            
            // Save to Supabase if we have a logged-in user
            if (result && user?.id && !user.id.startsWith('guest_')) {
              try {
                const { error } = await supabase
                  .from('user_ratings')
                  .upsert({
                    user_id: user.id,
                    ratings: result.userRatings,
                    updated_at: new Date().toISOString()
                  }, {
                    onConflict: 'user_id'
                  });

                if (error) {
                  console.error('❌ Error saving ratings to Supabase:', error);
                } else {
                  console.log('✅ Successfully saved ratings to Supabase');
                }
              } catch (err) {
                console.error('❌ Error saving to Supabase:', err);
              }
            }
            
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
          const result = await dispatch(updateRatingsAfterPuzzleAsync({ success: false, userId: user?.id })).unwrap();
          
          // Save to Supabase if we have a logged-in user
          if (result && user?.id && !user.id.startsWith('guest_')) {
            try {
              const { error } = await supabase
                .from('user_ratings')
                .upsert({
                  user_id: user.id,
                  ratings: result.userRatings,
                  updated_at: new Date().toISOString()
                }, {
                  onConflict: 'user_id'
                });

              if (error) {
                console.error('❌ Error saving ratings to Supabase:', error);
              } else {
                console.log('✅ Successfully saved ratings to Supabase');
              }
            } catch (err) {
              console.error('❌ Error saving to Supabase:', err);
            }
          }
          
          onPuzzleComplete?.(false);
        }
      }

      return true;
    } catch (error) {
      console.error('Error making move:', error);
      return false;
    }
  };

  const onSquareClick = (square: Square) => {
    // If a piece is already selected
    if (selectedSquare) {
      // If clicking the same square, deselect it
      if (square === selectedSquare) {
        setSelectedSquare(null);
        setLegalMoves({});
        return;
      }
      
      // If clicking a legal move square, make the move
      if (legalMoves[square]) {
        makeMove(selectedSquare, square);
        return;
      }
      
      // If clicking a different piece of the same color
      const piece = game.get(square);
      if (piece && piece.color === game.turn()) {
        // Select the new piece
        setSelectedSquare(square);
        // Calculate and show legal moves for the new piece
        const moves = game.moves({ square, verbose: true });
        const newLegalMoves: CustomSquareStyles = {
          [square]: SELECTED_COLOR
        };
        moves.forEach(move => {
          // Check if the move is a capture
          const targetPiece = game.get(move.to);
          newLegalMoves[move.to] = targetPiece ? CAPTURE_MOVE_STYLE : LEGAL_MOVE_STYLE;
        });
        setLegalMoves(newLegalMoves);
        return;
      }
    }
    
    // If no piece is selected, try to select a piece
    const piece = game.get(square);
    if (piece && piece.color === game.turn()) {
      setSelectedSquare(square);
      // Calculate and show legal moves
      const moves = game.moves({ square, verbose: true });
      const newLegalMoves: CustomSquareStyles = {
        [square]: SELECTED_COLOR
      };
      moves.forEach(move => {
        // Check if the move is a capture
        const targetPiece = game.get(move.to);
        newLegalMoves[move.to] = targetPiece ? CAPTURE_MOVE_STYLE : LEGAL_MOVE_STYLE;
      });
      setLegalMoves(newLegalMoves);
    }
  };

  // Keep drag-and-drop functionality as fallback
  const onDrop = (sourceSquare: string, targetSquare: string) => {
    makeMove(sourceSquare as Square, targetSquare as Square)
      .then(result => {
        if (!result) {
          // Handle invalid move if needed
        }
      })
      .catch(error => {
        console.error('Error in onDrop:', error);
      });
    return true; // Always return true to prevent the piece from snapping back
  };

  console.debug('Chessboard rendering with FEN', { fen: game.fen() });
  return (
    <div className="space-y-4">
      <div className="w-full aspect-square">
        <ReactChessboard
          position={game.fen()}
          onPieceDrop={onDrop}
          onSquareClick={onSquareClick}
          boardWidth={size}
          boardOrientation={boardOrientation}
          customSquareStyles={{ ...highlightedSquares, ...legalMoves }}
          animationDuration={transitionDuration}
          customBoardStyle={{
            backgroundColor: '#f3f4f6',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          }}
        />
      </div>
    </div>
  );
}
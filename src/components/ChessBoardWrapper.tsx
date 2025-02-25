import React, { useState, useEffect, useRef } from 'react';
import Chessboard from './Chessboard';

interface ChessBoardWrapperProps {
  size: number;
  onPuzzleComplete?: (solved: boolean) => void;
  containerRef: React.RefObject<HTMLDivElement>;
  shouldResetPuzzle?: boolean;
  onPuzzleReset?: () => void;
}

/**
 * A wrapper component for the chessboard that handles size and visibility issues
 */
export const ChessBoardWrapper: React.FC<ChessBoardWrapperProps> = ({ 
  size, 
  onPuzzleComplete,
  containerRef,
  shouldResetPuzzle,
  onPuzzleReset
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const hasRendered = useRef(false);
  const visibilityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [validatedSize, setValidatedSize] = useState(Math.max(size, 300)); // Use a minimum default

  // Force the component to be visible after a short delay
  useEffect(() => {
    // Validate size and use a minimum if needed
    if (size <= 0) {
      // Only keep critical warnings
      console.warn(`Invalid board size (${size}px), using fallback`);
      // Use container width if available, otherwise use a safe default
      const containerWidth = containerRef.current?.clientWidth || window.innerWidth * 0.8;
      const safeSize = Math.max(Math.floor(containerWidth * 0.8), 300);
      setValidatedSize(safeSize);
    } else {
      setValidatedSize(size);
    }
    
    // Force visibility after a short delay
    visibilityTimerRef.current = setTimeout(() => {
      setIsVisible(true);
      hasRendered.current = true;
    }, 100);

    return () => {
      if (visibilityTimerRef.current) {
        clearTimeout(visibilityTimerRef.current);
      }
    };
  }, [size, containerRef]);

  // Diagnostic helper to render a debug overlay in development
  const renderDebugInfo = () => {
    // Always return null to disable the debug overlay
    return null;
  };

  // Return the chess board only if we have a valid size
  return (
    <div 
      className="relative" 
      style={{ 
        width: `${validatedSize}px`, 
        height: `${validatedSize}px`,
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 0.2s ease-in-out',
      }}
    >
      {validatedSize > 0 && (
        <>
          <Chessboard 
            size={validatedSize} 
            onPuzzleComplete={onPuzzleComplete}
            shouldResetPuzzle={shouldResetPuzzle}
            onPuzzleReset={onPuzzleReset}
          />
          {renderDebugInfo()}
        </>
      )}
    </div>
  );
};

export default ChessBoardWrapper; 
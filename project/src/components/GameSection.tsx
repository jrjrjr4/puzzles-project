import React from 'react';
import Chessboard from './Chessboard';
import CategoryRatings from './CategoryRatings';

export default function GameSection() {
  return (
    <div className="flex gap-8 h-[calc(100vh-12rem)] items-start">
      <div className="flex-1">
        <div className="max-w-[600px] mx-auto">
          <Chessboard />
        </div>
      </div>
      <div className="w-[400px]">
        <CategoryRatings />
      </div>
    </div>
  );
}
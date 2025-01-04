import React from 'react';
import { CategoryRating } from '../types/category';

interface CategoryRatingBarProps {
  category: CategoryRating;
  averageRating: number;
  maxRating: number;
}

export function CategoryRatingBar({ category, averageRating, maxRating }: CategoryRatingBarProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-baseline">
        <div>
          <h3 className="text-sm font-medium text-gray-900">{category.name}</h3>
          <p className="text-xs text-gray-500">{category.description}</p>
        </div>
        <span className="text-sm font-semibold text-blue-600">{category.rating}</span>
      </div>
      <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className="absolute h-full bg-blue-600 rounded-full transition-all duration-300"
          style={{ width: `${(category.rating / maxRating) * 100}%` }}
        />
        <div 
          className="absolute h-full w-0.5 bg-yellow-400"
          style={{ left: `${(averageRating / maxRating) * 100}%` }}
        />
      </div>
    </div>
  );
}
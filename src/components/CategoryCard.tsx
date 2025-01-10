import React from 'react';
import { 
  Sword, 
  Anchor, 
  Target, 
  Shield, 
  Crown, 
  Crosshair,
  LucideIcon 
} from 'lucide-react';
import { CategoryRating } from '../types/category';
import RatingBar from './RatingBar';

const categoryIcons: Record<string, LucideIcon> = {
  'Forks': Target,
  'Pins': Anchor,
  'Skewers': Sword,
  'Defense': Shield,
  'Endgame': Crown,
  'Tactics': Crosshair,
};

interface CategoryCardProps {
  category: CategoryRating & {
    ratingDeviation?: number;
  };
  averageRating: number;
}

export function CategoryCard({ category, averageRating }: CategoryCardProps) {
  return (
    <div className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-600 text-sm sm:text-base">
              {category.icon || category.name[0]}
            </span>
          </div>
        </div>
        <div>
          <h4 className="text-sm sm:text-base font-medium text-gray-900">{category.name}</h4>
          <p className="text-xs sm:text-sm text-gray-500">{category.description}</p>
        </div>
      </div>
      <div className="text-right">
        <div className="text-base sm:text-lg font-semibold text-blue-600">
          {Math.round(category.rating)}
        </div>
        <div className="text-xs text-gray-500">
          ±{Math.round(category.ratingDeviation || 350)}
        </div>
      </div>
    </div>
  );
}
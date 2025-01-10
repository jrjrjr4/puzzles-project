import React from 'react';
import { 
  Sword,
  Anchor,
  Target,
  Shield,
  Crown,
  Crosshair,
  Hammer,
  Scissors,
  Zap,
  Trophy,
  Swords,
  CircleDot,
  Boxes,
  Castle,
  LucideIcon 
} from 'lucide-react';
import { CategoryRating } from '../types/category';
import RatingBar from './RatingBar';

const categoryIcons: Record<string, LucideIcon> = {
  'Crushing': Hammer,
  'Advantage': Zap,
  'Mate': Crown,
  'Fork': Scissors,
  'Pin': Anchor,
  'Skewer': Sword,
  'Hanging Piece': Target,
  'Trapped Piece': Boxes,
  'Exposed King': Shield,
  'Middlegame': Swords,
  'Endgame': Castle,
  'Pawn Endgame': CircleDot,
  'Rook Endgame': Castle,
  'Master Game': Trophy
};

interface CategoryCardProps {
  category: CategoryRating & {
    ratingDeviation?: number;
  };
  averageRating: number;
}

export function CategoryCard({ category, averageRating }: CategoryCardProps) {
  const Icon = categoryIcons[category.name] || Crosshair;

  return (
    <div className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <Icon className="w-5 h-5 text-blue-600" />
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
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
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
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
  const lastRatingUpdates = useSelector((state: RootState) => state.puzzle.lastRatingUpdates);
  const ratingUpdate = lastRatingUpdates?.categories[category.name];
  const userRatings = useSelector((state: RootState) => state.puzzle.userRatings);

  if (!userRatings.loaded || !userRatings.overall) {
    return (
      <div className="p-2 md:p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-2 md:space-x-3 mb-1 md:mb-2">
          <div className="flex-shrink-0">
            <div className="w-6 h-6 md:w-10 md:h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Icon className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
            </div>
          </div>
          <h4 className="text-xs md:text-base font-medium text-gray-900">{category.name}</h4>
        </div>
        <div className="text-center">
          <div className="text-xs md:text-sm text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-2 md:p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center space-x-2 md:space-x-3 mb-1 md:mb-2">
        <div className="flex-shrink-0">
          <div className="w-6 h-6 md:w-10 md:h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <Icon className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
          </div>
        </div>
        <h4 className="text-xs md:text-base font-medium text-gray-900">{category.name}</h4>
      </div>
      <div className="text-center">
        {ratingUpdate ? (
          <div className="flex items-center justify-center gap-1 md:gap-2">
            <div className="text-sm md:text-lg font-semibold text-blue-600">
              {Math.round(ratingUpdate.oldRating)}
            </div>
            <div className="text-xs md:text-sm">→</div>
            <div className={`text-sm md:text-lg font-semibold ${
              ratingUpdate.newRating > ratingUpdate.oldRating 
                ? 'text-green-600' 
                : 'text-red-600'
            }`}>
              {Math.round(ratingUpdate.newRating)}
            </div>
          </div>
        ) : (
          <div className="text-sm md:text-lg font-semibold text-blue-600">
            {Math.round(category.rating)}
          </div>
        )}
        <div className="text-[10px] md:text-xs text-gray-500">
          ±{Math.round(category.ratingDeviation || 350)}
        </div>
      </div>
    </div>
  );
}
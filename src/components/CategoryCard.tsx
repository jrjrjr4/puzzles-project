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
  const previousPuzzle = useSelector((state: RootState) => state.puzzle.previousPuzzleId);
  const lastUpdatedThemes = useSelector((state: RootState) => state.puzzle.lastUpdatedThemes);

  // Show loading state if ratings aren't loaded yet
  if (!userRatings.loaded) {
    return (
      <div className="p-1.5 bg-gray-50 rounded-lg animate-pulse">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gray-200 rounded-full"></div>
            <div className="h-4 w-24 bg-gray-200 rounded"></div>
          </div>
          <div className="h-4 w-12 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  // If the rating is 0 or undefined, it means it hasn't been calculated yet
  const hasRating = category.rating !== undefined && category.rating > 0;
  const wasRecentlyUpdated = lastUpdatedThemes.includes(category.name);

  return (
    <div className="p-1.5 bg-gray-50 rounded-lg">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex-shrink-0">
            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
              <Icon className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <h4 className="text-sm font-medium text-gray-900">{category.name}</h4>
        </div>
        <div className="flex items-center gap-2">
          {!hasRating ? (
            <div className="text-sm text-gray-500">Not rated</div>
          ) : ratingUpdate ? (
            <div className="flex items-center gap-1">
              <div className="text-sm font-semibold text-blue-600">
                {Math.round(ratingUpdate.oldRating)}
              </div>
              <div className="text-xs">→</div>
              <div className={`text-sm font-semibold ${
                ratingUpdate.newRating > ratingUpdate.oldRating 
                  ? 'text-green-600' 
                  : 'text-red-600'
              }`}>
                {Math.round(ratingUpdate.newRating)}
              </div>
            </div>
          ) : (
            <div className={`text-sm font-semibold ${
              wasRecentlyUpdated ? 'text-yellow-600' : 'text-blue-600'
            }`}>
              {Math.round(category.rating)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
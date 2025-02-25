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
import { RatingUpdate } from '../types/puzzle';

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

// Augmented RatingUpdate to handle different implementations
interface AugmentedRatingUpdate {
  oldRating?: number;
  newRating: number;
  oldRD?: number;
  newRD: number;
  change?: number;
  attempts: number;
}

interface CategoryCardProps {
  category: CategoryRating & {
    ratingDeviation?: number;
  };
  averageRating: number;
  lastRatingUpdates?: { categories: { [key: string]: AugmentedRatingUpdate } };
}

export function CategoryCard({ category, averageRating, lastRatingUpdates }: CategoryCardProps) {
  const Icon = categoryIcons[category.name] || Crosshair;
  const lastRatingUpdatesState = useSelector((state: RootState) => state.puzzle.lastRatingUpdates);
  const ratingUpdate = lastRatingUpdatesState?.categories?.[category.name] as AugmentedRatingUpdate | undefined;
  const userRatings = useSelector((state: RootState) => state.puzzle.userRatings);
  const lastPuzzleIdForRatingUpdates = useSelector((state: RootState) => state.puzzle.lastPuzzleIdForRatingUpdates);
  const lastUpdatedThemes = useSelector((state: RootState) => state.puzzle.lastUpdatedThemes || []);
  const currentPuzzle = useSelector((state: RootState) => state.puzzle.currentPuzzle);

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
  
  // Safely check for themes that were updated
  const safeLastUpdatedThemes = Array.isArray(lastUpdatedThemes) ? lastUpdatedThemes : [];
  const wasRecentlyUpdated = safeLastUpdatedThemes.includes(category.name);
  
  // Safe access to rating update data
  const safeRatingUpdate = ratingUpdate || null;
  const showRatingUpdate = wasRecentlyUpdated && safeRatingUpdate && 
                          (currentPuzzle?.id === lastPuzzleIdForRatingUpdates);
  const showYellowHighlight = wasRecentlyUpdated && safeRatingUpdate && 
                             (currentPuzzle?.id !== lastPuzzleIdForRatingUpdates);

  // Get old rating value (may be different depending on which RatingUpdate interface is used)
  const getOldRating = (update: AugmentedRatingUpdate | null): number => {
    if (!update) return 0;
    // If oldRating is defined, use it, otherwise fall back to the category's current rating
    return typeof update.oldRating !== 'undefined' ? update.oldRating : category.rating;
  };

  // Safely access the update from props
  const update = lastRatingUpdates?.categories?.[category.name];
  const hasUpdate = !!update;

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
          ) : showRatingUpdate && safeRatingUpdate ? (
            <div className="flex items-center gap-1">
              <div className="text-sm font-semibold text-blue-600">
                {Math.round(getOldRating(safeRatingUpdate))}
              </div>
              <div className="text-xs">→</div>
              <div className={`text-sm font-semibold ${
                safeRatingUpdate.newRating > getOldRating(safeRatingUpdate) 
                  ? 'text-green-600' 
                  : 'text-red-600'
              }`}>
                {Math.round(safeRatingUpdate.newRating)}
              </div>
            </div>
          ) : showYellowHighlight ? (
            <div className="text-sm font-semibold text-yellow-600">
              {Math.round(category.rating)}
            </div>
          ) : (
            <div className="text-sm font-semibold text-blue-600">
              {Math.round(category.rating)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
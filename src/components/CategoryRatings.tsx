import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { categories } from '../data/categories';
import { calculateAverageRating } from '../utils/ratings';
import { CategoryCard } from './CategoryCard';

export default function CategoryRatings() {
  const userRatings = useSelector((state: RootState) => state.puzzle.userRatings);
  const lastRatingUpdates = useSelector((state: RootState) => state.puzzle.lastRatingUpdates);
  
  // Don't render anything until ratings are loaded
  if (!userRatings.loaded || !userRatings.overall) {
    return (
      <div className="bg-white p-4 sm:p-6 h-full w-full max-w-full">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2 sm:mb-0">Categories</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Loading ratings...</span>
          </div>
        </div>
      </div>
    );
  }

  // Ensure categories is defined and not empty
  if (!categories || categories.length === 0) {
    console.warn('No categories defined');
    return null;
  }

  const averageRating = calculateAverageRating(categories);

  // Sort categories by actual user ratings
  const sortedCategories = [...categories].sort((a, b) => {
    const ratingA = userRatings.categories[a.name]?.rating || 1200;
    const ratingB = userRatings.categories[b.name]?.rating || 1200;
    return ratingB - ratingA;
  });

  const strongestCategories = sortedCategories.slice(0, 5);
  const weakestCategories = sortedCategories.slice(-5).reverse();

  return (
    <div className="bg-white p-2 h-full w-full max-w-full">
      <div className="grid grid-cols-2 gap-1">
        <div>
          <h3 className="text-xs font-medium text-green-600 mb-1">Strengths</h3>
          <div className="space-y-1">
            {strongestCategories.map((category) => (
              <CategoryCard
                key={category.name}
                category={{
                  ...category,
                  rating: userRatings.categories[category.name]?.rating || 1200,
                  ratingDeviation: userRatings.categories[category.name]?.ratingDeviation || 350
                }}
                averageRating={averageRating}
              />
            ))}
          </div>
        </div>

        <div className="border-l pl-1">
          <h3 className="text-xs font-medium text-orange-600 mb-1">Focus Areas</h3>
          <div className="space-y-1">
            {weakestCategories.map((category) => (
              <CategoryCard
                key={category.name}
                category={{
                  ...category,
                  rating: userRatings.categories[category.name]?.rating || 1200,
                  ratingDeviation: userRatings.categories[category.name]?.ratingDeviation || 350
                }}
                averageRating={averageRating}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
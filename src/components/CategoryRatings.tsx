import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { categories } from '../data/categories';
import { calculateAverageRating } from '../utils/ratings';
import { CategoryCard } from './CategoryCard';

export default function CategoryRatings() {
  const userRatings = useSelector((state: RootState) => state.puzzle.userRatings);
  const lastRatingUpdates = useSelector((state: RootState) => state.puzzle.lastRatingUpdates);
  
  // Show loading state until ratings are fully loaded
  if (!userRatings.loaded) {
    return (
      <div className="bg-white p-2 h-full w-full max-w-full">
        <div className="grid grid-cols-2 gap-1">
          <div>
            <h3 className="text-xs font-medium text-green-600 mb-1">Strengths</h3>
            <div className="space-y-1">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="p-1.5 bg-gray-50 rounded-lg animate-pulse">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-gray-200 rounded-full"></div>
                      <div className="h-4 w-24 bg-gray-200 rounded"></div>
                    </div>
                    <div className="h-4 w-12 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="border-l pl-1">
            <h3 className="text-xs font-medium text-orange-600 mb-1">Focus Areas</h3>
            <div className="space-y-1">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="p-1.5 bg-gray-50 rounded-lg animate-pulse">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-gray-200 rounded-full"></div>
                      <div className="h-4 w-24 bg-gray-200 rounded"></div>
                    </div>
                    <div className="h-4 w-12 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
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

  // Sort categories by actual user ratings, only if they exist
  const sortedCategories = [...categories].sort((a, b) => {
    const ratingA = userRatings.categories[a.name]?.rating;
    const ratingB = userRatings.categories[b.name]?.rating;
    
    // If either rating is undefined, put it at the end
    if (ratingA === undefined && ratingB === undefined) return 0;
    if (ratingA === undefined) return 1;
    if (ratingB === undefined) return -1;
    
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
                  rating: userRatings.categories[category.name]?.rating || 0,
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
                  rating: userRatings.categories[category.name]?.rating || 0,
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
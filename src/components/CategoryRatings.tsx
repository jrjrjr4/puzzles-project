import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { categories } from '../data/categories';
import { calculateAverageRating } from '../utils/ratings';
import { CategoryCard } from './CategoryCard';

export default function CategoryRatings() {
  const userRatings = useSelector((state: RootState) => state.puzzle.userRatings);
  
  // Defensive check for userRatings
  if (!userRatings) {
    console.warn('No user ratings found');
    return null;
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

  const strongestCategories = sortedCategories.slice(0, 3);
  const weakestCategories = sortedCategories.slice(-3).reverse();

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 h-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Categories</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Overall Rating</span>
          <div className="text-right">
            <div className="text-lg font-bold text-blue-600">
              {Math.round(userRatings.overall.rating)}
            </div>
            <div className="text-xs text-gray-500">
              ±{Math.round(userRatings.overall.ratingDeviation)}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-medium text-green-600 mb-3">Strengths</h3>
          <div className="grid grid-cols-1 gap-4">
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

        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-sm font-medium text-orange-600 mb-3">Focus Areas</h3>
          <div className="grid grid-cols-1 gap-4">
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
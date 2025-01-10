import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { categories } from '../data/categories';
import { calculateAverageRating } from '../utils/ratings';
import { CategoryCard } from './CategoryCard';

export default function CategoryRatings() {
  const userRatings = useSelector((state: RootState) => state.puzzle.userRatings);
  console.log('Current user ratings:', userRatings);
  
  const averageRating = calculateAverageRating(categories);
  console.log('Average rating:', averageRating);

  // Sort categories by rating
  const sortedCategories = [...categories].sort((a, b) => {
    const ratingA = userRatings.categories[a.name]?.rating || 1200;
    const ratingB = userRatings.categories[b.name]?.rating || 1200;
    return ratingB - ratingA;
  });
  console.log('Sorted categories:', sortedCategories.map(c => ({
    name: c.name,
    rating: userRatings.categories[c.name]?.rating || 1200
  })));

  const strongestCategories = sortedCategories.slice(0, 3);
  const weakestCategories = sortedCategories.slice(-3).reverse();
  
  console.log('Strongest categories:', strongestCategories);
  console.log('Weakest categories:', weakestCategories);

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 h-full w-full max-w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2 sm:mb-0">Categories</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Overall Rating</span>
          <div className="text-right">
            <div className="text-base sm:text-lg font-bold text-blue-600">
              {Math.round(userRatings.overall.rating)}
            </div>
            <div className="text-xs text-gray-500">
              ±{Math.round(userRatings.overall.ratingDeviation)}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 sm:space-y-6">
        <div>
          <h3 className="text-sm font-medium text-green-600 mb-2 sm:mb-3">Strengths</h3>
          <div className="grid grid-cols-1 gap-3 sm:gap-4">
            {strongestCategories.map((category) => (
              <CategoryCard
                key={category.name}
                category={{
                  ...category,
                  rating: userRatings.categories[category.name]?.rating || 1200,
                  ratingDeviation: userRatings.categories[category.name]?.ratingDeviation
                }}
                averageRating={averageRating}
              />
            ))}
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4 sm:pt-6">
          <h3 className="text-sm font-medium text-orange-600 mb-2 sm:mb-3">Focus Areas</h3>
          <div className="grid grid-cols-1 gap-3 sm:gap-4">
            {weakestCategories.map((category) => (
              <CategoryCard
                key={category.name}
                category={{
                  ...category,
                  rating: userRatings.categories[category.name]?.rating || 1200,
                  ratingDeviation: userRatings.categories[category.name]?.ratingDeviation
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
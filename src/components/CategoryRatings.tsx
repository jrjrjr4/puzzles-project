import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { categories } from '../data/categories';
import { calculateAverageRating } from '../utils/ratings';
import { CategoryCard } from './CategoryCard';

export default function CategoryRatings() {
  const averageRating = calculateAverageRating(categories);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 h-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Categories</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Average</span>
          <span className="text-lg font-bold text-blue-600">{Math.round(averageRating)}</span>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4">
        {categories.map((category) => (
          <CategoryCard
            key={category.name}
            category={category}
            averageRating={averageRating}
          />
        ))}
      </div>
    </div>
  );
}
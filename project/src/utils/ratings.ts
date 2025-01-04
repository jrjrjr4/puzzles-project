import { CategoryRating } from '../types/category';

export const calculateAverageRating = (categories: CategoryRating[]): number => {
  return categories.reduce((sum, cat) => sum + cat.rating, 0) / categories.length;
};

export const getMaxRating = (categories: CategoryRating[]): number => {
  return Math.max(...categories.map(cat => cat.rating));
};
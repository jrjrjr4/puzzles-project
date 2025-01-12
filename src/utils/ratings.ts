import { CategoryRating } from '../types/category';

// Glicko-1 system constants
export const BASE_RD = 350; // Starting rating deviation
const Q = Math.log(10) / 400;
const K = 0.5; // System constant that affects rating changes

interface RatingUpdate {
  newRating: number;
  newRD: number;
}

export function calculateNewRating(
  userRating: number,
  userRD: number,
  opponentRating: number,
  opponentRD: number,
  score: boolean
): RatingUpdate {
  const q = Math.log(10) / 400;
  const g = 1 / Math.sqrt(1 + 3 * q * q * (userRD * userRD + opponentRD * opponentRD) / (Math.PI * Math.PI));
  const e = 1 / (1 + Math.pow(10, g * (opponentRating - userRating) / 400));
  const d2 = 1 / (q * q * g * g * e * (1 - e));
  const newRD = Math.sqrt(1 / (1 / (userRD * userRD) + 1 / d2));
  const newRating = userRating + q * newRD * newRD * g * (score ? 1 - e : 0 - e);

  return {
    newRating,
    newRD: Math.min(Math.max(newRD, 30), BASE_RD)
  };
}

export function calculateAverageRating(categories: { rating: number }[]): number {
  if (categories.length === 0) return 1200;
  return Math.round(
    categories.reduce((sum, category) => sum + category.rating, 0) / categories.length
  );
}

export function getRatingConfidence(ratingDeviation: number): string {
  if (ratingDeviation <= 50) return 'Very High';
  if (ratingDeviation <= 100) return 'High';
  if (ratingDeviation <= 200) return 'Medium';
  return 'Low';
}
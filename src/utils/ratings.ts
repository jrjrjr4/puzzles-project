import { CategoryRating } from '../types/category';

// Glicko-1 system constants
export const BASE_RD = 350; // Starting rating deviation
const Q = Math.log(10) / 400;
const K = 0.5; // System constant that affects rating changes

interface RatingUpdate {
  oldRating: number;
  newRating: number;
  oldRD: number;
  newRD: number;
  change: number;
}

export function calculateRatingChange(
  playerRating: number,
  playerRD: number,
  opponentRating: number,
  opponentRD: number,
  score: number // 1 for win, 0 for loss, 0.5 for draw
): RatingUpdate {
  // Calculate g(RD)
  const g = 1 / Math.sqrt(1 + 3 * Q * Q * opponentRD * opponentRD / (Math.PI * Math.PI));
  
  // Calculate E (expected score)
  const E = 1 / (1 + Math.pow(10, g * (opponentRating - playerRating) / 400));
  
  // Calculate d²
  const d2 = 1 / (Q * Q * g * g * E * (1 - E));
  
  // Calculate rating change
  const ratingChange = Q / (1 / (playerRD * playerRD) + 1 / d2) * g * (score - E);
  
  // Calculate new RD
  const newRD = Math.sqrt(1 / (1 / (playerRD * playerRD) + 1 / d2));
  
  return {
    oldRating: playerRating,
    newRating: Math.round(playerRating + ratingChange),
    oldRD: playerRD,
    newRD: Math.round(newRD),
    change: Math.round(ratingChange)
  };
}

export const calculateAverageRating = (categories: CategoryRating[]): number => {
  return categories.reduce((sum, cat) => sum + cat.rating, 0) / categories.length;
};

export const getMaxRating = (categories: CategoryRating[]): number => {
  return Math.max(...categories.map(cat => cat.rating));
};
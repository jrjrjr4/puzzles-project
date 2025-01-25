import { CategoryRating } from '../types/category';

// Glicko-1 system constants
export const BASE_RD = 350; // Starting rating deviation
const Q = Math.log(10) / 400;

// Dynamic K-factor constants
export const K_FACTORS = {
  NEW_USER: 0.8,    // First 5 attempts
  DEVELOPING: 0.6,  // 5-10 attempts
  ESTABLISHED: 0.4  // 10+ attempts
} as const;

interface RatingWithDeviation {
  rating: number;
  ratingDeviation: number;
  attempts: number; // Track number of attempts
}

interface RatingUpdate {
  oldRating: number;
  newRating: number;
  oldRD: number;
  newRD: number;
  change: number;
  attempts: number;
}

/**
 * Get dynamic K-factor based on number of attempts
 * @param attempts Number of attempts in the category
 * @returns K-factor value between 0.4 and 0.8
 */
function getDynamicK(attempts: number): number {
  if (attempts < 5) return K_FACTORS.NEW_USER;
  if (attempts < 10) return K_FACTORS.DEVELOPING;
  return K_FACTORS.ESTABLISHED;
}

export function calculateRatingChange(
  playerRating: number,
  playerRD: number,
  opponentRating: number,
  opponentRD: number,
  score: number, // 1 for win, 0 for loss, 0.5 for draw
  attempts: number = 0 // Default to 0 for backward compatibility
): RatingUpdate {
  // Calculate g(RD)
  const g = 1 / Math.sqrt(1 + 3 * Q * Q * opponentRD * opponentRD / (Math.PI * Math.PI));
  
  // Calculate E (expected score)
  const E = 1 / (1 + Math.pow(10, g * (opponentRating - playerRating) / 400));
  
  // Calculate d²
  const d2 = 1 / (Q * Q * g * g * E * (1 - E));
  
  // Get dynamic K-factor based on attempts
  const K = getDynamicK(attempts);
  
  // Calculate rating change with dynamic K
  const ratingChange = Q / (1 / (playerRD * playerRD) + 1 / d2) * g * (score - E) * K;
  
  // Calculate new RD
  const newRD = Math.sqrt(1 / (1 / (playerRD * playerRD) + 1 / d2));
  
  return {
    oldRating: playerRating,
    newRating: Math.round(playerRating + ratingChange),
    oldRD: playerRD,
    newRD: Math.round(newRD),
    change: Math.round(ratingChange),
    attempts: attempts + 1
  };
}

export const calculateAverageRating = (categories: CategoryRating[]): number => {
  return categories.reduce((sum, cat) => sum + cat.rating, 0) / categories.length;
};

export const getMaxRating = (categories: CategoryRating[]): number => {
  return Math.max(...categories.map(cat => cat.rating));
};
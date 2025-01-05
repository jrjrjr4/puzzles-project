export interface Puzzle {
  id: string;
  fen: string;
  moves: string[];
  rating: number;
  ratingDeviation: number;
  popularity: number;
  nbPlays: number;
  themes: string[];
  gameUrl: string;
  openingTags: string[];
}

export interface PuzzleState {
  currentPuzzle: Puzzle | null;
  userRatings: {
    overall: number;
    categories: Record<string, number>;
  };
}

export interface RatingUpdate {
  oldRating: number;
  oldRD: number;
  newRating: number;
  newRD: number;
} 
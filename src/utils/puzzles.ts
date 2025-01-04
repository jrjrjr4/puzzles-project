import { Puzzle } from '../types/puzzle';

export function parsePuzzleCsv(csvContent: string): Puzzle[] {
  const lines = csvContent.trim().split('\n');
  const headers = lines[0].split(',');
  
  return lines.slice(1).map(line => {
    const values = line.split(',');
    return {
      id: values[0],
      fen: values[1],
      moves: values[2].split(' '),
      rating: parseInt(values[3]),
      ratingDeviation: parseInt(values[4]),
      popularity: parseInt(values[5]),
      nbPlays: parseInt(values[6]),
      themes: values[7].split(' '),
      gameUrl: values[8],
      openingTags: values[9] ? values[9].split(' ') : []
    };
  });
}

export function getRandomPuzzle(puzzles: Puzzle[]): Puzzle {
  const index = Math.floor(Math.random() * puzzles.length);
  return puzzles[index];
}

// Rating deviation in Glicko rating system represents the reliability of a player's rating
// A smaller RD indicates a more reliable rating
export function getRatingConfidence(ratingDeviation: number): string {
  if (ratingDeviation < 50) return 'Very High';
  if (ratingDeviation < 75) return 'High';
  if (ratingDeviation < 100) return 'Medium';
  return 'Low';
} 
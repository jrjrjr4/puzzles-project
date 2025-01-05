import { Puzzle } from '../types/puzzle';

export function parsePuzzleCsv(csvContent: string): Puzzle[] {
  // Skip header row and empty lines
  const lines = csvContent.split('\n')
    .filter((line, index) => index > 0 && line.trim());
    
  return lines.map(line => {
    try {
      // Split by comma but handle quoted fields
      const parts = line.split(',');
      const [id, fen, moves, rating, ratingDeviation, popularity, nbPlays, themesString] = parts;
      
      // Parse themes, properly handling the format
      const themes = themesString
        ? themesString
            .split(' ')
            .map(t => t.trim())
            .filter(t => {
              return t && 
                     !t.includes('http') && 
                     !t.includes('Short');
            })
            .map(t => {
              // Only remove standalone numbers and dots, preserve mateInX
              return t
                .replace(/^(\d+\.?)(?!.*In)/, '') // Remove number prefix and dot only if not part of "mateIn"
                .toLowerCase() // Convert to lowercase
                .trim();
            })
            .filter(t => t.length > 0) // Remove empty strings
        : ['tactics'];

      return {
        id,
        fen,
        moves: moves.split(' '),
        rating: parseInt(rating),
        ratingDeviation: parseInt(ratingDeviation),
        popularity: parseInt(popularity),
        nbPlays: parseInt(nbPlays),
        themes
      };
    } catch (error) {
      console.error('Error parsing puzzle line:', line, error);
      return null;
    }
  }).filter((puzzle): puzzle is Puzzle => puzzle !== null);
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
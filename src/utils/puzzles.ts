import { Puzzle } from '../types/puzzle';

// Map Lichess puzzle themes to our category names
export function mapThemeToCategory(theme: string): string | undefined {
  const themeMap: Record<string, string | undefined> = {
    'crushing': 'Crushing',
    'advantage': 'Advantage',
    'mate': 'Mate',
    'mateIn1': 'Mate',
    'mateIn2': 'Mate',
    'mateIn3': 'Mate',
    'mateIn4': 'Mate',
    'mateIn5': 'Mate',
    'backRankMate': 'Mate',
    'fork': 'Fork',
    'pin': 'Pin',
    'skewer': 'Skewer',
    'hangingPiece': 'Hanging Piece',
    'trappedPiece': 'Trapped Piece',
    'exposedKing': 'Exposed King',
    'middlegame': 'Middlegame',
    'endgame': 'Endgame',
    'pawnEndgame': 'Pawn Endgame',
    'rookEndgame': 'Rook Endgame',
    'master': 'Master Game',
    'masterGame': 'Master Game',
    'short': undefined, // These are puzzle length indicators, not themes
    'long': undefined,
    'veryLong': undefined
  };

  return themeMap[theme.toLowerCase()];
}

export function parsePuzzleCsv(csvContent: string): Puzzle[] {
  const lines = csvContent.trim().split('\n');
  const headers = lines[0].split(',');
  
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const rawThemes = values[7].split(' ');
    
    // Map raw themes to our categories, filter out nulls, and remove duplicates
    const themes = [...new Set(
      rawThemes
        .map(theme => mapThemeToCategory(theme.trim()))
        .filter((theme): theme is string => theme !== undefined)
    )];

    return {
      id: values[0],
      fen: values[1],
      moves: values[2].split(' '),
      rating: parseInt(values[3]),
      ratingDeviation: parseInt(values[4]),
      popularity: parseInt(values[5]),
      nbPlays: parseInt(values[6]),
      themes,
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
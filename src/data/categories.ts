import { CategoryRating } from '../types/category';

export const categories: CategoryRating[] = [
  {
    name: 'Crushing',
    rating: 1200,
    description: 'Winning material or position decisively'
  },
  {
    name: 'Advantage',
    rating: 1200,
    description: 'Gaining a significant advantage'
  },
  {
    name: 'Mate',
    rating: 1200,
    description: 'Checkmate patterns and sequences'
  },
  {
    name: 'Fork',
    rating: 1200,
    description: 'Attack multiple pieces at once'
  },
  {
    name: 'Pin',
    rating: 1200,
    description: 'Pin pieces to important squares'
  },
  {
    name: 'Skewer',
    rating: 1200,
    description: 'Attack pieces in a line'
  },
  {
    name: 'Hanging Piece',
    rating: 1200,
    description: 'Capture undefended pieces'
  },
  {
    name: 'Trapped Piece',
    rating: 1200,
    description: 'Trap opponent\'s pieces'
  },
  {
    name: 'Exposed King',
    rating: 1200,
    description: 'Attack exposed king positions'
  },
  {
    name: 'Middlegame',
    rating: 1200,
    description: 'Middlegame tactics and strategy'
  },
  {
    name: 'Endgame',
    rating: 1200,
    description: 'Endgame tactics and strategy'
  },
  {
    name: 'Pawn Endgame',
    rating: 1200,
    description: 'Endgames with mainly pawns'
  },
  {
    name: 'Rook Endgame',
    rating: 1200,
    description: 'Endgames with rooks'
  },
  {
    name: 'Master Game',
    rating: 1200,
    description: 'Puzzles from master-level games'
  }
];

// Map puzzle themes to our category system
export const themeToCategory: Record<string, string> = {
  'mate': 'Mate',
  'mateIn1': 'Mate in 1',
  'mateIn2': 'Mate in 2',
  'mateIn3': 'Mate in 3',
  'kingsideAttack': 'Kingside Attack',
  'queensideAttack': 'Queenside Attack',
  'pin': 'Pin',
  'fork': 'Fork',
  'discoveredAttack': 'Discovered Attack',
  'skewer': 'Skewer',
  'sacrifice': 'Sacrifice',
  'trapped': 'Trapped Piece',
  'endgame': 'Endgame',
  'middlegame': 'Middlegame',
  'opening': 'Opening',
  'hanging': 'Hanging Piece',
  'oneMove': 'Quick Tactics',
  'advantage': 'Advantage',
  'crushing': 'Crushing',
  'defensiveMove': 'Defense',
  // Add any other theme mappings you see in the puzzles
};
import { CategoryRating } from '../types/category';

export const categories: CategoryRating[] = [
  {
    name: 'Forks',
    rating: 1200,
    description: 'Attack two pieces at once'
  },
  {
    name: 'Pins',
    rating: 1200,
    description: 'Pin pieces to important squares'
  },
  {
    name: 'Skewers',
    rating: 1200,
    description: 'Attack pieces in a line'
  },
  {
    name: 'Defense',
    rating: 1200,
    description: 'Defend against threats'
  },
  {
    name: 'Endgame',
    rating: 1200,
    description: 'End game tactics and strategy'
  },
  {
    name: 'Tactics',
    rating: 1200,
    description: 'General tactical patterns'
  },
  {
    name: 'Mate in 2',
    rating: 1200,
    description: 'Checkmate in two moves'
  },
  {
    name: 'Mate in 3',
    rating: 1200,
    description: 'Checkmate in three moves'
  },
  {
    name: 'Sacrifice',
    rating: 1200,
    description: 'Material sacrifice for advantage'
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
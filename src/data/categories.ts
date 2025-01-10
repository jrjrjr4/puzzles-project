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
  'advantage': 'Advantage',
  'attraction': 'Attraction',
  'clearance': 'Clearance',
  'crushing': 'Crushing',
  'defensiveMove': 'Defense',
  'defensivemove': 'Defense',
  'deflection': 'Deflection',
  'discoveredAttack': 'Discovered Attack',
  'doubleCheck': 'Double Check',
  'endgame': 'Endgame',
  'fork': 'Fork',
  'hanging': 'Hanging Piece',
  'interference': 'Interference',
  'kingsideAttack': 'Kingside Attack',
  'mate': 'Mate',
  'mateIn1': 'Mate in 1',
  'mateIn2': 'Mate in 2',
  'mateIn3': 'Mate in 3',
  'mateIn4': 'Mate in 4',
  'master': 'Master Level',
  'masterVsMaster': 'Master vs Master',
  'middlegame': 'Middlegame',
  'oneMove': 'Quick Tactics',
  'opening': 'Opening',
  'pin': 'Pin',
  'queensideAttack': 'Queenside Attack',
  'quietMove': 'Quiet Move',
  'sacrifice': 'Sacrifice',
  'skewer': 'Skewer',
  'superGM': 'Super GM',
  'trapped': 'Trapped Piece',
  'xRayAttack': 'X-Ray Attack',
  'zugzwang': 'Zugzwang'
};
import { CategoryRating } from '../types/category';

export const categories: CategoryRating[] = [
  {
    name: 'Mate',
    rating: 1200,
    description: 'Checkmate patterns and sequences'
  },
  {
    name: 'Endgame',
    rating: 1200,
    description: 'Critical endgame positions'
  },
  {
    name: 'Defense',
    rating: 1200,
    description: 'Find the best defensive move'
  },
  {
    name: 'Pin',
    rating: 1200,
    description: 'Pin pieces to important squares'
  },
  {
    name: 'Deflection',
    rating: 1200,
    description: 'Force a piece away from an important square'
  },
  {
    name: 'Discovered Attack',
    rating: 1200,
    description: 'Move one piece to reveal an attack from another'
  },
  {
    name: 'Kingside Attack',
    rating: 1200,
    description: 'Attack the opponent\'s kingside'
  },
  {
    name: 'Fork',
    rating: 1200,
    description: 'Attack multiple pieces at once'
  },
  {
    name: 'Capturing Defender',
    rating: 1200,
    description: 'Remove a key defensive piece'
  },
  {
    name: 'Quiet Move',
    rating: 1200,
    description: 'A subtle move that prepares a tactical strike'
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
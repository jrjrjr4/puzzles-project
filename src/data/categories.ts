import { CategoryRating } from '../types/category';

export const categories: CategoryRating[] = [
  {
    name: 'Mate',
    rating: 1600,
    description: 'Checkmate puzzles'
  },
  {
    name: 'Endgame',
    rating: 1600,
    description: 'Endgame puzzles'
  },
  {
    name: 'Defense',
    rating: 1600,
    description: 'Defensive puzzles'
  },
  {
    name: 'Pin',
    rating: 1600,
    description: 'Pin puzzles'
  },
  {
    name: 'Deflection',
    rating: 1600,
    description: 'Deflection puzzles'
  },
  {
    name: 'Discovered Attack',
    rating: 1600,
    description: 'Discovered attack puzzles'
  },
  {
    name: 'Kingside Attack',
    rating: 1600,
    description: 'Kingside attack puzzles'
  },
  {
    name: 'Fork',
    rating: 1600,
    description: 'Fork puzzles'
  },
  {
    name: 'Capturing Defender',
    rating: 1600,
    description: 'Capturing defender puzzles'
  },
  {
    name: 'Quiet Move',
    rating: 1600,
    description: 'Quiet move puzzles'
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
import React from 'react';
import { 
  Sword, 
  Anchor, 
  Target, 
  Shield, 
  Crown, 
  Crosshair,
  LucideIcon 
} from 'lucide-react';
import { CategoryRating } from '../types/category';
import RatingBar from './RatingBar';

const categoryIcons: Record<string, LucideIcon> = {
  'Forks': Target,
  'Pins': Anchor,
  'Skewers': Sword,
  'Defense': Shield,
  'Endgame': Crown,
  'Tactics': Crosshair,
};

interface CategoryCardProps {
  category: CategoryRating;
  averageRating: number;
}

export function CategoryCard({ category, averageRating }: CategoryCardProps) {
  const Icon = categoryIcons[category.name] || Crosshair;

  return (
    <div className="bg-gray-50 rounded-lg p-4 transition-transform hover:scale-102">
      <div className="flex items-center gap-4">
        <div className="p-2 bg-blue-100 rounded-full">
          <Icon className="w-5 h-5 text-blue-600" />
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium text-gray-900">{category.name}</h3>
            <span className="text-sm font-bold text-blue-600">{category.rating}</span>
          </div>
          <RatingBar rating={category.rating} averageRating={averageRating} />
        </div>
      </div>
    </div>
  );
}
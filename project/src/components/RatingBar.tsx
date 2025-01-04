import React from 'react';

interface RatingBarProps {
  rating: number;
  averageRating: number;
}

export default function RatingBar({ rating, averageRating }: RatingBarProps) {
  // Calculate percentage relative to average with amplified differences
  const getAmplifiedPercentage = (value: number, avg: number): number => {
    const diff = value - avg;
    const percentage = (diff / avg) * 100;
    // Amplify the differences by multiplying them
    const amplifiedDiff = percentage * 2;
    // Center around 50% and clamp between 10% and 90%
    return Math.max(10, Math.min(90, 50 + amplifiedDiff));
  };

  const percentage = getAmplifiedPercentage(rating, averageRating);
  
  const getBarColor = (rating: number, avg: number): string => {
    const diff = rating - avg;
    if (diff > 100) return 'bg-emerald-500';
    if (diff > 0) return 'bg-green-500';
    if (diff > -50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
      {/* Rating bar */}
      <div 
        className={`absolute h-full transition-all duration-300 ${getBarColor(rating, averageRating)}`}
        style={{ width: `${percentage}%` }}
      />
      {/* Average marker */}
      <div className="absolute top-0 bottom-0 w-0.5 bg-yellow-400" style={{ left: '50%' }}>
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-gray-500">
          avg
        </div>
      </div>
    </div>
  );
}
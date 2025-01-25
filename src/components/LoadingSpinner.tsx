import React from 'react';

/**
 * A loading spinner component used during authentication initialization
 */
export const LoadingSpinner: React.FC = () => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 z-50">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent dark:border-blue-500 dark:border-t-transparent"></div>
    </div>
  );
}; 
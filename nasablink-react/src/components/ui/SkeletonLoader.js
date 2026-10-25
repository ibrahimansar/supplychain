import React from 'react';

// Base skeleton component with shimmer animation
export const Skeleton = ({ className = '', variant = 'default' }) => {
  const baseStyles = 'animate-pulse bg-gray-200 dark:bg-gray-700';
  
  const variants = {
    default: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    text: 'rounded h-4',
  };

  return (
    <div 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      aria-busy="true"
      aria-live="polite"
    />
  );
};

// Shimmer effect overlay
export const SkeletonShimmer = ({ children }) => {
  return (
    <div className="relative overflow-hidden">
      {children}
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent" />
    </div>
  );
};

// Card skeleton
export const CardSkeleton = ({ rows = 3, hasImage = false }) => {
  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 space-y-4">
      {hasImage && (
        <Skeleton className="w-full h-48 mb-4" variant="rectangular" />
      )}
      <Skeleton className="w-3/4 h-6" variant="text" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="w-full h-4" variant="text" />
      ))}
    </div>
  );
};

// List skeleton
export const ListSkeleton = ({ items = 3, withAvatar = false }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          {withAvatar && <Skeleton className="w-12 h-12 flex-shrink-0" variant="circular" />}
          <div className="flex-1 space-y-2">
            <Skeleton className="w-1/2 h-4" variant="text" />
            <Skeleton className="w-3/4 h-3" variant="text" />
          </div>
        </div>
      ))}
    </div>
  );
};

// Table skeleton
export const TableSkeleton = ({ rows = 3, columns = 4 }) => {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="bg-gray-50 dark:bg-gray-900 p-4 flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="flex-1 h-4" variant="text" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="bg-white dark:bg-gray-800 p-4 flex gap-4 border-t border-gray-200 dark:border-gray-700">
          {Array.from({ length: columns }).map((_, colIdx) => (
            <Skeleton key={colIdx} className="flex-1 h-4" variant="text" />
          ))}
        </div>
      ))}
    </div>
  );
};

// Tree node skeleton
export const TreeNodeSkeleton = ({ count = 5 }) => {
  return (
    <div className="flex flex-col items-center gap-8 p-8">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="w-32 h-24 rounded-lg" />
          {i < count - 1 && <div className="w-8 h-0.5 bg-gray-300 dark:bg-gray-600" />}
        </div>
      ))}
    </div>
  );
};

// Page skeleton with header and content
export const PageSkeleton = () => {
  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="w-1/3 h-8" variant="text" />
        <Skeleton className="w-1/2 h-4" variant="text" />
      </div>
      {/* Content */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <CardSkeleton rows={2} />
        <CardSkeleton rows={2} />
        <CardSkeleton rows={2} />
      </div>
    </div>
  );
};

// Form skeleton
export const FormSkeleton = ({ fields = 4 }) => {
  return (
    <div className="space-y-4 p-6 bg-white dark:bg-gray-800 rounded-lg">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="w-1/4 h-4" variant="text" />
          <Skeleton className="w-full h-10 rounded-lg" />
        </div>
      ))}
      <div className="flex gap-3 pt-4">
        <Skeleton className="w-24 h-10 rounded-lg" />
        <Skeleton className="w-24 h-10 rounded-lg" />
      </div>
    </div>
  );
};

// Dashboard stats skeleton
/** Tailwind needs full class names at build time — never interpolate. */
const STAT_COLUMNS = {
  2: 'grid gap-4 md:grid-cols-2',
  3: 'grid gap-4 md:grid-cols-3',
  4: 'grid gap-4 md:grid-cols-2 lg:grid-cols-4',
};

/**
 * Mirrors a row of stat cards. `cards` and `columns` must match the real grid,
 * otherwise the placeholder is a different size than the content that replaces
 * it and the swap reads as a jump.
 */
export const StatsSkeleton = ({ cards = 4, columns = 4 }) => {
  return (
    <div className={STAT_COLUMNS[columns] || STAT_COLUMNS[4]}>
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 space-y-2">
          <Skeleton className="w-1/2 h-4" variant="text" />
          <Skeleton className="w-1/3 h-7" variant="text" />
        </div>
      ))}
    </div>
  );
};

export default Skeleton;

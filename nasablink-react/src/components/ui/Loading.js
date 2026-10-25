import React from 'react';

/**
 * LoadingSpinner - Unified spinner component
 * 
 * @param {string} size - 'xs' | 'sm' | 'md' | 'lg' | 'xl'
 * @param {string} color - 'primary' | 'white' | 'gray' | 'current'
 * @param {string} className - Additional CSS classes
 */
const LoadingSpinner = ({ size = 'md', color = 'primary', className = '' }) => {
  const sizeClasses = {
    xs: 'h-3 w-3 border',
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-2',
    xl: 'h-16 w-16 border-[3px]'
  };

  const colorClasses = {
    primary: 'border-gray-200 border-t-primary-600 dark:border-gray-700 dark:border-t-primary-500',
    white: 'border-white/30 border-t-white',
    gray: 'border-gray-200 border-t-gray-500 dark:border-gray-600 dark:border-t-gray-400',
    current: 'border-current/30 border-t-current'
  };

  return (
    <div 
      className={`animate-spin rounded-full ${sizeClasses[size]} ${colorClasses[color]} ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
};

/**
 * LoadingOverlay - Overlay with spinner for loading states on components
 */
const LoadingOverlay = ({ message = 'Loading...', children, show = true }) => {
  if (!show) return children;

  return (
    <div className="relative">
      {children}
      <div className="absolute inset-0 bg-white/75 dark:bg-gray-900/75 flex items-center justify-center z-10 rounded-lg backdrop-blur-sm">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-2" />
          <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p>
        </div>
      </div>
    </div>
  );
};

/**
 * LoadingPage - Full page loading state
 */
const LoadingPage = ({ message = 'Loading...' }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
    <div className="text-center">
      <LoadingSpinner size="xl" className="mx-auto mb-4" />
      <p className="text-lg text-gray-600 dark:text-gray-400">{message}</p>
    </div>
  </div>
);

/**
 * LoadingInline - Inline loading indicator with optional text
 */
const LoadingInline = ({ text, size = 'sm', className = '' }) => (
  <div className={`flex items-center gap-2 text-gray-600 dark:text-gray-400 ${className}`}>
    <LoadingSpinner size={size} />
    {text && <span className="text-sm">{text}</span>}
  </div>
);

/**
 * LoadingButton - Button wrapper that shows spinner when loading
 */
const LoadingButton = ({ loading, children, disabled, className = '', ...props }) => (
  <button
    disabled={loading || disabled}
    aria-busy={loading || undefined}
    className={`relative inline-flex items-center justify-center ${className}`}
    {...props}
  >
    {/* Centred over the button; the label keeps its space so the width is
        identical loading or not. */}
    {loading && (
      <span className="absolute inset-0 flex items-center justify-center">
        <LoadingSpinner size="sm" color="current" />
      </span>
    )}
    <span className={loading ? 'invisible' : undefined}>{children}</span>
  </button>
);

/**
 * LoadingSection - Section loading placeholder
 */
const LoadingSection = ({ message = 'Loading...', height = 'h-32' }) => (
  <div className={`${height} flex items-center justify-center`}>
    <div className="text-center">
      <LoadingSpinner size="md" className="mx-auto mb-2" />
      <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
    </div>
  </div>
);

/**
 * Skeleton - Base skeleton component for loading placeholders
 */
const Skeleton = ({ className = '', variant = 'rectangular', animation = 'pulse' }) => {
  const baseClasses = 'bg-gray-200 dark:bg-gray-700';
  const animationClasses = animation === 'pulse' ? 'animate-pulse' : 'animate-shimmer';
  
  const variantClasses = {
    rectangular: 'rounded',
    circular: 'rounded-full',
    text: 'rounded h-4',
  };

  return (
    <div 
      className={`${baseClasses} ${animationClasses} ${variantClasses[variant]} ${className}`}
      aria-hidden="true"
    />
  );
};

/**
 * SkeletonText - Multiple lines of skeleton text
 */
const SkeletonText = ({ lines = 3, className = '' }) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton 
        key={i} 
        variant="text" 
        className={`h-4 ${i === lines - 1 ? 'w-3/4' : 'w-full'}`} 
      />
    ))}
  </div>
);

/**
 * SkeletonCard - Card-shaped skeleton
 */
const SkeletonCard = ({ className = '', showImage = true, showAvatar = false }) => (
  <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-4 ${className}`}>
    {showImage && (
      <Skeleton className="h-40 w-full mb-4" />
    )}
    {showAvatar && (
      <div className="flex items-center gap-3 mb-4">
        <Skeleton variant="circular" className="h-10 w-10" />
        <div className="flex-1">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    )}
    <Skeleton className="h-5 w-3/4 mb-2" />
    <SkeletonText lines={2} />
  </div>
);

/**
 * SkeletonTable - Table skeleton with rows
 */
const SkeletonTable = ({ rows = 5, columns = 4, className = '' }) => (
  <div className={`bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden ${className}`}>
    {/* Header */}
    <div className="border-b border-gray-200 dark:border-gray-700 p-4">
      <div className="flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div 
        key={rowIndex} 
        className="border-b border-gray-100 dark:border-gray-700 p-4 last:border-0"
      >
        <div className="flex gap-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-4 flex-1" />
          ))}
        </div>
      </div>
    ))}
  </div>
);

/**
 * SkeletonList - List skeleton with items
 */
const SkeletonList = ({ items = 5, showAvatar = true, className = '' }) => (
  <div className={`space-y-3 ${className}`}>
    {Array.from({ length: items }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg">
        {showAvatar && <Skeleton variant="circular" className="h-10 w-10 flex-shrink-0" />}
        <div className="flex-1 min-w-0">
          <Skeleton className="h-4 w-3/4 mb-2" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="h-8 w-20 flex-shrink-0" />
      </div>
    ))}
  </div>
);

/**
 * SkeletonTreeNode - Skeleton for family tree nodes
 */
const SkeletonTreeNode = ({ className = '' }) => (
  <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 w-48 ${className}`}>
    <div className="flex items-center gap-3 mb-3">
      <Skeleton variant="circular" className="h-12 w-12" />
      <div className="flex-1">
        <Skeleton className="h-4 w-full mb-1" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
    <Skeleton className="h-3 w-full mb-1" />
    <Skeleton className="h-3 w-3/4" />
  </div>
);

/**
 * SkeletonTree - Full tree skeleton with multiple nodes
 */
const SkeletonTree = ({ className = '' }) => (
  <div className={`flex flex-col items-center gap-8 p-8 ${className}`}>
    {/* Root node */}
    <SkeletonTreeNode />
    {/* Connector line */}
    <Skeleton className="w-0.5 h-8" />
    {/* Children */}
    <div className="flex gap-8">
      <SkeletonTreeNode />
      <SkeletonTreeNode />
      <SkeletonTreeNode />
    </div>
  </div>
);

/**
 * SkeletonForm - Form skeleton with fields
 */
const SkeletonForm = ({ fields = 4, className = '' }) => (
  <div className={`space-y-4 ${className}`}>
    {Array.from({ length: fields }).map((_, i) => (
      <div key={i}>
        <Skeleton className="h-4 w-24 mb-2" />
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
    ))}
    <div className="flex gap-3 pt-4">
      <Skeleton className="h-10 w-24 rounded-md" />
      <Skeleton className="h-10 w-24 rounded-md" />
    </div>
  </div>
);

/**
 * SkeletonStats - Statistics cards skeleton
 */
const SkeletonStats = ({ cards = 4, className = '' }) => (
  <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${className}`}>
    {Array.from({ length: cards }).map((_, i) => (
      <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <Skeleton className="h-3 w-20 mb-2" />
        <Skeleton className="h-8 w-16 mb-1" />
        <Skeleton className="h-3 w-12" />
      </div>
    ))}
  </div>
);

export { 
  LoadingSpinner, 
  LoadingOverlay, 
  LoadingPage, 
  LoadingInline, 
  LoadingButton, 
  LoadingSection,
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonTable,
  SkeletonList,
  SkeletonTreeNode,
  SkeletonTree,
  SkeletonForm,
  SkeletonStats
};
export default LoadingSpinner;

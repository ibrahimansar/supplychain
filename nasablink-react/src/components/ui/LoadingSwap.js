import React from 'react';
import { useLoadingPhase } from '../../hooks/useDelayedLoading';

/**
 * Swaps between a loading placeholder and real content without the flicker that
 * comes from painting a skeleton for a handful of frames.
 *
 * Three phases:
 *   loading, delay not yet elapsed  → the skeleton is rendered but hidden, so it
 *                                     holds the space without flashing. Rendering
 *                                     `children` here instead would briefly show
 *                                     an empty-state ("No members") before the
 *                                     data lands, which is worse than a skeleton.
 *   loading, delay elapsed          → skeleton visible
 *   done                            → content
 *
 * @param {boolean} loading
 * @param {React.ReactNode} skeleton  placeholder to show while loading
 * @param {number} [delay]            ms before the skeleton is painted
 * @param {number} [minDuration]      ms the skeleton stays up once painted
 */
export default function LoadingSwap({
  loading,
  skeleton,
  children,
  className = '',
  delay,
  minDuration,
}) {
  const phase = useLoadingPhase(loading, { delay, minDuration });

  if (phase !== 'content') {
    return (
      <div className={className} aria-busy="true" aria-live="polite">
        <div className={phase === 'hidden' ? 'invisible' : undefined}>{skeleton}</div>
      </div>
    );
  }

  return <div className={`${className} animate-content-in`}>{children}</div>;
}

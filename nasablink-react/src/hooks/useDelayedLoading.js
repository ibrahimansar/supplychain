import { useEffect, useRef, useState } from 'react';

/**
 * Decides whether a loading placeholder should actually be painted.
 *
 * Two rules, both aimed at the same thing — never show a placeholder for so
 * short a time that it reads as a flicker:
 *
 *   delay       wait this long before showing anything. A response that beats
 *               the delay never renders a placeholder at all.
 *   minDuration once shown, keep it up at least this long, so it cannot blink
 *               out a frame later.
 *
 * @param {boolean} isLoading
 * @param {{delay?: number, minDuration?: number}} [options]
 * @returns {boolean} whether to paint the placeholder
 */
export default function useDelayedLoading(isLoading, { delay = 200, minDuration = 400 } = {}) {
  const [visible, setVisible] = useState(false);
  const shownAt = useRef(0);
  const delayTimer = useRef(null);
  const hideTimer = useRef(null);

  useEffect(() => {
    if (isLoading) {
      // A new load started before the previous placeholder finished its
      // minimum: cancel the pending hide and just keep it up.
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
        hideTimer.current = null;
      }
      if (visible || delayTimer.current) return;
      delayTimer.current = setTimeout(() => {
        delayTimer.current = null;
        shownAt.current = Date.now();
        setVisible(true);
      }, delay);
      return;
    }

    // Finished loading. If the delay never elapsed, nothing was ever painted.
    if (delayTimer.current) {
      clearTimeout(delayTimer.current);
      delayTimer.current = null;
    }
    if (!visible || hideTimer.current) return;

    const remaining = Math.max(0, minDuration - (Date.now() - shownAt.current));
    if (remaining === 0) {
      setVisible(false);
      return;
    }
    hideTimer.current = setTimeout(() => {
      hideTimer.current = null;
      setVisible(false);
    }, remaining);
  }, [isLoading, visible, delay, minDuration]);

  useEffect(() => () => {
    if (delayTimer.current) clearTimeout(delayTimer.current);
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, []);

  return visible;
}

/**
 * The same decision expressed as three phases, for call sites that render the
 * placeholder inline rather than through <LoadingSwap>.
 *
 *   'skeleton' — paint the placeholder
 *   'hidden'   — loading, but too early to paint: render the placeholder with
 *                `invisible` so it reserves space. Rendering real content here
 *                would flash an empty state before the data arrives.
 *   'content'  — render the real thing
 *
 * @returns {'skeleton' | 'hidden' | 'content'}
 */
export function useLoadingPhase(isLoading, options) {
  const showSkeleton = useDelayedLoading(isLoading, options);
  if (showSkeleton) return 'skeleton';
  return isLoading ? 'hidden' : 'content';
}

import { useEffect, useRef } from 'react';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

// Deliberately attribute-based rather than layout-based: `offsetParent === null`
// is the usual visibility trick, but it is also null for position:fixed elements
// and is always null under jsdom, which would silently shrink the trap to a
// single element. The selector above already excludes disabled and tabindex=-1.
const focusableWithin = (node) =>
  Array.from(node.querySelectorAll(FOCUSABLE)).filter(
    (el) => !el.hasAttribute('hidden') && !el.closest('[aria-hidden="true"]'),
  );

/**
 * Modal behaviour every dialog is expected to have:
 *
 *   - Tab and Shift+Tab cycle within the dialog instead of escaping to the page
 *     behind it
 *   - focus moves into the dialog on open and returns to whatever opened it on
 *     close, so keyboard users don't get dumped at the top of the document
 *   - Escape closes
 *   - the page behind cannot scroll
 *
 * Returns a ref to attach to the dialog's outermost element.
 *
 * The keydown listener is attached to that element rather than to `document`,
 * so a nested dialog rendered through a Portal (outside this subtree) handles
 * its own Escape without the parent also closing.
 *
 * `enabled` exists because some dialogs stay mounted while closed; the trap must
 * engage when the dialog opens, not when its component mounts.
 *
 * @param {{onClose?: () => void, closeOnEscape?: boolean, enabled?: boolean}} [options]
 */
export default function useModalA11y({ onClose, closeOnEscape = true, enabled = true } = {}) {
  const containerRef = useRef(null);

  // Held in a ref so the effect can run once on mount. Depending on `onClose`
  // directly would re-run it on every render and steal focus mid-typing.
  const onCloseRef = useRef(onClose);
  const closeOnEscapeRef = useRef(closeOnEscape);
  useEffect(() => {
    onCloseRef.current = onClose;
    closeOnEscapeRef.current = closeOnEscape;
  });

  useEffect(() => {
    if (!enabled) return undefined;
    const node = containerRef.current;
    if (!node) return undefined;

    const previouslyFocused = document.activeElement;

    // An autoFocus'd field has already claimed focus by now — leave it alone.
    if (!node.contains(document.activeElement)) {
      node.setAttribute('tabindex', '-1');
      node.focus({ preventScroll: true });
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && closeOnEscapeRef.current) {
        event.stopPropagation();
        onCloseRef.current?.();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = focusableWithin(node);
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || !node.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !node.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };

    node.addEventListener('keydown', handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      node.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, [enabled]);

  return containerRef;
}

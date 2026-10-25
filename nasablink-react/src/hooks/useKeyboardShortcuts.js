import { useEffect, useCallback, useRef } from 'react';

/**
 * Global keyboard shortcuts for power users
 * 
 * Shortcuts:
 * - Ctrl/Cmd + F: Focus search
 * - Ctrl/Cmd + K: Open command palette (if enabled)
 * - Ctrl/Cmd + /: Show keyboard shortcuts help
 * - Ctrl/Cmd + S: Save (where applicable)
 * - Escape: Close modals/panels
 * - Ctrl/Cmd + Z: Undo (where applicable)
 * - Ctrl/Cmd + Shift + Z: Redo (where applicable)
 * - +/-: Zoom in/out (tree view)
 * - Ctrl/Cmd + 0: Reset zoom
 * - Arrow keys: Navigate tree (when focused)
 * - Ctrl/Cmd + P: Print
 * - Ctrl/Cmd + H: Go home
 */

// Default shortcuts configuration
const DEFAULT_SHORTCUTS = {
  'ctrl+f': { action: 'search', description: 'Focus search' },
  'cmd+f': { action: 'search', description: 'Focus search' },
  'ctrl+k': { action: 'commandPalette', description: 'Open command palette' },
  'cmd+k': { action: 'commandPalette', description: 'Open command palette' },
  'ctrl+/': { action: 'help', description: 'Show keyboard shortcuts' },
  'cmd+/': { action: 'help', description: 'Show keyboard shortcuts' },
  'escape': { action: 'close', description: 'Close modal/panel' },
  'ctrl+s': { action: 'save', description: 'Save changes', preventDefault: true },
  'cmd+s': { action: 'save', description: 'Save changes', preventDefault: true },
  'ctrl+z': { action: 'undo', description: 'Undo' },
  'cmd+z': { action: 'undo', description: 'Undo' },
  'ctrl+shift+z': { action: 'redo', description: 'Redo' },
  'cmd+shift+z': { action: 'redo', description: 'Redo' },
  'ctrl+p': { action: 'print', description: 'Print', preventDefault: true },
  'cmd+p': { action: 'print', description: 'Print', preventDefault: true },
  'ctrl+h': { action: 'home', description: 'Go to home' },
  'cmd+h': { action: 'home', description: 'Go to home' },
  '+': { action: 'zoomIn', description: 'Zoom in' },
  '=': { action: 'zoomIn', description: 'Zoom in' },
  '-': { action: 'zoomOut', description: 'Zoom out' },
  'ctrl+0': { action: 'zoomReset', description: 'Reset zoom' },
  'cmd+0': { action: 'zoomReset', description: 'Reset zoom' },
};

/**
 * Parse keyboard event into shortcut string
 */
const parseKeyEvent = (event) => {
  const parts = [];
  
  if (event.ctrlKey) parts.push('ctrl');
  if (event.metaKey) parts.push('cmd');
  if (event.altKey) parts.push('alt');
  if (event.shiftKey) parts.push('shift');
  
  let key = event.key.toLowerCase();
  
  // Normalize key names
  if (key === ' ') key = 'space';
  if (key === 'arrowup') key = 'up';
  if (key === 'arrowdown') key = 'down';
  if (key === 'arrowleft') key = 'left';
  if (key === 'arrowright') key = 'right';
  
  // Don't add modifier keys themselves
  if (!['control', 'meta', 'alt', 'shift'].includes(key)) {
    parts.push(key);
  }
  
  return parts.join('+');
};

/**
 * Check if element is an input field
 */
const isInputElement = (element) => {
  const tagName = element?.tagName?.toLowerCase();
  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    element?.isContentEditable
  );
};

/**
 * useKeyboardShortcuts hook
 * 
 * @param {Object} handlers - Map of action names to handler functions
 * @param {Object} options - Options for the hook
 * @returns {Object} - Helper functions and state
 */
export function useKeyboardShortcuts(handlers = {}, options = {}) {
  const {
    enabled = true,
    shortcuts = DEFAULT_SHORTCUTS,
    ignoreInputs = true,
    allowInModals = false,
  } = options;
  
  const handlersRef = useRef(handlers);
  
  // Update handlers ref when handlers change
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);
  
  const handleKeyDown = useCallback((event) => {
    if (!enabled) return;
    
    // Ignore if typing in input fields (unless explicitly allowed)
    if (ignoreInputs && isInputElement(event.target)) {
      // Allow Escape to work even in inputs
      if (event.key !== 'Escape') return;
    }
    
    // Check if we're in a modal (unless allowed)
    if (!allowInModals) {
      const modal = document.querySelector('[role="dialog"]');
      if (modal && !modal.contains(event.target)) {
        // Allow Escape to close modals
        if (event.key !== 'Escape') return;
      }
    }
    
    const shortcutKey = parseKeyEvent(event);
    const shortcut = shortcuts[shortcutKey];
    
    if (shortcut) {
      const handler = handlersRef.current[shortcut.action];
      
      if (handler) {
        if (shortcut.preventDefault !== false) {
          event.preventDefault();
        }
        handler(event);
      }
    }
  }, [enabled, shortcuts, ignoreInputs, allowInModals]);
  
  useEffect(() => {
    if (enabled) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [enabled, handleKeyDown]);
  
  // Helper to get all shortcuts for display
  const getShortcutsList = useCallback(() => {
    const list = [];
    const seen = new Set();
    
    Object.entries(shortcuts).forEach(([key, config]) => {
      if (!seen.has(config.action)) {
        seen.add(config.action);
        // Prefer Cmd over Ctrl for display on Mac
        const displayKey = key.replace('ctrl+', '⌘').replace('cmd+', '⌘')
          .replace('shift+', '⇧').replace('alt+', '⌥')
          .replace('escape', 'Esc').toUpperCase();
        list.push({
          action: config.action,
          key: displayKey,
          description: config.description,
        });
      }
    });
    
    return list;
  }, [shortcuts]);
  
  return {
    getShortcutsList,
  };
}

/**
 * useTreeKeyboardNavigation - Specialized hook for tree navigation
 */
export function useTreeKeyboardNavigation({
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onFitView,
  onPrint,
  onSearch,
  enabled = true,
}) {
  const handlers = {
    zoomIn: onZoomIn,
    zoomOut: onZoomOut,
    zoomReset: onZoomReset,
    fitView: onFitView,
    print: onPrint || (() => window.print()),
    search: onSearch,
  };
  
  return useKeyboardShortcuts(handlers, { enabled });
}

/**
 * KeyboardShortcutsHelp - Component to display keyboard shortcuts
 */
export function KeyboardShortcutsProvider({ children }) {
  return children;
}

export default useKeyboardShortcuts;

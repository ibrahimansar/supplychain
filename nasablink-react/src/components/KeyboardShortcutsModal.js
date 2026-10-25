import React, { useState, useEffect, useCallback } from 'react';
import { X, Command, Search, Printer, Home, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

/**
 * KeyboardShortcutsModal - Displays available keyboard shortcuts
 */
const KeyboardShortcutsModal = ({ isOpen, onClose }) => {
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const modKey = isMac ? '⌘' : 'Ctrl';
  
  const shortcuts = [
    {
      category: 'General',
      items: [
        { keys: [`${modKey}`, 'F'], description: 'Focus search', icon: Search },
        { keys: [`${modKey}`, 'K'], description: 'Quick actions', icon: Command },
        { keys: [`${modKey}`, '/'], description: 'Show this help', icon: null },
        { keys: ['Esc'], description: 'Close modal / Cancel', icon: null },
      ]
    },
    {
      category: 'Navigation',
      items: [
        { keys: [`${modKey}`, 'H'], description: 'Go to home / trees', icon: Home },
        { keys: ['↑', '↓', '←', '→'], description: 'Navigate tree nodes', icon: null },
      ]
    },
    {
      category: 'Tree View',
      items: [
        { keys: ['+'], description: 'Zoom in', icon: ZoomIn },
        { keys: ['-'], description: 'Zoom out', icon: ZoomOut },
        { keys: [`${modKey}`, '0'], description: 'Reset zoom / Fit view', icon: RotateCcw },
        { keys: [`${modKey}`, 'P'], description: 'Print tree', icon: Printer },
      ]
    },
    {
      category: 'Editing',
      items: [
        { keys: [`${modKey}`, 'S'], description: 'Save changes', icon: null },
        { keys: [`${modKey}`, 'Z'], description: 'Undo', icon: null },
        { keys: [`${modKey}`, '⇧', 'Z'], description: 'Redo', icon: null },
      ]
    },
  ];
  
  // Close on Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);
  
  if (!isOpen) return null;
  
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 id="shortcuts-title" className="text-lg font-semibold text-gray-900 dark:text-white">
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="grid md:grid-cols-2 gap-6">
            {shortcuts.map((section) => (
              <div key={section.category}>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                  {section.category}
                </h3>
                <div className="space-y-2">
                  {section.items.map((shortcut, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                        {shortcut.icon && <shortcut.icon className="h-4 w-4 text-gray-400" />}
                        <span className="text-sm">{shortcut.description}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, keyIndex) => (
                          <React.Fragment key={keyIndex}>
                            <kbd className="px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded shadow-sm min-w-[24px] text-center">
                              {key}
                            </kbd>
                            {keyIndex < shortcut.keys.length - 1 && (
                              <span className="text-gray-400 text-xs">+</span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Press <kbd className="px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 rounded">{modKey} + /</kbd> anytime to show this help
          </p>
        </div>
      </div>
    </div>
  );
};

/**
 * useKeyboardShortcutsModal - Hook to manage shortcuts modal state
 */
export function useKeyboardShortcutsModal() {
  const [isOpen, setIsOpen] = useState(false);
  
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen(prev => !prev), []);
  
  // Listen for Ctrl/Cmd + / to open
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        toggle();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [toggle]);
  
  return { isOpen, open, close, toggle };
}

export default KeyboardShortcutsModal;

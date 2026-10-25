import React from 'react';
import Portal from './Portal';
import useModalA11y from '../../hooks/useModalA11y';
import { X } from 'lucide-react';

/** Tailwind needs full class names at build time — never interpolate breakpoints. */
const MAX_WIDTH_CLASS = {
  'max-w-xs': 'max-w-xs',
  'max-w-sm': 'max-w-sm',
  'max-w-md': 'max-w-md',
  'max-w-lg': 'max-w-lg',
  'max-w-xl': 'max-w-xl',
  'max-w-2xl': 'max-w-2xl',
  'max-w-3xl': 'max-w-3xl',
  'max-w-4xl': 'max-w-4xl',
  'max-w-5xl': 'max-w-5xl',
};

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} [props.onClose]
 * @param {React.ReactNode} props.children
 * @param {boolean} [props.closeOnBackdrop]
 * @param {string} [props.labelledBy]
 * @param {keyof typeof MAX_WIDTH_CLASS | string} [props.maxWidth]
 * @param {'auto' | 'sheet'} [props.variant]
 */
export default function Dialog({
  open,
  onClose,
  children,
  closeOnBackdrop = true,
  labelledBy,
  maxWidth = 'max-w-lg',
  variant = 'auto',
}) {
  const panelRef = useModalA11y({ onClose, enabled: open });

  if (!open) return null;

  const widthClass = MAX_WIDTH_CLASS[maxWidth] || MAX_WIDTH_CLASS['max-w-lg'];
  const panelClass =
    variant === 'sheet'
      ? `bg-white rounded-t-[1.25rem] sm:rounded-[1.25rem] shadow-[0_24px_80px_-16px_rgba(15,23,42,0.45)] ring-1 ring-slate-200/80 w-full ${widthClass} max-h-[92vh] sm:max-h-[90vh] overflow-hidden flex flex-col animate-scale-in`
      : `bg-white rounded-[1.25rem] shadow-[0_24px_80px_-16px_rgba(15,23,42,0.45)] ring-1 ring-slate-200/80 w-full ${widthClass} max-h-[min(90vh,720px)] overflow-hidden flex flex-col animate-scale-in`;

  return (
    <Portal>
      <div className="fixed inset-0 z-[3000]">
        <div
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-[3px] animate-fade-in"
          onClick={() => closeOnBackdrop && onClose?.()}
        />
        <div className="absolute inset-0 flex items-end sm:items-center justify-center p-3 sm:p-5 pointer-events-none">
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
            className={`${panelClass} pointer-events-auto focus:outline-none`}
          >
            {children}
          </div>
        </div>
      </div>
    </Portal>
  );
}

export function DialogHeader({ title, onClose, children, subtitle }) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 sm:px-6 pt-5 pb-3 flex-shrink-0">
      <div className="min-w-0 pt-0.5">
        <h2 id={title} className="text-[17px] font-semibold tracking-tight text-slate-900">
          {children}
        </h2>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 p-2 -me-1 -mt-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export function DialogBody({ children, className = '' }) {
  return (
    <div className={`px-5 sm:px-6 pb-2 overflow-y-auto scrollbar-hidden min-h-0 flex-1 ${className}`}>
      {children}
    </div>
  );
}

export function DialogFooter({ children }) {
  return (
    <div className="px-5 sm:px-6 py-4 mt-1 bg-slate-50/80 border-t border-slate-100 flex justify-end gap-2.5 flex-shrink-0">
      {children}
    </div>
  );
}

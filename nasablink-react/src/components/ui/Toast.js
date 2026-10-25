import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

/**
 * Toast - CRM-style notification toast
 */
export default function Toast({ msg, type = 'success', action }) {
  const variants = {
    success: {
      icon: <CheckCircle className="w-4.5 h-4.5 w-[18px] h-[18px] text-teal-600 flex-shrink-0" />,
      bar: 'bg-teal-500',
    },
    error: {
      icon: <XCircle className="w-[18px] h-[18px] text-rose-600 flex-shrink-0" />,
      bar: 'bg-rose-500',
    },
    warning: {
      icon: <AlertTriangle className="w-[18px] h-[18px] text-amber-600 flex-shrink-0" />,
      bar: 'bg-amber-500',
    },
    info: {
      icon: <Info className="w-[18px] h-[18px] text-sky-600 flex-shrink-0" />,
      bar: 'bg-sky-500',
    },
  };

  const { icon, bar } = variants[type] || variants.info;

  return (
    <div
      className="fixed top-20 end-4 sm:end-6 z-[3000] w-[min(100vw-2rem,22rem)] rounded-2xl bg-white shadow-[0_16px_40px_-12px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/90 overflow-hidden animate-slide-up"
      role="status"
      aria-live="polite"
    >
      <div className={`h-0.5 w-full ${bar}`} />
      <div className="px-3.5 py-3 flex items-start gap-3">
        {icon}
        <span className="text-sm font-medium text-slate-800 flex-1 leading-snug pt-0.5">{msg}</span>
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="ms-1 shrink-0 text-xs font-semibold text-teal-700 hover:text-teal-900 px-2 py-1 rounded-lg hover:bg-teal-50"
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}

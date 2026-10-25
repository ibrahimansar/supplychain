import React from 'react';

/**
 * Generic status/info badge — muted fills, hairline border (matches RoleBadge geometry).
 */
export default function Badge({ children, color = 'gray', className = '' }) {
  const map = {
    gray: 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800/60 dark:text-gray-300 dark:border-gray-600',
    primary: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/80 dark:text-slate-200 dark:border-slate-600',
    green: 'bg-emerald-50/80 text-emerald-800 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60',
    red: 'bg-rose-50/80 text-rose-800 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60',
    yellow: 'bg-amber-50/80 text-amber-900 border-amber-200/70 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800/50',
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-medium tracking-wide ${map[color] || map.gray} ${className}`}
    >
      {children}
    </span>
  );
}

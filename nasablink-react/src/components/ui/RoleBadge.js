import React from 'react';

const ROLE_STYLES = {
  OWNER:
    'bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100',
  ADMIN:
    'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/80 dark:text-slate-200 dark:border-slate-600',
  VERIFIER:
    'bg-stone-100 text-stone-700 border-stone-200 dark:bg-stone-800/60 dark:text-stone-200 dark:border-stone-600',
  VIEWER:
    'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800/60 dark:text-gray-300 dark:border-gray-600',
};

const ROLE_LABELS = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  VERIFIER: 'Verifier',
  VIEWER: 'Viewer',
};

const SIZE_CLASSES = {
  sm: 'px-1.5 py-0.5 text-[10px]',
  md: 'px-2 py-0.5 text-[11px]',
};

/**
 * Professional role chip — muted slate/stone palette, title case, hairline border.
 */
export default function RoleBadge({ role, isOwner = false, size = 'md', className = '', label }) {
  const normalized = isOwner
    ? 'OWNER'
    : String(role || 'VIEWER').toUpperCase();
  const key = ROLE_STYLES[normalized] ? normalized : 'VIEWER';
  const text = label || ROLE_LABELS[key] || 'Viewer';

  return (
    <span
      className={`inline-flex items-center rounded-md border font-medium tracking-wide ${SIZE_CLASSES[size] || SIZE_CLASSES.md} ${ROLE_STYLES[key]} ${className}`}
    >
      {text}
    </span>
  );
}

import React from 'react';

const base = 'inline-flex items-center justify-center font-medium select-none disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none rounded-xl transition-all duration-200 ease-out focus-visible:ring-2 focus-visible:ring-offset-1 relative';

const variants = {
  solid: 'bg-slate-900 text-white hover:bg-slate-800 focus:ring-slate-400 shadow-sm active:scale-[0.98]',
  outline: 'border border-slate-200 text-slate-800 bg-white hover:bg-slate-50 hover:border-slate-300 focus:ring-teal-300 shadow-sm active:scale-[0.98]',
  ghost: 'text-slate-700 hover:bg-slate-100 focus:ring-teal-300 active:scale-[0.98]',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-400 shadow-sm active:scale-[0.98]',
};

const sizes = {
  sm: 'h-8 px-3 text-sm min-w-[4rem]',
  md: 'h-10 px-4 text-sm min-w-[5rem]',
  lg: 'h-12 px-6 text-base min-w-[6rem]',
};

export default function Button({ variant = 'solid', size = 'md', loading = false, children, className = '', ...rest }) {
  return (
    <button 
      className={`${base} ${variants[variant]} ${sizes[size]} ${loading ? 'pointer-events-none' : ''} ${className}`} 
      aria-busy={loading || undefined} 
      disabled={loading || rest.disabled}
      {...rest}
    >
      {/* Overlays the full button so the spinner sits dead centre. The label
          below stays in the layout (invisible) to hold the button's width. */}
      {loading && (
        <span data-testid="button-spinner" className="absolute inset-0 flex items-center justify-center">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0" />
          </svg>
        </span>
      )}
      <span className={`${loading ? 'invisible' : ''} inline-flex items-center gap-1.5`}>{children}</span>
    </button>
  );
}

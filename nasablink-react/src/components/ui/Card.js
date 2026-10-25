import React from 'react';

export default function Card({ children, className = '', ...rest }) {
  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow duration-200 relative overflow-hidden will-change-auto ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

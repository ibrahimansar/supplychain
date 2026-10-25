import React, { useState } from 'react';

function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] || '') + (parts[1]?.[0] || '');
}

export default function Avatar({ src, name, size = 32 }) {
  const s = typeof size === 'number' ? `${size}px` : size;
  const fallback = initials(name);
  const [showImg, setShowImg] = useState(!!src);
  return (
    <div
      className="inline-flex items-center justify-center rounded-full bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700 ring-1 ring-slate-200/80 overflow-hidden"
      style={{ width: s, height: s }}
    >
      {showImg && src ? (
        // eslint-disable-next-line jsx-a11y/alt-text
        <img src={src} alt={name || 'avatar'} className="rounded-full object-cover" style={{ width: s, height: s }} onError={() => setShowImg(false)} />
      ) : (
        <span className="text-xs font-semibold tracking-wide" aria-hidden>{fallback}</span>
      )}
    </div>
  );
}


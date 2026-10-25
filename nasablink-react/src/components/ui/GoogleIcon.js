// GoogleIcon.js
import React from 'react';

export default function GoogleIcon({ size = 20, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <g>
        <path
          d="M44.5 20H24v8.5h11.7C34.7 32.9 30.1 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c2.7 0 5.2.9 7.2 2.4l6.4-6.4C33.5 6.1 28.9 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.3-4z"
          fill="#FFC107"
        />
        <path
          d="M6.3 14.7l7 5.1C15.5 16.1 19.4 13 24 13c2.7 0 5.2.9 7.2 2.4l6.4-6.4C33.5 6.1 28.9 4 24 4c-7.1 0-13.2 3.7-16.7 9.3z"
          fill="#FF3D00"
        />
        <path
          d="M24 44c6.1 0 11.2-2 14.9-5.5l-6.9-5.7C30.1 36 26.1 38 24 38c-5.9 0-10.9-3.8-12.7-9.1l-7 5.4C7.1 40.2 14.9 44 24 44z"
          fill="#4CAF50"
        />
        <path
          d="M44.5 20H24v8.5h11.7c-1.1 3.1-4.7 7.5-11.7 7.5-5.9 0-10.9-3.8-12.7-9.1l-7 5.4C7.1 40.2 14.9 44 24 44c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.3-4z"
          fill="#1976D2"
        />
      </g>
    </svg>
  );
}

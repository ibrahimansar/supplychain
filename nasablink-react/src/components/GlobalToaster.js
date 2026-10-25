import React, { useEffect, useState } from 'react';
import { useError, ERROR_TYPES } from '../contexts/ErrorContext';

const Toast = ({ error, onClose, onRetry }) => {
  const getToastStyle = (type) => {
    switch (type) {
      case ERROR_TYPES.NETWORK:
        return {
          bgColor: 'bg-red-900/90',
          icon: (
            <svg className="h-5 w-5 mt-0.5 text-red-300 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18.364 5.636l-12.728 12.728m0-12.728l12.728 12.728"/>
              <path d="M2 12h20"/>
            </svg>
          ),
          title: 'Connection Error'
        };
      case ERROR_TYPES.AUTHENTICATION:
        return {
          bgColor: 'bg-orange-900/90',
          icon: (
            <svg className="h-5 w-5 mt-0.5 text-orange-300 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 15v2m-6 4h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2zm10-10V7a4 4 0 0 0-8 0v4h8z"/>
            </svg>
          ),
          title: 'Authentication Required'
        };
      case ERROR_TYPES.AUTHORIZATION:
        return {
          bgColor: 'bg-yellow-900/90',
          icon: (
            <svg className="h-5 w-5 mt-0.5 text-yellow-300 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/>
            </svg>
          ),
          title: 'Access Denied'
        };
      case ERROR_TYPES.VALIDATION:
        return {
          bgColor: 'bg-blue-900/90',
          icon: (
            <svg className="h-5 w-5 mt-0.5 text-blue-300 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          ),
          title: 'Validation Error'
        };
      case ERROR_TYPES.BUSINESS_LOGIC:
        return {
          bgColor: 'bg-purple-900/90',
          icon: (
            <svg className="h-5 w-5 mt-0.5 text-purple-300 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
          ),
          title: 'Action Not Allowed'
        };
      default:
        return {
          bgColor: 'bg-gray-900/90',
          icon: (
            <svg className="h-5 w-5 mt-0.5 text-gray-300 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/>
            </svg>
          ),
          title: 'Error'
        };
    }
  };

  const { bgColor, icon, title } = getToastStyle(error.type);

  return (
    <div className="fixed bottom-4 end-4 z-[4000] max-w-xs sm:max-w-sm animate-scale-in">
      <div className={`${bgColor} text-white rounded-xl shadow-lg px-4 py-3 backdrop-blur-md border border-gray-800`}>
        <div className="flex items-start gap-3">
          {icon}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium mb-1">{title}</div>
            <div className="text-sm leading-snug pe-6">{error.userMessage}</div>
            {error.resetAtMs && (
              <div className="text-xs text-gray-300 mt-1">
                Retry in {Math.max(1, Math.round((error.resetAtMs - Date.now()) / 1000))}s
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="ms-auto text-white/70 hover:text-white p-1 rounded shrink-0"
          >
            ✕
          </button>
        </div>
        {onRetry && (
          <div className="mt-3 flex gap-2">
            <button
              onClick={onRetry}
              className="flex-1 bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default function GlobalToaster() {
  const { errors, removeError, executeRetry } = useError();
  const [legacyMsg, setLegacyMsg] = useState('');
  const [eta, setEta] = useState(null);

  // Handle legacy rate limit events
  useEffect(() => {
    const onRate = (e) => {
      const m = e?.detail?.message || 'Rate limit exceeded. Please wait and try again.';
      setLegacyMsg(m);
      if (e?.detail?.resetAtMs) setEta(e.detail.resetAtMs);
    };
    window.addEventListener('nasablink:rate-limit', onRate);
    return () => window.removeEventListener('nasablink:rate-limit', onRate);
  }, []);

  useEffect(() => {
    if (!legacyMsg) return;
    const t = setTimeout(() => { setLegacyMsg(''); setEta(null); }, 8000);
    return () => clearTimeout(t);
  }, [legacyMsg]);

  // Show legacy rate limit toast if no new errors
  if (!errors.length && legacyMsg) {
    let countdown = '';
    if (eta && eta > Date.now()) {
      const secs = Math.max(1, Math.round((eta - Date.now()) / 1000));
      countdown = ` Please wait ~${secs}s.`;
    }

    return (
      <Toast
        error={{
          type: ERROR_TYPES.API,
          userMessage: `${legacyMsg}${countdown}`,
          resetAtMs: eta
        }}
        onClose={() => { setLegacyMsg(''); setEta(null); }}
      />
    );
  }

  // Show the most recent error
  if (!errors.length) return null;

  const currentError = errors[errors.length - 1];

  return (
    <Toast
      error={currentError}
      onClose={() => removeError(currentError.id)}
      onRetry={currentError.details?.retryable ? () => executeRetry(currentError.id) : null}
    />
  );
}

/**
 * Normalize API error bodies (ErrorResponse + legacy Map shapes).
 */
export function getApiErrorMessage(data, fallback = 'Something went wrong') {
  if (!data) return fallback;
  if (typeof data === 'string') return data;
  if (typeof data.message === 'string' && data.message.trim()) return data.message;
  // Human text sometimes lives in `error` (legacy); SCREAMING values are codes
  if (typeof data.error === 'string' && data.error && !/^[A-Z][A-Z0-9_]*$/.test(data.error)) {
    return data.error;
  }
  return fallback;
}

export function getApiErrorCode(data) {
  if (!data || typeof data !== 'object') return null;
  if (typeof data.code === 'string' && data.code) return data.code;
  if (typeof data.errorCode === 'string' && data.errorCode) return data.errorCode;
  if (typeof data.error === 'string' && /^[A-Z][A-Z0-9_]*$/.test(data.error)) return data.error;
  return null;
}

export function getApiValidationErrors(data) {
  if (!data || typeof data !== 'object') return null;
  if (Array.isArray(data.validationErrors)) return data.validationErrors;
  if (data.errors && typeof data.errors === 'object') return data.errors;
  return null;
}

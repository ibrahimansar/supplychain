import { useState, useCallback } from 'react';
import { useError } from '../contexts/ErrorContext';
import { getApiErrorMessage, getApiValidationErrors } from '../utils/apiError';

/**
 * Custom hook for handling API calls with loading states and error handling
 * @param {Function} apiFunction - The API function to call
 * @param {Object} options - Configuration options
 * @returns {Object} - { execute, loading, error, data }
 */
export function useApiCall(apiFunction, options = {}) {
  const {
    onSuccess,
    onError,
    showErrorToast = true,
    initialData = null,
    errorType = 'API'
  } = options;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(initialData);

  const { addError } = useError();

  const execute = useCallback(async (...args) => {
    try {
      setLoading(true);
      setError(null);

      const result = await apiFunction(...args);

      setData(result.data);

      if (onSuccess) {
        onSuccess(result.data, result);
      }

      return result;
    } catch (err) {
      const errorObj = {
        message: err.message || 'An error occurred',
        statusCode: err.response?.status,
        details: err.response?.data
      };

      setError(errorObj);

      if (showErrorToast) {
        addError(err, errorType);
      }

      if (onError) {
        onError(errorObj, err);
      }

      throw err; // Re-throw so calling code can handle if needed
    } finally {
      setLoading(false);
    }
  }, [apiFunction, onSuccess, onError, showErrorToast, errorType, addError]);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setData(initialData);
  }, [initialData]);

  return {
    execute,
    loading,
    error,
    data,
    reset
  };
}

/**
 * Hook for handling form submissions with validation and error handling
 * @param {Function} submitFunction - The submit function
 * @param {Object} options - Configuration options
 * @returns {Object} - { submit, loading, errors, setErrors }
 */
export function useFormSubmit(submitFunction, options = {}) {
  const {
    onSuccess,
    onError,
    validate,
    showErrorToast = true
  } = options;

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const { addError } = useError();

  const submit = useCallback(async (formData) => {
    try {
      setLoading(true);
      setErrors({});

      // Run validation if provided
      if (validate) {
        const validationErrors = validate(formData);
        if (validationErrors && Object.keys(validationErrors).length > 0) {
          setErrors(validationErrors);
          return false;
        }
      }

      const result = await submitFunction(formData);

      if (onSuccess) {
        onSuccess(result);
      }

      return result;
    } catch (err) {
      const errorObj = {
        message: getApiErrorMessage(err.response?.data, err.message || 'Submission failed'),
        statusCode: err.response?.status,
        details: err.response?.data
      };

      // Handle validation errors from server (ErrorResponse.validationErrors or legacy errors)
      const validationErrors = getApiValidationErrors(err.response?.data);
      if ((err.response?.status === 422 || err.response?.status === 400) && validationErrors) {
        if (Array.isArray(validationErrors)) {
          setErrors({ general: validationErrors.join('; ') });
        } else {
          setErrors(validationErrors);
        }
      } else {
        setErrors({ general: errorObj.message });
      }

      if (showErrorToast) {
        addError(err, 'VALIDATION');
      }

      if (onError) {
        onError(errorObj, err);
      }

      return false;
    } finally {
      setLoading(false);
    }
  }, [submitFunction, onSuccess, onError, validate, showErrorToast, addError]);

  const resetErrors = useCallback(() => {
    setErrors({});
  }, []);

  return {
    submit,
    loading,
    errors,
    setErrors,
    resetErrors
  };
}

/**
 * Hook for handling async operations with retry capability
 * @param {Function} operation - The async operation to perform
 * @param {Object} options - Configuration options
 * @returns {Object} - { execute, loading, retry, canRetry }
 */
export function useAsyncOperation(operation, options = {}) {
  const {
    maxRetries = 3,
    onSuccess,
    onError,
    showErrorToast = true
  } = options;

  const [loading, setLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const { addError } = useError();
  // const { addToRetryQueue } = useError(); // Unused

  const execute = useCallback(async (...args) => {
    try {
      setLoading(true);
      const result = await operation(...args);

      setRetryCount(0); // Reset retry count on success

      if (onSuccess) {
        onSuccess(result);
      }

      return result;
    } catch (err) {
      if (showErrorToast) {
        addError(err, 'API');
      }

      if (onError) {
        onError(err);
      }

      throw err;
    } finally {
      setLoading(false);
    }
  }, [operation, onSuccess, onError, showErrorToast, addError]);

  const retry = useCallback(async (...args) => {
    if (retryCount < maxRetries) {
      setRetryCount(prev => prev + 1);
      return execute(...args);
    }
  }, [execute, retryCount, maxRetries]);

  const canRetry = retryCount < maxRetries;

  return {
    execute,
    loading,
    retry,
    canRetry,
    retryCount
  };
}

export default useApiCall;

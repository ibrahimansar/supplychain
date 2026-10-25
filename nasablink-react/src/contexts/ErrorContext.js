import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { getApiErrorMessage } from '../utils/apiError';

// Error types
export const ERROR_TYPES = {
  NETWORK: 'NETWORK',
  API: 'API',
  VALIDATION: 'VALIDATION',
  AUTHENTICATION: 'AUTHENTICATION',
  AUTHORIZATION: 'AUTHORIZATION',
  BUSINESS_LOGIC: 'BUSINESS_LOGIC',
  UNKNOWN: 'UNKNOWN'
};

// Error actions
const ERROR_ACTIONS = {
  ADD_ERROR: 'ADD_ERROR',
  REMOVE_ERROR: 'REMOVE_ERROR',
  CLEAR_ERRORS: 'CLEAR_ERRORS',
  SET_LOADING: 'SET_LOADING',
  SET_RETRY: 'SET_RETRY'
};

// Initial state
const initialState = {
  errors: [],
  loading: false,
  retryQueue: []
};

// Error reducer
function errorReducer(state, action) {
  switch (action.type) {
    case ERROR_ACTIONS.ADD_ERROR:
      return {
        ...state,
        errors: [...state.errors, {
          ...action.payload,
          timestamp: new Date()
        }]
      };

    case ERROR_ACTIONS.REMOVE_ERROR:
      return {
        ...state,
        errors: state.errors.filter(error => error.id !== action.payload)
      };

    case ERROR_ACTIONS.CLEAR_ERRORS:
      return {
        ...state,
        errors: []
      };

    case ERROR_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload
      };

    case ERROR_ACTIONS.SET_RETRY:
      return {
        ...state,
        retryQueue: action.payload
      };

    default:
      return state;
  }
}

// Error context
const ErrorContext = createContext();

// Error provider component
export function ErrorProvider({ children }) {
  const [state, dispatch] = useReducer(errorReducer, initialState);

  // Add error
  const addError = useCallback((error, type = ERROR_TYPES.UNKNOWN) => {
    let message = 'An unexpected error occurred';
    let userMessage = 'Something went wrong. Please try again.';
    let statusCode = null;
    let details = null;

    if (typeof error === 'string') {
      message = error;
      userMessage = error;
    } else if (error?.response) {
      // API error
      statusCode = error.response.status;
      message = getApiErrorMessage(error.response.data, error.message);
      userMessage = getUserFriendlyMessage(error.response);
      details = error.response.data;
    } else if (error?.request) {
      // Network error
      type = ERROR_TYPES.NETWORK;
      message = 'Network request failed';
      userMessage = 'Unable to connect. Please check your internet connection.';
    } else {
      // Other error
      message = error?.message || message;
      userMessage = message;
    }

    const errorId = Date.now() + Math.random();

    dispatch({
      type: ERROR_ACTIONS.ADD_ERROR,
      payload: {
        id: errorId,
        type,
        message,
        userMessage,
        statusCode,
        details,
        originalError: error,
        // Disable retry for rate limit and network errors
        retryable: statusCode !== 429 && type !== ERROR_TYPES.NETWORK
      }
    });

    // Auto-remove error after 8 seconds
    setTimeout(() => {
      dispatch({
        type: ERROR_ACTIONS.REMOVE_ERROR,
        payload: errorId
      });
    }, 8000);
  }, []);

  // Remove error
  const removeError = useCallback((errorId) => {
    dispatch({
      type: ERROR_ACTIONS.REMOVE_ERROR,
      payload: errorId
    });
  }, []);

  // Clear all errors
  const clearErrors = useCallback(() => {
    dispatch({
      type: ERROR_ACTIONS.CLEAR_ERRORS
    });
  }, []);

  // Set loading state
  const setLoading = useCallback((loading) => {
    dispatch({
      type: ERROR_ACTIONS.SET_LOADING,
      payload: loading
    });
  }, []);

  // Add to retry queue
  const addToRetryQueue = useCallback((retryFunction, error) => {
    const retryItem = {
      id: Date.now() + Math.random(),
      function: retryFunction,
      error,
      attempts: 0
    };

    dispatch({
      type: ERROR_ACTIONS.SET_RETRY,
      payload: [...state.retryQueue, retryItem]
    });

    return retryItem.id;
  }, [state.retryQueue]);

  // Execute retry
  const executeRetry = useCallback((retryId) => {
    const retryItem = state.retryQueue.find(item => item.id === retryId);
    if (retryItem && retryItem.attempts < 3) { // Limit to maximum 3 retries
      retryItem.attempts++;
      retryItem.function();
    } else if (retryItem && retryItem.attempts >= 3) {
      // Remove from queue after max retries reached
      dispatch({
        type: ERROR_ACTIONS.SET_RETRY,
        payload: state.retryQueue.filter(item => item.id !== retryId)
      });
    }
  }, [state.retryQueue]);

  const value = {
    ...state,
    addError,
    removeError,
    clearErrors,
    setLoading,
    addToRetryQueue,
    executeRetry
  };

  return (
    <ErrorContext.Provider value={value}>
      {children}
    </ErrorContext.Provider>
  );
}

// Custom hook to use error context
export function useError() {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
}

// Helper function to get user-friendly error messages
function getUserFriendlyMessage(response) {
  const status = response.status;
  const data = response.data;

  const serverMessage = getApiErrorMessage(data, null);
  if (serverMessage) {
    return serverMessage;
  }

  // Default messages based on status code
  switch (status) {
    case 400:
      return 'Invalid request. Please check your input.';
    case 401:
      return 'You need to log in to continue.';
    case 402:
      return 'This feature requires an upgraded subscription.';
    case 403:
      return 'You don\'t have permission to perform this action.';
    case 404:
      return 'The requested resource was not found.';
    case 409:
      return 'This action conflicts with existing data.';
    case 422:
      return 'The submitted data is invalid.';
    case 429:
      return 'Too many requests. Please wait a moment.';
    case 500:
      return 'Server error. Please try again later.';
    case 502:
    case 503:
    case 504:
      return 'Service temporarily unavailable. Please try again later.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

export default ErrorContext;

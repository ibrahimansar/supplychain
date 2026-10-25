import React from 'react';

// Email validation regex (RFC 5322 compliant)
export const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

// Input validation utilities
export const validators = {
  // Email validation
  email: (value) => {
    if (!value || typeof value !== 'string') return 'Email is required';
    if (value.length > 254) return 'Email is too long';
    if (!EMAIL_REGEX.test(value.trim())) return 'Please enter a valid email address';
    return null;
  },

  // Required field validation
  required: (value, fieldName = 'This field') => {
    if (value === null || value === undefined || value === '') {
      return `${fieldName} is required`;
    }
    return null;
  },

  // String length validation
  maxLength: (value, maxLen, fieldName = 'This field') => {
    if (value && value.length > maxLen) {
      return `${fieldName} must be less than ${maxLen} characters`;
    }
    return null;
  },

  // Numeric validation
  number: (value, fieldName = 'This field') => {
    if (value !== '' && value !== null && value !== undefined) {
      const num = Number(value);
      if (isNaN(num)) return `${fieldName} must be a valid number`;
      return null;
    }
    return null;
  },

  // Positive number validation
  positiveNumber: (value, fieldName = 'This field') => {
    const numError = validators.number(value, fieldName);
    if (numError) return numError;

    if (value !== '' && value !== null && value !== undefined) {
      const num = Number(value);
      if (num <= 0) return `${fieldName} must be greater than 0`;
    }
    return null;
  },

  // Date validation (future date)
  futureDate: (value, fieldName = 'Date') => {
    if (!value) return null; // Optional field

    const selectedDate = new Date(value);
    const now = new Date();

    if (selectedDate <= now) {
      return `${fieldName} must be in the future`;
    }
    return null;
  },

  // Role validation
  role: (value) => {
    const validRoles = ['ADMIN', 'VERIFIER', 'VIEWER'];
    if (!validRoles.includes(value)) {
      return 'Please select a valid role';
    }
    return null;
  },

  // Language validation
  language: (value) => {
    const validLanguages = ['en', 'ar'];
    if (!validLanguages.includes(value)) {
      return 'Please select a valid language';
    }
    return null;
  },

  // Search input sanitization
  searchQuery: (value) => {
    if (!value) return null;

    // Remove potentially dangerous characters
    const sanitized = value.replace(/[<>]/g, '');
    if (sanitized !== value) {
      return 'Search query contains invalid characters';
    }

    if (value.length > 100) {
      return 'Search query is too long';
    }

    return null;
  },

  // Label validation (for viewer links)
  label: (value) => {
    if (!value) return null; // Optional field

    if (value.length > 50) {
      return 'Label must be less than 50 characters';
    }

    // Remove potentially dangerous characters
    const sanitized = value.replace(/[<>]/g, '');
    if (sanitized !== value) {
      return 'Label contains invalid characters';
    }

    return null;
  }
};

// Sanitization utilities
export const sanitizers = {
  // Basic XSS prevention
  text: (value) => {
    if (!value) return value;
    return value
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  },

  // Trim whitespace
  trim: (value) => {
    if (!value) return value;
    return value.trim();
  },

  // Remove non-printable characters
  printable: (value) => {
    if (!value) return value;
    // eslint-disable-next-line no-control-regex
    return value.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
  }
};

// Combined validation and sanitization
export const validateAndSanitize = (value, validator, sanitizer = null) => {
  let processedValue = value;

  // Apply sanitizer first
  if (sanitizer && typeof sanitizers[sanitizer] === 'function') {
    processedValue = sanitizers[sanitizer](processedValue);
  }

  // Apply validator
  if (validator && typeof validators[validator] === 'function') {
    const error = validators[validator](processedValue);
    if (error) return { isValid: false, error, value: processedValue };
  }

  return { isValid: true, error: null, value: processedValue };
};

// Form validation hook
export const useFormValidation = (initialValues = {}) => {
  const [values, setValues] = React.useState(initialValues);
  const [errors, setErrors] = React.useState({});
  const [touched, setTouched] = React.useState({});

  const validateField = React.useCallback((name, value, validator, sanitizer) => {
    const result = validateAndSanitize(value, validator, sanitizer);
    setErrors(prev => ({
      ...prev,
      [name]: result.error
    }));
    return result;
  }, []);

  const handleChange = React.useCallback((name, validator = null, sanitizer = null) => (e) => {
    const value = e.target.value;
    setValues(prev => ({ ...prev, [name]: value }));

    if (validator) {
      validateField(name, value, validator, sanitizer);
    }
  }, [validateField]);

  const handleBlur = React.useCallback((name) => () => {
    setTouched(prev => ({ ...prev, [name]: true }));
  }, []);

  const validateForm = React.useCallback((validationRules) => {
    const newErrors = {};
    let isValid = true;

    Object.keys(validationRules).forEach(name => {
      const rule = validationRules[name];
      const result = validateAndSanitize(values[name], rule.validator, rule.sanitizer);
      if (!result.isValid) {
        newErrors[name] = result.error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [values]);

  const resetForm = React.useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    validateField,
    validateForm,
    resetForm,
    setValues
  };
};

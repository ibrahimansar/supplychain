import React from 'react';

/**
 * Input - Unified input component with dark mode support
 */
export function Input({ className = '', error, ...props }) {
  const baseClasses = 'block w-full px-3 py-2 border rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500';
  const normalClasses = 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-500';
  const errorClasses = 'border-red-500 dark:border-red-500 focus:ring-red-500 focus:border-red-500';
  const disabledClasses = 'disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60';

  return (
    <input
      {...props}
      className={`${baseClasses} ${error ? errorClasses : normalClasses} ${disabledClasses} ${className}`}
    />
  );
}

/**
 * Textarea - Unified textarea component with dark mode support
 */
export function Textarea({ className = '', error, rows = 3, ...props }) {
  const baseClasses = 'block w-full px-3 py-2 border rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none';
  const normalClasses = 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-500';
  const errorClasses = 'border-red-500 dark:border-red-500 focus:ring-red-500 focus:border-red-500';
  const disabledClasses = 'disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60';

  return (
    <textarea
      rows={rows}
      {...props}
      className={`${baseClasses} ${error ? errorClasses : normalClasses} ${disabledClasses} ${className}`}
    />
  );
}

/**
 * Select - Unified select component with dark mode support
 */
export function Select({ className = '', error, children, ...props }) {
  const baseClasses = 'block w-full px-3 py-2 border rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500';
  const normalClasses = 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white';
  const errorClasses = 'border-red-500 dark:border-red-500 focus:ring-red-500 focus:border-red-500';
  const disabledClasses = 'disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60';
  
  return (
    <select 
      {...props} 
      className={`${baseClasses} ${error ? errorClasses : normalClasses} ${disabledClasses} ${className}`}
    >
      {children}
    </select>
  );
}

/**
 * Checkbox - Unified checkbox with dark mode support
 */
export function Checkbox({ className = '', ...rest }) {
  return (
    <input 
      type="checkbox" 
      className={`h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500 dark:bg-gray-800 dark:checked:bg-primary-600 ${className}`} 
      {...rest} 
    />
  );
}

/**
 * Switch - Toggle switch component with dark mode support
 */
export function Switch({ checked, onChange, disabled = false }) {
  return (
    <button 
      type="button" 
      onClick={() => !disabled && onChange(!checked)} 
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${
        checked ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`} 
      role="switch"
      aria-checked={checked}
    >
      <span 
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-1'
        }`} 
      />
    </button>
  );
}

/**
 * Label - Form label component
 */
export function Label({ children, htmlFor, required, className = '' }) {
  return (
    <label 
      htmlFor={htmlFor}
      className={`block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 ${className}`}
    >
      {children}
      {required && <span className="text-red-500 ms-1">*</span>}
    </label>
  );
}

/**
 * FormGroup - Wrapper for form field with label and error message
 */
export function FormGroup({ label, htmlFor, required, error, children, className = '' }) {
  return (
    <div className={className}>
      {label && (
        <Label htmlFor={htmlFor} required={required}>
          {label}
        </Label>
      )}
      {children}
      {error && (
        <p className="mt-1 text-sm text-red-500 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}


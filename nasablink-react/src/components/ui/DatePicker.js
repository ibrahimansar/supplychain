import React from 'react';

export function DatePicker({ value, onChange, placeholder = "Select date", className = '', name }) {
  const handleChange = (e) => {
    onChange({ target: { name: name || 'birthYear', value: e.target.value } });
  };

  // Convert year string to date format if needed
  const getDateValue = () => {
    if (!value) return '';
    // If it's already a date string (contains hyphens), return as is
    if (value.includes('-')) return value;
    // If it's just a year, convert to January 1st of that year
    if (/^\d{4}$/.test(value)) return `${value}-01-01`;
    return value;
  };

  return (
    <input
      type="date"
      value={getDateValue()}
      onChange={handleChange}
      placeholder={placeholder}
      className={`block w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:[color-scheme:dark] ${className}`}
      name={name}
    />
  );
}
module.exports = {
  extends: ['react-app', 'react-app/jest'],
  rules: {
    // Disable unknown at-rule warnings for Tailwind CSS
    'at-rule-no-unknown': 0,
  },
  overrides: [
    {
      files: ['*.css'],
      rules: {
        // Allow Tailwind's @apply and @tailwind directives
        'at-rule-no-unknown': 0,
        'property-no-unknown': 0,
      },
    },
  ],
};
// Utility functions for managing user notification preferences
// These can be easily extended to use database storage instead of localStorage

export const notificationPreferences = {
  // Get notification preference
  get: (key) => {
    try {
      return localStorage.getItem(`notification-${key}`) === 'dismissed';
    } catch {
      return false;
    }
  },

  // Set notification as dismissed
  dismiss: (key) => {
    try {
      localStorage.setItem(`notification-${key}`, 'dismissed');
    } catch {
      // Fallback if localStorage is not available
    }
  },

  // Reset notification preference (for testing/admin purposes)
  reset: (key) => {
    try {
      localStorage.removeItem(`notification-${key}`);
    } catch {
      // Fallback if localStorage is not available
    }
  },

  // Check if notification should be shown
  shouldShow: (key) => {
    return !notificationPreferences.get(key);
  }
};

// Future enhancement: Database-backed preferences
// export const dbNotificationPreferences = {
//   get: async (userId, key) => { /* API call */ },
//   dismiss: async (userId, key) => { /* API call */ },
//   reset: async (userId, key) => { /* API call */ },
//   shouldShow: async (userId, key) => { /* API call */ }
// };
/**
 * Environment and development utilities
 */

/**
 * Check if the application is running in a development environment
 * @returns {boolean} True if in development mode
 */
export const isDevelopment = () => {
  return process.env.NODE_ENV === 'development';
};

/**
 * Check if the application is running on localhost
 * @returns {boolean} True if running on localhost
 */
export const isLocalhost = () => {
  if (typeof window === 'undefined') return false;

  const hostname = window.location.hostname;
  return hostname === 'localhost' ||
         hostname === '127.0.0.1' ||
         hostname.startsWith('localhost:') ||
         hostname.startsWith('127.0.0.1:');
};

/**
 * Check if test controls should be visible
 * @returns {boolean} True if test controls should be shown
 */
export const shouldShowTestControls = () => {
  // Always show in development
  if (isDevelopment()) return true;

  // Show if running on localhost (for local testing)
  if (isLocalhost()) return true;

  // Show if URL parameter is present
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('showTestControls') === 'true') return true;
  }

  // Show if localStorage flag is set
  if (typeof window !== 'undefined') {
    if (localStorage.getItem('showTestControls') === 'true') return true;
  }

  return false;
};

/**
 * Check if offline test controls should be visible
 * @returns {boolean} True if offline test controls should be shown
 */
export const shouldShowOfflineTestControls = () => {
  // Always show in development
  if (isDevelopment()) return true;

  // Show if running on localhost
  if (isLocalhost()) return true;

  // Show if specific URL parameter is present
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('showOfflineTest') === 'true') return true;
  }

  // Show if localStorage flag is set
  if (typeof window !== 'undefined') {
    if (localStorage.getItem('showOfflineTest') === 'true') return true;
  }

  return false;
};

/**
 * Enable test controls globally
 */
export const enableTestControls = () => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('showTestControls', 'true');
  }
};

/**
 * Disable test controls globally
 */
export const disableTestControls = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('showTestControls');
  }
};

/**
 * Enable offline test controls
 */
export const enableOfflineTestControls = () => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('showOfflineTest', 'true');
  }
};

/**
 * Disable offline test controls
 */
export const disableOfflineTestControls = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('showOfflineTest');
  }
};

/**
 * Get current environment info
 * @returns {object} Environment information
 */
export const getEnvironmentInfo = () => {
  return {
    isDevelopment: isDevelopment(),
    isLocalhost: isLocalhost(),
    hostname: typeof window !== 'undefined' ? window.location.hostname : 'unknown',
    nodeEnv: process.env.NODE_ENV,
    shouldShowTestControls: shouldShowTestControls(),
    shouldShowOfflineTestControls: shouldShowOfflineTestControls()
  };
};

// Console utilities for development
if (typeof window !== 'undefined' && isDevelopment()) {
  window.OfflineTestUtils = {
    enable: enableOfflineTestControls,
    disable: disableOfflineTestControls,
    enableAll: enableTestControls,
    disableAll: disableTestControls,
    info: getEnvironmentInfo,
    show: () => {
      enableOfflineTestControls();
      console.log('Offline test controls enabled. Refresh the page to see them.');
    },
    hide: () => {
      disableOfflineTestControls();
      console.log('Offline test controls disabled. Refresh the page to hide them.');
    }
  };

  console.log(`
🔧 Offline Test Controls Available!
Use window.OfflineTestUtils to control test features:

• window.OfflineTestUtils.show() - Show offline test controls
• window.OfflineTestUtils.hide() - Hide offline test controls
• window.OfflineTestUtils.info() - Get environment info
• window.OfflineTestUtils.enable() - Enable offline controls
• window.OfflineTestUtils.disable() - Disable offline controls

Or add ?showOfflineTest=true to the URL
  `);
}

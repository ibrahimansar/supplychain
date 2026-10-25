/**
 * Analytics Service
 * 
 * Provides unified analytics tracking across the application.
 * Supports multiple analytics providers and custom event tracking.
 */

// Configuration
const ANALYTICS_CONFIG = {
  enabled: process.env.NODE_ENV === 'production',
  debug: process.env.NODE_ENV === 'development',
  // Add your analytics provider keys here
  googleAnalyticsId: process.env.REACT_APP_GA_ID || null,
  mixpanelToken: process.env.REACT_APP_MIXPANEL_TOKEN || null,
};

// Event types for type safety
export const AnalyticsEvents = {
  // Page views
  PAGE_VIEW: 'page_view',
  
  // Authentication
  LOGIN: 'login',
  LOGOUT: 'logout',
  SIGNUP: 'signup',
  
  // Tree actions
  TREE_CREATE: 'tree_create',
  TREE_VIEW: 'tree_view',
  TREE_DELETE: 'tree_delete',
  TREE_SHARE: 'tree_share',
  
  // Person actions
  PERSON_ADD: 'person_add',
  PERSON_EDIT: 'person_edit',
  PERSON_DELETE: 'person_delete',
  
  // Collaboration
  INVITE_SEND: 'invite_send',
  INVITE_ACCEPT: 'invite_accept',
  VIEWER_LINK_CREATE: 'viewer_link_create',
  VIEWER_LINK_USE: 'viewer_link_use',
  
  // Documents (Plus)
  DOCUMENT_UPLOAD: 'document_upload',
  DOCUMENT_VIEW: 'document_view',
  
  // Subscription
  UPGRADE_CLICK: 'upgrade_click',
  SUBSCRIPTION_START: 'subscription_start',
  SUBSCRIPTION_CANCEL: 'subscription_cancel',
  
  // Feature usage
  SEARCH_USE: 'search_use',
  PRINT_TREE: 'print_tree',
  EXPORT_DATA: 'export_data',
  
  // Errors
  ERROR_OCCUR: 'error_occur',
  
  // Engagement
  SESSION_START: 'session_start',
  SESSION_END: 'session_end',
  FEATURE_DISCOVER: 'feature_discover',
};

class Analytics {
  constructor() {
    this.initialized = false;
    this.userId = null;
    this.sessionId = this.generateSessionId();
    this.sessionStart = Date.now();
    this.eventQueue = [];
  }

  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Initialize analytics with user context
   */
  init(user = null) {
    if (this.initialized) return;

    if (user) {
      this.userId = user.id;
      this.setUserProperties({
        email: user.email,
        name: user.displayName,
        subscription: user.subscriptionStatus || 'FREE',
        createdAt: user.createdAt,
      });
    }

    // Initialize Google Analytics if configured
    if (ANALYTICS_CONFIG.googleAnalyticsId && typeof window !== 'undefined') {
      this.initGoogleAnalytics();
    }

    // Initialize Mixpanel if configured
    if (ANALYTICS_CONFIG.mixpanelToken && typeof window !== 'undefined') {
      this.initMixpanel();
    }

    // Track session start
    this.track(AnalyticsEvents.SESSION_START);

    // Process queued events
    this.eventQueue.forEach(({ event, properties }) => {
      this.track(event, properties);
    });
    this.eventQueue = [];

    this.initialized = true;

    // Track session end on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        const sessionDuration = Math.round((Date.now() - this.sessionStart) / 1000);
        this.track(AnalyticsEvents.SESSION_END, { duration: sessionDuration });
      });
    }

    if (ANALYTICS_CONFIG.debug) {
      console.log('[Analytics] Initialized', { userId: this.userId, sessionId: this.sessionId });
    }
  }

  initGoogleAnalytics() {
    // Load Google Analytics script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${ANALYTICS_CONFIG.googleAnalyticsId}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function() {
      window.dataLayer.push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', ANALYTICS_CONFIG.googleAnalyticsId, {
      send_page_view: false, // We'll handle page views manually
    });
  }

  initMixpanel() {
    // Mixpanel initialization would go here
    // For now, we'll just log that it would be initialized
    if (ANALYTICS_CONFIG.debug) {
      console.log('[Analytics] Mixpanel would be initialized with token:', ANALYTICS_CONFIG.mixpanelToken);
    }
  }

  /**
   * Set user properties for analytics
   */
  setUserProperties(properties) {
    if (window.gtag) {
      window.gtag('set', 'user_properties', properties);
    }

    if (ANALYTICS_CONFIG.debug) {
      console.log('[Analytics] User properties set:', properties);
    }
  }

  /**
   * Track a page view
   */
  pageView(pageName, properties = {}) {
    const pageData = {
      page_title: pageName,
      page_location: window.location.href,
      page_path: window.location.pathname,
      ...properties,
    };

    if (window.gtag) {
      window.gtag('event', 'page_view', pageData);
    }

    if (ANALYTICS_CONFIG.debug) {
      console.log('[Analytics] Page view:', pageName, pageData);
    }
  }

  /**
   * Track an event
   */
  track(eventName, properties = {}) {
    if (!ANALYTICS_CONFIG.enabled && !ANALYTICS_CONFIG.debug) {
      return;
    }

    // Queue events if not initialized
    if (!this.initialized && eventName !== AnalyticsEvents.SESSION_START) {
      this.eventQueue.push({ event: eventName, properties });
      return;
    }

    const eventData = {
      event_name: eventName,
      user_id: this.userId,
      session_id: this.sessionId,
      timestamp: new Date().toISOString(),
      ...properties,
    };

    // Send to Google Analytics
    if (window.gtag) {
      window.gtag('event', eventName, eventData);
    }

    // Log in development
    if (ANALYTICS_CONFIG.debug) {
      console.log('[Analytics] Event:', eventName, eventData);
    }

    // Also store locally for internal analytics
    this.storeEvent(eventName, eventData);
  }

  /**
   * Store event locally (for internal dashboard)
   */
  storeEvent(eventName, eventData) {
    try {
      const events = JSON.parse(localStorage.getItem('analytics_events') || '[]');
      events.push(eventData);
      // Keep only last 100 events locally
      if (events.length > 100) {
        events.shift();
      }
      localStorage.setItem('analytics_events', JSON.stringify(events));
    } catch (e) {
      // Ignore storage errors
    }
  }

  /**
   * Track timing (for performance)
   */
  timing(category, variable, value, label = '') {
    if (window.gtag) {
      window.gtag('event', 'timing_complete', {
        name: variable,
        value: value,
        event_category: category,
        event_label: label,
      });
    }

    if (ANALYTICS_CONFIG.debug) {
      console.log('[Analytics] Timing:', category, variable, value, label);
    }
  }

  /**
   * Track errors
   */
  trackError(error, fatal = false) {
    this.track(AnalyticsEvents.ERROR_OCCUR, {
      error_message: error.message,
      error_stack: error.stack,
      fatal,
    });
  }

  /**
   * Get session analytics
   */
  getSessionAnalytics() {
    return {
      sessionId: this.sessionId,
      duration: Math.round((Date.now() - this.sessionStart) / 1000),
      events: JSON.parse(localStorage.getItem('analytics_events') || '[]'),
    };
  }

  /**
   * Clear local analytics data
   */
  clearLocalData() {
    localStorage.removeItem('analytics_events');
  }

  /**
   * Identify user (call after login)
   */
  identify(user) {
    this.userId = user.id;
    this.setUserProperties({
      email: user.email,
      name: user.displayName,
      subscription: user.subscriptionStatus || 'FREE',
    });

    if (window.gtag) {
      window.gtag('config', ANALYTICS_CONFIG.googleAnalyticsId, {
        user_id: user.id,
      });
    }
  }

  /**
   * Reset user (call after logout)
   */
  reset() {
    this.userId = null;
    this.sessionId = this.generateSessionId();
    this.sessionStart = Date.now();
    this.clearLocalData();
  }
}

// Export singleton instance
const analytics = new Analytics();

export default analytics;

// React hook for analytics
export function useAnalytics() {
  return {
    track: analytics.track.bind(analytics),
    pageView: analytics.pageView.bind(analytics),
    identify: analytics.identify.bind(analytics),
    timing: analytics.timing.bind(analytics),
    trackError: analytics.trackError.bind(analytics),
  };
}

// NOTE: For higher-order component with page tracking, use AnalyticsContext instead
// The withPageTracking HOC is not recommended as it requires React import in a service file
// Use the AnalyticsProvider and useTrackEvent hook from '../contexts/AnalyticsContext'

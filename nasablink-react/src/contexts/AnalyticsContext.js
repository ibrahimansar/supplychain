import React, { createContext, useContext, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import analytics, { AnalyticsEvents } from '../services/analytics';
import { useAuth } from './AuthContext';

const AnalyticsContext = createContext(null);

export function AnalyticsProvider({ children }) {
  const location = useLocation();
  const { user, authenticated } = useAuth();

  // Initialize analytics when user is available
  useEffect(() => {
    if (authenticated && user) {
      analytics.init(user);
      analytics.identify(user);
    } else {
      analytics.init();
    }
  }, [authenticated, user]);

  // Track page views on route change
  useEffect(() => {
    const pageName = getPageName(location.pathname);
    analytics.pageView(pageName, {
      path: location.pathname,
      search: location.search,
    });
  }, [location.pathname, location.search]);

  const value = {
    track: analytics.track.bind(analytics),
    pageView: analytics.pageView.bind(analytics),
    timing: analytics.timing.bind(analytics),
    trackError: analytics.trackError.bind(analytics),
    events: AnalyticsEvents,
  };

  return (
    <AnalyticsContext.Provider value={value}>
      {children}
    </AnalyticsContext.Provider>
  );
}

export function useAnalytics() {
  const context = useContext(AnalyticsContext);
  if (!context) {
    // Return a no-op version if not wrapped in provider
    return {
      track: () => {},
      pageView: () => {},
      timing: () => {},
      trackError: () => {},
      events: AnalyticsEvents,
    };
  }
  return context;
}

// Helper to get readable page name from path
function getPageName(pathname) {
  const routes = {
    '/': 'Landing Page',
    '/login': 'Login',
    '/register': 'Register',
    '/trees': 'Tree Selector',
    '/onboarding': 'Onboarding',
    '/privacy': 'Privacy Policy',
    '/terms': 'Terms of Service',
    '/help': 'Help Center',
    '/admin-console': 'Admin Console',
    '/unauthorized': 'Unauthorized',
  };

  // Check exact matches first
  if (routes[pathname]) {
    return routes[pathname];
  }

  // Check pattern matches
  if (pathname.startsWith('/trees/') && pathname.includes('/documents')) {
    return 'Documents';
  }
  if (pathname.startsWith('/trees/') && pathname.includes('/admin')) {
    return 'Tree Admin';
  }
  if (pathname.startsWith('/trees/')) {
    return 'Tree Workspace';
  }
  if (pathname.startsWith('/view/')) {
    return 'Viewer Link';
  }
  if (pathname.startsWith('/public-tree/')) {
    return 'Public Tree Viewer';
  }
  if (pathname.startsWith('/invites/')) {
    return 'Invitation';
  }

  return 'Unknown Page';
}

export default AnalyticsProvider;

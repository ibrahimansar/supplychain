import React, { useEffect, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import Button from './components/ui/Button';
import Navbar from './components/Navbar';
import GlobalToaster from './components/GlobalToaster';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import OfflineScreen from './components/OfflineScreen';
import CookieConsentBanner from './components/CookieConsentBanner';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import OnboardingWelcome from './components/OnboardingWelcome';
import OnboardingTooltip from './components/OnboardingTooltip';
import { BASE_PATH } from './config/basePath';
import { AuthProvider } from './contexts/AuthContext';
import { ErrorProvider } from './contexts/ErrorContext';
import { I18nProvider } from './i18n/I18nContext';
import { AnalyticsProvider } from './contexts/AnalyticsContext';
import { OnboardingProvider } from './contexts/OnboardingContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { DataStoreProvider } from './contexts/DataStoreContext';
import NotificationDrawer from './components/NotificationDrawer';
import errorReporter from './utils/errorReporter';
import lazyWithRetry from './utils/lazyWithRetry';

// Route-level code splitting — lazy-loaded pages
const LoginPage = lazyWithRetry(() => import('./pages/LoginPage'), 'LoginPage');
const LandingPage = lazyWithRetry(() => import('./pages/LandingPage'), 'LandingPage');
const OnboardingPage = lazyWithRetry(() => import('./pages/OnboardingPage'), 'OnboardingPage');
const TreeSelectorPage = lazyWithRetry(() => import('./pages/TreeSelectorPage'), 'TreeSelectorPage');
const TreeWorkspacePage = lazyWithRetry(() => import('./pages/TreeWorkspacePage'), 'TreeWorkspacePage');
const DocumentsTab = lazyWithRetry(() => import('./pages/DocumentsTab'), 'DocumentsTab');
const TimelinePage = lazyWithRetry(() => import('./pages/TimelinePage'), 'TimelinePage');
const TreeAdminPage = lazyWithRetry(() => import('./pages/TreeAdminPage'), 'TreeAdminPage');
const ViewerLinkPage = lazyWithRetry(() => import('./pages/ViewerLinkPage'), 'ViewerLinkPage');
const ContributePage = lazyWithRetry(() => import('./pages/ContributePage'), 'ContributePage');
const PublicTreeViewerPage = lazyWithRetry(() => import('./pages/PublicTreeViewerPage'), 'PublicTreeViewerPage');
const InvitePage = lazyWithRetry(() => import('./pages/InvitePage'), 'InvitePage');
const AdminConsole = lazyWithRetry(() => import('./pages/AdminConsole'), 'AdminConsole');
const ConnectionTest = lazyWithRetry(() => import('./components/ConnectionTest'), 'ConnectionTest');
const RegisterPage = lazyWithRetry(() => import('./pages/RegisterPage'), 'RegisterPage');
const UnauthorizedPage = lazyWithRetry(() => import('./pages/UnauthorizedPage'), 'UnauthorizedPage');
const PrivacyPolicy = lazyWithRetry(() => import('./pages/PrivacyPolicy'), 'PrivacyPolicy');
const TermsOfService = lazyWithRetry(() => import('./pages/TermsOfService'), 'TermsOfService');
const GDPRSettingsPage = lazyWithRetry(() => import('./pages/GDPRSettingsPage'), 'GDPRSettingsPage');
const HelpPage = lazyWithRetry(() => import('./pages/HelpPage'), 'HelpPage');
const APIDocumentation = lazyWithRetry(() => import('./pages/APIDocumentation'), 'APIDocumentation');
const ExplorePage = lazyWithRetry(() => import('./pages/ExplorePage'), 'ExplorePage');
const ExploreTreeDetailPage = lazyWithRetry(() => import('./pages/ExploreTreeDetailPage'), 'ExploreTreeDetailPage');
const ExploreTreeViewerPage = lazyWithRetry(() => import('./pages/ExploreTreeViewerPage'), 'ExploreTreeViewerPage');
const SubscriptionPage = lazyWithRetry(() => import('./pages/SubscriptionPage'), 'SubscriptionPage');
const AuthCallbackPage = lazyWithRetry(() => import('./pages/AuthCallbackPage'), 'AuthCallbackPage');

function ThemeWrapper({ children }) {
  return children;
}

// Standalone AuthRedirector function
// Commented out - not currently used
// function AuthRedirector() {
//   const { authenticated, loading } = useAuth();
//   const navigate = useNavigate();
//   useEffect(() => {
//     if (!loading && authenticated) {
//       meAPI.getMyTrees()
//         .then(res => {
//           if (Array.isArray(res.data) && res.data.length > 0) {
//             navigate('/trees', { replace: true });
//           } else {
//             navigate('/onboarding', { replace: true });
//           }
//         })
//         .catch((error) => {
//           console.error('Failed to load trees:', error);
//           navigate('/trees', { replace: true });
//         });
//     }
//   }, [authenticated, loading, navigate]);
//   return null;
// }

function TreePageOnboarding() {
  const location = useLocation();
  const isTreePage = location.pathname.startsWith('/trees') || location.pathname === '/onboarding';

  if (!isTreePage) return null;

  return (
    <>
      <OnboardingWelcome />
      <OnboardingTooltip />
    </>
  );
}

/** Route-level loading state while a lazy page chunk downloads. */
function RouteFallback() {
  return (
    <div className="flex-1 min-h-[60vh] bg-white dark:bg-gray-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-gray-400 dark:text-gray-500">
        <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="text-sm">Loading…</span>
      </div>
    </div>
  );
}

function AppChrome() {
  const location = useLocation();
  const showNavbar =
    location.pathname !== '/' && !location.pathname.startsWith('/contribute/');

  return (
    <div className="App min-h-screen flex flex-col bg-slate-50">
      {showNavbar && <Navbar />}
      <GlobalToaster />
      <CookieConsentBanner />
      <PWAInstallPrompt />
      {/*
        A blank fill looks identical to a broken page when a chunk is slow or
        missing, which is exactly how stale-deploy chunk errors were presenting.
        Show something that reads as "loading" instead.
      */}
      <Suspense fallback={<RouteFallback />}>
      <Routes>
        {/* Google OAuth callback — must be public, no auth required */}
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        {/* Public Route */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/gdpr-settings" element={<ProtectedRoute element={<GDPRSettingsPage />} />} />
        <Route path="/help" element={<HelpPage />} />
        <Route path="/api-docs" element={<APIDocumentation />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/explore/:treeId/view" element={<ExploreTreeViewerPage />} />
        <Route path="/explore/:treeId" element={<ExploreTreeDetailPage />} />
        <Route path="/" element={<LandingPage />} />

        {/* Protected Routes */}
        <Route path="/register" element={<ProtectedRoute element={<RegisterPage />} />} />
        <Route path="/unauthorized" element={<ProtectedRoute element={<UnauthorizedPage />} />} />
        <Route path="/test-connection" element={<ProtectedRoute element={<ConnectionTest />} />} />
        <Route path="/onboarding" element={<ProtectedRoute element={<OnboardingPage />} />} />
        <Route path="/trees" element={<ProtectedRoute element={<TreeSelectorPage />} />} />
        <Route path="/trees/:treeId" element={<ProtectedRoute element={<TreeWorkspacePage />} />} />
        <Route path="/trees/:treeId/documents" element={<ProtectedRoute element={<DocumentsTab />} />} />
        <Route path="/trees/:treeId/timeline" element={<ProtectedRoute element={<TimelinePage />} />} />
        <Route path="/trees/:treeId/admin" element={<ProtectedRoute element={<TreeAdminPage />} />} />
        <Route path="/tree" element={<ProtectedRoute element={<Navigate to="/trees" replace />} />} />
        {/* <Route path="/" element={<ProtectedRoute element={<AuthRedirector />} />} /> */}
        <Route path="/view/:treeId/:token" element={<ViewerLinkPage />} />
        {/* Unauthenticated: a relative answering questions about one person. */}
        <Route path="/contribute/:token" element={<ContributePage />} />
        <Route path="/public-tree/:treeId/:token" element={<PublicTreeViewerPage />} />
        <Route path="/invites/:token" element={<ProtectedRoute element={<InvitePage />} />} />
        <Route path="/admin-console" element={<ProtectedRoute element={<AdminConsole />} />} />
        <Route path="/subscription" element={<ProtectedRoute element={<SubscriptionPage />} />} />

        {/* 404 Route */}
        <Route
          path="*"
          element={
            <div className="min-h-screen bg-white dark:bg-gray-950 pt-20 flex items-center justify-center">
              <div className="text-center">
                <p className="text-sm font-medium text-primary-600 dark:text-primary-400 mb-2">404</p>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">Page not found</h1>
                <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-sm mx-auto">The page you're looking for doesn't exist or has been moved.</p>
                <Link to="/trees"><Button className="rounded-xl">Go to My Trees</Button></Link>
              </div>
            </div>
          }
        />
      </Routes>
      </Suspense>
    </div>
  );
}

function App() {
  useEffect(() => {
    errorReporter.reportPerformance({
      type: 'app_init',
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    });
  }, []);

  return (
    <ErrorProvider>
      <Router basename={BASE_PATH}>
        <AuthProvider>
          <DataStoreProvider>
            <ErrorBoundary
              onError={(error) => {
                // This will be handled by the ErrorProvider
                console.error('App-level error:', error);
              }}
              fallback={({ error, retry }) => (
                <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                  <div className="max-w-md w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
                    <div className="text-center">
                      <svg className="mx-auto h-12 w-12 text-red-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        Application Error
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        Something went wrong with the application. Please try refreshing the page.
                      </p>
                      <div className="flex space-x-3">
                        <button
                          onClick={retry}
                          className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
                        >
                          Try Again
                        </button>
                        <button
                          onClick={() => window.location.reload()}
                          className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700"
                        >
                          Refresh Page
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            >
              <I18nProvider>
                <AnalyticsProvider>
                  <OnboardingProvider>
                    <NotificationProvider>
                      <ThemeWrapper>
                        <OfflineScreen />
                        {/* <OfflineTestControls /> */}
                        <TreePageOnboarding />
                        <AppChrome />
                        <NotificationDrawer />
                      </ThemeWrapper>
                    </NotificationProvider>
                  </OnboardingProvider>
                </AnalyticsProvider>
              </I18nProvider>
            </ErrorBoundary>
          </DataStoreProvider>
        </AuthProvider>
      </Router>
    </ErrorProvider>
  );
}

export default App;

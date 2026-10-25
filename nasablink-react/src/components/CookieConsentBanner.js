import React, { useState, useEffect } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { Link } from 'react-router-dom';

const COOKIE_CONSENT_KEY = 'nasablink_cookie_consent';

export default function CookieConsentBanner() {
  const { t } = useI18n();
  const [showBanner, setShowBanner] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [preferences, setPreferences] = useState({
    necessary: true, // Always true, cannot be disabled
    analytics: false,
    marketing: false
  });

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      // Show banner after a short delay
      setTimeout(() => setShowBanner(true), 1000);
    }
  }, []);

  const handleAcceptAll = () => {
    const consent = {
      necessary: true,
      analytics: true,
      marketing: true,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent));
    setShowBanner(false);
    
    // Initialize analytics/marketing tools here
    initializeTracking(consent);
  };

  const handleDecline = () => {
    const consent = {
      necessary: true,
      analytics: false,
      marketing: false,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent));
    setShowBanner(false);
  };

  const handleSavePreferences = () => {
    const consent = {
      ...preferences,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent));
    setShowBanner(false);
    setShowCustomize(false);
    
    // Initialize only allowed tracking
    initializeTracking(consent);
  };

  const initializeTracking = (consent) => {
    // Add your analytics/marketing initialization here
    // Example:
    // if (consent.analytics && window.gtag) {
    //   window.gtag('consent', 'update', { analytics_storage: 'granted' });
    // }
    // if (consent.marketing && window.fbq) {
    //   window.fbq('consent', 'grant');
    // }
    console.log('Cookie consent preferences saved:', consent);
  };

  if (!showBanner) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-[9998]"
        onClick={() => setShowCustomize(false)}
      />
      
      {/* Banner */}
      <div className="fixed bottom-0 start-0 end-0 z-[9999] p-4 sm:p-6">
        <div className="max-w-6xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700">
          {!showCustomize ? (
            // Simple Banner
            <div className="p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    🍪 {t('cookies.banner_message', 'We use cookies to enhance your experience')}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('cookies.banner_message', 'We use cookies to enhance your experience. By continuing to visit this site you agree to our use of cookies.')}
                    {' '}
                    <Link 
                      to="/privacy" 
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {t('legal.learn_more', 'Learn More')}
                    </Link>
                  </p>
                </div>
                
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setShowCustomize(true)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    {t('cookies.banner_customize', 'Customize')}
                  </button>
                  
                  <button
                    onClick={handleDecline}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    {t('cookies.banner_decline', 'Decline')}
                  </button>
                  
                  <button
                    onClick={handleAcceptAll}
                    className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                  >
                    {t('cookies.banner_accept', 'Accept All')}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            // Customization Panel
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {t('cookies.preferences_title', 'Cookie Preferences')}
                </h3>
                <button
                  onClick={() => setShowCustomize(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4 mb-6">
                {/* Necessary Cookies (always enabled) */}
                <div className="flex items-start justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {t('cookies.necessary', 'Necessary Cookies')}
                      </h4>
                      <span className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded">
                        Always Active
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t('cookies.necessary_description', 'Required for the website to function properly')}
                    </p>
                  </div>
                  <div className="ms-4">
                    <div className="w-12 h-6 bg-blue-600 rounded-full flex items-center justify-end px-1 cursor-not-allowed opacity-50">
                      <div className="w-4 h-4 bg-white rounded-full" />
                    </div>
                  </div>
                </div>
                
                {/* Analytics Cookies */}
                <div className="flex items-start justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                      {t('cookies.analytics', 'Analytics Cookies')}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t('cookies.analytics_description', 'Help us understand how you use our website')}
                    </p>
                  </div>
                  <div className="ms-4">
                    <button
                      onClick={() => setPreferences(p => ({ ...p, analytics: !p.analytics }))}
                      className={`w-12 h-6 rounded-full flex items-center transition-colors ${
                        preferences.analytics 
                          ? 'bg-blue-600 justify-end' 
                          : 'bg-gray-300 dark:bg-gray-600 justify-start'
                      } px-1`}
                    >
                      <div className="w-4 h-4 bg-white rounded-full" />
                    </button>
                  </div>
                </div>
                
                {/* Marketing Cookies */}
                <div className="flex items-start justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                      {t('cookies.marketing', 'Marketing Cookies')}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t('cookies.marketing_description', 'Used to deliver personalized advertisements')}
                    </p>
                  </div>
                  <div className="ms-4">
                    <button
                      onClick={() => setPreferences(p => ({ ...p, marketing: !p.marketing }))}
                      className={`w-12 h-6 rounded-full flex items-center transition-colors ${
                        preferences.marketing 
                          ? 'bg-blue-600 justify-end' 
                          : 'bg-gray-300 dark:bg-gray-600 justify-start'
                      } px-1`}
                    >
                      <div className="w-4 h-4 bg-white rounded-full" />
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={handleDecline}
                  className="px-6 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  {t('cookies.banner_decline', 'Decline All')}
                </button>
                <button
                  onClick={handleSavePreferences}
                  className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  {t('cookies.save_preferences', 'Save Preferences')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

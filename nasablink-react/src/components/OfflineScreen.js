import React, { useState, useEffect } from 'react';
import { useConnectivity } from '../hooks/useConnectivity';
import Button from './ui/Button';
import { LoadingSpinner } from './ui/Loading';

const OfflineScreen = () => {
  const { isOnline, wasOffline, connectionQuality, lastOnline, testConnectivity } = useConnectivity();
  const [showReconnected, setShowReconnected] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (wasOffline && isOnline) {
      setShowReconnected(true);
      setRetryCount(0);
      const timer = setTimeout(() => setShowReconnected(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [wasOffline, isOnline]);

  const handleRetry = async () => {
    setIsRetrying(true);
    setRetryCount(prev => prev + 1);

    const success = await testConnectivity();
    setIsRetrying(false);

    if (success) {
      // Force a page reload to ensure everything works
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const getConnectionQualityColor = (quality) => {
    switch (quality) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'fair': return 'text-yellow-600';
      case 'poor': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  const getConnectionQualityText = (quality) => {
    switch (quality) {
      case 'excellent': return 'Excellent';
      case 'good': return 'Good';
      case 'fair': return 'Fair';
      case 'poor': return 'Poor';
      default: return 'Unknown';
    }
  };

  // Don't show offline screen if online
  if (isOnline && !showReconnected) {
    return null;
  }

  // Show reconnection notification
  if (showReconnected && isOnline) {
    return (
      <div className="fixed top-4 start-1/2 transform -translate-x-1/2 z-[10000] animate-slide-in-right">
        <div className="bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <span className="font-medium">Connection restored!</span>
            <div className={`text-sm ${getConnectionQualityColor(connectionQuality)}`}>
              {getConnectionQualityText(connectionQuality)} connection
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Don't show offline screen if online
  if (isOnline && !showReconnected) {
    return null;
  }

  // Show reconnection notification
  if (showReconnected && isOnline) {
    return (
      <div className="fixed top-4 start-1/2 transform -translate-x-1/2 z-[10000] animate-slide-in-right">
        <div className="bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <span className="font-medium">Connection restored!</span>
            <div className={`text-sm ${getConnectionQualityColor(connectionQuality)}`}>
              {getConnectionQualityText(connectionQuality)} connection
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show offline screen
  return (
    <div className="fixed inset-0 z-[9999] bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 text-center">
        {/* Offline Icon */}
        <div className="mb-6">
          <div className="relative mx-auto w-24 h-24">
            <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-12 h-12 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-12.728 12.728m0-12.728l12.728 12.728"/>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2 12h20"/>
              </svg>
            </div>
            {/* Animated signal bars */}
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full animate-pulse"></div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            <div className="absolute top-0 end-0 w-2 h-2 bg-red-300 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          You're Offline
        </h1>

        {/* Description */}
        <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
          It looks like you've lost your internet connection. Don't worry, you can try reconnecting or check your connection settings.
        </p>

        {/* Connection Status */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Connection Status</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {lastOnline ? `Last online: ${lastOnline.toLocaleTimeString()}` : 'Never connected'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((bar) => (
                <div
                  key={bar}
                  className={`w-1 h-4 rounded-full transition-colors ${
                    connectionQuality === 'offline' ? 'bg-gray-300' :
                    bar <= (connectionQuality === 'excellent' ? 4 :
                           connectionQuality === 'good' ? 3 :
                           connectionQuality === 'fair' ? 2 : 1)
                      ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
            <span className={`text-sm font-medium ${getConnectionQualityColor(connectionQuality)}`}>
              {connectionQuality === 'offline' ? 'Offline' : getConnectionQualityText(connectionQuality)}
            </span>
          </div>
        </div>

        {/* Connection Tips */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6 text-start">
          <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">Quick Tips:</h3>
          <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
            <li>• Check your Wi-Fi or mobile data</li>
            <li>• Try switching between networks</li>
            <li>• Restart your router if needed</li>
            <li>• Contact your service provider</li>
            <li>• Try airplane mode off/on</li>
          </ul>
        </div>

        {/* Retry Count */}
        {retryCount > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-300">
              Retry attempts: {retryCount}
              {retryCount > 3 && " - Consider checking your network settings"}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            onClick={handleRetry}
            disabled={isRetrying}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
          >
            {isRetrying ? (
              <div className="flex items-center justify-center gap-2">
                <LoadingSpinner size="xs" color="white" />
                Testing Connection...
              </div>
            ) : (
              'Test Connection'
            )}
          </Button>

          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={handleRefresh}
              variant="outline"
              className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium py-3 px-6 rounded-lg transition-colors"
            >
              Refresh Page
            </Button>
            <Button
              onClick={() => window.history.back()}
              variant="outline"
              className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium py-3 px-6 rounded-lg transition-colors"
            >
              Go Back
            </Button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-xs text-gray-500 mt-6">
          Some features may not work without an internet connection
        </p>
      </div>
    </div>
  );
};

export default OfflineScreen;

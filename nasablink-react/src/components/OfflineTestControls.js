import React, { useState } from 'react';
import { useConnectivity } from '../hooks/useConnectivity';
import { shouldShowOfflineTestControls, enableOfflineTestControls, disableOfflineTestControls, getEnvironmentInfo } from '../utils/environment';
import Button from './ui/Button';

const OfflineTestControls = () => {
  const { isOnline, connectionQuality, testConnectivity } = useConnectivity();
  const [showDetails, setShowDetails] = useState(false);
  const envInfo = getEnvironmentInfo();

  const simulateOffline = () => {
    // Simulate going offline
    window.dispatchEvent(new Event('offline'));
  };

  const simulateOnline = () => {
    // Simulate going online
    window.dispatchEvent(new Event('online'));
  };

  const testConnection = async () => {
    await testConnectivity();
  };

  const toggleVisibility = () => {
    if (shouldShowOfflineTestControls()) {
      disableOfflineTestControls();
    } else {
      enableOfflineTestControls();
    }
    // Force re-render by updating state
    setShowDetails(!showDetails);
  };

  // Use the centralized environment check
  if (!shouldShowOfflineTestControls()) {
    return null;
  }

  return (
    <div className="fixed bottom-4 end-4 z-[9998] bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-xs">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-sm">Offline Test Controls</h3>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          {showDetails ? 'Hide' : 'Info'}
        </button>
      </div>

      {showDetails && (
        <div className="mb-3 p-2 bg-gray-50 rounded text-xs">
          <div className="space-y-1">
            <div>Env: <span className="font-mono">{envInfo.nodeEnv}</span></div>
            <div>Host: <span className="font-mono">{envInfo.hostname}</span></div>
            <div>Local: <span className={envInfo.isLocalhost ? 'text-green-600' : 'text-red-600'}>
              {envInfo.isLocalhost ? 'Yes' : 'No'}
            </span></div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="text-xs text-gray-600">
          Status: <span className={isOnline ? 'text-green-600' : 'text-red-600'}>
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
        <div className="text-xs text-gray-600">
          Quality: <span className="capitalize">{connectionQuality}</span>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={simulateOffline}
            size="sm"
            className="text-xs px-2 py-1"
            variant="outline"
          >
            Go Offline
          </Button>
          <Button
            onClick={simulateOnline}
            size="sm"
            className="text-xs px-2 py-1"
            variant="outline"
          >
            Go Online
          </Button>
        </div>

        <Button
          onClick={testConnection}
          size="sm"
          className="text-xs px-2 py-1 w-full"
        >
          Test Connection
        </Button>

        <Button
          onClick={toggleVisibility}
          size="sm"
          className="text-xs px-2 py-1 w-full bg-gray-100 hover:bg-gray-200 text-gray-700"
        >
          Hide Controls
        </Button>
      </div>
    </div>
  );
};

export default OfflineTestControls;

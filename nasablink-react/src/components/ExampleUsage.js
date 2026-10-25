// Example: Using environment utilities in other components

import React from 'react';
import { shouldShowTestControls, isLocalhost, isDevelopment } from '../utils/environment';

const SomeComponent = () => {
  // Show debug info only in development or localhost
  const showDebug = shouldShowTestControls();

  // Or check specific conditions
  const isLocalDev = isDevelopment() && isLocalhost();

  return (
    <div>
      {showDebug && (
        <div className="debug-panel">
          <h4>Debug Information</h4>
          <p>Local Development: {isLocalDev ? 'Yes' : 'No'}</p>
        </div>
      )}
      {/* Your component content */}
    </div>
  );
};

export default SomeComponent;

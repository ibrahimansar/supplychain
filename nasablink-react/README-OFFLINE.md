# Offline Screen Implementation

## Overview
The offline screen provides a user-friendly interface when users lose internet connectivity or encounter network errors. It includes interactive features to help users troubleshoot and reconnect.

## Features

### 🔍 **Smart Connectivity Detection**
- Uses `navigator.onLine` API for basic detection
- Performs actual connectivity tests by making small requests
- Monitors connection quality (Excellent, Good, Fair, Poor)
- Periodic connectivity checks (30s when online, 5s when offline)

### 🎨 **Interactive Offline Screen**
- Full-screen overlay with professional design
- Animated connection status indicator
- Real-time connection quality display
- Retry counter and attempt tracking
- Helpful troubleshooting tips

### 🔄 **Reconnection Features**
- "Test Connection" button with loading state
- Automatic reconnection detection
- Success notification with connection quality
- Page refresh and navigation options

### 📱 **User Experience**
- Non-intrusive reconnection notifications
- Clear visual feedback for all actions
- Responsive design for all screen sizes
- Accessibility-friendly interactions

## Usage

### Basic Implementation
```javascript
import OfflineScreen from './components/OfflineScreen';

// Add to your main App component
function App() {
  return (
    <div>
      <OfflineScreen />
      {/* Your app content */}
    </div>
  );
}
```

### Advanced Usage with Custom Hooks
```javascript
import { useConnectivity } from './hooks/useConnectivity';

function MyComponent() {
  const { isOnline, connectionQuality, testConnectivity } = useConnectivity();

  const handleCustomAction = async () => {
    if (!isOnline) {
      // Handle offline state
      return;
    }
    // Proceed with online action
  };

  return (
    <div>
      {/* Your component content */}
    </div>
  );
}
```

## Components

### `OfflineScreen`
Main offline screen component that automatically shows/hides based on connectivity.

### `useConnectivity`
Advanced hook that provides:
- `isOnline`: Boolean indicating online status
- `connectionQuality`: 'excellent' | 'good' | 'fair' | 'poor' | 'offline'
- `lastOnline`: Date of last successful connection
- `testConnectivity()`: Function to manually test connection

### `useOnlineStatus` (Legacy)
Basic hook for simple online/offline detection.

## API Integration

The offline screen integrates with the existing error handling system:

```javascript
// API service automatically triggers offline screen for network errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'NETWORK_ERROR') {
      // Offline screen will automatically show
    }
    return Promise.reject(error);
  }
);
```

## Testing

### Simulate Offline Mode
```javascript
// In browser DevTools Console
// Go offline
window.dispatchEvent(new Event('offline'));

// Go online
window.dispatchEvent(new Event('online'));
```

### Test Controls Visibility

The offline test controls are now controlled by the environment utilities:

#### Automatic Detection
- ✅ **Development Mode**: Always visible (`NODE_ENV === 'development'`)
- ✅ **Localhost**: Visible when running on localhost/127.0.0.1
- ✅ **URL Parameter**: Add `?showOfflineTest=true` to any URL
- ✅ **LocalStorage**: Set `localStorage.setItem('showOfflineTest', 'true')`

#### Console Commands (Development Only)
```javascript
// Show offline test controls
window.OfflineTestUtils.show()

// Hide offline test controls
window.OfflineTestUtils.hide()

// Get environment information
window.OfflineTestUtils.info()

// Enable/disable permanently
window.OfflineTestUtils.enable()
window.OfflineTestUtils.disable()
```

#### Using Environment Utilities
```javascript
import { shouldShowOfflineTestControls, getEnvironmentInfo } from './utils/environment';

// Check if controls should be visible
const showControls = shouldShowOfflineTestControls();

// Get detailed environment info
const env = getEnvironmentInfo();
console.log(env); // { isDevelopment, isLocalhost, hostname, ... }
```

### Manual Testing URLs
```
http://localhost:3000/?showOfflineTest=true
http://localhost:3000/trees?showOfflineTest=true
https://yourdomain.com/?showOfflineTest=true
```

## Customization

### Styling
The offline screen uses Tailwind CSS classes and can be customized by modifying the component styles.

### Behavior
You can customize the behavior by modifying the `useConnectivity` hook:
- Change check intervals
- Modify connection quality thresholds
- Add custom connectivity tests

### Content
Update the troubleshooting tips and messages in the `OfflineScreen` component to match your app's needs.

## Environment Utilities

The `src/utils/environment.js` file provides centralized environment detection and test control management:

### Available Functions

```javascript
import {
  isDevelopment,
  isLocalhost,
  shouldShowTestControls,
  shouldShowOfflineTestControls,
  enableTestControls,
  disableTestControls,
  enableOfflineTestControls,
  disableOfflineTestControls,
  getEnvironmentInfo
} from './utils/environment';

// Check environment
isDevelopment() // true in development mode
isLocalhost()   // true when running on localhost

// Check if test controls should be visible
shouldShowTestControls()
shouldShowOfflineTestControls()

// Control visibility
enableTestControls()
disableTestControls()
enableOfflineTestControls()
disableOfflineTestControls()

// Get environment information
getEnvironmentInfo() // Returns detailed env object
```

### Usage in Components

```javascript
import { shouldShowOfflineTestControls } from '../utils/environment';

const MyComponent = () => {
  if (!shouldShowOfflineTestControls()) {
    return null; // Hide component
  }

  return <div>Test controls visible</div>;
};
```

## Best Practices

1. **Don't block user interaction** - Allow users to navigate app history
2. **Provide clear actions** - Give users multiple ways to retry
3. **Show connection quality** - Help users understand their connection status
4. **Test regularly** - Use the periodic checks to detect reconnection
5. **Handle edge cases** - Some networks may report online but not work properly

## Troubleshooting

### Screen doesn't show
- Check that `OfflineScreen` is included in your App component
- Verify the `useConnectivity` hook is working
- Test with browser DevTools network throttling

### False positives
- The system performs actual connectivity tests, not just browser reports
- Check network tab in DevTools for failed test requests
- Adjust connection quality thresholds if needed

### Performance issues
- Reduce check intervals in production
- The component only renders when offline, so performance impact is minimal

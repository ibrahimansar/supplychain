import { useState, useEffect, useCallback } from 'react';

export function useConnectivity() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionQuality, setConnectionQuality] = useState('unknown');
  const [lastOnline, setLastOnline] = useState(null);
  const [wasOffline, setWasOffline] = useState(false);

  // Test actual connectivity by making a small request
  const testConnectivity = useCallback(async () => {
    try {
      const startTime = Date.now();
      const response = await fetch(`${process.env.PUBLIC_URL}/favicon.ico`, {
        method: 'HEAD',
        cache: 'no-cache'
      });
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      if (response.ok) {
        // Determine connection quality based on response time
        if (responseTime < 500) {
          setConnectionQuality('excellent');
        } else if (responseTime < 1000) {
          setConnectionQuality('good');
        } else if (responseTime < 2000) {
          setConnectionQuality('fair');
        } else {
          setConnectionQuality('poor');
        }
        return true;
      }
    } catch (error) {
      setConnectionQuality('offline');
      return false;
    }
    return false;
  }, []);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      setLastOnline(new Date());
      setWasOffline(true);

      // Test actual connectivity
      const isActuallyOnline = await testConnectivity();
      if (!isActuallyOnline) {
        setIsOnline(false);
        return;
      }

      // Auto-clear the "was offline" flag after 3 seconds
      setTimeout(() => setWasOffline(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setConnectionQuality('offline');
      setWasOffline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic connectivity check - DISABLED to prevent excessive API calls
    // This was causing unlimited retries when APIs fail
    // const interval = setInterval(async () => {
    //   const actuallyOnline = await testConnectivity();
    //   if (navigator.onLine !== actuallyOnline) {
    //     if (actuallyOnline) {
    //       handleOnline();
    //     } else {
    //       handleOffline();
    //     }
    //   }
    // }, isOnline ? 30000 : 5000);

    // Initial connectivity test
    testConnectivity();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      // clearInterval(interval); // Disabled - no interval created
    };
  }, [isOnline, testConnectivity]);

  return {
    isOnline,
    wasOffline,
    connectionQuality,
    lastOnline,
    testConnectivity
  };
}

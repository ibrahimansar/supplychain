import { useState, useEffect } from 'react';

const VAPID_PUBLIC_KEY = process.env.REACT_APP_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function usePushNotifications() {
  const [supported, setSupported] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [permission, setPermission] = useState('default');

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!supported) {
      return { success: false, error: 'Push notifications not supported' };
    }

    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);

      if (permission === 'granted') {
        return { success: true };
      } else {
        return { success: false, error: 'Permission denied' };
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return { success: false, error: error.message };
    }
  };

  const subscribe = async () => {
    if (!supported || permission !== 'granted') {
      return { success: false, error: 'Permission not granted' };
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        setSubscription(existingSubscription);
        return { success: true, subscription: existingSubscription };
      }

      if (!VAPID_PUBLIC_KEY) {
        console.warn('VAPID public key not configured');
      }

      const newSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: VAPID_PUBLIC_KEY ? urlBase64ToUint8Array(VAPID_PUBLIC_KEY) : undefined
      });

      setSubscription(newSubscription);

      // Send subscription to backend
      await sendSubscriptionToBackend(newSubscription);

      return { success: true, subscription: newSubscription };
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      return { success: false, error: error.message };
    }
  };

  const unsubscribe = async () => {
    if (!subscription) {
      return { success: true };
    }

    try {
      await subscription.unsubscribe();
      
      // Remove subscription from backend
      await removeSubscriptionFromBackend(subscription);
      
      setSubscription(null);
      return { success: true };
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      return { success: false, error: error.message };
    }
  };

  const sendSubscriptionToBackend = async (subscription) => {
    try {
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(subscription.toJSON())
      });

      if (!response.ok) {
        throw new Error('Failed to save subscription to server');
      }
    } catch (error) {
      console.error('Error sending subscription to backend:', error);
    }
  };

  const removeSubscriptionFromBackend = async (subscription) => {
    try {
      const response = await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ endpoint: subscription.endpoint })
      });

      if (!response.ok) {
        throw new Error('Failed to remove subscription from server');
      }
    } catch (error) {
      console.error('Error removing subscription from backend:', error);
    }
  };

  return {
    supported,
    permission,
    subscription,
    requestPermission,
    subscribe,
    unsubscribe
  };
}

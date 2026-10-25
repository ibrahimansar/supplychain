import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { notificationAPI } from '../services/api';

const NotificationContext = createContext(null);

const POLL_INTERVAL = 60_000; // 60 seconds

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.notifications)) return data.notifications;
  return [];
}

export function NotificationProvider({ children }) {
  const { authenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState(null);
  const pollRef = useRef(null);

  // Fetch unread count (lightweight poll)
  const fetchUnreadCount = useCallback(async () => {
    if (!authenticated) return;
    try {
      const res = await notificationAPI.getUnreadCount();
      const count = Number(res?.data?.count);
      setUnreadCount(Number.isFinite(count) ? count : 0);
    } catch (_) {
      // Silently fail — don't break the app for a badge
    }
  }, [authenticated]);

  // Fetch full notification list
  const fetchNotifications = useCallback(async () => {
    if (!authenticated) return;
    setLoading(true);
    setListError(null);
    try {
      const res = await notificationAPI.getNotifications(50);
      const list = normalizeList(res?.data);
      setNotifications(list);
      // Keep badge in sync with list when we have authoritative data
      const unreadFromList = list.filter((n) => !n.read).length;
      setUnreadCount(unreadFromList);
    } catch (err) {
      setListError(err?.response?.data?.message || 'Failed to load notifications');
      // Keep existing list if any; don't wipe on transient errors
    } finally {
      setLoading(false);
    }
  }, [authenticated]);

  // Poll unread count when authenticated
  useEffect(() => {
    if (!authenticated) {
      setUnreadCount(0);
      setNotifications([]);
      setListError(null);
      return;
    }

    fetchUnreadCount();
    pollRef.current = setInterval(fetchUnreadCount, POLL_INTERVAL);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [authenticated, fetchUnreadCount]);

  // When drawer opens, fetch full list
  const openDrawer = useCallback(() => {
    setIsOpen(true);
    fetchNotifications();
  }, [fetchNotifications]);

  const closeDrawer = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggleDrawer = useCallback(() => {
    setIsOpen(prev => {
      if (!prev) fetchNotifications();
      return !prev;
    });
  }, [fetchNotifications]);

  const markAsRead = useCallback(async (id) => {
    try {
      await notificationAPI.markAsRead(id);
      setNotifications(prev => prev.map(n =>
        n.id === id ? { ...n, read: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (_) {}
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationAPI.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (_) {}
  }, []);

  const deleteNotification = useCallback(async (id) => {
    try {
      const n = notifications.find(n => n.id === id);
      await notificationAPI.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (n && !n.read) setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (_) {}
  }, [notifications]);

  const clearAll = useCallback(async () => {
    try {
      await notificationAPI.clearAll();
      setNotifications([]);
      setUnreadCount(0);
    } catch (_) {}
  }, []);

  const value = {
    notifications,
    unreadCount,
    isOpen,
    loading,
    listError,
    openDrawer,
    closeDrawer,
    toggleDrawer,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    refresh: fetchNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export default NotificationProvider;

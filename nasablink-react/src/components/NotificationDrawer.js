import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bell, X, Check, AlertCircle, UserPlus, FileText, TreePine, Link2, ShieldAlert, Info } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';

function getNotificationIcon(type) {
  const cls = 'h-5 w-5';
  switch (type) {
    case 'MEMBER_JOINED':
      return <UserPlus className={`${cls} text-emerald-500`} />;
    case 'APPLICATION_SUBMITTED':
      return <FileText className={`${cls} text-orange-500`} />;
    case 'APPLICATION_APPROVED':
      return <Check className={`${cls} text-green-500`} />;
    case 'APPLICATION_REJECTED':
      return <AlertCircle className={`${cls} text-red-500`} />;
    case 'CONNECTION_REQUESTED':
      return <Link2 className={`${cls} text-blue-500`} />;
    case 'CONNECTION_APPROVED':
      return <Link2 className={`${cls} text-green-500`} />;
    case 'CONNECTION_REJECTED':
      return <Link2 className={`${cls} text-red-400`} />;
    case 'ROLE_CHANGED':
      return <ShieldAlert className={`${cls} text-purple-500`} />;
    case 'REMOVED_FROM_TREE':
      return <TreePine className={`${cls} text-red-500`} />;
    default:
      return <Info className={`${cls} text-blue-500`} />;
  }
}

function formatRelativeTime(timestamp) {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function groupByDate(notifications) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const groups = { today: [], earlier: [] };
  for (const n of notifications) {
    const d = n?.createdAt != null ? new Date(n.createdAt) : null;
    const valid = d && !Number.isNaN(d.getTime());
    if (valid && d >= today) {
      groups.today.push(n);
    } else {
      // Invalid / missing timestamps still show under Earlier (never drop them)
      groups.earlier.push(n);
    }
  }
  return groups;
}

export default function NotificationDrawer() {
  const { authenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    isOpen,
    loading,
    listError,
    closeDrawer,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    refresh,
  } = useNotifications();

  // Hide on landing page and login page
  const hiddenPaths = ['/', '/login'];
  if (!authenticated || hiddenPaths.includes(location.pathname)) return null;

  const groups = groupByDate(Array.isArray(notifications) ? notifications : []);

  const handleNotificationClick = async (n) => {
    if (!n.read) await markAsRead(n.id);
    if (n.link) {
      closeDrawer();
      navigate(n.link);
    }
  };

  // Bell lives in the top navbar; this component only renders the drawer panel.
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[3000] flex justify-end print:hidden" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-slate-900/30 backdrop-blur-[2px]"
            onClick={closeDrawer}
            aria-hidden="true"
          />

          <div className="relative w-full max-w-sm bg-white shadow-[0_0_60px_-12px_rgba(15,23,42,0.35)] flex flex-col h-full animate-slide-in-right border-s border-slate-200/80">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <h2 className="text-[15px] font-semibold text-slate-900 tracking-tight">Notifications</h2>
                {unreadCount > 0 && (
                  <p className="text-[11px] text-slate-400 mt-0.5">{unreadCount} unread</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {notifications.length > 0 && (
                  <button
                    onClick={clearAll}
                    className="text-xs font-medium text-slate-500 hover:text-slate-800 px-2 py-1 rounded-lg hover:bg-slate-100"
                  >
                    Clear all
                  </button>
                )}
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs font-medium text-teal-700 hover:text-teal-800 px-2 py-1 rounded-lg hover:bg-teal-50"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={closeDrawer}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {loading && notifications.length === 0 ? (
                <div className="px-4 py-12 text-center text-gray-400">
                  <div className="animate-pulse">Loading...</div>
                </div>
              ) : listError && notifications.length === 0 ? (
                <div className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                  <AlertCircle className="h-10 w-10 mx-auto mb-3 text-amber-500 opacity-80" />
                  <p className="text-sm mb-3">{listError}</p>
                  <button
                    type="button"
                    onClick={refresh}
                    className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    Try again
                  </button>
                </div>
              ) : notifications.length === 0 ? (
                <div className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                  <Bell className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">You&apos;re all caught up</p>
                  {unreadCount > 0 && (
                    <p className="text-xs mt-2 text-amber-600 dark:text-amber-400">
                      Badge shows {unreadCount} unread — refresh if items don&apos;t appear.
                    </p>
                  )}
                </div>
              ) : (
                <>
                  {groups.today.length > 0 && (
                    <NotificationGroup
                      label="Today"
                      items={groups.today}
                      onClick={handleNotificationClick}
                      onDelete={deleteNotification}
                    />
                  )}
                  {groups.earlier.length > 0 && (
                    <NotificationGroup
                      label="Earlier"
                      items={groups.earlier}
                      onClick={handleNotificationClick}
                      onDelete={deleteNotification}
                    />
                  )}
                </>
              )}
            </div>
          </div>
      </div>
    </>
  );
}

function NotificationGroup({ label, items, onClick, onDelete }) {
  return (
    <div>
      <div className="px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 sticky top-0">
        {label}
      </div>
      <ul className="divide-y divide-gray-100 dark:divide-gray-800">
        {items.map((n) => (
          <li
            key={n.id}
            className={`group px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors ${
              !n.read ? 'bg-blue-50/40 dark:bg-blue-900/10' : ''
            }`}
            onClick={() => onClick(n)}
          >
            <div className="flex gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {getNotificationIcon(n.type)}
              </div>
              <div className="flex-1 min-w-0">
                {n.treeName && (
                  <span className="inline-block mb-1 px-1.5 py-0.5 text-[10px] font-medium bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded">
                    {n.treeName}
                  </span>
                )}
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm font-medium ${
                    !n.read ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'
                  }`}>
                    {n.title}
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(n.id);
                    }}
                    className="flex-shrink-0 p-0.5 text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Remove"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{n.message}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{formatRelativeTime(n.createdAt)}</p>
              </div>
              {!n.read && (
                <div className="flex-shrink-0 mt-2">
                  <span className="h-2 w-2 bg-blue-500 rounded-full block" />
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

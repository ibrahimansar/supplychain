import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useLocation, useNavigate, NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { treeAPI, meAPI } from '../services/api';
import ConfirmDialog from './ui/ConfirmDialog';
import Avatar from './ui/Avatar';
import Logo from './Logo';
import { useI18n } from '../i18n/I18nContext';
import {
  Settings,
  Trees,
  Clock3,
  FileStack,
  Compass,
  CircleHelp,
  CreditCard,
  Shield,
  LogOut,
  ChevronDown,
  Bell,
  Mail,
  DoorOpen,
} from 'lucide-react';
import RoleBadge from './ui/RoleBadge';
import Toast from './ui/Toast';
import { useDataStore } from '../contexts/DataStoreContext';
import { useNotifications } from '../contexts/NotificationContext';

const navTabClass = ({ isActive }) =>
  [
    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors whitespace-nowrap',
    isActive
      ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80'
      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60',
  ].join(' ');

const Navbar = () => {
  const { t } = useI18n();
  const { authenticated } = useAuth();
  const location = useLocation();
  const hideNavOnLogin = location.pathname === '/login';
  const [subscription, setSubscription] = useState(null);
  const [currentTree, setCurrentTree] = useState(null);
  const [myRole, setMyRole] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!authenticated) return;
    meAPI.getSubscription().then((res) => setSubscription(res.data)).catch(() => setSubscription(null));
  }, [authenticated]);

  useEffect(() => {
    const m = location.pathname.match(/^\/trees\/([^/]+)(?:\/.*)?$/);
    const treeId = m ? m[1] : null;
    let cancelled = false;
    async function load() {
      if (!treeId) {
        setCurrentTree(null);
        setMyRole(null);
        return;
      }
      try {
        const res = await treeAPI.getTreeInfo(treeId);
        if (!cancelled) {
          setCurrentTree({ id: res.data.id, name: res.data.name, treeType: res.data.treeType });
          setMyRole(res.data.role);
        }
      } catch (_) {
        if (!cancelled) {
          setCurrentTree(null);
          setMyRole(null);
        }
      }
    }
    load();
    const handleTreeTypeChanged = (e) => {
      if (e.detail.treeId === treeId && !cancelled) load();
    };
    window.addEventListener('treeTypeChanged', handleTreeTypeChanged);
    return () => {
      cancelled = true;
      window.removeEventListener('treeTypeChanged', handleTreeTypeChanged);
    };
  }, [location.pathname]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const inTree = Boolean(currentTree?.id);
  const base = inTree ? `/trees/${currentTree.id}` : null;
  const isAdminPath = location.pathname.includes('/admin');

  return (
    <nav className="fixed top-0 inset-x-0 z-50 print-hide border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto w-full max-w-none px-3 sm:px-4 lg:px-5 xl:px-6">
        <div className="flex h-14 sm:h-16 items-center gap-3">
          {/* Brand + context */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Link
              to={authenticated ? '/trees' : '/'}
              className="flex items-center gap-2 shrink-0"
            >
              <Logo size={30} className="rounded-lg shadow-sm" />
              <span className="hidden sm:inline text-[15px] font-semibold tracking-tight text-slate-900">
                {t('nav.brand', 'NasabLink')}
              </span>
              {subscription?.status === 'PLUS' && (
                <span className="hidden sm:inline text-[10px] font-semibold tracking-wide text-teal-700 bg-teal-50 border border-teal-100 px-1.5 py-0.5 rounded-md">
                  PLUS
                </span>
              )}
            </Link>

            {authenticated && inTree && (
              <>
                <span className="hidden md:block h-4 w-px bg-slate-200" aria-hidden />
                <div className="hidden md:flex items-center gap-1.5 min-w-0 text-[13px]">
                  <Link
                    to="/trees"
                    className="text-slate-500 hover:text-slate-800 transition-colors shrink-0"
                  >
                    {t('nav.my_trees', 'My Trees')}
                  </Link>
                  <span className="text-slate-300">/</span>
                  <span className="font-medium text-slate-900 truncate max-w-[160px] lg:max-w-[220px]" title={currentTree.name}>
                    {currentTree.name}
                  </span>
                  {myRole && (
                    <span className="ms-1 shrink-0">
                      <RoleBadge role={myRole} />
                    </span>
                  )}
                </div>
              </>
            )}

            {/* Primary workspace tabs */}
            {!hideNavOnLogin && authenticated && (
              <div className="hidden md:flex items-center ms-1 min-w-0">
                {inTree ? (
                  <div className="flex items-center gap-0.5 rounded-xl bg-slate-100/90 p-1">
                    <NavLink to={base} end className={navTabClass}>
                      <Trees className="h-3.5 w-3.5 opacity-70" />
                      {t('nav.trees', 'Tree')}
                    </NavLink>
                    <NavLink to={`${base}/timeline`} className={navTabClass}>
                      <Clock3 className="h-3.5 w-3.5 opacity-70" />
                      {t('nav.timeline', 'Timeline')}
                    </NavLink>
                    {currentTree?.treeType === 'ADVANCED' && (
                      <NavLink to={`${base}/documents`} className={navTabClass}>
                        <FileStack className="h-3.5 w-3.5 opacity-70" />
                        {t('nav.documents', 'Documents')}
                      </NavLink>
                    )}
                    {myRole === 'ADMIN' && (
                      <NavLink
                        to={`${base}/admin`}
                        className={({ isActive }) =>
                          navTabClass({ isActive: isActive || isAdminPath })
                        }
                      >
                        <Settings className="h-3.5 w-3.5 opacity-70" />
                        {t('nav.manage', 'Manage')}
                      </NavLink>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-0.5 rounded-xl bg-slate-100/90 p-1">
                    <NavLink to="/trees" className={navTabClass}>
                      <Trees className="h-3.5 w-3.5 opacity-70" />
                      {t('nav.my_trees', 'My Trees')}
                    </NavLink>
                    <NavLink to="/explore" className={navTabClass}>
                      <Compass className="h-3.5 w-3.5 opacity-70" />
                      {t('nav.explore', 'Explore')}
                    </NavLink>
                    <NavLink to="/help" className={navTabClass}>
                      <CircleHelp className="h-3.5 w-3.5 opacity-70" />
                      {t('nav.help', 'Help')}
                    </NavLink>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right utilities */}
          <div className="flex items-center gap-1 shrink-0">
            {!hideNavOnLogin && authenticated && <NotificationBell />}
            {!hideNavOnLogin && (
              <button
                type="button"
                className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
                aria-label="Open menu"
                aria-expanded={mobileOpen}
                onClick={() => setMobileOpen((v) => !v)}
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {mobileOpen ? <path d="M6 18L18 6M6 6l12 12" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
                </svg>
              </button>
            )}
            {!hideNavOnLogin && <ProfileMenu subscription={subscription} treeContext={{ currentTree, myRole }} />}
          </div>
        </div>
      </div>

      {/* Mobile sheet */}
      {!hideNavOnLogin && mobileOpen && (
        <div className="md:hidden border-t border-slate-200/80 bg-white/95 backdrop-blur-xl">
          <div className="px-3 py-3 space-y-1">
            {inTree && (
              <div className="px-3 pb-2 mb-1 border-b border-slate-100">
                <p className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">Workspace</p>
                <p className="text-sm font-semibold text-slate-900 truncate">{currentTree.name}</p>
              </div>
            )}
            {inTree ? (
              <>
                <MobileLink to={base} end onNavigate={() => setMobileOpen(false)} icon={Trees} label={t('nav.trees', 'Tree')} />
                <MobileLink to={`${base}/timeline`} onNavigate={() => setMobileOpen(false)} icon={Clock3} label={t('nav.timeline', 'Timeline')} />
                {currentTree?.treeType === 'ADVANCED' && (
                  <MobileLink to={`${base}/documents`} onNavigate={() => setMobileOpen(false)} icon={FileStack} label={t('nav.documents', 'Documents')} />
                )}
                {myRole === 'ADMIN' && (
                  <MobileLink to={`${base}/admin`} onNavigate={() => setMobileOpen(false)} icon={Settings} label={t('nav.manage', 'Manage')} />
                )}
                <div className="my-2 border-t border-slate-100" />
                <MobileLink to="/trees" onNavigate={() => setMobileOpen(false)} icon={Trees} label={t('nav.my_trees', 'My Trees')} />
              </>
            ) : (
              authenticated && (
                <>
                  <MobileLink to="/trees" onNavigate={() => setMobileOpen(false)} icon={Trees} label={t('nav.my_trees', 'My Trees')} />
                  <MobileLink to="/explore" onNavigate={() => setMobileOpen(false)} icon={Compass} label={t('nav.explore', 'Explore')} />
                  <MobileLink to="/help" onNavigate={() => setMobileOpen(false)} icon={CircleHelp} label={t('nav.help', 'Help')} />
                </>
              )
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

function MobileLink({ to, end, icon: Icon, label, onNavigate }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) =>
        [
          'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
          isActive ? 'bg-teal-50 text-teal-800' : 'text-slate-700 hover:bg-slate-50',
        ].join(' ')
      }
    >
      <Icon className="h-4 w-4 opacity-70" />
      {label}
    </NavLink>
  );
}

function NotificationBell() {
  const { unreadCount, toggleDrawer, isOpen } = useNotifications();
  return (
    <button
      type="button"
      onClick={toggleDrawer}
      className={`relative inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
        isOpen ? 'bg-teal-50 text-teal-700' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
      }`}
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
    >
      <Bell className="h-4.5 w-4.5 h-[18px] w-[18px]" />
      {unreadCount > 0 && (
        <span className="absolute top-1 end-1 min-w-[16px] h-4 px-1 flex items-center justify-center text-[10px] font-bold text-white bg-rose-500 rounded-full ring-2 ring-white">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}

const ProfileMenu = ({ subscription, treeContext }) => {
  const { user, authenticated, logout } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const { removeTree, invalidateTrees } = useDataStore();
  const [open, setOpen] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState(null);
  const ref = useRef(null);
  const location = useLocation();
  const [isOwner, setIsOwner] = useState(false);
  const [myRole, setMyRole] = useState(null);

  const currentTreeId = treeContext?.currentTree?.id || null;
  const roleFromNav = treeContext?.myRole || null;

  const formattedExpiry = useMemo(() => {
    if (!subscription?.expiry) return null;
    try {
      return new Date(subscription.expiry).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch (_err) {
      return subscription.expiry;
    }
  }, [subscription]);

  useEffect(() => {
    const onClick = (e) => {
      if (open && ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!currentTreeId || !user?.id) {
      setIsOwner(false);
      setMyRole(roleFromNav);
      return;
    }
    setMyRole(roleFromNav);
    treeAPI
      .getMembers(currentTreeId)
      .then((res) => {
        const me = (res.data || []).find((m) => m.userId === user.id);
        setIsOwner(!!me?.isOwner);
        setMyRole(me?.role || roleFromNav || null);
      })
      .catch(() => {
        setIsOwner(false);
      });
  }, [currentTreeId, user, roleFromNav]);

  const handleLeaveTree = async () => {
    if (!currentTreeId) return;
    setLeaving(true);
    setLeaveError(null);
    try {
      await treeAPI.leaveTree(currentTreeId);
      removeTree(currentTreeId);
      invalidateTrees();
      setShowLeaveDialog(false);
      setOpen(false);
      navigate('/trees');
    } catch (err) {
      const code = err?.response?.data?.error;
      const msg =
        code === 'CANNOT_LEAVE_AS_OWNER'
          ? t('common.leave_tree_owner_error', 'Transfer ownership before leaving this tree')
          : err?.response?.data?.message || t('common.leave_tree_error', 'Failed to leave tree');
      setLeaveError(msg);
      setShowLeaveDialog(false);
      clearTimeout(handleLeaveTree._t);
      handleLeaveTree._t = setTimeout(() => setLeaveError(null), 4000);
    } finally {
      setLeaving(false);
    }
  };

  const go = (path) => {
    setOpen(false);
    navigate(path);
  };

  if (!authenticated) {
    return (
      <Link
        to="/login"
        className="inline-flex items-center h-9 px-3.5 rounded-lg text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 transition-colors"
      >
        {t('nav.login', 'Login')}
      </Link>
    );
  }

  const canLeave = myRole && !isOwner && currentTreeId;

  return (
    <div className="relative" ref={ref} data-profile-dropdown>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex items-center gap-2 h-9 pl-1 pr-2 rounded-xl border transition-colors ${
          open
            ? 'border-slate-300 bg-slate-50'
            : 'border-transparent hover:border-slate-200 hover:bg-slate-50'
        }`}
      >
        <Avatar src={user?.picture} name={user?.name || user?.email} size={28} />
        <span className="hidden sm:block text-[13px] font-medium text-slate-800 max-w-[120px] truncate">
          {user?.name?.split(' ')[0] || 'Account'}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute end-0 mt-2 w-[300px] rounded-2xl border border-slate-200/90 bg-white shadow-[0_16px_48px_-12px_rgba(15,23,42,0.28)] overflow-hidden animate-scale-in origin-top-right"
        >
          {/* Identity */}
          <div className="px-4 py-3.5 bg-gradient-to-br from-slate-50 to-white border-b border-slate-100">
            <div className="flex items-center gap-3">
              <Avatar src={user?.picture} name={user?.name || user?.email} size={40} />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{user?.name}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
              </div>
            </div>
            {subscription?.status === 'PLUS' && (
              <div className="mt-3 flex items-center justify-between rounded-xl bg-teal-50 border border-teal-100 px-3 py-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-teal-800">NasabLink Plus</p>
                  {formattedExpiry && (
                    <p className="text-[11px] text-teal-700/80 mt-0.5">
                      {t('nav.subscription_expires', 'Expires')}: {formattedExpiry}
                    </p>
                  )}
                </div>
                <CreditCard className="h-4 w-4 text-teal-600 opacity-70" />
              </div>
            )}
          </div>

          <div className="py-1.5">
            <MenuLabel>Workspace</MenuLabel>
            <MenuItem icon={Trees} onClick={() => go('/trees')}>
              {t('nav.trees', 'My Trees')}
            </MenuItem>
            <MenuItem icon={Compass} onClick={() => go('/explore')}>
              {t('nav.explore', 'Explore')}
            </MenuItem>
            {currentTreeId && myRole === 'ADMIN' && (
              <MenuItem icon={Settings} onClick={() => go(`/trees/${currentTreeId}/admin`)}>
                {t('nav.manage', 'Manage tree')}
              </MenuItem>
            )}

            <MenuLabel>Account</MenuLabel>
            <MenuItem icon={CreditCard} onClick={() => go('/subscription')}>
              {t('nav.subscription', 'Subscription')}
            </MenuItem>
            <MenuItem icon={Shield} onClick={() => go('/gdpr-settings')}>
              {t('nav.privacy', 'Privacy & data')}
            </MenuItem>
            <MenuItem icon={CircleHelp} onClick={() => go('/help')}>
              {t('nav.help', 'Help center')}
            </MenuItem>
            <MenuItem
              icon={Mail}
              onClick={() => {
                setOpen(false);
                window.location.href = 'mailto:nasablink@misbahi.zohodesk.com';
              }}
            >
              {t('nav.support', 'Contact support')}
            </MenuItem>

            <div className="my-1.5 mx-3 border-t border-slate-100" />

            {canLeave && (
              <MenuItem
                icon={DoorOpen}
                danger
                onClick={() => setShowLeaveDialog(true)}
              >
                {t('common.leave_tree', 'Leave this tree')}
              </MenuItem>
            )}
            <MenuItem
              icon={LogOut}
              danger
              onClick={() => {
                setOpen(false);
                logout();
              }}
            >
              {t('nav.signout', 'Sign out')}
            </MenuItem>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={showLeaveDialog}
        title={t('common.leave_tree_confirm_title', 'Leave Tree')}
        message={t(
          'common.leave_tree_confirm_message',
          "Are you sure you want to leave this tree? You'll lose access until invited again."
        )}
        confirmText={leaving ? t('common.leaving', 'Leaving...') : t('common.leave', 'Leave')}
        cancelText={t('common.cancel', 'Cancel')}
        variant="danger"
        loading={leaving}
        onCancel={() => setShowLeaveDialog(false)}
        onConfirm={handleLeaveTree}
      />
      {leaveError && <Toast msg={leaveError} type="error" />}
    </div>
  );
};

function MenuLabel({ children }) {
  return (
    <div className="px-4 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
      {children}
    </div>
  );
}

function MenuItem({ icon: Icon, children, onClick, danger }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-4 py-2 text-[13px] transition-colors ${
        danger
          ? 'text-rose-600 hover:bg-rose-50'
          : 'text-slate-700 hover:bg-slate-50'
      }`}
    >
      <Icon className={`h-4 w-4 shrink-0 ${danger ? 'opacity-80' : 'text-slate-400'}`} />
      <span className="font-medium">{children}</span>
    </button>
  );
}

export default Navbar;

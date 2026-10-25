import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getAllUsers, getAdminUserLimits, getAllTrees, saveLimit, deleteLimit, monitoringAPI, gdprAdminAPI } from '../services/api';
import { API_BASE_URL } from '../config/env';
import {
  RefreshCw,
  Users,
  TreePine,
  Shield,
  Settings,
  BarChart3,
  Search,
  Download,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronRight,
  Database,
  Activity,
  UserCheck,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  Crown,
  Ban
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Tooltip from '../components/ui/Tooltip';
import { LoadingSpinner } from '../components/ui/Loading';

const ADMIN_EMAIL = 'mdansariibrahim1@gmail.com';

// Monitoring sub-component
const MonitoringTab = () => {
  const [stats, setStats] = useState(null);
  const [dbInfo, setDbInfo] = useState(null);
  const [cacheInfo, setCacheInfo] = useState(null);
  const [errors, setErrors] = useState(null);
  const [rateLimits, setRateLimits] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [s, d, c, e, r] = await Promise.allSettled([
        monitoringAPI.getStats(),
        monitoringAPI.getDatabase(),
        monitoringAPI.getCache(),
        monitoringAPI.getErrors(),
        monitoringAPI.getRateLimits(),
      ]);
      if (s.status === 'fulfilled') setStats(s.value.data);
      if (d.status === 'fulfilled') setDbInfo(d.value.data);
      if (c.status === 'fulfilled') setCacheInfo(c.value.data);
      if (e.status === 'fulfilled') setErrors(e.value.data);
      if (r.status === 'fulfilled') setRateLimits(r.value.data);
    } catch {} finally { setLoading(false); }
  };

  const clearCache = async () => {
    setClearing(true);
    try { await monitoringAPI.clearCache(); loadAll(); } catch {} finally { setClearing(false); }
  };

  if (loading) return <div className="flex justify-center py-12"><LoadingSpinner /></div>;

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      {stats && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary-500" /> System Stats
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(stats).map(([key, value]) => (
              <div key={key} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{typeof value === 'number' ? value.toLocaleString() : String(value)}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Database */}
      {dbInfo && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Database className="w-5 h-5 text-green-500" /> Database
          </h2>
          <pre className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-xs text-gray-700 dark:text-gray-300 overflow-x-auto max-h-64">
            {JSON.stringify(dbInfo, null, 2)}
          </pre>
        </Card>
      )}

      {/* Cache */}
      {cacheInfo && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-500" /> Cache
            </h2>
            <Button variant="outline" size="sm" onClick={clearCache} disabled={clearing}>
              {clearing ? 'Clearing...' : 'Clear Cache'}
            </Button>
          </div>
          <pre className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-xs text-gray-700 dark:text-gray-300 overflow-x-auto max-h-64">
            {JSON.stringify(cacheInfo, null, 2)}
          </pre>
        </Card>
      )}

      {/* Rate Limits */}
      {rateLimits && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-yellow-500" /> Rate Limits
          </h2>
          <pre className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-xs text-gray-700 dark:text-gray-300 overflow-x-auto max-h-64">
            {JSON.stringify(rateLimits, null, 2)}
          </pre>
        </Card>
      )}

      {/* Recent Errors */}
      {errors && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" /> Recent Errors
          </h2>
          {Array.isArray(errors) && errors.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {errors.map((err, i) => (
                <div key={i} className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm">
                  <p className="font-medium text-red-700 dark:text-red-400">{err.message || err.error || JSON.stringify(err)}</p>
                  {err.timestamp && <p className="text-xs text-red-500 mt-1">{new Date(err.timestamp).toLocaleString()}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">No recent errors</p>
          )}
        </Card>
      )}

      <div className="text-center">
        <Button variant="outline" onClick={loadAll}>
          <RefreshCw className="w-4 h-4 me-2" /> Refresh All
        </Button>
      </div>
    </div>
  );
};

// GDPR Admin sub-component
const GDPRAdminTab = ({ showToast }) => {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadPending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPending = async () => {
    setLoading(true);
    try {
      const res = await gdprAdminAPI.getPendingDeletions();
      setPending(Array.isArray(res.data) ? res.data : []);
    } catch {
      showToast('Failed to load GDPR requests', 'error');
    } finally { setLoading(false); }
  };

  const processDeletions = async () => {
    setProcessing(true);
    try {
      await gdprAdminAPI.processDeletions();
      showToast('Deletions processed successfully');
      await loadPending();
    } catch {
      showToast('Failed to process deletions', 'error');
    } finally { setProcessing(false); }
  };

  if (loading) return <div className="flex justify-center py-12"><LoadingSpinner /></div>;

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-primary-500" /> Pending Account Deletions
          </h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadPending}>
              <RefreshCw className="w-3 h-3 me-1" /> Refresh
            </Button>
            {pending.length > 0 && (
              <Button size="sm" onClick={processDeletions} disabled={processing}
                className="bg-red-600 hover:bg-red-700">
                {processing ? 'Processing...' : `Process ${pending.length} Deletion${pending.length !== 1 ? 's' : ''}`}
              </Button>
            )}
          </div>
        </div>

        {pending.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No pending deletion requests</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((req, i) => (
              <div key={i} className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{req.email || req.userEmail || `User #${req.userId}`}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Requested: {req.requestedAt ? new Date(req.requestedAt).toLocaleString() : 'Unknown'}
                  </p>
                  {req.reason && <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Reason: {req.reason}</p>}
                </div>
                <span className="px-2 py-1 text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full">
                  Pending
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

const AdminConsole = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [users, setUsers] = useState([]);
  const [trees, setTrees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usersError, setUsersError] = useState('');
  const [treesError, setTreesError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState(null);

  // Pagination state
  const [usersPage, setUsersPage] = useState(1);
  const [treesPage, setTreesPage] = useState(1);
  const [userLimitsPage, setUserLimitsPage] = useState(1);
  const [treeLimitsPage, setTreeLimitsPage] = useState(1);
  const itemsPerPage = 10;

  // Totals come from the server: a single page cannot tell us how many users
  // exist, and the dashboard tiles must not restate the page size.
  const [userTotals, setUserTotals] = useState({ total: 0, activeCount: 0, totalPages: 1 });
  // The Limits tab used to be derived from the full user list; it now has its
  // own paginated endpoint.
  const [userLimitRows, setUserLimitRows] = useState([]);
  const [userLimitTotalPages, setUserLimitTotalPages] = useState(1);
  // Debounced copy of searchTerm, so typing doesn't fire a request per keystroke.
  const [userSearch, setUserSearch] = useState('');
  // Picker results are searched server-side; the table's page is not a
  // sufficient pool to choose from.
  const [limitUserResults, setLimitUserResults] = useState([]);

  // Limit editing state
  const [editingLimit, setEditingLimit] = useState(null);
  const [limitValue, setLimitValue] = useState('');
  const [limitType, setLimitType] = useState('PERSON_COUNT');
  const [limitTarget, setLimitTarget] = useState(null);
  const [limitError, setLimitError] = useState('');
  const [limitSearchTerm, setLimitSearchTerm] = useState('');

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Server-side results for the limit modal's user picker.
  useEffect(() => {
    const term = limitSearchTerm.trim();
    if (!term) { setLimitUserResults([]); return; }
    let active = true;
    const timer = setTimeout(() => {
      getAllUsers({ page: 0, size: 20, search: term })
        .then(res => { if (active) setLimitUserResults(res.data?.users ?? []); })
        .catch(() => { if (active) setLimitUserResults([]); });
    }, 300);
    return () => { active = false; clearTimeout(timer); };
  }, [limitSearchTerm]);

  // Limits tab data. Fetched only while that tab is open — it is a separate
  // query now, and the dashboard does not need it.
  useEffect(() => {
    if (activeTab !== 'limits') return;
    let active = true;
    getAdminUserLimits({ page: userLimitsPage - 1, size: itemsPerPage })
      .then(res => {
        if (!active) return;
        const payload = res.data || {};
        setUserLimitRows(Array.isArray(payload.limits) ? payload.limits : []);
        setUserLimitTotalPages(Math.max(1, payload.totalPages ?? 1));
      })
      .catch(() => { if (active) setUserLimitRows([]); });
    return () => { active = false; };
  }, [activeTab, userLimitsPage, itemsPerPage]);

  // Debounce the search box before hitting the server, and go back to page 1
  // so results aren't hidden on a page that no longer exists.
  useEffect(() => {
    const timer = setTimeout(() => {
      setUserSearch(searchTerm);
      setUsersPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Pagination helpers
  const formatDateTime = (value) => {
    if (!value) return 'N/A';
    try {
      return new Date(value).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
    } catch (_err) {
      return value;
    }
  };

  const paginateData = (data, page, itemsPerPage) => {
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
  };

  const getTotalPages = (data, itemsPerPage) => {
    return Math.ceil(data.length / itemsPerPage);
  };

  // Pagination component
  const Pagination = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) return null;

    const getVisiblePages = () => {
      const delta = 2;
      const range = [];
      const rangeWithDots = [];

      for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
        range.push(i);
      }

      if (currentPage - delta > 2) {
        rangeWithDots.push(1, '...');
      } else {
        rangeWithDots.push(1);
      }

      rangeWithDots.push(...range);

      if (currentPage + delta < totalPages - 1) {
        rangeWithDots.push('...', totalPages);
      } else if (totalPages > 1) {
        rangeWithDots.push(totalPages);
      }

      return rangeWithDots;
    };

    return (
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-gray-700 dark:text-gray-300">
          Page {currentPage} of {totalPages}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          {getVisiblePages().map((page, index) => (
            <React.Fragment key={index}>
              {page === '...' ? (
                <span className="px-3 py-2 text-gray-500 dark:text-gray-400">...</span>
              ) : (
                <Button
                  variant={currentPage === page ? 'solid' : 'outline'}
                  size="sm"
                  onClick={() => onPageChange(page)}
                  className={currentPage === page ? 'bg-primary-600 text-white' : ''}
                >
                  {page}
                </Button>
              )}
            </React.Fragment>
          ))}

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setUsersError('');
    setTreesError('');
    try {
      const [usersResult, treesResult] = await Promise.allSettled([
        getAllUsers({ page: usersPage - 1, size: itemsPerPage, search: userSearch }),
        getAllTrees()
      ]);
      if (usersResult.status === 'fulfilled') {
        const payload = usersResult.value.data || {};
        setUsers(Array.isArray(payload.users) ? payload.users : []);
        setUserTotals({
          total: payload.total ?? 0,
          activeCount: payload.activeCount ?? 0,
          totalPages: Math.max(1, payload.totalPages ?? 1),
        });
      } else {
        setUsersError('Failed to load users');
      }
      if (treesResult.status === 'fulfilled') {
        setTrees(treesResult.value.data);
      } else {
        setTreesError('Failed to load trees');
      }
      if (usersResult.status === 'rejected' || treesResult.status === 'rejected') {
        showToast('Some data failed to load', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [usersPage, userSearch, itemsPerPage]);

  useEffect(() => {
    if (!user || user.email !== ADMIN_EMAIL) return;
    loadData();
  }, [user, loadData]);

  const handleEditLimit = (target, type, value) => {
    setEditingLimit({ ...target, type });
    setLimitType(type);
    setLimitValue(value);
    setLimitTarget(target);
    setLimitError('');
  };

  const handleSaveLimit = async () => {
    try {
      let payload = {
        type: limitType,
        value: parseInt(limitValue, 10)
      };

      if (limitType === 'USER_TREE_LIMIT') {
        if (limitTarget && limitTarget.userId) {
          payload.userId = limitTarget.userId;
        } else {
          setLimitError('User must be selected for USER_TREE_LIMIT');
          return;
        }
      } else {
        if (limitTarget && limitTarget.treeId) {
          payload.treeId = limitTarget.treeId;
        } else {
          setLimitError('Tree must be selected for this limit type');
          return;
        }
      }

      await saveLimit(payload);
      setEditingLimit(null);
      setLimitValue('');
      setLimitType('PERSON_COUNT');
      setLimitTarget(null);
      setLimitError('');
      loadData();
      showToast('Limit saved successfully');
    } catch (e) {
      setLimitError('Failed to save limit');
      showToast('Failed to save limit', 'error');
    }
  };

  const handleDeleteLimit = async (id) => {
    try {
      await deleteLimit(id);
      loadData();
      showToast('Limit deleted successfully');
    } catch (e) {
      showToast('Failed to delete limit', 'error');
    }
  };

  const handleUpdateSubscription = async (userId, action) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/console/users/${userId}/subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ action })
      });

      if (!response.ok) {
        throw new Error('Failed to update subscription');
      }

      const result = await response.json();
      showToast(`Subscription updated: ${result.subscriptionStatus}`);
      loadData(); // Refresh the data
    } catch (error) {
      showToast('Failed to update subscription', 'error');
    }
  };

  // Already filtered and paged by the server — filtering again here would only
  // hide rows the server deliberately returned.
  const filteredUsers = users;

  const filteredTrees = trees.filter(tree =>
    tree.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tree.ownerEmail?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filtered lists for limit modal.
  //
  // This picker must be able to reach ANY user, not just the ones on the
  // current page of the table, so it searches the server rather than filtering
  // the loaded page.
  const filteredLimitUsers = limitUserResults;

  const filteredLimitTrees = trees.filter(tree =>
    tree.id?.toString().toLowerCase().includes(limitSearchTerm.toLowerCase()) ||
    tree.name?.toLowerCase().includes(limitSearchTerm.toLowerCase()) ||
    tree.ownerEmail?.toLowerCase().includes(limitSearchTerm.toLowerCase())
  );

  // Reset pagination when search changes
  useEffect(() => {
    setUsersPage(1);
    setTreesPage(1);
    setUserLimitsPage(1);
    setTreeLimitsPage(1);
  }, [searchTerm]);

  // Reset limit search when modal opens/closes
  useEffect(() => {
    if (editingLimit) {
      setLimitSearchTerm('');
    }
  }, [editingLimit]);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'trees', label: 'Trees', icon: TreePine },
    { id: 'limits', label: 'Limits', icon: Shield },
    { id: 'monitoring', label: 'Monitoring', icon: Activity },
    { id: 'gdpr', label: 'GDPR', icon: UserCheck },
    { id: 'system', label: 'System', icon: Settings }
  ];

  if (!user) return <div className="p-8 text-center">Loading...</div>;
  if (user.email !== ADMIN_EMAIL) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20 flex items-center justify-center">
        <Card className="max-w-md w-full p-8 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400">This page is restricted to developers only.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="pt-20 w-full px-3 sm:px-4 min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Toast Notifications */}
      {toast && (
        <div className={`fixed top-20 right-6 z-[3000] px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 ${
          toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
        }`}>
          {toast.type === 'error' ? <XCircle className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Console</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Developer Dashboard • {user.email}</p>
        </div>
        <div className="flex items-center gap-3">
          <Tooltip label="Refresh Data">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              loading={loading}
              className="p-2"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </Tooltip>
          <Tooltip label="Export Data">
            <Button variant="outline" size="sm" className="p-2">
              <Download className="h-4 w-4" />
            </Button>
          </Tooltip>
        </div>
      </div>

      <div className="flex gap-6 items-start">
        {/* Sidebar */}
        <aside className={`hidden md:block ${sidebarCollapsed ? 'w-16' : 'w-64'} flex-shrink-0 transition-all duration-300 ease-in-out sticky top-20 self-start`}>
          {sidebarCollapsed && (
            <button
              className="absolute -right-3 top-3 z-10 h-7 w-7 rounded-full bg-white dark:bg-gray-800 shadow-md border border-gray-200 dark:border-gray-600 flex items-center justify-center hover:shadow-lg transition-all"
              onClick={() => setSidebarCollapsed(false)}
            >
              <ChevronRight className="h-4 w-4 text-gray-700 dark:text-gray-300" />
            </button>
          )}

          <Card className="overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className={`text-sm font-semibold text-gray-800 dark:text-gray-200 transition-opacity duration-200 ${
                sidebarCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'
              }`}>
                Admin Panel
              </h3>
              <button
                className="p-1 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              >
                <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${
                  sidebarCollapsed ? 'rotate-180' : ''
                }`} />
              </button>
            </div>

            <div className="p-2">
              {tabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                const btn = (
                  <button
                    key={tab.id}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl mb-1 transition-all ${
                      isActive
                        ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 ring-1 ring-primary-200 dark:ring-primary-800 shadow-sm'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <Icon className={`h-5 w-5 ${isActive ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400'}`} />
                    <span className={`${sidebarCollapsed ? 'hidden' : 'block'} font-medium`}>
                      {tab.label}
                    </span>
                  </button>
                );
                return sidebarCollapsed ? <Tooltip key={tab.id} label={tab.label}>{btn}</Tooltip> : btn;
              })}
            </div>
          </Card>
        </aside>

        {/* Mobile Tabs */}
        <div className="md:hidden w-full mb-4 overflow-x-auto">
          <div className="flex items-center gap-2 pb-2">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-full border whitespace-nowrap text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 space-y-6 min-w-0">
          {loading ? (
            <Card className="p-8">
              <div className="flex items-center justify-center">
                <LoadingSpinner />
                <span className="ms-3 text-gray-600 dark:text-gray-400">Loading admin data...</span>
              </div>
            </Card>
          ) : (
            <>
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Metrics Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Users</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">{userTotals.total}</p>
                        </div>
                        <Users className="h-8 w-8 text-blue-500" />
                      </div>
                    </Card>

                    <Card className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Trees</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">{trees.length}</p>
                        </div>
                        <TreePine className="h-8 w-8 text-green-500" />
                      </div>
                    </Card>

                    <Card className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Users</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {userTotals.activeCount}
                          </p>
                        </div>
                        <UserCheck className="h-8 w-8 text-green-500" />
                      </div>
                    </Card>

                    <Card className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">System Health</p>
                          <p className="text-2xl font-bold text-green-600 dark:text-green-400">Good</p>
                        </div>
                        <Activity className="h-8 w-8 text-green-500" />
                      </div>
                    </Card>
                  </div>

                  {/* Recent Activity */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">Data refreshed successfully</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Just now</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <Database className="h-5 w-5 text-blue-500" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">System health check completed</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">2 minutes ago</p>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {/* Users Tab */}
              {activeTab === 'users' && (
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">User Management</h2>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Search className="absolute start-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search users..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="ps-10 pe-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                        />
                      </div>
                    </div>
                  </div>

                  {usersError && (
                    <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      <span className="text-red-700 dark:text-red-400">{usersError}</span>
                    </div>
                  )}

                  <div className="overflow-x-auto">
                    <table className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr className="border-b border-gray-200 dark:border-gray-600">
                          <th className="text-start py-3 px-4 font-medium text-gray-900 dark:text-white">User ID</th>
                          <th className="text-start py-3 px-4 font-medium text-gray-900 dark:text-white">Email</th>
                          <th className="text-start py-3 px-4 font-medium text-gray-900 dark:text-white">Status</th>
                          <th className="text-start py-3 px-4 font-medium text-gray-900 dark:text-white">Subscription</th>
                          <th className="text-start py-3 px-4 font-medium text-gray-900 dark:text-white">Expiry</th>
                          <th className="text-start py-3 px-4 font-medium text-gray-900 dark:text-white">Trees</th>
                          <th className="text-start py-3 px-4 font-medium text-gray-900 dark:text-white">Limits</th>
                          <th className="text-start py-3 px-4 font-medium text-gray-900 dark:text-white">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map(user => (
                          <tr key={user.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                            <td className="py-3 px-4">
                              <div className="font-mono text-sm text-gray-600 dark:text-gray-400">{user.id}</div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-medium text-gray-900 dark:text-white">{user.email}</div>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex px-2 py-0.5 text-[11px] font-medium tracking-wide rounded-md border capitalize ${
                                user.status === 'active'
                                  ? 'bg-emerald-50/80 text-emerald-800 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60'
                                  : 'bg-rose-50/80 text-rose-800 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60'
                              }`}>
                                {user.status}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex px-2 py-0.5 text-[11px] font-medium tracking-wide rounded-md border ${
                                user.subscriptionStatus === 'PLUS'
                                  ? 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/80 dark:text-slate-200 dark:border-slate-600'
                                  : user.subscriptionStatus === 'CANCELLED'
                                  ? 'bg-rose-50/80 text-rose-800 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60'
                                  : 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800/60 dark:text-gray-300 dark:border-gray-600'
                              }`}>
                                {user.subscriptionStatus || 'FREE'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                {formatDateTime(user.subscriptionExpiry)}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-gray-900 dark:text-white">{user.familyTrees?.length || 0} trees</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-gray-900 dark:text-white">{user.limits?.length || 0} limits</span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                {user.subscriptionStatus !== 'PLUS' ? (
                                  <Tooltip label="Enable PLUS">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleUpdateSubscription(user.id, 'enable_plus')}
                                      className="text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                                    >
                                      <Crown className="h-4 w-4" />
                                    </Button>
                                  </Tooltip>
                                ) : (
                                  <Tooltip label="Disable PLUS">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleUpdateSubscription(user.id, 'disable_plus')}
                                      className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                    >
                                      <Ban className="h-4 w-4" />
                                    </Button>
                                  </Tooltip>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <Pagination
                    currentPage={usersPage}
                    totalPages={userTotals.totalPages}
                    onPageChange={setUsersPage}
                  />
                </Card>
              )}

              {/* Trees Tab */}
              {activeTab === 'trees' && (
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Family Tree Management</h2>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Search className="absolute start-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search trees..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="ps-10 pe-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                        />
                      </div>
                    </div>
                  </div>

                  {treesError && (
                    <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      <span className="text-red-700 dark:text-red-400">{treesError}</span>
                    </div>
                  )}

                  <div className="overflow-x-auto">
                    <table className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr className="border-b border-gray-200 dark:border-gray-600">
                          <th className="text-start py-3 px-4 font-medium text-gray-900 dark:text-white">Tree ID</th>
                          <th className="text-start py-3 px-4 font-medium text-gray-900 dark:text-white">Tree Name</th>
                          <th className="text-start py-3 px-4 font-medium text-gray-900 dark:text-white">Owner</th>
                          <th className="text-start py-3 px-4 font-medium text-gray-900 dark:text-white">Node Limit</th>
                          <th className="text-start py-3 px-4 font-medium text-gray-900 dark:text-white">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginateData(filteredTrees, treesPage, itemsPerPage).map(tree => {
                          const nodeLimit = tree.limits?.find(l => l.type === 'PERSON_COUNT');
                          return (
                            <tr key={tree.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                              <td className="py-3 px-4">
                                <div className="font-mono text-sm text-gray-600 dark:text-gray-400">{tree.id}</div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="font-medium text-gray-900 dark:text-white">{tree.name}</div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="text-gray-600 dark:text-gray-400">{tree.ownerEmail}</div>
                              </td>
                              <td className="py-3 px-4">
                                {nodeLimit ? (
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-900 dark:text-white">{nodeLimit.value}</span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEditLimit({ treeId: tree.id }, nodeLimit.type, nodeLimit.value)}
                                    >
                                      Edit
                                    </Button>
                                  </div>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEditLimit({ treeId: tree.id }, 'PERSON_COUNT', '')}
                                  >
                                    Set Limit
                                  </Button>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <Button variant="ghost" size="sm">View</Button>
                                  <Button variant="ghost" size="sm" className="text-red-600 dark:text-red-400">Delete</Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <Pagination
                    currentPage={treesPage}
                    totalPages={getTotalPages(filteredTrees, itemsPerPage)}
                    onPageChange={setTreesPage}
                  />
                </Card>
              )}

              {/* Limits Tab */}
              {activeTab === 'limits' && (
                <div className="space-y-6">
                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Limits Management</h2>
                      <Button onClick={() => handleEditLimit({}, 'PERSON_COUNT', '')}>
                        Add New Limit
                      </Button>
                    </div>

                    {/* User Limits */}
                    <div className="mb-8">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">User-Based Limits</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                          <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr className="border-b border-gray-200 dark:border-gray-600">
                              <th className="text-start py-3 px-4 font-medium text-gray-900 dark:text-white">User</th>
                              <th className="text-start py-3 px-4 font-medium text-gray-900 dark:text-white">Type</th>
                              <th className="text-start py-3 px-4 font-medium text-gray-900 dark:text-white">Value</th>
                              <th className="text-start py-3 px-4 font-medium text-gray-900 dark:text-white">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {userLimitRows.map(row => (
                              <tr key={`${row.userId}-${row.limit.id}`} className="border-b border-gray-100 dark:border-gray-700">
                                <td className="py-3 px-4 text-gray-900 dark:text-white">{row.userEmail}</td>
                                <td className="py-3 px-4 text-gray-900 dark:text-white">{row.limit.type}</td>
                                <td className="py-3 px-4 text-gray-900 dark:text-white">{row.limit.value}</td>
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEditLimit({ userId: row.userId }, row.limit.type, row.limit.value)}
                                    >
                                      Edit
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-red-600 dark:text-red-400"
                                      onClick={() => handleDeleteLimit(row.limit.id)}
                                    >
                                      Delete
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <Pagination
                        currentPage={userLimitsPage}
                        totalPages={userLimitTotalPages}
                        onPageChange={setUserLimitsPage}
                      />
                    </div>

                    {/* Tree Limits */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Tree-Based Limits</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                          <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr className="border-b border-gray-200 dark:border-gray-600">
                              <th className="text-start py-3 px-4 font-medium text-gray-900 dark:text-white">Tree</th>
                              <th className="text-start py-3 px-4 font-medium text-gray-900 dark:text-white">Type</th>
                              <th className="text-start py-3 px-4 font-medium text-gray-900 dark:text-white">Value</th>
                              <th className="text-start py-3 px-4 font-medium text-gray-900 dark:text-white">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paginateData(
                              trees.flatMap(tree => (tree.limits || []).map(limit => ({ ...limit, tree }))),
                              treeLimitsPage,
                              itemsPerPage
                            ).map(limit => (
                              <tr key={`${limit.tree.id}-${limit.id}`} className="border-b border-gray-100 dark:border-gray-700">
                                <td className="py-3 px-4 text-gray-900 dark:text-white">{limit.tree.name}</td>
                                <td className="py-3 px-4 text-gray-900 dark:text-white">{limit.type}</td>
                                <td className="py-3 px-4 text-gray-900 dark:text-white">{limit.value}</td>
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEditLimit({ treeId: limit.tree.id }, limit.type, limit.value)}
                                    >
                                      Edit
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-red-600 dark:text-red-400"
                                      onClick={() => handleDeleteLimit(limit.id)}
                                    >
                                      Delete
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <Pagination
                        currentPage={treeLimitsPage}
                        totalPages={getTotalPages(
                          trees.flatMap(tree => (tree.limits || []).map(limit => ({ ...limit, tree }))),
                          itemsPerPage
                        )}
                        onPageChange={setTreeLimitsPage}
                      />
                    </div>
                  </Card>
                </div>
              )}

              {/* Monitoring Tab */}
              {activeTab === 'monitoring' && <MonitoringTab />}

              {/* GDPR Admin Tab */}
              {activeTab === 'gdpr' && <GDPRAdminTab showToast={showToast} />}

              {/* System Tab */}
              {activeTab === 'system' && (
                <div className="space-y-6">
                  <Card className="p-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">System Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Application Status</h3>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">Backend API</span>
                            <span className="inline-flex items-center gap-2 px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded-full">
                              <CheckCircle className="h-3 w-3" />
                              Online
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">Database</span>
                            <span className="inline-flex items-center gap-2 px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded-full">
                              <CheckCircle className="h-3 w-3" />
                              Connected
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Quick Actions</h3>
                        <div className="space-y-3">
                          <Button variant="outline" className="w-full justify-start">
                            <Database className="h-4 w-4 me-2" />
                            View Database Logs
                          </Button>
                          <Button variant="outline" className="w-full justify-start">
                            <Activity className="h-4 w-4 me-2" />
                            System Performance
                          </Button>
                          <Button variant="outline" className="w-full justify-start">
                            <Settings className="h-4 w-4 me-2" />
                            Configuration
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Limit Edit Modal */}
      {editingLimit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingLimit.value ? 'Edit' : 'Add'} Limit
              </h3>
              <button
                onClick={() => setEditingLimit(null)}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
                aria-label="Close modal"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {!editingLimit.value && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Apply to:</label>
                <div className="mb-3">
                  <div className="relative">
                    <Search className="absolute start-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by ID, name, or email..."
                      value={limitSearchTerm}
                      onChange={(e) => setLimitSearchTerm(e.target.value)}
                      className="w-full ps-10 pe-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    />
                  </div>
                </div>
                {limitType === 'USER_TREE_LIMIT' ? (
                  <select
                    value={limitTarget?.userId || ''}
                    onChange={e => setLimitTarget({ userId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="">Select User</option>
                    {filteredLimitUsers.map(u => (
                      <option key={u.id} value={u.id}>{u.email} (ID: {u.id})</option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={limitTarget?.treeId || ''}
                    onChange={e => setLimitTarget({ treeId: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="">Select Tree</option>
                    {filteredLimitTrees.map(t => (
                      <option key={t.id} value={t.id}>{t.name} (ID: {t.id}) - {t.ownerEmail}</option>
                    ))}
                  </select>
                )}
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type</label>
              <select
                value={limitType}
                onChange={e => setLimitType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="USER_TREE_LIMIT">USER_TREE_LIMIT (Max Trees Per User)</option>
                <option value="PERSON_COUNT">PERSON_COUNT (Max Nodes Per Tree)</option>
                <option value="DOCUMENT_COUNT">DOCUMENT_COUNT (Max Documents Per User)</option>
                <option value="VIEWER_LINKS">VIEWER_LINKS (Max Viewer Links Per Tree)</option>
                <option value="ADMIN">ADMIN (Max Admins Per Tree)</option>
                <option value="VERIFIER">VERIFIER (Max Verifiers Per Tree)</option>
                <option value="VIEWER">VIEWER (Max Viewers Per Tree)</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Value</label>
              <input
                type="number"
                value={limitValue}
                onChange={e => setLimitValue(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>

            {limitError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-sm text-red-700 dark:text-red-400">{limitError}</span>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={handleSaveLimit}
                disabled={
                  (limitType === 'USER_TREE_LIMIT' && !(limitTarget && limitTarget.userId)) ||
                  (limitType !== 'USER_TREE_LIMIT' && !(limitTarget && limitTarget.treeId))
                }
                className="flex-1"
              >
                Save
              </Button>
              <Button variant="outline" onClick={() => setEditingLimit(null)} className="flex-1">
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AdminConsole;

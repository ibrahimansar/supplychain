import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreHorizontal } from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import RoleBadge from '../components/ui/RoleBadge';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Toast from '../components/ui/Toast';
import { Plus, Edit as EditIcon, Star } from '../components/ui/Icons';
import Tooltip from '../components/ui/Tooltip';
import { treeAPI, meAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import { useFormSubmit } from '../hooks/useApi';
import { useDataStore } from '../contexts/DataStoreContext';
import { LoadingOverlay } from '../components/ui/Loading';
import { CardSkeleton } from '../components/ui/SkeletonLoader';
import { readLastCount, writeLastCount, STORAGE_KEYS } from '../utils/skeletonCount';
import { useLoadingPhase } from '../hooks/useDelayedLoading';
import PlanStatusBanner from '../components/PlanStatusBanner';
import useEntitlements from '../hooks/useEntitlements';

const TreeSelectorPage = () => {
  const { canCreateTree, treesUsed, treeLimit } = useEntitlements();
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [toast, setToast] = useState(null);
  const showToast = (msg, action, type = 'success') => {
    setToast({ msg, action, type });
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => setToast(null), 3000);
  };
  const navigate = useNavigate();
  const { authenticated, loading: authLoading } = useAuth();
  const { t } = useI18n();

  const { trees, isTreesStale, setTreesList, updateTreeName: storeUpdateTreeName, removeTree } = useDataStore();

  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const treesPhase = useLoadingPhase(loading || trees === null);
  const loadingRef = useRef(false);

  const [menuOpenId, setMenuOpenId] = useState(null);
  const [leaveTarget, setLeaveTarget] = useState(null);
  const [leaving, setLeaving] = useState(false);
  const menuRef = useRef(null);

  const fetchTrees = useCallback(({ background = false } = {}) => {
    if (!background) {
      setLoading(true);
      setLoadError(null);
    }
    loadingRef.current = true;
    return meAPI.getMyTrees({ background })
      .then(res => {
        const list = res.data;
        setTreesList(list);
        writeLastCount(STORAGE_KEYS.trees, Array.isArray(list) ? list.length : 0);
      })
      .catch(err => { if (!background) setLoadError(err); })
      .finally(() => { setLoading(false); loadingRef.current = false; });
  }, [setTreesList]);

  useEffect(() => {
    if (authLoading || !authenticated) return;

    if (trees !== null && !isTreesStale()) return;

    if (loadingRef.current) return;

    if (trees !== null && isTreesStale()) {
      fetchTrees({ background: true });
      return;
    }

    fetchTrees();
  }, [authenticated, authLoading, trees, isTreesStale, fetchTrees]);

  useEffect(() => {
    if (!menuOpenId) return;
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpenId(null);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpenId]);

  const { submit: renameTree, loading: renaming } = useFormSubmit(
    async (formData) => {
      const { treeId, newName, prevName } = formData;
      await treeAPI.updateTreeName(treeId, newName);
      return { treeId, newName, prevName };
    },
    {
      onSuccess: ({ treeId, newName, prevName }) => {
        storeUpdateTreeName(treeId, newName);
        showToast('Name updated', {
          label: 'Undo',
          onClick: async () => {
            storeUpdateTreeName(treeId, prevName);
            try {
              await treeAPI.updateTreeName(treeId, prevName);
            } catch (error) {
              storeUpdateTreeName(treeId, newName);
              console.error('Failed to undo rename:', error);
            }
          }
        });
      },
      onError: () => {
        showToast('Failed to rename tree', null, 'error');
      },
      showErrorToast: true
    }
  );

  const handleCardMouseDown = (e) => {
    if (e.target.closest('button, input, textarea')) return;
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 1.2;
    const ripple = document.createElement('span');
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    ripple.style.position = 'absolute';
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.borderRadius = '9999px';
    ripple.style.background = 'rgba(0,0,0,0.08)';
    ripple.style.pointerEvents = 'none';
    ripple.className = 'ripple';
    el.appendChild(ripple);
    setTimeout(() => { ripple.remove(); }, 500);
  };

  useEffect(() => {
    if (!loading) return;
    const timeout = setTimeout(() => {
      setLoading(false);
      loadingRef.current = false;
    }, 15000);
    return () => clearTimeout(timeout);
  }, [loading]);

  const startInlineEdit = (tree) => { setEditingId(tree.familyTreeId); setEditingName(tree.treeName); };
  const cancelInlineEdit = () => { setEditingId(null); setEditingName(''); };
  const commitInlineEdit = async (tree) => {
    const newName = editingName.trim();
    if (!newName || newName === tree.treeName) {
      cancelInlineEdit();
      return;
    }

    cancelInlineEdit();

    await renameTree({
      treeId: tree.familyTreeId,
      newName,
      prevName: tree.treeName
    });
  };

  const leaveConfirmMessage = leaveTarget
    ? t('common.leave_tree_confirm_named', 'Leave {{name}}? You\'ll lose access until invited again.').replace('{{name}}', leaveTarget.treeName)
    : t('common.leave_tree_confirm_message', 'Are you sure you want to leave this tree? You\'ll lose access until invited again.');

  const handleLeaveTree = async () => {
    if (!leaveTarget) return;
    setLeaving(true);
    try {
      await treeAPI.leaveTree(leaveTarget.familyTreeId);
      removeTree(leaveTarget.familyTreeId);
      meAPI.invalidateMyTrees?.();
      setLeaveTarget(null);
      showToast(t('common.leave_tree_success', 'You left the tree'));
    } catch (err) {
      const code = err?.response?.data?.error;
      const msg = code === 'CANNOT_LEAVE_AS_OWNER'
        ? t('common.leave_tree_owner_error', 'Transfer ownership before leaving this tree')
        : (err?.response?.data?.message || t('common.leave_tree_error', 'Failed to leave tree'));
      showToast(msg, null, 'error');
      setLeaveTarget(null);
    } finally {
      setLeaving(false);
    }
  };

  return (
    <>
    <div className="min-h-screen bg-slate-50 pt-20">
      <div className="mx-auto w-full max-w-none px-3 sm:px-4 lg:px-5 xl:px-6">
        <PlanStatusBanner />

        <div className="flex items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">{t('tree_selector.title')}</h1>
            <p className="text-sm text-slate-500 mt-1">{t('tree_selector.subtitle')}</p>
          </div>
          <Tooltip
            label={
              canCreateTree
                ? t('tree_selector.create')
                : `${t('tree_selector.create_blocked', 'You have reached the number of trees your plan allows. Upgrade to Plus or delete one to create another.')}${
                    treesUsed != null && treeLimit != null ? ` (${treesUsed}/${treeLimit})` : ''
                  }`
            }
            theme="brand"
          >
            {/* A disabled button cannot be hovered in some browsers, so the
                tooltip needs a wrapper that can. */}
            <span className="inline-block shrink-0">
              <Button
                variant="solid"
                onClick={() => navigate('/onboarding')}
                disabled={!canCreateTree}
                aria-disabled={!canCreateTree}
                className="rounded-xl shrink-0"
              >
                <Plus className="h-4 w-4 me-1.5" />
                <span className="hidden sm:inline">{t('tree_selector.new_tree', 'New Tree')}</span>
              </Button>
            </span>
          </Tooltip>
        </div>

        {treesPhase !== 'content' ? (
          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 ${treesPhase === 'hidden' ? 'invisible' : ''}`} aria-busy="true">
            {Array.from({ length: readLastCount(STORAGE_KEYS.trees, 3, { min: 1, max: 4 }) }).map((_, i) => (
              <div key={i} className="min-h-[120px]">
                <CardSkeleton rows={1} />
              </div>
            ))}
          </div>
        ) : loadError ? (
          <Card className="p-6 text-center">
            <div className="text-red-600 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{t('tree_selector.unable_to_load', 'Unable to Load Trees')}</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{loadError.message}</p>
            <div className="flex gap-3 justify-center">
              <Button variant="solid" onClick={() => fetchTrees()}>{t('tree_selector.try_again', 'Try Again')}</Button>
              <Button variant="outline" onClick={() => navigate('/onboarding')} disabled={!canCreateTree}>{t('tree_selector.create_new_tree', 'Create New Tree')}</Button>
            </div>
          </Card>
        ) : trees.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-12 text-center max-w-lg mx-auto">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-primary-50 dark:bg-primary-950/50 flex items-center justify-center mb-6">
              <svg className="h-8 w-8 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No family trees yet</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{t('tree_selector.empty')}</p>
            <Button variant="solid" onClick={() => navigate('/onboarding')} className="rounded-xl">{t('tree_selector.create_first')}</Button>
            <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">{t('tree_selector.need_help')} <a href="mailto:nasablink@misbahi.zohodesk.com" className="underline hover:text-primary-600 dark:hover:text-primary-400 transition-colors">nasablink@misbahi.zohodesk.com</a>.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 animate-content-in">
            {trees.map(tree => (
              <LoadingOverlay key={`${tree.familyTreeId}`} show={renaming && editingId === tree.familyTreeId}>
                <Card
                  className={`cursor-pointer group transition-all duration-200 ease-out relative ${tree.treeType === 'ADVANCED' ? 'border-2 border-primary-200 dark:border-primary-800 shadow-lg' : 'border border-gray-200 dark:border-gray-800 hover:border-primary-200 dark:hover:border-primary-700'} bg-white dark:bg-gray-900 hover:shadow-lg hover:-translate-y-0.5 rounded-2xl overflow-hidden min-h-[120px] p-6 flex flex-col justify-center`}
                  onClick={() => navigate(`/trees/${tree.familyTreeId}`)}
                  role="button"
                  tabIndex={0}
                  aria-label={`${t('tree_selector.actions.open', 'Open')} ${tree.treeName}`}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/trees/${tree.familyTreeId}`); } }}
                  onMouseDown={handleCardMouseDown}
                >
                {tree.treeType === 'ADVANCED' && (
                  <div className="absolute top-2 end-2">
                    <Star className="h-3.5 w-3.5 text-primary-500 fill-current" />
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold text-gray-900 dark:text-white text-lg leading-tight min-w-0 flex-1">
                      {editingId === tree.familyTreeId ? (
                        <input
                          type="text"
                          autoFocus
                          aria-label="Edit tree name"
                          maxLength={120}
                          className="form-input py-1 h-9 text-lg rounded-md border-gray-300 dark:border-gray-600 focus:border-primary-500 focus:ring-1 focus:ring-primary-200 w-full"
                          value={editingName}
                          onChange={(e)=>setEditingName(e.target.value)}
                          onClick={(e)=>e.stopPropagation()}
                          onKeyDown={(e)=>{ e.stopPropagation(); if (e.key==='Enter') { e.preventDefault(); commitInlineEdit(tree); } if (e.key==='Escape') { e.preventDefault(); cancelInlineEdit(); } }}
                          onBlur={()=>commitInlineEdit(tree)}
                        />
                      ) : (
                        <span className="block truncate" onDoubleClick={(e)=>{ e.stopPropagation(); startInlineEdit(tree); }}>{tree.treeName}</span>
                      )}
                    </div>
                    <div className={`flex items-center gap-1 flex-shrink-0 ${tree.treeType === 'ADVANCED' ? 'pr-5' : ''}`}>
                      {tree.role === 'ADMIN' && (
                        <Tooltip label={t('tree_selector.actions.rename', 'Rename')}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                            onClick={(e) => { e.stopPropagation(); startInlineEdit(tree); }}
                          >
                            <EditIcon className="h-4 w-4" />
                          </Button>
                        </Tooltip>
                      )}
                      {tree.isOwner === false && (
                        <div
                          className="relative"
                          ref={menuOpenId === tree.familyTreeId ? menuRef : null}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={t('common.more', 'More')}
                            aria-expanded={menuOpenId === tree.familyTreeId}
                            className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-150"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuOpenId(menuOpenId === tree.familyTreeId ? null : tree.familyTreeId);
                            }}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                          {menuOpenId === tree.familyTreeId && (
                            <div className="absolute end-0 top-full mt-1 z-20 min-w-[10rem] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg py-1">
                              <button
                                type="button"
                                className="w-full text-start px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMenuOpenId(null);
                                  setLeaveTarget(tree);
                                }}
                              >
                                {t('common.leave_tree', 'Leave Tree')}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-1">
                    {tree.role && <RoleBadge role={tree.role} />}
                  </div>
                </div>
              </Card>
              </LoadingOverlay>
            ))}
          </div>
        )}
      </div>
    </div>

    <ConfirmDialog
      open={!!leaveTarget}
      title={t('common.leave_tree_confirm_title', 'Leave Tree')}
      message={leaveConfirmMessage}
      confirmText={leaving ? t('common.leaving', 'Leaving...') : t('common.leave', 'Leave')}
      cancelText={t('common.cancel', 'Cancel')}
      variant="danger"
      onCancel={() => !leaving && setLeaveTarget(null)}
      onConfirm={handleLeaveTree}
    />

    {toast && (
      <Toast msg={toast.msg} type={toast.type || 'success'} action={toast.action} />
    )}
    </>
  );
};

export default TreeSelectorPage;

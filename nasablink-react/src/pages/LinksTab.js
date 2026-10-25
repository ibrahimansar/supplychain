import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import { CopyIcon, CheckIcon, BanIcon } from '../components/ui/CopyIcon';
import ConfirmDialog from '../components/ui/ConfirmDialog';
// LoadingSpinner removed - using ListSkeleton instead
import { TableSkeleton } from '../components/ui/SkeletonLoader';
import { useFormValidation } from '../utils/validation';
import { readLastCount, writeLastCount, scopedKey, STORAGE_KEYS } from '../utils/skeletonCount';
import { useLoadingPhase } from '../hooks/useDelayedLoading';
import { peekCachedData, treeAPI } from '../services/api';

const LinksTab = ({ treeId, showToast }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  // Seed from the last-known response so a revisit paints immediately (see RolesTab).
  const cachedLinks = useCallback(() => {
    const cached = peekCachedData(`viewers:${treeId}:links`);
    return Array.isArray(cached) ? cached : [];
  }, [treeId]);
  const [viewerLinks, setViewerLinks] = useState(cachedLinks);
  const linksPhase = useLoadingPhase(loading && viewerLinks.length === 0);
  const hasLoadedRef = useRef(false);
  const [confirmState, setConfirmState] = useState({ open: false, title: '', message: '', onConfirm: null, variant: 'danger' });
  const askConfirm = (title, message, onConfirm, variant='danger') => setConfirmState({ open: true, title, message, onConfirm, variant });
  const closeConfirm = () => setConfirmState(c => ({ ...c, open: false }));
  const [copiedLinkId, setCopiedLinkId] = useState(null);
  const [copyAnim, setCopyAnim] = useState(false);

  // Form validation
  const {
    values: formValues,
    errors: formErrors,
    touched: formTouched,
    handleChange: handleFormChange,
    handleBlur: handleFormBlur,
    validateForm,
    resetForm
  } = useFormValidation({ label: '', expiresAt: '', maxUses: '' });

  const loadData = useCallback(async () => {
    if (!hasLoadedRef.current) setLoading(true);
    try {
      const res = await treeAPI.listViewerLinks(treeId);
      const list = res.data || [];
      setViewerLinks(list);
      writeLastCount(scopedKey(STORAGE_KEYS.viewerLinks, treeId), list.length);
      hasLoadedRef.current = true;
    } catch (e) {
      if (e?.response?.status === 403) { navigate('/trees', { replace: true }); return; }
      showToast('Failed to load viewer links', 'error');
    } finally {
      setLoading(false);
    }
  }, [treeId, navigate, showToast]);

  useEffect(() => {
    hasLoadedRef.current = false;
    setViewerLinks(cachedLinks());
    setLoading(true);
    loadData();
  }, [treeId, loadData, cachedLinks]);

  const handleCopyLink = async (id, url) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLinkId(id);
      setCopyAnim(true);
      setTimeout(() => {
        setCopyAnim(false);
        setCopiedLinkId(null);
      }, 3000);
    } catch {}
  };

  const createViewerLink = async (e) => {
    e.preventDefault();

    // Validate form
    const isValid = validateForm({
      label: { validator: 'label' },
      expiresAt: { validator: 'futureDate' },
      maxUses: { validator: 'positiveNumber' }
    });

    if (!isValid) {
      showToast('Please fix the form errors', 'error');
      return;
    }

    try {
      const payload = {};
      if (formValues.label) payload.label = formValues.label;
      if (formValues.expiresAt) payload.expiresAt = new Date(formValues.expiresAt).toISOString();
      if (formValues.maxUses) payload.maxUses = parseInt(formValues.maxUses, 10);
      const res = await treeAPI.createViewerShareLink(treeId, payload);
      await loadData();
      resetForm();
      if (res.data?.urlPath) {
        navigator.clipboard?.writeText(window.location.origin + res.data.urlPath).catch(()=>{});
        showToast('Viewer link created');
      }
    } catch {
      showToast('Failed to create viewer link', 'error');
    }
  };

  const revokeLink = (id) => {
    askConfirm('Revoke Link', 'This will disable the link permanently. Continue?', async () => {
      closeConfirm();
      // The table hides revoked links, so stamping revokedAt removes the row
      // immediately. Restore the previous list if the server refuses.
      const previous = viewerLinks;
      setViewerLinks(current =>
        current.map(l => (l.id === id ? { ...l, revokedAt: new Date().toISOString() } : l)));
      try {
        await treeAPI.revokeViewerShareLink(treeId, id);
        showToast('Viewer link revoked');
        loadData(); // reconcile in the background
      } catch (e) {
        setViewerLinks(previous);
        showToast(e?.response?.data?.message || 'Failed to revoke link', 'error');
      }
    });
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Viewer Links</h2>
      </div>
      <div className="card w-full p-4 dark:bg-gray-800 dark:border-gray-700">
        <form onSubmit={createViewerLink} className="grid grid-cols-12 gap-4 items-end">
          <div className="col-span-12 md:col-span-4">
            <label className="form-label dark:text-gray-300">Label</label>
            <input
              className={`form-input dark:bg-gray-700 dark:text-white dark:border-gray-600 ${formErrors.label && formTouched.label ? 'border-red-500' : ''}`}
              value={formValues.label}
              onChange={handleFormChange('label', 'label')}
              onBlur={handleFormBlur('label')}
              placeholder="Optional label"
            />
            {formErrors.label && formTouched.label && (
              <p className="mt-1 text-sm text-red-600">{formErrors.label}</p>
            )}
          </div>
          <div className="col-span-12 md:col-span-5">
            <label className="form-label dark:text-gray-300">Expires At</label>
            <input
              className={`form-input dark:bg-gray-700 dark:text-white dark:border-gray-600 ${formErrors.expiresAt && formTouched.expiresAt ? 'border-red-500' : ''}`}
              type="datetime-local"
              value={formValues.expiresAt}
              onChange={handleFormChange('expiresAt', 'futureDate')}
              onBlur={handleFormBlur('expiresAt')}
              placeholder="Optional expiration"
            />
            {formErrors.expiresAt && formTouched.expiresAt && (
              <p className="mt-1 text-sm text-red-600">{formErrors.expiresAt}</p>
            )}
          </div>
          <div className="col-span-6 md:col-span-2">
            <label className="form-label dark:text-gray-300">Max Uses</label>
            <input
              className={`form-input dark:bg-gray-700 dark:text-white dark:border-gray-600 ${formErrors.maxUses && formTouched.maxUses ? 'border-red-500' : ''}`}
              type="number"
              min="1"
              value={formValues.maxUses}
              onChange={handleFormChange('maxUses', 'positiveNumber')}
              onBlur={handleFormBlur('maxUses')}
              placeholder="Optional"
            />
            {formErrors.maxUses && formTouched.maxUses && (
              <p className="mt-1 text-sm text-red-600">{formErrors.maxUses}</p>
            )}
          </div>
          <div className="col-span-6 md:col-span-1 flex md:justify-end">
            <Button type="submit" className="w-full md:w-auto">Create</Button>
          </div>
        </form>
      </div>

      <div className="card w-full overflow-hidden dark:bg-gray-800 dark:border-gray-700">
        {linksPhase !== 'content' ? (
          <div className={`p-3 sm:p-4 ${linksPhase === 'hidden' ? 'invisible' : ''}`} aria-busy="true">
            <TableSkeleton rows={readLastCount(scopedKey(STORAGE_KEYS.viewerLinks, treeId), 2, { min: 1, max: 6 })} columns={7} />
          </div>
        ) : (
          <div className={`overflow-x-auto p-3 sm:p-4 ${loading ? 'opacity-60' : ''} animate-content-in`}>
            <table className="w-full text-xs sm:text-sm dark:bg-gray-800">
              <thead>
              <tr className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <th className="p-2 text-start text-gray-900 dark:text-white">Label</th>
                <th className="p-2 text-start text-gray-900 dark:text-white">URL</th>
                <th className="p-2 text-start text-gray-900 dark:text-white">Created</th>
                <th className="p-2 text-start text-gray-900 dark:text-white">Expires</th>
                <th className="p-2 text-start text-gray-900 dark:text-white">Uses</th>
                <th className="p-2 text-start text-gray-900 dark:text-white">Status</th>
                <th className="p-2 text-start text-gray-900 dark:text-white">Actions</th>
              </tr>
              </thead>
              <tbody>
              {viewerLinks.filter(l => !l.revokedAt).map(l => {
                const url = window.location.origin + l.urlPath;
                const expired = !!l.expiresAt && new Date(l.expiresAt) < new Date();
                const revoked = !!l.revokedAt;
                const active = !expired && !revoked;
                return (
                  <tr key={l.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="p-2 text-gray-900 dark:text-white">{l.label || '-'}</td>
                    <td className="p-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <button
                          className={`icon-btn h-7 w-7 flex items-center justify-center rounded transition-all duration-400 ease-out border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 ${copiedLinkId === l.id && copyAnim ? 'bg-green-100 dark:bg-green-900 tilt-anim' : ''}`}
                          title={copiedLinkId === l.id && copyAnim ? 'Copied!' : 'Copy'}
                          onClick={() => handleCopyLink(l.id, url)}
                        >
                          {copiedLinkId === l.id && copyAnim ? <CheckIcon className="w-4 h-4 text-green-600" /> : <CopyIcon className="w-4 h-4 text-gray-500" />}
                          <style jsx>{`
                            .tilt-anim {
                              background: linear-gradient(105deg, #bbf7d0 0%, #d1fae5 100%);
                              animation: tiltFade 1s cubic-bezier(0.4,0,0.2,1);
                            }
                            @keyframes tiltFade {
                              0% { background-position: 0 0; opacity: 1; }
                              80% { opacity: 1; }
                              100% { background-position: 100% 100%; opacity: 0.7; }
                            }
                          `}</style>
                        </button>
                        <span
                          className="text-[11px] text-gray-500 dark:text-gray-400 ms-1 truncate block max-w-[140px] sm:max-w-[220px] md:max-w-[360px]"
                          title={url}
                        >
                          {url}
                        </span>
                      </div>
                    </td>
                    <td className="p-2 text-gray-900 dark:text-white">{l.createdAt ? new Date(l.createdAt).toLocaleString() : '-'}</td>
                    <td className="p-2 text-gray-900 dark:text-white">{l.expiresAt ? new Date(l.expiresAt).toLocaleString() : '-'}</td>
                    <td className="p-2 text-gray-900 dark:text-white">{l.useCount}{l.maxUses ? ` / ${l.maxUses}` : ''}</td>
                    <td className="p-2 text-gray-900 dark:text-white">{revoked ? 'Revoked' : expired ? 'Expired' : 'Active'}</td>
                    <td className="p-2 flex gap-2">
                      {active ? (
                        <button
                          className="icon-btn h-7 w-7 flex items-center justify-center rounded hover:bg-red-50 dark:hover:bg-red-900/20 border border-gray-200 dark:border-gray-600"
                          title="Revoke"
                          onClick={() => revokeLink(l.id)}
                        >
                          <BanIcon className="w-4 h-4 text-red-500" />
                        </button>
                      ) : '-'}
                    </td>
                  </tr>
                );
              })}
              {viewerLinks.filter(l => !l.revokedAt).length === 0 && (<tr><td className="p-3 text-gray-500 dark:text-gray-400" colSpan={7}>No viewer links yet</td></tr>)}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog open={confirmState.open} title={confirmState.title} message={confirmState.message} variant={confirmState.variant} onCancel={closeConfirm} onConfirm={confirmState.onConfirm || closeConfirm} />
    </section>
  );
};

export default LinksTab;

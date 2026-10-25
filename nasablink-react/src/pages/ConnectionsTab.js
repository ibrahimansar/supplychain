import React, { useState, useEffect, useCallback, useRef } from 'react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { Input } from '../components/ui/Input';
import { CardSkeleton } from '../components/ui/SkeletonLoader';
import { Link, Plus, CheckCircle, Copy } from 'lucide-react';
import { readLastCount, writeLastCount, scopedKey, STORAGE_KEYS } from '../utils/skeletonCount';
import { useLoadingPhase } from '../hooks/useDelayedLoading';
import { peekCachedData, treeAPI } from '../services/api';

/**
 * Manage linked trees. Connection *requests* were removed — link directly when
 * you admin both trees, or link automatically when adding a spouse by person ID.
 */
const ConnectionsTab = ({ treeId, showToast }) => {
  const [linkedTrees, setLinkedTrees] = useState(() => {
    const cached = peekCachedData(`conn:${treeId}:linked`);
    return Array.isArray(cached) ? cached : [];
  });
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(() => peekCachedData(`conn:${treeId}:linked`) !== undefined);
  const connectionsPhase = useLoadingPhase(loading && !hasLoaded);
  const [copiedTreeId, setCopiedTreeId] = useState(false);
  const [removeConfirm, setRemoveConfirm] = useState({ open: false, linkId: null });
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [targetTreeId, setTargetTreeId] = useState('');
  const [linking, setLinking] = useState(false);
  const showToastRef = useRef(showToast);

  useEffect(() => {
    showToastRef.current = showToast;
  }, [showToast]);

  const fetchConnections = useCallback(async ({ withSpinner = true, signal } = {}) => {
    if (signal?.aborted) return;
    if (withSpinner) setLoading(true);
    try {
      const linkedRes = await treeAPI.getLinkedTrees(treeId);
      if (signal?.aborted) return;
      setLinkedTrees(linkedRes.data || []);
      writeLastCount(scopedKey(STORAGE_KEYS.connections, treeId), linkedRes.data?.length || 0);
      setHasLoaded(true);
    } catch (error) {
      if (signal?.aborted) return;
      console.error('Error loading connection data:', error);
      showToastRef.current?.('Failed to load linked trees', 'error');
    } finally {
      if (withSpinner && !signal?.aborted) setLoading(false);
    }
  }, [treeId]);

  useEffect(() => {
    const controller = new AbortController();
    setHasLoaded(false);
    setLoading(true);
    fetchConnections({ withSpinner: true, signal: controller.signal });
    return () => controller.abort();
  }, [fetchConnections]);

  const handleDirectLink = async () => {
    const target = targetTreeId.trim();
    if (!target) {
      showToast('Enter the other tree’s ID', 'error');
      return;
    }
    setLinking(true);
    try {
      await treeAPI.createDirectTreeLink(treeId, target);
      showToast('Trees linked successfully');
      setShowLinkModal(false);
      setTargetTreeId('');
      await fetchConnections({ withSpinner: false });
    } catch (error) {
      showToast(error.response?.data?.error || error.response?.data?.message || 'Failed to link trees', 'error');
    } finally {
      setLinking(false);
    }
  };

  const handleRemoveLinkConfirmed = async (linkId) => {
    setRemoveConfirm({ open: false, linkId: null });
    try {
      await treeAPI.removeTreeLink(linkId);
      showToast('Tree connection removed');
      await fetchConnections({ withSpinner: false });
    } catch (error) {
      showToast('Failed to remove connection', 'error');
    }
  };

  const copyOwnTreeId = async () => {
    try {
      await navigator.clipboard.writeText(String(treeId));
      setCopiedTreeId(true);
      showToast?.('Tree ID copied');
      setTimeout(() => setCopiedTreeId(false), 2000);
    } catch {
      showToast?.('Could not copy Tree ID', 'error');
    }
  };

  if (connectionsPhase !== 'content') {
    const skel = readLastCount(scopedKey(STORAGE_KEYS.connections, treeId), 2, { min: 1, max: 3 });
    return (
      <div className={`space-y-6 ${connectionsPhase === 'hidden' ? 'invisible' : ''}`} aria-busy="true">
        {Array.from({ length: skel }).map((_, i) => (
          <CardSkeleton key={i} rows={2} />
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-6 animate-content-in ${loading ? 'opacity-70' : ''}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Linked Trees</h2>
          <p className="text-sm text-slate-500 mt-1">
            Link trees you admin on both sides, or they link automatically when you add a spouse by person ID.
          </p>
        </div>
        <Button onClick={() => setShowLinkModal(true)} className="shrink-0">
          <Plus className="h-4 w-4 me-2" />
          Link tree by ID
        </Button>
      </div>

      <Card className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-slate-900 mb-0.5">Your Tree ID</h3>
            <p className="text-xs text-slate-500 mb-2">
              Share this with another admin so they can link trees, or use person IDs to add spouses across trees.
            </p>
            <code className="inline-block font-mono text-sm px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-slate-900 select-all">
              {treeId}
            </code>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={copyOwnTreeId} className="flex-shrink-0 self-start sm:self-center">
            {copiedTreeId ? (
              <>
                <CheckCircle className="h-4 w-4 me-1.5 text-teal-600" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 me-1.5" />
                Copy ID
              </>
            )}
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Link className="h-4 w-4 text-teal-600" />
          Connected ({linkedTrees.length})
        </h3>

        {linkedTrees.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-slate-500 text-sm">No linked trees yet</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Link another tree you admin, or add a spouse via their person ID — trees connect automatically.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {linkedTrees.map((link) => {
              const otherTree = String(link.treeA.id) === String(treeId) ? link.treeB : link.treeA;
              return (
                <div
                  key={link.id}
                  className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:bg-slate-50"
                >
                  <div>
                    <p className="font-medium text-slate-900">{otherTree.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      ID {otherTree.id}
                      {link.linkedAt ? ` · Linked ${new Date(link.linkedAt).toLocaleDateString()}` : ''}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRemoveConfirm({ open: true, linkId: link.id })}
                    className="text-rose-600 hover:bg-rose-50"
                  >
                    Unlink
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Modal isOpen={showLinkModal} onClose={() => setShowLinkModal(false)} title="Link tree by ID">
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Enter the ID of another tree you administer. Trees link immediately — no approval step.
          </p>
          <div>
            <label className="form-label">Other tree ID</label>
            <Input
              value={targetTreeId}
              onChange={(e) => setTargetTreeId(e.target.value)}
              placeholder="e.g. 42"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowLinkModal(false)}>Cancel</Button>
            <Button onClick={handleDirectLink} loading={linking}>Link trees</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={removeConfirm.open}
        title="Unlink trees?"
        message="Person and spouse links that rely on this connection may stop working across trees."
        confirmText="Unlink"
        variant="danger"
        onCancel={() => setRemoveConfirm({ open: false, linkId: null })}
        onConfirm={() => handleRemoveLinkConfirmed(removeConfirm.linkId)}
      />
    </div>
  );
};

export default ConnectionsTab;

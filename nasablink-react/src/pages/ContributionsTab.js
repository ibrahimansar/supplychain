import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Copy, Inbox, Link2, Plus, Trash2, X } from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { Input, Select } from '../components/ui/Input';
import { treeAPI } from '../services/api';

/**
 * Asking relatives what they know, and reviewing what comes back.
 *
 * The queue leads. Links are the means; the answers waiting for someone are the
 * thing that actually needs attention, and burying them under link management
 * would be the wrong way round.
 */
const ContributionsTab = ({ treeId, showToast }) => {
  const [pending, setPending] = useState([]);
  const [links, setLinks] = useState([]);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [error, setError] = useState('');

  const notify = (type, message) => (showToast ? showToast(message, type) : setError(message));
  const serverMessage = (e, fallback) =>
    e?.response?.data?.message || e?.response?.data?.error || fallback;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, l] = await Promise.all([
        treeAPI.listPendingContributions(treeId),
        treeAPI.listContributionLinks(treeId),
      ]);
      setPending(p?.data || []);
      setLinks(l?.data || []);
    } catch (e) {
      setError(serverMessage(e, 'Could not load contributions.'));
    } finally {
      setLoading(false);
    }
  }, [treeId]);

  useEffect(() => { load(); }, [load]);

  // Only needed when actually creating a link, so it is not on the load path.
  const loadPeople = useCallback(async () => {
    try {
      const res = await treeAPI.getTree();
      const out = [];
      const walk = (node) => {
        if (!node) return;
        if (node.person) out.push({ id: node.person.id, name: node.person.name });
        (node.children || []).forEach(walk);
      };
      walk(res?.data);
      setPeople(out);
    } catch (_) { setPeople([]); }
  }, []);

  /** One visit's answers belong together — a reviewer judges them as a set. */
  const submissions = useMemo(() => {
    const groups = new Map();
    for (const p of pending) {
      if (!groups.has(p.submissionId)) groups.set(p.submissionId, []);
      groups.get(p.submissionId).push(p);
    }
    return [...groups.entries()].map(([id, items]) => ({ id, items }));
  }, [pending]);

  const review = async (proposal, accept) => {
    setBusyId(proposal.id);
    try {
      if (accept) await treeAPI.acceptContribution(treeId, proposal.id);
      else await treeAPI.discardContribution(treeId, proposal.id);
      setPending((prev) => prev.filter((p) => p.id !== proposal.id));
    } catch (e) {
      notify('error', serverMessage(e, 'Could not record that decision.'));
    } finally {
      setBusyId(null);
    }
  };

  const createLink = async () => {
    if (!draft?.personId) { setError('Choose who the questions are about.'); return; }
    setCreating(true);
    setError('');
    try {
      const res = await treeAPI.createContributionLink(treeId, {
        personId: draft.personId,
        label: draft.label?.trim() || null,
        expiresInDays: draft.expiresInDays ? Number(draft.expiresInDays) : null,
      });
      setLinks((prev) => [res.data, ...prev]);
      setDraft(null);
      notify('success', 'Link ready to send');
    } catch (e) {
      setError(serverMessage(e, 'Could not create the link.'));
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (link) => {
    try {
      await treeAPI.revokeContributionLink(treeId, link.id);
      setLinks((prev) => prev.map((l) => (l.id === link.id ? { ...l, active: false } : l)));
    } catch (e) {
      notify('error', serverMessage(e, 'Could not close that link.'));
    }
  };

  const copy = async (link) => {
    try {
      await navigator.clipboard.writeText(link.url);
      setCopiedId(link.id);
      setTimeout(() => setCopiedId(null), 1600);
    } catch (_) { notify('error', 'Could not copy the link'); }
  };

  if (loading) {
    return (
      <div className="space-y-3" aria-busy="true">
        <div className="h-24 rounded-2xl bg-slate-100 dark:bg-gray-700" />
        <div className="h-24 rounded-2xl bg-slate-100 dark:bg-gray-700" />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-4xl">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      {/* ── Waiting for review ─────────────────────────────────────── */}
      <Card className="p-5 dark:bg-gray-800 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Inbox className="h-4 w-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Waiting for review
          </h2>
          {pending.length > 0 && (
            <span className="rounded-full bg-teal-600 px-2 py-0.5 text-[11px] font-semibold text-white">
              {pending.length}
            </span>
          )}
        </div>

        {pending.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500 dark:text-gray-400">
            Nothing waiting. Answers from relatives appear here before they reach the tree.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {submissions.map(({ id, items }) => (
              <div key={id} className="rounded-xl border border-slate-200 dark:border-gray-700">
                <div className="flex flex-wrap items-baseline gap-x-2 border-b border-slate-100 dark:border-gray-700 px-4 py-2.5">
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    {items[0].contributorName || 'Someone'}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-gray-400">
                    on {items[0].personName} · {items.length} answer{items.length === 1 ? '' : 's'}
                  </span>
                </div>

                <ul className="divide-y divide-slate-100 dark:divide-gray-700">
                  {items.map((p) => (
                    <li key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs text-slate-500 dark:text-gray-400">{p.label}</span>
                        <span className="block text-sm text-slate-900 dark:text-white break-words">
                          {p.proposedValue}
                        </span>
                        {p.currentValue && (
                          // Shown so a reviewer knows this would overwrite, not fill a gap.
                          <span className="block text-xs text-amber-700 dark:text-amber-400">
                            replaces “{p.currentValue}”
                          </span>
                        )}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Button
                          type="button" size="sm" variant="outline"
                          disabled={busyId === p.id} onClick={() => review(p, false)}
                        >
                          <X className="h-3.5 w-3.5" /> Discard
                        </Button>
                        <Button
                          type="button" size="sm"
                          loading={busyId === p.id} disabled={busyId === p.id}
                          onClick={() => review(p, true)}
                        >
                          <Check className="h-3.5 w-3.5" /> Accept
                        </Button>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── Links ──────────────────────────────────────────────────── */}
      <Card className="p-5 dark:bg-gray-800 dark:border-gray-700">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Ask a relative</h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-gray-400 max-w-prose">
              Send a link about one person. They answer on their phone with no account,
              and nothing reaches the tree until you accept it.
            </p>
          </div>
          {!draft && (
            <Button
              type="button" size="sm"
              onClick={() => { setDraft({ personId: '', label: '', expiresInDays: '' }); setError(''); loadPeople(); }}
            >
              <Plus className="h-4 w-4" /> New link
            </Button>
          )}
        </div>

        {draft && (
          <div className="mt-4 space-y-3 border-t border-slate-200 dark:border-gray-700 pt-4">
            <div>
              <label htmlFor="contrib-person" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
                Who are the questions about?
              </label>
              <Select
                id="contrib-person" value={draft.personId}
                onChange={(e) => setDraft({ ...draft, personId: e.target.value })}
              >
                <option value="">Choose a person…</option>
                {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="contrib-label" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
                  A note for them (optional)
                </label>
                <Input
                  id="contrib-label" value={draft.label}
                  placeholder="e.g. Anything you remember about your father"
                  onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="contrib-expiry" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
                  Close after (optional)
                </label>
                <Select
                  id="contrib-expiry" value={draft.expiresInDays}
                  onChange={(e) => setDraft({ ...draft, expiresInDays: e.target.value })}
                >
                  <option value="">Never</option>
                  <option value="7">7 days</option>
                  <option value="30">30 days</option>
                  <option value="90">90 days</option>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDraft(null)} disabled={creating}>
                Cancel
              </Button>
              <Button type="button" onClick={createLink} loading={creating} disabled={creating}>
                Create link
              </Button>
            </div>
          </div>
        )}

        {links.length > 0 && (
          <ul className="mt-4 space-y-2">
            {links.map((l) => (
              <li
                key={l.id}
                className={`flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 dark:border-gray-700 px-3 py-2.5 ${
                  l.active ? '' : 'opacity-60'
                }`}
              >
                <Link2 className="h-4 w-4 flex-shrink-0 text-slate-400" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-slate-900 dark:text-white">
                    {l.personName}
                    {!l.active && <span className="ms-2 text-xs font-normal text-slate-400">closed</span>}
                  </span>
                  <span className="block text-xs text-slate-500 dark:text-gray-400">
                    {l.label || 'No note'} · opened {l.useCount}×
                    {l.pendingCount > 0 ? ` · ${l.pendingCount} waiting` : ''}
                  </span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Button type="button" size="sm" variant="outline" onClick={() => copy(l)} disabled={!l.active}>
                    {copiedId === l.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedId === l.id ? 'Copied' : 'Copy'}
                  </Button>
                  {l.active && (
                    <button
                      type="button" onClick={() => revoke(l)} aria-label={`Close link for ${l.personName}`}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};

export default ContributionsTab;

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Button from '../components/ui/Button';
import { treeAPI } from '../services/api';
import { Link2, Unlink, CheckCircle, Clock, Search, Plus, X, AlertTriangle, Loader2, Info } from 'lucide-react';

const PersonLinksTab = ({ treeId, showToast }) => {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [verifying, setVerifying] = useState(null);

  // Linked trees (approved connections)
  const [linkedTrees, setLinkedTrees] = useState([]);

  // Create form state
  const [personAId, setPersonAId] = useState('');
  const [personBId, setPersonBId] = useState('');
  const [personBName, setPersonBName] = useState('');
  const [personBTreeName, setPersonBTreeName] = useState('');
  const [notes, setNotes] = useState('');

  // Search state — Person A (current tree)
  const [treeMembers, setTreeMembers] = useState([]);
  const [searchA, setSearchA] = useState('');

  // Search state — Person B (linked trees)
  const [searchB, setSearchB] = useState('');
  const [searchBResults, setSearchBResults] = useState([]);
  const [searchBLoading, setSearchBLoading] = useState(false);
  const searchBDebounce = useRef(null);

  const loadLinks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await treeAPI.getTreePersonLinks(treeId);
      setLinks(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      showToast('Failed to load person links', 'error');
    } finally {
      setLoading(false);
    }
  }, [treeId, showToast]);

  const loadMembers = useCallback(async () => {
    try {
      const res = await treeAPI.getTree();
      const members = [];
      const collectMembers = (node) => {
        if (node?.person) members.push(node.person);
        if (node?.children) node.children.forEach(collectMembers);
      };
      collectMembers(res.data);
      setTreeMembers(members);
    } catch {
      // Silently fail
    }
  }, []);

  const loadLinkedTrees = useCallback(async () => {
    try {
      const res = await treeAPI.getLinkedTrees(treeId);
      setLinkedTrees(Array.isArray(res.data) ? res.data : []);
    } catch {
      // Silently fail
    }
  }, [treeId]);

  useEffect(() => {
    loadLinks();
    loadMembers();
    loadLinkedTrees();
  }, [loadLinks, loadMembers, loadLinkedTrees]);

  // Debounced search for Person B across linked trees
  const handleSearchB = useCallback((query) => {
    setSearchB(query);
    setPersonBId('');
    setPersonBName('');
    setPersonBTreeName('');

    if (searchBDebounce.current) clearTimeout(searchBDebounce.current);
    if (query.length < 2) {
      setSearchBResults([]);
      return;
    }

    searchBDebounce.current = setTimeout(async () => {
      setSearchBLoading(true);
      try {
        const res = await treeAPI.searchLinkedTreePersons(treeId, query);
        setSearchBResults(Array.isArray(res.data) ? res.data : []);
      } catch {
        setSearchBResults([]);
      } finally {
        setSearchBLoading(false);
      }
    }, 350);
  }, [treeId]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!personAId || !personBId) {
      showToast('Please select both persons', 'error');
      return;
    }
    if (personAId === personBId) {
      showToast('Cannot link a person to themselves', 'error');
      return;
    }

    setCreating(true);
    try {
      await treeAPI.createPersonLink({ personAId, personBId, notes: notes || undefined });
      showToast('Person link created successfully');
      setShowCreateForm(false);
      setPersonAId('');
      setPersonBId('');
      setPersonBName('');
      setPersonBTreeName('');
      setSearchA('');
      setSearchB('');
      setNotes('');
      await loadLinks();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to create person link', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleVerify = async (linkId) => {
    setVerifying(linkId);
    try {
      await treeAPI.verifyPersonLink(linkId);
      showToast('Person link verified');
      await loadLinks();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to verify link', 'error');
    } finally {
      setVerifying(null);
    }
  };

  const handleDelete = async (linkId) => {
    setDeleting(linkId);
    try {
      await treeAPI.removePersonLink(linkId);
      showToast('Person link removed');
      await loadLinks();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to remove link', 'error');
    } finally {
      setDeleting(null);
    }
  };

  const filteredMembersA = treeMembers.filter(m =>
    m.name?.toLowerCase().includes(searchA.toLowerCase()) ||
    m.arabicName?.toLowerCase().includes(searchA.toLowerCase())
  );

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Link2 className="w-5 h-5 text-primary-600" />
            Cross-Tree Person Links
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Link persons across different trees to show they are the same individual
          </p>
        </div>
        <Button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="rounded-xl"
        >
          {showCreateForm ? <X className="w-4 h-4 me-1" /> : <Plus className="w-4 h-4 me-1" />}
          {showCreateForm ? 'Cancel' : 'New Link'}
        </Button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <form onSubmit={handleCreate} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Create Person Link</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Select two persons from different trees to link them as the same individual.
          </p>

          {/* No linked trees warning */}
          {linkedTrees.length === 0 && (
            <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-700 dark:text-amber-300">
                <p className="font-medium">No connected trees found</p>
                <p className="mt-0.5">You need an approved tree connection before you can link persons. Go to the <strong>Connections</strong> tab to request one first.</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Person A — current tree */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Person A <span className="text-gray-400 font-normal">(this tree)</span>
              </label>
              <div className="relative">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name..."
                  value={searchA}
                  onChange={(e) => { setSearchA(e.target.value); setPersonAId(''); }}
                  className="w-full ps-9 pe-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              {searchA && !personAId && (
                <div className="mt-1 max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900">
                  {filteredMembersA.length === 0 ? (
                    <div className="p-2 text-sm text-gray-500">No results</div>
                  ) : filteredMembersA.slice(0, 10).map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => { setPersonAId(m.id); setSearchA(m.name); }}
                      className="w-full text-start px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-900 dark:text-white"
                    >
                      {m.name} {m.arabicName ? `(${m.arabicName})` : ''}
                    </button>
                  ))}
                </div>
              )}
              {personAId && (
                <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                  ✓ Selected: {treeMembers.find(m => m.id === personAId)?.name}
                </p>
              )}
            </div>

            {/* Person B — linked trees */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Person B <span className="text-gray-400 font-normal">(linked tree)</span>
              </label>
              <div className="relative">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={linkedTrees.length === 0 ? 'No linked trees available' : 'Search by name in linked trees...'}
                  value={searchB}
                  onChange={(e) => handleSearchB(e.target.value)}
                  disabled={linkedTrees.length === 0}
                  className="w-full ps-9 pe-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                {searchBLoading && (
                  <Loader2 className="absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
                )}
              </div>
              {searchB.length >= 2 && !personBId && (
                <div className="mt-1 max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900">
                  {searchBLoading ? (
                    <div className="p-2 text-sm text-gray-500 flex items-center gap-2">
                      <Loader2 className="w-3 h-3 animate-spin" /> Searching...
                    </div>
                  ) : searchBResults.length === 0 ? (
                    <div className="p-2 text-sm text-gray-500">No results in linked trees</div>
                  ) : searchBResults.map(p => (
                    <button
                      key={`${p.treeId}-${p.id}`}
                      type="button"
                      onClick={() => {
                        setPersonBId(p.id);
                        setPersonBName(p.name);
                        setPersonBTreeName(p.treeName);
                        setSearchB(p.name);
                        setSearchBResults([]);
                      }}
                      className="w-full text-start px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-900 dark:text-white flex items-center justify-between gap-2"
                    >
                      <span>{p.name}{p.arabicName ? ` (${p.arabicName})` : ''}</span>
                      <span className="text-xs px-2 py-0.5 rounded-md border bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-600 flex-shrink-0">
                        {p.treeName}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {personBId && (
                <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                  ✓ Selected: {personBName}
                  {personBTreeName && (
                    <span className="ms-1 px-1.5 py-0.5 rounded-md border text-[11px] bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-600">
                      {personBTreeName}
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g., Same person married into both families"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)} className="rounded-xl">Cancel</Button>
            <Button type="submit" disabled={creating || !personAId || !personBId} className="rounded-xl">
              {creating ? <><Loader2 className="w-4 h-4 me-1 animate-spin" /> Creating...</> : 'Create Link'}
            </Button>
          </div>
        </form>
      )}

      {/* Links List */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
          <Link2 className="w-4 h-4 text-primary-500" />
          Linked Persons
          {!loading && (
            <span className="ms-1 px-1.5 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
              {links.length}
            </span>
          )}
        </h3>

        {loading ? (
          <div className="flex justify-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
            <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
          </div>
        ) : links.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
            <Link2 className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">No person links yet</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Create links to connect people across different family trees
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <th className="px-4 py-3 text-start font-medium text-gray-700 dark:text-white">Person (This Tree)</th>
                    <th className="px-4 py-3 text-start font-medium text-gray-700 dark:text-white">Linked Person</th>
                    <th className="px-4 py-3 text-start font-medium text-gray-700 dark:text-white">Status</th>
                    <th className="px-4 py-3 text-start font-medium text-gray-700 dark:text-white hidden md:table-cell">Notes</th>
                    <th className="px-4 py-3 text-start font-medium text-gray-700 dark:text-white">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {links.map((link) => {
                    const myPerson = String(link.personA?.treeId) === String(treeId) ? link.personA : link.personB;
                    const otherPerson = String(link.personA?.treeId) === String(treeId) ? link.personB : link.personA;
                    const myName = myPerson?.name || myPerson?.arabicName || link.personAName || String(link.personAId);
                    const otherName = otherPerson?.name || otherPerson?.arabicName || link.personBName || String(link.personBId);
                    const otherTreeName = otherPerson?.treeName;
                    return (
                      <tr key={link.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{myName}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-gray-900 dark:text-white">{otherName}</span>
                            {otherTreeName && (
                              <span className="px-1.5 py-0.5 text-[10px] font-medium tracking-wide rounded-md border bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-600 whitespace-nowrap">
                                {otherTreeName}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                            link.verified
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                              : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                          }`}>
                            {link.verified ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                            {link.verified ? 'Verified' : 'Pending'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400 hidden md:table-cell max-w-[180px] truncate">
                          {link.notes || <span className="text-gray-300 dark:text-gray-600">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {!link.verified && (
                              <button
                                onClick={() => handleVerify(link.id)}
                                disabled={verifying === link.id}
                                title="Verify"
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                {verifying === link.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                                <span className="hidden sm:inline">Verify</span>
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(link.id)}
                              disabled={deleting === link.id}
                              title="Remove"
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {deleting === link.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Unlink className="w-3 h-3" />}
                              <span className="hidden sm:inline">Remove</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-700 dark:text-blue-300">
          <p className="font-medium mb-1">How cross-tree linking works</p>
          <ul className="list-disc list-inside space-y-1 text-blue-600 dark:text-blue-400">
            <li>Both trees must be connected via an approved Tree Connection first</li>
            <li>Links need to be verified by an admin of each tree</li>
            <li>Once verified, linked persons will show a cross-reference badge</li>
          </ul>
        </div>
      </div>
    </section>
  );
};

export default PersonLinksTab;

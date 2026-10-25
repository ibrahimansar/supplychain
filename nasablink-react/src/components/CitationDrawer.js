import React, { useState, useEffect, useCallback } from 'react';
import { treeAPI } from '../services/api';
import Button from './ui/Button';

const CITATION_TYPES = [
  { value: '', label: 'General' },
  { value: 'BIRTH', label: 'Birth' },
  { value: 'DEATH', label: 'Death' },
  { value: 'MARRIAGE', label: 'Marriage' },
  { value: 'IMMIGRATION', label: 'Immigration' },
  { value: 'RESIDENCE', label: 'Residence' },
  { value: 'OCCUPATION', label: 'Occupation' },
  { value: 'EDUCATION', label: 'Education' },
  { value: 'MILITARY', label: 'Military' },
  { value: 'RELIGION', label: 'Religion' },
  { value: 'OTHER', label: 'Other' },
];

const CONFIDENCE_OPTIONS = [
  { value: 'PRIMARY', label: 'Primary Source', desc: 'Original document (birth certificate, census, etc.)' },
  { value: 'SECONDARY', label: 'Secondary Source', desc: 'Derivative record (transcription, family bible, etc.)' },
  { value: 'UNVERIFIED', label: 'Unverified', desc: 'Not yet confirmed against original source' },
];

const CONFIDENCE_BADGES = {
  PRIMARY: { label: 'Primary', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  SECONDARY: { label: 'Secondary', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
  UNVERIFIED: { label: 'Unverified', color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' },
};

/**
 * CitationDrawer — a slide-over panel for managing citations (evidence links)
 * between a document and a specific person+field.
 *
 * Props:
 *   treeId, personId, personName
 *   fieldName — optional, for fact-level citations (e.g. "birthYear")
 *   citationType — optional, for event-level citations (e.g. "BIRTH")
 *   onClose — callback to close the drawer
 */
const CitationDrawer = ({ treeId, personId, personName, fieldName, citationType, onClose }) => {
  const [citations, setCitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // New citation form state
  const [form, setForm] = useState({
    documentId: '',
    citationType: citationType || '',
    fieldName: fieldName || '',
    referenceDetail: '',
    confidence: 'UNVERIFIED',
    notes: '',
  });

  const loadCitations = useCallback(async () => {
    setLoading(true);
    try {
      if (fieldName) {
        const res = await treeAPI.getCitationsForField(treeId, personId, fieldName);
        setCitations(res.data || []);
      } else {
        const res = await treeAPI.getCitationsForPerson(treeId, personId);
        // If citationType filter is set, filter client-side
        const all = res.data || [];
        if (citationType) {
          setCitations(all.filter(c => c.citationType === citationType));
        } else {
          setCitations(all);
        }
      }
    } catch {
      setCitations([]);
    } finally {
      setLoading(false);
    }
  }, [treeId, personId, fieldName, citationType]);

  const loadDocuments = useCallback(async () => {
    setDocsLoading(true);
    try {
      const res = await treeAPI.listDocuments(treeId);
      setDocuments(res.data || []);
    } catch {
      setDocuments([]);
    } finally {
      setDocsLoading(false);
    }
  }, [treeId]);

  useEffect(() => { loadCitations(); }, [loadCitations]);
  useEffect(() => { if (showAddForm) loadDocuments(); }, [showAddForm, loadDocuments]);

  const handleSave = async () => {
    if (!form.documentId) return;
    setSaving(true);
    try {
      await treeAPI.createCitation(treeId, {
        documentId: form.documentId,
        personId,
        citationType: form.citationType || null,
        fieldName: form.fieldName || null,
        referenceDetail: form.referenceDetail || null,
        confidence: form.confidence,
        notes: form.notes || null,
      });
      setShowAddForm(false);
      setForm(f => ({ ...f, documentId: '', referenceDetail: '', notes: '' }));
      await loadCitations();
    } catch (err) {
      console.error('Failed to create citation:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (citationId) => {
    try {
      await treeAPI.deleteCitation(treeId, citationId);
      setCitations(prev => prev.filter(c => c.id !== citationId));
    } catch (err) {
      console.error('Failed to delete citation:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-[3000] flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Drawer */}
      <div className="relative w-full max-w-md bg-white dark:bg-gray-800 shadow-xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Evidence & Sources
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {personName}
                {fieldName && <span className="ms-1 text-primary-600 dark:text-primary-400">/ {fieldName}</span>}
                {citationType && !fieldName && <span className="ms-1 text-primary-600 dark:text-primary-400">/ {citationType}</span>}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Existing citations */}
          {loading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
          ) : citations.length === 0 ? (
            <div className="text-center py-6">
              <svg className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No sources attached yet</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Add a document citation to back up this fact</p>
            </div>
          ) : (
            <div className="space-y-2">
              {citations.map(c => (
                <div key={c.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{c.documentName}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${CONFIDENCE_BADGES[c.confidence]?.color || ''}`}>
                          {CONFIDENCE_BADGES[c.confidence]?.label || c.confidence}
                        </span>
                      </div>
                      {c.referenceDetail && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{c.referenceDetail}</p>
                      )}
                      {c.notes && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 italic">{c.notes}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="ms-2 text-gray-400 hover:text-red-500 p-1 flex-shrink-0"
                      title="Remove citation"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add citation form */}
          {!showAddForm ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAddForm(true)}
              className="w-full"
            >
              <svg className="h-4 w-4 me-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Source
            </Button>
          ) : (
            <div className="bg-primary-50/50 dark:bg-primary-900/10 rounded-lg p-4 border border-primary-200 dark:border-primary-800 space-y-3">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Attach Source Document</h4>

              {/* Document selector */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Document *</label>
                {docsLoading ? (
                  <p className="text-xs text-gray-500">Loading documents...</p>
                ) : documents.length === 0 ? (
                  <p className="text-xs text-gray-500">No documents in this tree. Upload one first in the Documents tab.</p>
                ) : (
                  <select
                    value={form.documentId}
                    onChange={e => setForm(f => ({ ...f, documentId: e.target.value }))}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm dark:bg-gray-800 dark:text-white"
                  >
                    <option value="">Select a document...</option>
                    {documents.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.documentType})</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Citation type (for non-field-level) */}
              {!fieldName && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Event Type</label>
                  <select
                    value={form.citationType}
                    onChange={e => setForm(f => ({ ...f, citationType: e.target.value }))}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm dark:bg-gray-800 dark:text-white"
                  >
                    {CITATION_TYPES.map(ct => (
                      <option key={ct.value} value={ct.value}>{ct.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Reference detail */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Reference Detail</label>
                <input
                  type="text"
                  value={form.referenceDetail}
                  onChange={e => setForm(f => ({ ...f, referenceDetail: e.target.value }))}
                  placeholder="e.g. Page 3, entry 12"
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm dark:bg-gray-800 dark:text-white"
                />
              </div>

              {/* Confidence */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Confidence</label>
                <div className="space-y-1.5">
                  {CONFIDENCE_OPTIONS.map(opt => (
                    <label key={opt.value} className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="confidence"
                        value={opt.value}
                        checked={form.confidence === opt.value}
                        onChange={e => setForm(f => ({ ...f, confidence: e.target.value }))}
                        className="mt-0.5"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{opt.label}</span>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  placeholder="Optional notes about this source"
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <Button type="button" onClick={handleSave} disabled={!form.documentId || saving}>
                  {saving ? 'Saving...' : 'Save Citation'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CitationDrawer;

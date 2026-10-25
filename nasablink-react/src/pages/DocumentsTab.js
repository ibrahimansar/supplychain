import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { treeAPI } from '../services/api';
import { getApiErrorCode, getApiErrorMessage } from '../utils/apiError';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { LoadingSpinner } from '../components/ui/Loading';
import { FileText, Upload, Download, Trash2 } from 'lucide-react';
import Modal from '../components/ui/Modal';
import Toast from '../components/ui/Toast';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Tooltip from '../components/ui/Tooltip';
import { Plus } from '../components/ui/Icons';

const GRID_COLUMN_CLASSES = {
  'grid-2': 'grid-cols-1 sm:grid-cols-2',
  'grid-4': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  'grid-8': 'grid-cols-2 sm:grid-cols-4 xl:grid-cols-8',
};

function documentsErrorToast(error, fallback = 'Something went wrong with documents') {
  const status = error?.response?.status;
  const data = error?.response?.data;
  const code = getApiErrorCode(data);
  if (code === 'ADVANCED_TREE_REQUIRED') {
    return 'Documents feature requires ADVANCED tree type';
  }
  if (status === 402 || code === 'SUBSCRIPTION_REQUIRED') {
    return 'Documents require a Plus subscription';
  }
  if (status === 429 || code === 'DOCUMENT_LIMIT_EXCEEDED' || code === 'LIMIT_EXCEEDED') {
    return getApiErrorMessage(data, 'Document limit exceeded');
  }
  if (status === 403 || code === 'ACCESS_DENIED') {
    return getApiErrorMessage(data, "You don't have permission to access documents on this tree");
  }
  return getApiErrorMessage(data, fallback);
}

const FinderListIcon = ({ active }) => (
  <svg
      viewBox="0 0 24 24"
      className={`h-6 w-6 transition-opacity duration-150 ${active ? 'opacity-100' : 'opacity-70'}`}
    fill="none"
      stroke="currentColor"
      strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="6" cy="7" r="1.2" fill="currentColor" stroke="none" />
    <path d="M10 7h8" />
    <circle cx="6" cy="12" r="1.2" fill="currentColor" stroke="none" />
    <path d="M10 12h8" />
    <circle cx="6" cy="17" r="1.2" fill="currentColor" stroke="none" />
    <path d="M10 17h8" />
  </svg>
);

const FinderGridIcon = ({ columns, rows, active }) => {
  const gap = 1.6;
  const size = 16;
  const cellWidth = (size - gap * (columns - 1)) / columns;
  const cellHeight = (size - gap * (rows - 1)) / rows;
  const rects = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < columns; col += 1) {
      rects.push(
        <rect
          key={`${row}-${col}`}
          x={4 + col * (cellWidth + gap)}
          y={4 + row * (cellHeight + gap)}
          width={cellWidth}
          height={cellHeight}
          rx={1.3}
          ry={1.3}
            className="transition-colors"
        />
      );
    }
  }

  return (
    <svg
      viewBox="0 0 24 24"
        className={`h-6 w-6 transition-opacity duration-150 ${active ? 'opacity-100' : 'opacity-70'}`}
      fill="currentColor"
      aria-hidden="true"
    >
      {rects}
    </svg>
  );
};

const VIEW_OPTIONS = [
  { key: 'list', label: 'List view', renderIcon: (active) => <FinderListIcon active={active} /> },
  { key: 'grid-2', label: 'Comfortable grid', renderIcon: (active) => <FinderGridIcon columns={2} rows={2} active={active} /> },
  { key: 'grid-4', label: 'Balanced grid', renderIcon: (active) => <FinderGridIcon columns={3} rows={3} active={active} /> },
  { key: 'grid-8', label: 'Dense grid', renderIcon: (active) => <FinderGridIcon columns={4} rows={4} active={active} /> },
];

const DocumentsTab = () => {
  const { treeId } = useParams();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState(null);
  const [textDocument, setTextDocument] = useState({ name: '', content: '' });
  const [linkedPersonId, setLinkedPersonId] = useState('');
  const [personSearchTerm, setPersonSearchTerm] = useState('');
  const [personSearchResults, setPersonSearchResults] = useState([]);
  const [isSearchingPeople, setIsSearchingPeople] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [showPersonResults, setShowPersonResults] = useState(false);
  const searchContainerRef = useRef(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, documentId: null });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalTab, setAddModalTab] = useState('upload');
  const [documentSearchTerm, setDocumentSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('list');

  // Check tree type
  const [treeInfo, setTreeInfo] = useState(null);
  const isAdvancedTree = treeInfo?.treeType === 'ADVANCED';

  useEffect(() => {
    if (!isAdvancedTree && treeInfo !== null) {
      navigate(`/trees/${treeId}`);
      return;
    }
  }, [isAdvancedTree, treeInfo, navigate, treeId]);

  useEffect(() => {
    // Check tree info
    const checkTreeInfo = async () => {
      try {
        const res = await treeAPI.getTreeInfo(treeId);
        setTreeInfo(res.data);
      } catch (err) {
        setTreeInfo(null);
      }
    };

    checkTreeInfo();
  }, [treeId]);

  const loadDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await treeAPI.listDocuments(treeId);
      setDocuments(response.data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
      showToast(documentsErrorToast(error, 'Failed to load documents'), 'error');
    } finally {
      setLoading(false);
    }
  }, [treeId]);

  useEffect(() => {
    if (isAdvancedTree) {
      loadDocuments();
    }
  }, [treeId, isAdvancedTree, loadDocuments]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setShowPersonResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!isAdvancedTree) return;

    const trimmed = personSearchTerm.trim();
    if (trimmed.length < 2) {
      setPersonSearchResults([]);
      setIsSearchingPeople(false);
      return;
    }

    if (selectedPerson && trimmed === (selectedPerson.name || '').trim()) {
      setPersonSearchResults([]);
      setIsSearchingPeople(false);
      return;
    }

    let isMounted = true;
    setIsSearchingPeople(true);
    const handler = setTimeout(async () => {
      try {
        const response = await treeAPI.searchPersons(trimmed);
        if (!isMounted) return;
        setPersonSearchResults(response.data || []);
      } catch (error) {
        console.error('Error searching people:', error);
        if (!isMounted) return;
        setPersonSearchResults([]);
      } finally {
        if (isMounted) {
          setIsSearchingPeople(false);
        }
      }
    }, 300);

    return () => {
      isMounted = false;
      clearTimeout(handler);
    };
  }, [personSearchTerm, selectedPerson, isAdvancedTree, treeId]);

  const handleSelectPerson = (person) => {
    setLinkedPersonId(person.id);
    setSelectedPerson(person);
    setPersonSearchTerm(person.name || '');
    setShowPersonResults(false);
    setPersonSearchResults([]);
  };

  const resetPersonSelection = useCallback(() => {
    setLinkedPersonId('');
    setSelectedPerson(null);
    setPersonSearchTerm('');
    setPersonSearchResults([]);
    setShowPersonResults(false);
  }, []);

  const handleClearSelectedPerson = () => {
    resetPersonSelection();
  };

  const handleAddModalClose = useCallback(() => {
    setIsAddModalOpen(false);
    resetPersonSelection();
    setTextDocument({ name: '', content: '' });
    setAddModalTab('upload');
  }, [resetPersonSelection]);

  const filteredDocuments = useMemo(() => {
    const term = documentSearchTerm.trim().toLowerCase();
    if (!term) return documents;
    return documents.filter((doc) => {
      const name = (doc.name || '').toLowerCase();
      const type = (doc.documentType || '').toLowerCase();
      const citedNames = (doc.citations || []).map(c => (c.personName || '').toLowerCase()).join(' ');
      return name.includes(term) || type.includes(term) || citedNames.includes(term);
    });
  }, [documents, documentSearchTerm]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', file.name);
    if (linkedPersonId) {
      formData.append('linkedPersonId', linkedPersonId);
    }

    try {
      setUploading(true);
      const response = await treeAPI.uploadDocument(treeId, formData);
      let newDoc = response.data;
      // Create citation if a person was selected
      if (linkedPersonId && newDoc.id) {
        try {
          await treeAPI.createCitation(treeId, { documentId: newDoc.id, personId: linkedPersonId });
          // Re-fetch to include citation data
          const refreshed = await treeAPI.listDocuments(treeId);
          setDocuments(refreshed.data || []);
        } catch (citErr) {
          console.error('Failed to create citation:', citErr);
          setDocuments(prev => [...prev, newDoc]);
        }
      } else {
        setDocuments(prev => [...prev, newDoc]);
      }
      showToast('Document uploaded successfully');
      event.target.value = '';
      handleAddModalClose();
    } catch (error) {
      console.error('Error uploading document:', error);
      showToast(documentsErrorToast(error, 'Failed to upload document'), 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleCreateTextDocument = async () => {
    if (!textDocument.name.trim() || !textDocument.content.trim()) {
      showToast('Please provide both name and content', 'error');
      return;
    }

    try {
      setUploading(true);
      const response = await treeAPI.createTextDocument(treeId, {
        name: textDocument.name,
        content: textDocument.content
      });
      let newDoc = response.data;
      // Create citation if a person was selected
      if (linkedPersonId && newDoc.id) {
        try {
          await treeAPI.createCitation(treeId, { documentId: newDoc.id, personId: linkedPersonId });
          const refreshed = await treeAPI.listDocuments(treeId);
          setDocuments(refreshed.data || []);
        } catch (citErr) {
          console.error('Failed to create citation:', citErr);
          setDocuments(prev => [...prev, newDoc]);
        }
      } else {
        setDocuments(prev => [...prev, newDoc]);
      }
      showToast('Text document created successfully');
      setTextDocument({ name: '', content: '' });
  handleAddModalClose();
    } catch (error) {
      console.error('Error creating text document:', error);
      showToast(documentsErrorToast(error, 'Failed to create document'), 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (documentId, fileName) => {
    try {
      const response = await treeAPI.downloadDocument(treeId, documentId);
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading document:', error);
      showToast(documentsErrorToast(error, 'Failed to download document'), 'error');
    }
  };

  const handleDelete = async (documentId) => {
    setDeleteDialog({ open: true, documentId });
  };

  const confirmDelete = async () => {
    const { documentId } = deleteDialog;
    setDeleteDialog({ open: false, documentId: null });

    try {
      await treeAPI.deleteDocument(treeId, documentId);
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
      showToast('Document deleted successfully');
    } catch (error) {
      console.error('Error deleting document:', error);
      showToast(documentsErrorToast(error, 'Failed to delete document'), 'error');
    }
  };

  const renderDocumentCard = (doc) => {
    const isGrid = viewMode !== 'list';
    const baseClasses = 'rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/80 shadow-sm hover:shadow-md transition-shadow duration-200';
    const Icon = doc.documentType === 'FILE' ? Upload : FileText;
    const metaSegments = [
      doc.documentType,
      doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : null,
    ];
    // Show linked people from citations
    const citedPeople = (doc.citations || []).map(c => c.personName).filter(Boolean);
    const uniquePeople = [...new Set(citedPeople)];
    if (uniquePeople.length > 0) metaSegments.push(`Cited: ${uniquePeople.join(', ')}`);
    if (doc.fileSize) {
      const sizeKb = doc.fileSize / 1024;
      metaSegments.push(sizeKb >= 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb.toFixed(1)} KB`);
    }
    const metaText = metaSegments.filter(Boolean).join(' • ');

    if (isGrid) {
      return (
        <div key={doc.id} className={`${baseClasses} flex h-full flex-col gap-3 p-4`}>
          <div className="flex items-center gap-3">
            <Icon className="w-6 h-6 text-primary-500" />
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-white truncate" title={doc.name}>{doc.name}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 break-words">{metaText}</p>
            </div>
          </div>
          <div className="mt-auto flex items-center justify-end gap-2 pt-2">
            {doc.documentType === 'FILE' && (
              <Button
                onClick={() => handleDownload(doc.id, doc.name)}
                variant="outline"
                size="sm"
              >
                <Download className="w-4 h-4" />
              </Button>
            )}
            <Button
              onClick={() => handleDelete(doc.id)}
              variant="outline"
              size="sm"
              className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div key={doc.id} className={`${baseClasses} flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between`}>
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-primary-500" />
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">{doc.name}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{metaText}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {doc.documentType === 'FILE' && (
            <Button
              onClick={() => handleDownload(doc.id, doc.name)}
              variant="outline"
              size="sm"
            >
              <Download className="w-4 h-4" />
            </Button>
          )}
          <Button
            onClick={() => handleDelete(doc.id)}
            variant="outline"
            size="sm"
            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  };

  if (!isAdvancedTree && treeInfo !== null) {
    return (
      <div className="pt-20 min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Advanced Feature</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Documents feature is only available for ADVANCED trees.
            </p>
            <Button onClick={() => navigate(`/trees/${treeId}`)}>
              Back to Tree
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="pt-20 min-h-screen bg-gray-50 dark:bg-gray-900">
      {toast && <Toast message={toast.message} type={toast.type} />}
      <Modal
        isOpen={isAddModalOpen}
        onClose={handleAddModalClose}
        title="Add documents"
      >
        <div className="space-y-6">
          <div ref={searchContainerRef} className="relative">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Link to Person (Optional)
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={personSearchTerm}
                onChange={(e) => {
                  setPersonSearchTerm(e.target.value);
                  setShowPersonResults(true);
                }}
                onFocus={() => setShowPersonResults(true)}
                placeholder="Search by name..."
                className="w-full flex-1 rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:text-white"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleClearSelectedPerson}
                className="sm:w-auto"
              >
                {selectedPerson ? 'Clear' : 'No Link'}
              </Button>
            </div>
            {selectedPerson && (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Selected: {selectedPerson.name}
                {selectedPerson.fatherName && ` • Child of ${selectedPerson.fatherName}`}
              </p>
            )}
            {showPersonResults && (
              <div className="absolute z-20 mt-1 w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg max-h-60 overflow-y-auto">
                {personSearchTerm.trim().length < 2 ? (
                  <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                    Type at least 2 characters to search
                  </div>
                ) : isSearchingPeople ? (
                  <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                    Searching...
                  </div>
                ) : personSearchResults.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                    No people found
                  </div>
                ) : (
                  personSearchResults.map(person => (
                    <button
                      key={person.id}
                      type="button"
                      onClick={() => handleSelectPerson(person)}
                      className="w-full text-start px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none"
                    >
                      <span className="font-medium text-gray-900 dark:text-white">{person.name}</span>
                      {person.fatherName && (
                        <span className="block text-xs text-gray-500 dark:text-gray-400">Child of {person.fatherName}</span>
                      )}
                      {person.generation && (
                        <span className="block text-xs text-gray-400 dark:text-gray-500">Generation {person.generation}</span>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="inline-flex rounded-full bg-gray-100 dark:bg-gray-800 p-1">
              {[
                { key: 'upload', label: 'Upload File' },
                { key: 'text', label: 'Text Document' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setAddModalTab(tab.key)}
                  className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                    addModalTab === tab.key
                      ? 'bg-white text-primary-600 shadow-sm dark:bg-gray-900 dark:text-primary-200'
                      : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {addModalTab === 'upload' ? (
              <div className="space-y-3">
                <input
                  type="file"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                  id="modal-file-upload"
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                />
                <label
                  htmlFor="modal-file-upload"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-dashed border-primary-400 px-4 py-3 text-sm font-medium text-primary-700 bg-primary-50/70 hover:bg-primary-100 transition-colors cursor-pointer dark:border-primary-300 dark:text-primary-100 dark:bg-primary-900/40 dark:hover:bg-primary-900/60 disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  {uploading ? 'Uploading...' : 'Select File'}
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Supported formats: PDF, DOC, DOCX, TXT, JPG, JPEG, PNG.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Document Name
                  </label>
                  <input
                    type="text"
                    value={textDocument.name}
                    onChange={(e) => setTextDocument(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:text-white"
                    placeholder="Enter document name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Content
                  </label>
                  <textarea
                    value={textDocument.content}
                    onChange={(e) => setTextDocument(prev => ({ ...prev, content: e.target.value }))}
                    rows={8}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:text-white"
                    placeholder="Enter document content"
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <Button onClick={handleAddModalClose} variant="outline">
                    Cancel
                  </Button>
                  <Button onClick={handleCreateTextDocument} disabled={uploading}>
                    {uploading ? 'Creating...' : 'Create Document'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>
      <div className="w-full max-w-none mx-auto px-3 sm:px-4 lg:px-5 xl:px-6 py-5 sm:py-6">
        <div className="mb-5 sm:mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Documents</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Upload and manage documents for your family tree
          </p>
        </div>

        {/* Upload Section */}
        {/* Documents List */}
        <Card>
          <div className="p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Your Documents</h2>
                <Tooltip label="Add document">
                  <Button
                    type="button"
                    size="sm"
                    // variant="outline"
                    onClick={() => {
                      setIsAddModalOpen(true);
                      setAddModalTab('upload');
                    }}
                    // className="h-9 w-9 p-0 flex items-center justify-center text-primary-600 hover:text-primary-700 hover:border-primary-400 dark:border-primary-500/40 dark:text-primary-200 dark:hover:border-primary-400/70"
                    aria-label="Add document"
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                </Tooltip>
              </div>
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:justify-end sm:gap-4">
                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    value={documentSearchTerm}
                    onChange={(e) => setDocumentSearchTerm(e.target.value)}
                    placeholder="Search documents..."
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 pe-10 text-sm text-gray-900 dark:text-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  {documentSearchTerm && (
                    <button
                      type="button"
                      onClick={() => setDocumentSearchTerm('')}
                      className="absolute inset-y-0 end-2 flex items-center text-lg text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                      aria-label="Clear search"
                    >
                      ×
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {VIEW_OPTIONS.map((option) => {
                    const isActive = viewMode === option.key;
                    return (
                      <Tooltip key={option.key} label={option.label}>
                        <Button
                          variant={isActive ? 'solid' : 'ghost'}
                          size="sm"
                          onClick={() => setViewMode(option.key)}
                          className={`h-9 w-9 p-0 flex items-center justify-center rounded-xl transition-shadow duration-200 ${
                            isActive ? 'shadow-[0_8px_20px_rgba(59,130,246,0.18)] dark:shadow-[0_10px_24px_rgba(79,70,229,0.35)]' : 'hover:border-primary-200 dark:hover:border-primary-500/40'
                          }`}
                          aria-pressed={isActive}
                          aria-label={option.label}
                          type="button"
                        >
                          {option.renderIcon(isActive)}
                          <span className="sr-only">{option.label}</span>
                        </Button>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            </div>
            {loading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No documents yet</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  Use the + button above to upload files or create text documents.
                </p>
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No documents match your search</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  Try adjusting your filters or clearing the search box.
                </p>
              </div>
            ) : viewMode === 'list' ? (
              <div className="space-y-4">
                {filteredDocuments.map((doc) => renderDocumentCard(doc))}
              </div>
            ) : (
              <div className={`grid gap-4 ${GRID_COLUMN_CLASSES[viewMode] || GRID_COLUMN_CLASSES['grid-2']}`}>
                {filteredDocuments.map((doc) => renderDocumentCard(doc))}
              </div>
            )}
          </div>
        </Card>

        {/* Delete Confirmation Dialog */}
        {deleteDialog.open && (
          <ConfirmDialog
            open={deleteDialog.open}
            onClose={() => setDeleteDialog({ open: false, documentId: null })}
            onConfirm={confirmDelete}
            title="Confirm Delete"
            message="Are you sure you want to delete this document? This action cannot be undone."
          />
        )}
      </div>
    </div>
  );
};

export default DocumentsTab;
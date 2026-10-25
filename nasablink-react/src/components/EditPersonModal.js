import React, { useState, useEffect, useCallback } from 'react';
import Button from './ui/Button';
import { treeAPI } from '../services/api';
import { Textarea } from './ui/Input';
import { DatePicker } from './ui/DatePicker';
import ConfirmDialog from './ui/ConfirmDialog';
import Toast from './ui/Toast';
import CitationDrawer from './CitationDrawer';
import useModalA11y from '../hooks/useModalA11y';
import useTreeSettings from '../hooks/useTreeSettings';
import useTreeFields, {
  buildCustomFieldState,
  serialiseCustomFields,
  findMissingRequired,
} from '../hooks/useTreeFields';
import CustomFieldsSection from './CustomFieldsSection';

/** Small "source" icon button that opens the citation drawer for a given field. */
const SourceIcon = ({ count, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex items-center gap-0.5 ml-1.5 px-1 py-0.5 rounded text-xs transition-colors ${
      count > 0
        ? 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
        : 'text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
    }`}
    title={count > 0 ? `${count} source(s) attached` : 'Attach source document'}
  >
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
    {count > 0 && <span>{count}</span>}
  </button>
);

const EditPersonModal = ({ person, treeId, layoutMode = 'VERTICAL', onClose, onPersonUpdated }) => {
  const [formData, setFormData] = useState({
    name: '',
    arabicName: '',
    gender: 'MALE',
    birthYear: '',
    deathYear: '',
    title: '',
    description: '',
    notes: '',
    noHeir: false,
    isLiving: true,
    placeOfOrigin: '',
    childLayout: 'VERTICAL',
    parentRelationshipType: 'BIOLOGICAL',
    honorificName: '',
    epithet: '',
    patronymic: '',
    clanName: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [spouseLoading, setSpouseLoading] = useState(false);
  const [spouseError, setSpouseError] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [toast, setToast] = useState(null);
  const [siblings, setSiblings] = useState([]);
  const [siblingsLoading, setSiblingsLoading] = useState(false);
  const [siblingsError, setSiblingsError] = useState('');
  const [reorderLoading, setReorderLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const initialFormDataRef = React.useRef(null);

  // Citation drawer state (Phase 3 — fact-level evidence)
  const [citationDrawer, setCitationDrawer] = useState(null); // { fieldName, citationType }
  const [fieldCitationCounts, setFieldCitationCounts] = useState({});
  const [codeCopied, setCodeCopied] = useState(false);

  // Admin-defined fields for this tree
  const { settings } = useTreeSettings(treeId);
  const showNameParts = settings?.showNameParts === true;
  const secondScriptLabel = settings?.secondScriptLabel?.trim() || 'Second-script name';

  const { fields: customFieldDefs, loading: customFieldsLoading } = useTreeFields(treeId);
  const [customValues, setCustomValues] = useState({});
  const [missingCustomKeys, setMissingCustomKeys] = useState([]);
  const initialCustomRef = React.useRef({});

  const copyPublicCode = async () => {
    const code = person?.publicCode;
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 1600);
    } catch (_) {
      setToast({ type: 'error', message: 'Could not copy ID' });
    }
  };

  const loadSiblings = useCallback(async () => {
    if (!person || person.generation <= 1) return;

    setSiblingsLoading(true);
    setSiblingsError('');
    try {
      // Get the full tree to find siblings
      const treeResponse = await treeAPI.getTree();
      const tree = treeResponse.data;
      
      // Find the person in the tree and get their siblings
      const findPersonAndSiblings = (node, targetId, parent = null) => {
        if (node.person?.id === targetId) {
          // Found the person, get all children of the parent
          if (parent && parent.children) {
            return parent.children.map(child => child.person);
          }
          return [];
        }
        
        if (node.children) {
          for (const child of node.children) {
            const result = findPersonAndSiblings(child, targetId, node);
            if (result !== null) return result;
          }
        }
        
        return null;
      };
      
      const siblingsData = findPersonAndSiblings(tree, person.id);
      
      if (siblingsData) {
        // Sort ALL siblings (including current person) by orderIndex, birth year, then ID
        const sortedSiblings = siblingsData.sort((a, b) => {
          const orderA = a.orderIndex != null ? a.orderIndex : 0;
          const orderB = b.orderIndex != null ? b.orderIndex : 0;
          if (orderA !== orderB) return orderA - orderB;
          if (a.birthYear && b.birthYear) return a.birthYear - b.birthYear;
          if (a.birthYear) return -1;
          if (b.birthYear) return 1;
          return a.id.localeCompare(b.id);
        });
        
        setSiblings(sortedSiblings);
      }
    } catch (error) {
      console.error('Error loading siblings:', error);
      setSiblingsError('Could not load sibling order. You can still save other changes.');
    } finally {
      setSiblingsLoading(false);
    }
  }, [person]);

  // Initialize form with person data
  useEffect(() => {
    if (person) {
      const initial = {
        name: person.name || '',
        arabicName: person.arabicName || '',
        gender: person.gender || 'MALE',
        birthYear: person.birthYear ? String(person.birthYear) : '',
        deathYear: person.deathYear ? String(person.deathYear) : '',
        title: person.title || '',
        description: person.description || '',
        notes: person.notes || '',
        noHeir: person.noHeir || false,
        isLiving: person.isLiving != null ? person.isLiving : true,
        placeOfOrigin: person.placeOfOrigin || '',
        childLayout: person.childLayout || 'VERTICAL',
        parentRelationshipType: person.parentRelationshipType || 'BIOLOGICAL',
        honorificName: person.honorificName || '',
        epithet: person.epithet || '',
        patronymic: person.patronymic || '',
        clanName: person.clanName || ''
      };
      setFormData(initial);
      initialFormDataRef.current = initial;
      setIsDirty(false);
    }
  }, [person]);

  // Seed custom values once both the person and the tree's definitions are in.
  // Keyed on the definition list so a field added mid-session still appears.
  useEffect(() => {
    if (!person) return;
    const seeded = buildCustomFieldState(customFieldDefs, person.customFields);
    setCustomValues(seeded);
    initialCustomRef.current = seeded;
    setMissingCustomKeys([]);
  }, [person, customFieldDefs]);

  const handleCustomChange = (key, value) => {
    setCustomValues((prev) => {
      const updated = { ...prev, [key]: value };
      const customDirty = JSON.stringify(updated) !== JSON.stringify(initialCustomRef.current);
      const init = initialFormDataRef.current;
      const coreDirty = init ? JSON.stringify(formData) !== JSON.stringify(init) : false;
      setIsDirty(customDirty || coreDirty);
      return updated;
    });
    setMissingCustomKeys((prev) => prev.filter((k) => k !== key));
  };

  // Load siblings when modal opens
  useEffect(() => {
    if (person && person.generation > 1) {
      loadSiblings();
    }
  }, [person, loadSiblings]);

  // Load citation counts per field for source icons
  const loadCitationCounts = useCallback(async () => {
    if (!person || !treeId) return;
    try {
      const res = await treeAPI.getCitationsForPerson(treeId, person.id);
      const citations = res.data || [];
      const counts = {};
      citations.forEach(c => {
        if (c.fieldName) {
          counts[c.fieldName] = (counts[c.fieldName] || 0) + 1;
        }
        if (c.citationType) {
          const key = `event:${c.citationType}`;
          counts[key] = (counts[key] || 0) + 1;
        }
      });
      // Also count general (no field, no type)
      counts._total = citations.length;
      setFieldCitationCounts(counts);
    } catch {
      setFieldCitationCounts({});
    }
  }, [person, treeId]);

  useEffect(() => { loadCitationCounts(); }, [loadCitationCounts]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      const init = initialFormDataRef.current;
      setIsDirty(init ? JSON.stringify(updated) !== JSON.stringify(init) : true);
      return updated;
    });
  };

  const handleRemoveSpouse = async () => {
    if (!person?.spouseName) return;

    setShowConfirmDialog(true);
  };

  const confirmRemoveSpouse = async () => {
    setShowConfirmDialog(false);
    setSpouseLoading(true);
    setSpouseError('');

    try {
      await treeAPI.removeSpouse(person.id, treeId);
      // Refresh the person data to update spouse information
      const response = await treeAPI.getPerson(person.id);
      // Update the person object with new data (spouse should now be null/empty)
      Object.assign(person, response.data);
      setSpouseError('');
      // Show success message using toast
      setToast({ msg: 'Spouse unlinked successfully. The person remains in the tree.', type: 'success' });
      setTimeout(() => setToast(null), 3000);
      // Trigger tree reload to reflect the changes
      onPersonUpdated(person.id);
    } catch (error) {
      console.error('Error removing spouse:', error);
      setSpouseError(error.response?.data?.message || error.response?.data?.error || 'Failed to remove spouse');
    } finally {
      setSpouseLoading(false);
    }
  };

  const cancelRemoveSpouse = () => {
    setShowConfirmDialog(false);
  };

  const handleClose = () => {
    if (isDirty) {
      setShowUnsavedDialog(true);
    } else {
      onClose();
    }
  };

  // Declared after handleClose so Escape routes through the unsaved-changes guard.
  const modalRef = useModalA11y({ onClose: handleClose });

  // Sibling reordering functions
  const getCurrentPosition = () => {
    // Find the current person's position in the sorted siblings array (which includes the current person)
    return siblings.findIndex(s => s.id === person.id) + 1; // 1-based position
  };

  const canMoveLeft = () => {
    return getCurrentPosition() > 1;
  };

  const canMoveLeftmost = () => {
    return getCurrentPosition() > 2;
  };

  const canMoveRight = () => {
    return getCurrentPosition() < siblings.length;
  };

  const canMoveRightmost = () => {
    return getCurrentPosition() < siblings.length - 1;
  };

  const handleReorder = async (newPosition) => {
    if (!person || reorderLoading) return;

    setReorderLoading(true);
    try {
      // Calculate the target orderIndex (0-based)
      const targetOrderIndex = newPosition - 1;
      
      await treeAPI.reorderPerson(treeId, person.id, targetOrderIndex);
      
      // Update local person object
      person.orderIndex = targetOrderIndex;
      
      // Reload siblings to reflect new order
      await loadSiblings();
      
      // Show success message
      setToast({ msg: 'Person reordered successfully!', type: 'success' });
      setTimeout(() => setToast(null), 3000);
      
      // Trigger tree reload
      onPersonUpdated(person.id);
    } catch (error) {
      console.error('Error reordering person:', error);
      setToast({ msg: 'Failed to reorder person', type: 'error' });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setReorderLoading(false);
    }
  };

  const handleMoveLeft = () => {
    const currentPos = getCurrentPosition();
    if (currentPos > 1) {
      handleReorder(currentPos - 1);
    }
  };

  const handleMoveLeftmost = () => {
    handleReorder(1);
  };

  const handleMoveRight = () => {
    const currentPos = getCurrentPosition();
    if (currentPos < siblings.length) {
      handleReorder(currentPos + 1);
    }
  };

  const handleMoveRightmost = () => {
    handleReorder(siblings.length);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }

    const missing = findMissingRequired(customFieldDefs, customValues);
    if (missing.length > 0) {
      setMissingCustomKeys(missing.map((f) => f.fieldKey));
      setError(
        missing.length === 1
          ? `${missing[0].label} is required`
          : `${missing.length} required fields are empty`
      );
      return;
    }

    setLoading(true);
    setError('');

    try {
      const updateData = {
        ...formData,
        customFields: serialiseCustomFields(customFieldDefs, customValues),
        birthYear: formData.birthYear ? parseInt(formData.birthYear) : null,
        deathYear: formData.deathYear ? parseInt(formData.deathYear) : null,
        noHeir: formData.noHeir || false
      };
      // Only trees using the DYNAMIC layout store a per-person arrangement;
      // don't stamp a value on people in trees that ignore it.
      if (layoutMode !== 'DYNAMIC') delete updateData.childLayout;

      await treeAPI.updatePerson(person.id, updateData);
      onPersonUpdated(person.id);
    } catch (error) {
      console.error('Error updating person:', error);
      setError(error.response?.data?.message || 'Failed to update person');
    } finally {
      setLoading(false);
    }
  };

  if (!person) return null;

  const handleModalKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'SELECT') {
      const form = e.currentTarget.querySelector('form');
      if (form) { e.preventDefault(); form.requestSubmit(); }
    }
  };

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-[2000] p-4 focus:outline-none"
      onKeyDown={handleModalKeyDown}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-8 pt-8 pb-2 flex-shrink-0">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Edit Person: {person.name}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Generation {person.generation}
              </p>
              {person.publicCode && (
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Person ID
                  </span>
                  <code className="text-sm font-mono font-semibold text-primary-800 dark:text-primary-300 bg-primary-50 dark:bg-primary-950/40 px-2 py-0.5 rounded">
                    {person.publicCode}
                  </code>
                  <button
                    type="button"
                    onClick={copyPublicCode}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary-700 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-300 transition-colors"
                    aria-label="Copy person ID"
                  >
                    {codeCopied ? (
                      <>
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        Copied
                      </>
                    ) : (
                      <>
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
              aria-label="Close modal"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 rounded">
              {error}
            </div>
          )}

        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="px-8 pb-4 space-y-4 overflow-y-auto scrollbar-hidden flex-1 min-h-0">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label flex items-center">
                  Name *
                  <SourceIcon count={fieldCitationCounts['name'] || 0} onClick={() => setCitationDrawer({ fieldName: 'name' })} />
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="form-input"
                  required
                />
              </div>

              <div>
                <label className="form-label flex items-center">
                  {secondScriptLabel}
                  <SourceIcon count={fieldCitationCounts['arabicName'] || 0} onClick={() => setCitationDrawer({ fieldName: 'arabicName' })} />
                </label>
                <input
                  type="text"
                  name="arabicName"
                  value={formData.arabicName}
                  onChange={handleInputChange}
                  className="form-input arabic-text"
                  dir="rtl"
                />
              </div>

              <div>
                <label className="form-label flex items-center">
                  Gender *
                  <SourceIcon count={fieldCitationCounts['gender'] || 0} onClick={() => setCitationDrawer({ fieldName: 'gender' })} />
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  className="form-input"
                  required
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </select>
              </div>

              <div>
                <label className="form-label flex items-center">
                  Title
                  <SourceIcon count={fieldCitationCounts['title'] || 0} onClick={() => setCitationDrawer({ fieldName: 'title' })} />
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="e.g., Sheikh, Imam, Scholar"
                />
              </div>

              <div>
                <label className="form-label flex items-center">
                  Birth Year
                  <SourceIcon count={fieldCitationCounts['birthYear'] || 0} onClick={() => setCitationDrawer({ fieldName: 'birthYear' })} />
                </label>
                <DatePicker
                  name="birthYear"
                  value={formData.birthYear}
                  onChange={handleInputChange}
                  placeholder="Select birth year"
                  className="text-sm"
                />
              </div>

              {(formData.isLiving === false || formData.deathYear) && (
                <div>
                  <label className="form-label flex items-center">
                    Death Year
                    <SourceIcon count={fieldCitationCounts['deathYear'] || 0} onClick={() => setCitationDrawer({ fieldName: 'deathYear' })} />
                  </label>
                  <DatePicker
                    name="deathYear"
                    value={formData.deathYear}
                    onChange={handleInputChange}
                    placeholder="Select death year"
                    className="text-sm"
                  />
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="form-label flex items-center">
                Description
                <SourceIcon count={fieldCitationCounts['description'] || 0} onClick={() => setCitationDrawer({ fieldName: 'description' })} />
              </label>
              <Textarea name="description" value={formData.description} onChange={handleInputChange} rows={3} placeholder="Brief description about this person" />
            </div>

            {/* Notes */}
            <div>
              <label className="form-label flex items-center">
                Notes
                <SourceIcon count={fieldCitationCounts['notes'] || 0} onClick={() => setCitationDrawer({ fieldName: 'notes' })} />
              </label>
              <Textarea name="notes" value={formData.notes} onChange={handleInputChange} rows={3} placeholder="Additional notes and information" />
            </div>

            {/* Place of Origin */}
            <div>
              <label className="form-label">Place of Origin</label>
              <input
                type="text"
                name="placeOfOrigin"
                value={formData.placeOfOrigin || ''}
                onChange={handleInputChange}
                placeholder="e.g. Lahore, Punjab, Pakistan"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              />
            </div>

            {/* Living Person Privacy */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Privacy</h3>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-3">Living status</p>
                <div className="flex gap-3">
                  {[{ val: true, label: 'Living' }, { val: false, label: 'Deceased' }].map(({ val, label }) => (
                    <button
                      key={String(val)}
                      type="button"
                      onClick={() => setFormData(prev => {
                        const updated = { ...prev, isLiving: val, ...(val === true ? { deathYear: '' } : {}) };
                        setIsDirty(initialFormDataRef.current ? JSON.stringify(updated) !== JSON.stringify(initialFormDataRef.current) : true);
                        return updated;
                      })}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                        formData.isLiving === val
                          ? val === true
                            ? 'bg-green-100 dark:bg-green-900/50 border-green-400 text-green-800 dark:text-green-300'
                            : val === false
                            ? 'bg-gray-200 dark:bg-gray-700 border-gray-400 text-gray-800 dark:text-gray-200'
                            : 'bg-blue-100 dark:bg-blue-900/50 border-blue-400 text-blue-800 dark:text-blue-300'
                          : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-400'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {formData.isLiving === true && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                    Living persons' details are protected from public view.
                  </p>
                )}
              </div>
            </div>

            {/* Parent Relationship Type */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <label className="form-label">Relationship to Parent</label>
              <select
                name="parentRelationshipType"
                value={formData.parentRelationshipType || 'BIOLOGICAL'}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              >
                <option value="BIOLOGICAL">Biological</option>
                <option value="STEP">Step</option>
                <option value="KAFALA">Kafala</option>
                <option value="ADOPTIVE">Adoptive</option>
              </select>
            </div>

            {/* No Heir Toggle */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Descendant Status</h3>
              <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="noHeir"
                    checked={formData.noHeir || false}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setFormData(prev => {
                        const updated = { ...prev, noHeir: checked };
                        const init = initialFormDataRef.current;
                        setIsDirty(init ? JSON.stringify(updated) !== JSON.stringify(init) : true);
                        return updated;
                      });
                    }}
                    className="mt-1 h-4 w-4 text-amber-600 border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded focus:ring-amber-500"
                  />
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">Mark as "No Heir"</span>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Enable this if this person did not have any children or heirs. This prevents adding children, but you can still add a spouse.
                    </p>
                    {formData.noHeir && (
                      <p className="text-xs text-amber-700 dark:text-amber-400 mt-2 flex items-center gap-1">
                        <span>⊘</span>
                        This person is marked as having no heir
                      </p>
                    )}
                  </div>
                </label>
              </div>
            </div>

            {/* Structured name parts — opt-in per tree. These columns always
                existed on the record and showed in the detail view, but until
                now no form could set them. */}
            {showNameParts && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Name parts</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  A full name often carries more than one element. Recording them
                  separately keeps them searchable, and they survive a GEDCOM export.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label" htmlFor="honorificName">Honorific</label>
                    <input
                      id="honorificName"
                      type="text"
                      name="honorificName"
                      value={formData.honorificName}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="e.g. Elder, Sir, Hajji"
                    />
                  </div>
                  <div>
                    <label className="form-label" htmlFor="epithet">Epithet</label>
                    <input
                      id="epithet"
                      type="text"
                      name="epithet"
                      value={formData.epithet}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="e.g. the Traveller"
                    />
                  </div>
                  <div>
                    <label className="form-label" htmlFor="clanName">Family or house name</label>
                    <input
                      id="clanName"
                      type="text"
                      name="clanName"
                      value={formData.clanName}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="The name the wider family is known by"
                    />
                  </div>
                  <div>
                    <label className="form-label" htmlFor="patronymic">Ancestor chain</label>
                    <input
                      id="patronymic"
                      type="text"
                      name="patronymic"
                      value={formData.patronymic}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="e.g. son of Ibrahim, son of Yusuf"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Fields this tree's admins defined */}
            {(customFieldsLoading || customFieldDefs.length > 0) && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <CustomFieldsSection
                  fields={customFieldDefs}
                  values={customValues}
                  onChange={handleCustomChange}
                  missingKeys={missingCustomKeys}
                  loading={customFieldsLoading}
                />
              </div>
            )}

            {/* Children arrangement — only meaningful under the DYNAMIC tree layout */}
            {layoutMode === 'DYNAMIC' && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Children Arrangement</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Choose how this person's children are laid out in the tree.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'VERTICAL', icon: '⇔', label: 'Vertical', hint: 'Side by side in a row' },
                    { value: 'HORIZONTAL', icon: '⇕', label: 'Horizontal', hint: 'Stacked top to bottom' },
                  ].map((opt) => {
                    const selected = (formData.childLayout || 'VERTICAL') === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setFormData(prev => {
                          const updated = { ...prev, childLayout: opt.value };
                          const init = initialFormDataRef.current;
                          setIsDirty(init ? JSON.stringify(updated) !== JSON.stringify(init) : true);
                          return updated;
                        })}
                        className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
                          selected
                            ? 'border-primary-300 dark:border-primary-700 bg-primary-50/50 dark:bg-primary-950/20 ring-1 ring-primary-200 dark:ring-primary-800'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        <span className="text-lg leading-none mt-0.5">{opt.icon}</span>
                        <span className="min-w-0">
                          <span className={`block font-medium text-sm ${selected ? 'text-primary-700 dark:text-primary-300' : 'text-gray-700 dark:text-gray-300'}`}>
                            {opt.label}
                          </span>
                          <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">{opt.hint}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Spouse Management */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Spouse Management</h3>
              {person?.spouseName ? (
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Current spouse: <span className="font-medium text-gray-900 dark:text-white">{person.spouseName}</span>
                  </p>
                  
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border-s-4 border-blue-400">
                    <strong>What happens when you remove a spouse:</strong>
                    <ul className="mt-1 ms-4 list-disc">
                      <li>Only the spouse relationship is removed</li>
                      <li>Both people stay in the tree (they are not deleted)</li>
                      <li>If the other person has a parent in this tree, they remain under that parent</li>
                    </ul>
                  </div>
                  
                  {spouseError && (
                    <div className="mb-3 p-2 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 rounded text-sm">
                      {spouseError}
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleRemoveSpouse}
                      disabled={spouseLoading}
                      className="text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      {spouseLoading ? 'Removing...' : 'Remove Spouse'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    No spouse assigned to {person.name}.
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    To add a spouse, use the "+" button on the person's node in the family tree view.
                  </p>
                </div>
              )}
            </div>

            {/* Sibling Reordering */}
            {person && person.generation > 1 && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Sibling Order</h3>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  {siblingsLoading ? (
                    <div className="text-sm text-gray-600 dark:text-gray-400">Loading siblings...</div>
                  ) : siblingsError ? (
                    <p className="text-sm text-yellow-700 dark:text-yellow-400">{siblingsError}</p>
                  ) : (
                    <>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        Current position: <span className="font-medium text-gray-900 dark:text-white">{getCurrentPosition()} of {siblings.length}</span>
                      </p>
                      
                      <div className="flex flex-wrap gap-2">
                        {/* Move Left Most */}
                        {canMoveLeftmost() && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleMoveLeftmost}
                            disabled={reorderLoading}
                            className="text-blue-600 border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            title="Move to first position"
                          >
                            {reorderLoading ? 'Moving...' : '« First'}
                          </Button>
                        )}

                        {/* Move Left */}
                        {canMoveLeft() && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleMoveLeft}
                            disabled={reorderLoading}
                            className="text-blue-600 border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            title="Move one position left"
                          >
                            {reorderLoading ? 'Moving...' : '< Left'}
                          </Button>
                        )}

                        {/* Move Right */}
                        {canMoveRight() && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleMoveRight}
                            disabled={reorderLoading}
                            className="text-blue-600 border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            title="Move one position right"
                          >
                            {reorderLoading ? 'Moving...' : 'Right >'}
                          </Button>
                        )}

                        {/* Move Right Most */}
                        {canMoveRightmost() && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleMoveRightmost}
                            disabled={reorderLoading}
                            className="text-blue-600 border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            title="Move to last position"
                          >
                            {reorderLoading ? 'Moving...' : 'Last »'}
                          </Button>
                        )}
                      </div>

                      {siblings.length > 0 && (
                        <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                          <strong>Sibling order:</strong>
                          <div className="mt-1 space-y-1">
                            {siblings.map((sibling, index) => (
                              <div key={sibling.id} className={`flex items-center ${sibling.id === person.id ? 'font-medium text-blue-700 dark:text-blue-300' : ''}`}>
                                <span className="w-6 text-center">{index + 1}.</span>
                                <span>{sibling.name}</span>
                                {sibling.id === person.id && <span className="ms-2 text-blue-600 dark:text-blue-400">(current)</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

          </div>

          {/* Pinned so the action buttons stay reachable however long the form gets */}
          <div className="flex justify-end space-x-3 px-8 py-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 bg-white dark:bg-gray-800 rounded-b-lg">
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Updating...' : 'Update Person'}</Button>
          </div>
        </form>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={showConfirmDialog}
        title="Remove Spouse"
        message={`Remove ${person?.spouseName} as spouse from ${person?.name}?

Only the spouse relationship will be removed. Both people remain in the tree.`}
        confirmText="Remove Spouse"
        cancelText="Cancel"
        variant="danger"
        onCancel={cancelRemoveSpouse}
        onConfirm={confirmRemoveSpouse}
      />

      {/* Unsaved Changes Dialog */}
      <ConfirmDialog
        open={showUnsavedDialog}
        title="Discard Changes?"
        message="You have unsaved changes. Are you sure you want to close without saving?"
        confirmText="Discard"
        cancelText="Keep Editing"
        variant="danger"
        onCancel={() => setShowUnsavedDialog(false)}
        onConfirm={() => { setShowUnsavedDialog(false); onClose(); }}
      />

      {/* Toast Notification */}
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* Citation Drawer — fact-level evidence */}
      {citationDrawer && (
        <CitationDrawer
          treeId={treeId}
          personId={person.id}
          personName={person.name}
          fieldName={citationDrawer.fieldName}
          citationType={citationDrawer.citationType}
          onClose={() => {
            setCitationDrawer(null);
            loadCitationCounts(); // refresh counts
          }}
        />
      )}
    </div>
  );
};

export default EditPersonModal;

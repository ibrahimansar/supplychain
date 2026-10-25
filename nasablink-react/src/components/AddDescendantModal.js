import React, { useState, useEffect } from 'react';
import Button from './ui/Button';
import { Input, Textarea, Select } from './ui/Input';
import { DatePicker } from './ui/DatePicker';
import ConfirmDialog from './ui/ConfirmDialog';
import { treeAPI } from '../services/api';
import { useWorkspaceTemplate } from '../contexts/TemplateContext';
import useModalA11y from '../hooks/useModalA11y';
import useTreeSettings, { formatSpouseNames } from '../hooks/useTreeSettings';
import useTreeFields, {
  buildCustomFieldState,
  serialiseCustomFields,
  findMissingRequired,
} from '../hooks/useTreeFields';
import CustomFieldsSection from './CustomFieldsSection';

const normalizeGender = (g) => {
  if (!g) return '';
  const u = String(g).toUpperCase();
  if (u === 'M' || u === 'MALE') return 'MALE';
  if (u === 'F' || u === 'FEMALE') return 'FEMALE';
  return u;
};

const AddDescendantModal = ({
  parent,
  child,
  mode = 'descendant',
  onClose,
  onDescendantAdded,
  treeId,
  layoutMode = 'VERTICAL',
  preferSpouse = false,
}) => {
  const modalRef = useModalA11y({ onClose });
  const { label: tLabel, hasFeature } = useWorkspaceTemplate();
  const allowSpouses = hasFeature('spouses');
  const showGender = hasFeature('gender');
  const isParentMode = mode === 'parent';
  // In parent mode, the reference person is the child (existing root)
  const referencePerson = isParentMode ? child : parent;
  const parentIsNoHeir = !isParentMode && !!parent?.noHeir && hasFeature('noHeir');
  // No-heir / preferSpouse: default to spouse and block children when marked no-heir
  const [relationshipType, setRelationshipType] = useState(
    allowSpouses && (preferSpouse || parentIsNoHeir) ? 'spouse' : 'descendant'
  );
  const [spouseMode, setSpouseMode] = useState('new'); // new | existing | byId
  // Gates both the person form and its pinned footer, so they cannot diverge.
  const showPersonForm = isParentMode || relationshipType === 'descendant' || (relationshipType === 'spouse' && spouseMode === 'new');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchError, setSearchError] = useState('');
  const [genderHint, setGenderHint] = useState('');
  const [showAdvancedFields, setShowAdvancedFields] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [personCode, setPersonCode] = useState('');
  const [codeLookup, setCodeLookup] = useState(null);
  const [codeLoading, setCodeLoading] = useState(false);
  const [genderConfirm, setGenderConfirm] = useState({ open: false, person: null });
  const [formData, setFormData] = useState({
    name: '',
    arabicName: '',
    gender: isParentMode ? 'MALE' : (parent?.gender === 'MALE' ? 'FEMALE' : 'MALE'),
    birthYear: '',
    deathYear: '',
    title: '',
    description: '',
    // Only trees using the DYNAMIC layout store a per-person arrangement;
    // undefined is dropped from the request body everywhere else.
    childLayout: layoutMode === 'DYNAMIC' ? 'VERTICAL' : undefined
  });
  const [loading, setLoading] = useState(false);

  // Admin-defined fields for this tree
  const { settings, allowMultipleSpouses } = useTreeSettings(treeId);
  const secondScriptLabel = settings?.secondScriptLabel?.trim() || 'Second-script name';
  // Blocked only when this tree keeps one spouse per person.
  const spouseSlotTaken = !allowMultipleSpouses && !!parent?.spouseName;
  // Pairs of {id, name}; only offered when there is an actual choice to make.
  const parentSpouses = (parent?.spouseIds || []).map((id, i) => ({
    id,
    name: (parent?.spouseNames || [])[i] || 'Unknown',
  }));
  const [coParentId, setCoParentId] = useState('');

  const { fields: customFieldDefs, loading: customFieldsLoading } = useTreeFields(treeId);
  const [customValues, setCustomValues] = useState({});
  const [missingCustomKeys, setMissingCustomKeys] = useState([]);

  // Seed empty values as soon as the definitions land, so every input stays
  // controlled from its first render.
  useEffect(() => {
    setCustomValues(buildCustomFieldState(customFieldDefs));
    setMissingCustomKeys([]);
  }, [customFieldDefs]);

  const handleCustomChange = (key, value) => {
    setCustomValues((prev) => ({ ...prev, [key]: value }));
    setMissingCustomKeys((prev) => prev.filter((k) => k !== key));
  };

  useEffect(() => {
    if (parentIsNoHeir && allowSpouses && relationshipType === 'descendant') {
      setRelationshipType('spouse');
    }
    if (!allowSpouses && relationshipType === 'spouse') {
      setRelationshipType('descendant');
    }
  }, [parentIsNoHeir, relationshipType, allowSpouses]);

  useEffect(() => {
    if (isParentMode) return; // No gender auto-logic in parent mode
    if (relationshipType === 'spouse' && parent) {
      const newGender = parent.gender === 'MALE' ? 'FEMALE' : 'MALE';
      setFormData(prev => ({ ...prev, gender: newGender }));
      setGenderHint(`Gender set to ${newGender === 'FEMALE' ? 'Female' : 'Male'} based on ${parent.name}'s gender.`);
    } else if (relationshipType === 'descendant') {
      setFormData(prev => ({ ...prev, gender: 'MALE' }));
      setGenderHint('');
    }
  }, [relationshipType, parent, isParentMode]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'gender') setGenderHint('');
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    setSearchError('');
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const isSpouse = relationshipType === 'spouse';
      const searches = [treeAPI.searchPersons(query)];
      // For spouse mode, also search linked trees
      if (isSpouse && treeId) {
        searches.push(treeAPI.searchLinkedTreePersons(treeId, query).catch(() => ({ data: [] })));
      }
      const [currentRes, linkedRes] = await Promise.all(searches);

      // Show all genders; mismatch is confirmed at select time
      const currentFiltered = (currentRes.data || [])
        .filter((p) => {
          if (p.id === parent.id) return false;
          if (!isSpouse) return true;
          if (p.hasSpouse || p.spouseName) return false;
          // Unlinked same-tree spouses have no parent and should not reappear here.
          return !!(p.fatherId || p.motherId);
        })
        .map((p) => ({ ...p, _source: 'current' }));

      const linkedFiltered = linkedRes
        ? (linkedRes.data || [])
            .filter((p) => p.id !== parent.id && (!isSpouse || !(p.hasSpouse || p.spouseName)))
            .map((p) => ({ ...p, _source: 'linked' }))
        : [];

      setSearchResults([...currentFiltered, ...linkedFiltered]);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
      setSearchError('Search failed. Please try again.');
    }
  };

  const gendersMatchAsSpouses = (a, b) => {
    const ga = normalizeGender(a);
    const gb = normalizeGender(b);
    if (!ga || !gb) return true;
    return ga !== gb;
  };

  const linkSpouse = async (selectedPerson) => {
    setLoading(true);
    setSubmitError('');
    try {
      const spouseTreeId =
        selectedPerson._source === 'linked' ||
        (selectedPerson.treeId && String(selectedPerson.treeId) !== String(treeId))
          ? selectedPerson.treeId
          : undefined;
      await treeAPI.addSpouse(parent.id, selectedPerson.id, spouseTreeId);
      onDescendantAdded(selectedPerson, parent.id, 'spouse');
    } catch (error) {
      console.error('Error adding spouse:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to add spouse';
      if (errorMessage.toLowerCase().includes('already has a spouse')) {
        setSubmitError(`${errorMessage} — Please remove the existing spouse first, or choose a different person.`);
      } else {
        setSubmitError(errorMessage);
      }
    } finally {
      setLoading(false);
      setGenderConfirm({ open: false, person: null });
    }
  };

  const handleSelectExistingSpouse = async (selectedPerson) => {
    if (spouseSlotTaken) {
      setSubmitError(`${parent.name} already has a spouse (${formatSpouseNames(parent)}). Turn on "Allow more than one spouse" in Customisation, or remove the existing spouse first.`);
      return;
    }

    if (selectedPerson._source === 'linked' || (selectedPerson.treeId && String(selectedPerson.treeId) !== String(treeId))) {
      // Block only when the other tree explicitly says we cannot edit.
      // Missing canEdit used to fail closed even for trees the user owns.
      if (selectedPerson.canEdit === false) {
        setSubmitError(
          `Adding a spouse from "${selectedPerson.treeName || 'the other tree'}" requires edit access to that tree. ` +
            `Contact that tree's admin to be granted an Admin or Verifier role.`
        );
        return;
      }
    }

    if (!gendersMatchAsSpouses(parent.gender, selectedPerson.gender)) {
      setGenderConfirm({ open: true, person: selectedPerson });
      return;
    }

    await linkSpouse(selectedPerson);
  };

  const handleLookupByCode = async () => {
    const code = personCode.trim().toUpperCase();
    setSubmitError('');
    setCodeLookup(null);
    if (!/^[A-Z]{3}[0-9]{6}$/.test(code)) {
      setSubmitError('Enter a valid person ID like ABC123456');
      return;
    }
    setCodeLoading(true);
    try {
      const res = await treeAPI.lookupPersonByCode(treeId, code);
      setCodeLookup(res.data);
    } catch (error) {
      setCodeLookup(null);
      setSubmitError(
        error.response?.data?.message ||
          error.response?.data?.error ||
          'Could not find a person with that ID'
      );
    } finally {
      setCodeLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (!formData.name.trim()) {
      setSubmitError('Name is required.');
      return;
    }

    if (!isParentMode && relationshipType === 'spouse' && spouseSlotTaken) {
      setSubmitError(`${parent.name} already has a spouse (${formatSpouseNames(parent)}). Turn on "Allow more than one spouse" in Customisation, or remove the existing spouse first.`);
      return;
    }

    if (!isParentMode && relationshipType === 'descendant' && parent?.noHeir) {
      setSubmitError(`${parent.name} is marked as having no heir. Uncheck "No Heir" in their profile to add children.`);
      return;
    }

    const missing = findMissingRequired(customFieldDefs, customValues);
    if (missing.length > 0) {
      setMissingCustomKeys(missing.map((f) => f.fieldKey));
      setSubmitError(
        missing.length === 1
          ? `${missing[0].label} is required.`
          : `${missing.length} required fields are empty.`
      );
      return;
    }

    setLoading(true);
    const customFields = serialiseCustomFields(customFieldDefs, customValues);

    try {
      // --- Parent (ancestor) mode ---
      if (isParentMode) {
        const ancestorData = {
          ...formData,
          customFields,
          childId: child.id,
          birthYear: formData.birthYear ? new Date(formData.birthYear).getFullYear() : null,
          deathYear: formData.deathYear ? new Date(formData.deathYear).getFullYear() : null
        };
        const response = await treeAPI.addPerson(ancestorData);
        const newPerson = response.data || { ...ancestorData, id: Date.now() };
        onDescendantAdded(newPerson, null, 'parent');
        return;
      }

      if (relationshipType === 'descendant') {
        const descendantData = {
          ...formData,
          customFields,
          parentId: parent.id,
          // Which of the parent's spouses this child belongs to. Only asked for
          // when there is more than one, so there is a real choice to make.
          coParentId: coParentId || null,
          birthYear: formData.birthYear ? new Date(formData.birthYear).getFullYear() : null,
          deathYear: formData.deathYear ? new Date(formData.deathYear).getFullYear() : null
        };

        const response = await treeAPI.addPerson(descendantData);
        const newPerson = response.data || { ...descendantData, id: Date.now() };
        onDescendantAdded(newPerson, parent.id, 'descendant');
      } else if (relationshipType === 'spouse' && spouseMode === 'new') {
        const spouseData = {
          ...formData,
          customFields,
          birthYear: formData.birthYear ? new Date(formData.birthYear).getFullYear() : null,
          deathYear: formData.deathYear ? new Date(formData.deathYear).getFullYear() : null
        };

        const createResponse = await treeAPI.addPerson(spouseData);
        const newSpouse = createResponse.data;

        try {
          await treeAPI.addSpouse(parent.id, newSpouse.id);
          onDescendantAdded(newSpouse, parent.id, 'spouse');
        } catch (spouseError) {
          console.error('Error creating spouse relationship:', spouseError);
          const spouseErrorMessage = spouseError.response?.data?.message || spouseError.response?.data?.error || 'Failed to create spouse relationship';

          if (spouseErrorMessage.toLowerCase().includes('already has a spouse')) {
            setSubmitError(`${spouseErrorMessage} — "${formData.name}" was created in the tree but could not be linked as spouse. You can find them in the tree and set the relationship manually.`);
          } else {
            setSubmitError(`"${formData.name}" was created, but failed to establish spouse relationship: ${spouseErrorMessage}`);
          }

          onDescendantAdded(newSpouse, parent.id, 'descendant');
        }
      }
    } catch (error) {
      console.error('Error adding family member:', error);
      if (error.response?.status === 429 &&
          (error.response?.data?.error === 'PERSON_COUNT_LIMIT_EXCEEDED' ||
           error.response?.data?.code === 'PERSON_COUNT_LIMIT_EXCEEDED')) {
        setSubmitError('You have reached the maximum number of people allowed in this tree. Please contact an admin to increase the limit.');
      } else {
        setSubmitError(error.response?.data?.message || error.response?.data?.error || `Failed to add ${relationshipType}.`);
      }
    } finally {
      setLoading(false);
    }
  };

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
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {isParentMode
                ? `${tLabel('addParent', 'Add parent')} of ${referencePerson?.name}`
                : `${tLabel('addMember', 'Add family member')} to ${referencePerson?.name}`}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
              aria-label="Close modal"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

        </div>

        <div className="px-8 pb-4 overflow-y-auto scrollbar-hidden flex-1 min-h-0">
          {/* Submit / general error */}
          {submitError && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-400">
              {submitError}
            </div>
          )}

          {!isParentMode && allowSpouses && <div className="mb-6">
            <div className="flex items-center gap-4">
              <label className="form-label mb-0">Relationship Type</label>
              <div className="flex space-x-6">
                <label className={`flex items-center ${parentIsNoHeir ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <input
                    type="radio"
                    name="relationshipType"
                    value="descendant"
                    checked={relationshipType === 'descendant'}
                    onChange={(e) => setRelationshipType(e.target.value)}
                    className="me-2"
                    disabled={parentIsNoHeir}
                  />
                  <span className={`text-sm font-medium ${parentIsNoHeir ? 'text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                    {tLabel('addChild', 'Descendant')}
                    {parentIsNoHeir && (
                      <span className="text-xs text-amber-600 dark:text-amber-400 ms-1">(no heir)</span>
                    )}
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="relationshipType"
                    value="spouse"
                    checked={relationshipType === 'spouse'}
                    onChange={(e) => setRelationshipType(e.target.value)}
                    className="me-2"
                    disabled={spouseSlotTaken}
                  />
                  <span className={`text-sm font-medium ${spouseSlotTaken ? 'text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                    {tLabel('addSpouse', 'Spouse')}
                    {spouseSlotTaken && (
                      <span className="text-xs text-red-500 ms-1">
                        ({formatSpouseNames(parent)} is already spouse)
                      </span>
                    )}
                  </span>
                </label>
              </div>
            </div>
            {parentIsNoHeir && (
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
                This person is marked as having no heir — you can still add a spouse. To add children, remove the no-heir marking first.
              </p>
            )}
            {parent?.spouseName && relationshipType === 'spouse' && (
              <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-sm text-yellow-800 dark:text-yellow-300">
                <strong>Note:</strong> {parent.name} already has a spouse ({parent.spouseName}).
                To add a different spouse, first remove the existing spouse from {parent.name}'s profile.
              </div>
            )}
          </div>}

          {!isParentMode && relationshipType === 'spouse' && (
            <div className="mb-6">
              <label className="form-label block mb-3">How would you like to add the spouse?</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { value: 'new', label: 'New entry', hint: 'Create a person' },
                  { value: 'existing', label: 'Connected tree', hint: 'Search this & linked trees' },
                  { value: 'byId', label: 'By person ID', hint: 'Paste ABC123456' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setSpouseMode(opt.value);
                      setSubmitError('');
                      setCodeLookup(null);
                    }}
                    className={`text-left rounded-xl border px-3 py-2.5 transition-colors ${
                      spouseMode === opt.value
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-sm font-semibold">{opt.label}</div>
                    <div className={`text-[11px] mt-0.5 ${spouseMode === opt.value ? 'text-slate-300' : 'text-slate-400'}`}>
                      {opt.hint}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {!isParentMode && relationshipType === 'spouse' && spouseMode === 'existing' && (
            <div className="mb-6">
              <label className="form-label block mb-3">Search this tree and connected trees</label>
              <Input
                type="text"
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="mb-3"
              />
              {searchError && (
                <p className="text-sm text-red-600 mb-2">{searchError}</p>
              )}
              {searchResults.length > 0 && (
                <div className="max-h-40 overflow-y-auto scrollbar-hidden border border-slate-200 rounded-xl">
                  {searchResults.map((person) => (
                    <div
                      key={`${person._source || 'current'}-${person.id}`}
                      className="p-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer"
                      onClick={() => handleSelectExistingSpouse(person)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">{person.name}</span>
                        {person._source === 'linked' && person.treeName && (
                          <span className="px-1.5 py-0.5 text-[10px] font-medium tracking-wide rounded-md border bg-slate-100 text-slate-600 border-slate-200">
                            {person.treeName}
                          </span>
                        )}
                      </div>
                      {person.arabicName && (
                        <div className="text-sm text-slate-500 arabic-text" dir="rtl">{person.arabicName}</div>
                      )}
                      <div className="text-xs text-slate-400">
                        {person.gender} • {person.birthYear || 'Unknown birth'} - {person.deathYear || 'Present'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {searchQuery.length >= 2 && searchResults.length === 0 && !searchError && (
                <div className="text-sm text-slate-400 mt-2">No matching people found</div>
              )}
            </div>
          )}

          {!isParentMode && relationshipType === 'spouse' && spouseMode === 'byId' && (
            <div className="mb-6 space-y-3">
              <label className="form-label block">Person ID</label>
              <p className="text-xs text-slate-500 -mt-2">
                Paste the public ID from their profile (e.g. ABC123456). You need access to their tree.
              </p>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="ABC123456"
                  value={personCode}
                  onChange={(e) => setPersonCode(e.target.value.toUpperCase())}
                  className="font-mono tracking-wider"
                  maxLength={9}
                />
                <Button type="button" variant="outline" onClick={handleLookupByCode} loading={codeLoading}>
                  Look up
                </Button>
              </div>
              {codeLookup && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-900">{codeLookup.name}</div>
                      {codeLookup.arabicName && (
                        <div className="text-sm text-slate-500 arabic-text" dir="rtl">{codeLookup.arabicName}</div>
                      )}
                      <div className="text-xs text-slate-500 mt-1">
                        {codeLookup.gender || 'Unknown gender'}
                        {codeLookup.treeName ? ` · ${codeLookup.treeName}` : ''}
                        {codeLookup.publicCode ? ` · ${codeLookup.publicCode}` : ''}
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      disabled={loading || codeLookup.hasSpouse || codeLookup.canEdit === false}
                      onClick={() =>
                        handleSelectExistingSpouse({
                          ...codeLookup,
                          _source: String(codeLookup.treeId) === String(treeId) ? 'current' : 'linked',
                        })
                      }
                    >
                      Add as spouse
                    </Button>
                  </div>
                  {codeLookup.hasSpouse && (
                    <p className="text-xs text-amber-700">This person already has a spouse.</p>
                  )}
                  {codeLookup.canEdit === false && (
                    <p className="text-xs text-amber-700">You need edit access on their tree to link them.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {showPersonForm && (
            <form id="add-descendant-form" onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Name <span className="text-red-500">*</span></label>
                  <Input type="text" name="name" value={formData.name} onChange={handleInputChange} required autoFocus className="text-sm py-1.5" />
                </div>

                {hasFeature('culturalNames') && (
                  <div>
                    <label className="form-label">{secondScriptLabel}</label>
                    <Input type="text" name="arabicName" value={formData.arabicName} onChange={handleInputChange} className="arabic-text text-sm py-1.5" dir="rtl" />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {showGender && (
                  <div>
                    <label className="form-label">Gender <span className="text-red-500">*</span></label>
                    <Select name="gender" value={formData.gender} onChange={handleInputChange} required className="text-sm py-1.5">
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                    </Select>
                    {genderHint && (
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">{genderHint}</p>
                    )}
                  </div>
                )}

                <div>
                  <label className="form-label">Birth Year</label>
                  <DatePicker
                    name="birthYear"
                    value={formData.birthYear}
                    onChange={handleInputChange}
                    placeholder="Select birth date"
                    className="text-sm py-1.5"
                  />
                </div>
              </div>

              {/* Collapsible Advanced Fields */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAdvancedFields(!showAdvancedFields)}
                  className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                  <svg
                    className={`h-4 w-4 transition-transform ${showAdvancedFields ? 'rotate-90' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  {showAdvancedFields ? 'Hide' : 'Show'} additional fields (death date, title, description)
                </button>

                {showAdvancedFields && (
                  <div className="mt-3 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="form-label">Death Year</label>
                        <DatePicker
                          name="deathYear"
                          value={formData.deathYear}
                          onChange={handleInputChange}
                          placeholder="Select death date"
                          className="text-sm py-1.5"
                        />
                      </div>

                      <div>
                        <label className="form-label">Title</label>
                        <Input type="text" name="title" value={formData.title} onChange={handleInputChange} placeholder="e.g., Imam, Sayyid, etc." className="text-sm py-1.5" />
                      </div>
                    </div>

                    {layoutMode === 'DYNAMIC' && (
                      <div>
                        <label className="form-label">Children Arrangement</label>
                        <Select
                          name="childLayout"
                          value={formData.childLayout || 'VERTICAL'}
                          onChange={handleInputChange}
                          className="text-sm py-1.5"
                        >
                          <option value="VERTICAL">Vertical — children side by side</option>
                          <option value="HORIZONTAL">Horizontal — children stacked</option>
                        </Select>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          How this person's own children will be laid out in the tree.
                        </p>
                      </div>
                    )}

                    <div>
                      <label className="form-label">Description</label>
                      <Textarea name="description" value={formData.description} onChange={handleInputChange} rows={2} placeholder="Brief description or notable achievements" className="text-sm py-1.5" />
                    </div>
                  </div>
                )}
              </div>

              {relationshipType === 'descendant' && parentSpouses.length > 1 && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                  <label className="form-label" htmlFor="co-parent">Other parent</label>
                  <Select
                    id="co-parent"
                    value={coParentId}
                    onChange={(e) => setCoParentId(e.target.value)}
                    className="text-sm py-1.5"
                  >
                    <option value="">Not recorded</option>
                    {parentSpouses.map((sp) => (
                      <option key={sp.id} value={sp.id}>{sp.name}</option>
                    ))}
                  </Select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {parent?.name} has more than one spouse. Choose which of them is
                    this child's other parent.
                  </p>
                </div>
              )}

              {/* Fields this tree's admins defined — outside the collapsible
                  block, because a required field must never be hidden. */}
              {(customFieldsLoading || customFieldDefs.length > 0) && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                  <CustomFieldsSection
                    fields={customFieldDefs}
                    values={customValues}
                    onChange={handleCustomChange}
                    missingKeys={missingCustomKeys}
                    loading={customFieldsLoading}
                  />
                </div>
              )}

            </form>
          )}
        </div>

        {/* Pinned outside the scroll area; `form` keeps submit wired to the form above */}
        {showPersonForm && (
          <div className="flex justify-end space-x-3 px-8 py-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 bg-white dark:bg-gray-800 rounded-b-lg">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading} className="px-4 py-1.5 text-sm">Cancel</Button>
            <Button type="submit" form="add-descendant-form" loading={loading} disabled={loading} className="px-4 py-1.5 text-sm">
              {loading ? 'Adding...' : isParentMode ? 'Add Parent' : `Add ${relationshipType === 'descendant' ? 'Descendant' : 'Spouse'}`}
            </Button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={genderConfirm.open}
        title="Gender may not match"
        message={
          genderConfirm.person
            ? `${genderConfirm.person.name} is marked as ${normalizeGender(genderConfirm.person.gender) === 'FEMALE' ? 'Female' : normalizeGender(genderConfirm.person.gender) === 'MALE' ? 'Male' : genderConfirm.person.gender || 'unknown gender'}. Please confirm if you still want to add them as a spouse.`
            : 'Please confirm if you still want to add this person as a spouse.'
        }
        confirmText="Add as spouse"
        cancelText="Cancel"
        variant="warning"
        loading={loading}
        onCancel={() => setGenderConfirm({ open: false, person: null })}
        onConfirm={() => genderConfirm.person && linkSpouse(genderConfirm.person)}
      />
    </div>
  );
};

export default AddDescendantModal;

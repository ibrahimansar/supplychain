import React, { useState } from 'react';
import Button from './ui/Button';
import { Input, Select } from './ui/Input';
import { treeAPI } from '../services/api';
import useModalA11y from '../hooks/useModalA11y';

const AddSpouseModal = ({ person, treeId, onClose, onSpouseAdded }) => {
  const modalRef = useModalA11y({ onClose });
  const [formData, setFormData] = useState({
    name: '',
    arabicName: '',
    gender: person.gender === 'MALE' ? 'FEMALE' : 'MALE', // Opposite gender by default
    birthYear: '',
    deathYear: '',
    title: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchMode, setSearchMode] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [showAdvancedFields, setShowAdvancedFields] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    // Normalize gender to uppercase for comparison (handles 'M'/'F' and 'MALE'/'FEMALE')
    const normalizeGender = (g) => {
      if (!g) return '';
      const u = g.toUpperCase();
      if (u === 'M' || u === 'MALE') return 'MALE';
      if (u === 'F' || u === 'FEMALE') return 'FEMALE';
      return u;
    };

    const personGender = normalizeGender(person.gender);
    const oppositeGender = personGender === 'MALE' ? 'FEMALE' : 'MALE';

    setSearchLoading(true);
    try {
      // Search current tree + optionally linked trees in parallel
      const searches = [treeAPI.searchPersons(query)];
      if (treeId) searches.push(treeAPI.searchLinkedTreePersons(treeId, query).catch(() => ({ data: [] })));

      const [currentRes, linkedRes] = await Promise.all(searches);

      const currentFiltered = (currentRes.data || [])
        .filter(p => p.id !== person.id
          && !(p.hasSpouse || p.spouseName)
          && !!(p.fatherId || p.motherId)
          && normalizeGender(p.gender) === oppositeGender)
        .map(p => ({ ...p, _source: 'current' }));

      const linkedFiltered = linkedRes
        ? (linkedRes.data || [])
            .filter(p => p.id !== person.id
              && !(p.hasSpouse || p.spouseName)
              && (p.canEdit !== false)
              && normalizeGender(p.gender) === oppositeGender)
            .map(p => ({ ...p, _source: 'linked' }))
        : [];

      setSearchResults([...currentFiltered, ...linkedFiltered]);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSelectExistingSpouse = async (selectedPerson) => {
    setLoading(true);
    setError('');
    try {
      // Note: Search results don't include full lineage info
      // We can only show basic lineage info from the search result
      const hasLineage = selectedPerson.fatherId || selectedPerson.generation > 1;
      
      // Call API to add spouse relationship
      const spouseTreeId =
        selectedPerson._source === 'linked' || (selectedPerson.treeId && String(selectedPerson.treeId) !== String(treeId))
          ? selectedPerson.treeId
          : undefined;
      const response = await treeAPI.addSpouse(person.id, selectedPerson.id, spouseTreeId);
      
      let successMessage = `${selectedPerson.name} has been added as spouse!`;
      
      if (hasLineage) {
        successMessage += `\n\nNote: ${selectedPerson.name} has existing family connections in generation ${selectedPerson.generation}.`;
        if (selectedPerson.fatherName) {
          successMessage += ` They are the child of ${selectedPerson.fatherName}.`;
        }
        successMessage += ` The spouse relationship has been created, but their existing lineage remains unchanged.`;
      }
      
      setSuccess(successMessage);
      setTimeout(() => {
        onSpouseAdded(response.data);
      }, 2000); // Longer delay to show the note
    } catch (error) {
      console.error('Error adding spouse:', error);
      setError(error.response?.data?.message || error.response?.data?.error || 'Failed to add spouse');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // First create the new person
      const newPersonData = {
        ...formData,
        birthYear: formData.birthYear ? parseInt(formData.birthYear) : null,
        deathYear: formData.deathYear ? parseInt(formData.deathYear) : null
      };

      const createResponse = await treeAPI.addPerson(newPersonData);
      const newPerson = createResponse.data;

      // Then create the spouse relationship
      const spouseResponse = await treeAPI.addSpouse(person.id, newPerson.id);
      setSuccess(`${formData.name} has been successfully added as spouse!`);

      setTimeout(() => {
        onSpouseAdded(spouseResponse.data);
      }, 1500);
    } catch (error) {
      console.error('Error adding spouse:', error);
      if (error.response?.status === 429) {
        setError('You have reached the maximum number of people allowed in this tree.');
      } else {
        setError(error.response?.data?.message || error.response?.data?.error || 'Failed to add spouse');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={modalRef} className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-[2000] p-4 focus:outline-none">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 pt-6 pb-2 flex-shrink-0">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Add Spouse to {person.name}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl"
            >
              ×
            </button>
          </div>

        </div>

        <div className="px-6 pb-4 overflow-y-auto scrollbar-hidden flex-1 min-h-0">
          {/* Mode Toggle */}
          <div className="flex mb-4 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setSearchMode(false)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                !searchMode ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Create New
            </button>
            <button
              onClick={() => setSearchMode(true)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                searchMode ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Select Existing
            </button>
          </div>

          {/* Information about lineage handling */}
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start">
              <svg className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 me-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-blue-800 dark:text-blue-300">
                <strong>Lineage Connection:</strong> Only the spouse relationship will be created. Search results show basic lineage information (generation and parent). If the spouse has existing family members, they will remain in their original tree structure. You can manually connect lineages later if needed.
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 rounded">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/20 border border-green-400 dark:border-green-700 text-green-700 dark:text-green-400 rounded">
              {success}
            </div>
          )}

          {searchMode ? (
            /* Search Existing Person Mode */
            <div className="space-y-4">
              <div>
                <label className="form-label">Search for existing person</label>
                <Input
                  type="text"
                  placeholder="Type name to search..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>

              {searchLoading && (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                  Searching...
                </div>
              )}

              {!searchLoading && searchResults.length > 0 && (
                <div className="max-h-64 overflow-y-auto scrollbar-hidden border border-gray-200 dark:border-gray-600 rounded-lg">
                  {searchResults.map((result) => {
                    const hasLineage = result.fatherId || result.generation > 1;
                    const isLinked = result._source === 'linked';

                    return (
                    <button
                      key={`${result._source}-${result.id}`}
                      onClick={() => handleSelectExistingSpouse(result)}
                      disabled={loading}
                      className="w-full text-start p-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-600 last:border-b-0 disabled:opacity-50"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 dark:text-gray-100">{result.name}</div>
                          {result.arabicName && (
                            <div className="text-sm text-gray-500 dark:text-gray-400 arabic-text">{result.arabicName}</div>
                          )}
                          {result.title && (
                            <div className="text-sm text-primary-600 dark:text-primary-400">{result.title}</div>
                          )}
                          <div className="text-xs text-gray-400 dark:text-gray-500">
                            Generation {result.generation}
                            {(result.fatherName || result.motherName) && (
                              ` • Child of ${[result.fatherName, result.motherName].filter(Boolean).join(' & ')}`
                            )}
                            <span className="ms-2 text-gray-500 dark:text-gray-400">({result.gender === 'MALE' ? 'Male' : 'Female'})</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          {isLinked && result.treeName && (
                            <span className="text-xs px-2 py-0.5 rounded-md border bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-600">
                              {result.treeName}
                            </span>
                          )}
                          {hasLineage && !isLinked && (
                            <div className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 px-2 py-1 rounded-full">
                              Has lineage
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                    );
                  })}
                </div>
              )}

              {searchQuery.length >= 2 && !searchLoading && searchResults.length === 0 && (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                  No matching people found
                </div>
              )}
            </div>
          ) : (
            /* Create New Person Mode */
            <form id="add-spouse-form" onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="form-label">Name *</label>
                <Input type="text" name="name" value={formData.name} onChange={handleInputChange} required />
              </div>

              <div>
                <label className="form-label">Arabic Name</label>
                <Input type="text" name="arabicName" value={formData.arabicName} onChange={handleInputChange} className="arabic-text" dir="rtl" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Gender *</label>
                  <Select name="gender" value={formData.gender} onChange={handleInputChange} required>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                  </Select>
                </div>

                <div>
                  <label className="form-label">Birth Year</label>
                  <Input type="number" name="birthYear" value={formData.birthYear} onChange={handleInputChange} min="1" max="2100" />
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
                  <div className="mt-3 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="form-label">Death Year</label>
                        <Input type="number" name="deathYear" value={formData.deathYear} onChange={handleInputChange} min="1" max="2100" />
                      </div>

                      <div>
                        <label className="form-label">Title</label>
                        <Input type="text" name="title" value={formData.title} onChange={handleInputChange} placeholder="e.g., Sayyid, Imam, etc." />
                      </div>
                    </div>

                    <div>
                      <label className="form-label">Description</label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        rows={3}
                        className="form-textarea w-full"
                        placeholder="Brief description"
                      />
                    </div>
                  </div>
                )}
              </div>

            </form>
          )}
        </div>

        {/* Pinned outside the scroll area; `form` keeps submit wired to the form above */}
        {!searchMode && (
          <div className="flex justify-end space-x-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 bg-white dark:bg-gray-800 rounded-b-lg">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button type="submit" form="add-spouse-form" disabled={loading}>{loading ? 'Adding...' : 'Add Spouse'}</Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddSpouseModal;
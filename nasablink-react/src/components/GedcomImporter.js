import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GedcomParser, validateGedcomFile } from '../utils/gedcomParser';
import { treeAPI, getApiErrorMessage } from '../services/api';

const GedcomImporter = ({ treeId, onImportComplete, onClose }) => {
  const { t } = useTranslation();
  const [file, setFile] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [validation, setValidation] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.ged') && !selectedFile.name.endsWith('.gedcom')) {
      setError(t('gedcom.invalid_file_type', 'Please select a GEDCOM file (.ged or .gedcom)'));
      return;
    }

    setFile(selectedFile);
    setError(null);
    setValidation(null);
    setPreview(null);
    setResult(null);
    setIsValidating(true);

    try {
      const text = await selectedFile.text();

      // Validate file
      const validationResult = validateGedcomFile(text);
      setValidation(validationResult);

      if (validationResult.valid) {
        // Parse and preview
        const parser = new GedcomParser(text);
        const data = parser.convertToNasabLinkFormat();
        setPreview(data);
      }
    } catch (err) {
      console.error('Error reading file:', err);
      setError(t('gedcom.file_read_error', 'Failed to read file'));
    } finally {
      setIsValidating(false);
    }
  };

  const handleImport = async () => {
    if (!preview || !treeId) return;

    setIsImporting(true);
    setError(null);
    setResult(null);

    const { people, marriages } = preview;

    try {
      // One transactional request. The server orders parents before children
      // itself and rejects the whole import if it would exceed the tree's person
      // limit, so a failure can no longer leave a family half-imported.
      const response = await treeAPI.importGedcom(treeId, {
        people: people.map(person => ({
          gedcomId: person.gedcomId,
          parentGedcomId: person.parentGedcomId,
          name: person.name,
          arabicName: person.arabicName,
          title: person.title,
          description: person.description,
          gender: person.gender,
          birthYear: person.birthYear,
          deathYear: person.deathYear,
          placeOfOrigin: person.placeOfOrigin,
          notes: person.notes,
          isLiving: person.isLiving,
        })),
        marriages,
      });

      const data = response.data || {};
      const created = data.created || 0;
      setResult({
        created,
        skipped: Math.max(0, people.length - created),
        marriages: data.marriages || 0,
        warnings: data.warnings || [],
      });
    } catch (err) {
      console.error('Error importing GEDCOM:', err);
      setError(getApiErrorMessage(err) || t('gedcom.import_error', 'Failed to import GEDCOM file'));
    } finally {
      setIsImporting(false);
    }
  };

  const stats = preview?.stats;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('gedcom.title', 'Import GEDCOM File')}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {t('gedcom.subtitle', 'Import your family tree from a standard GEDCOM file')}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isImporting}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {/* File Upload */}
          {!result && (
            <div className="mb-6">
              <label
                className={`
                  block w-full p-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors
                  ${file ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-emerald-400'}
                  ${isImporting ? 'opacity-50 pointer-events-none' : ''}
                `}
              >
                <input
                  type="file"
                  accept=".ged,.gedcom"
                  onChange={handleFileSelect}
                  disabled={isImporting}
                  className="hidden"
                />
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                {file ? (
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{file.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {t('gedcom.drop_file', 'Click to select GEDCOM file')}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {t('gedcom.supported', '.ged or .gedcom files (max 10MB)')}
                    </p>
                  </div>
                )}
              </label>
            </div>
          )}

          {/* Loading */}
          {isValidating && (
            <div className="flex items-center justify-center gap-2 py-4">
              <svg className="animate-spin h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="text-gray-600 dark:text-gray-400">
                {t('gedcom.validating', 'Validating file...')}
              </span>
            </div>
          )}

          {/* Validation Results */}
          {validation && !result && (
            <div className="mb-6 space-y-2">
              {validation.errors.length > 0 && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <h3 className="font-semibold text-red-800 dark:text-red-200 mb-2">
                    {t('gedcom.errors', 'Errors')}
                  </h3>
                  <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                    {validation.errors.map((err, idx) => (
                      <li key={idx}>• {err}</li>
                    ))}
                  </ul>
                </div>
              )}
              {validation.warnings.length > 0 && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                    {t('gedcom.warnings', 'Warnings')}
                  </h3>
                  <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                    {validation.warnings.map((warn, idx) => (
                      <li key={idx}>• {warn}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Preview */}
          {preview && validation?.valid && !result && (
            <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
              <h3 className="font-semibold text-emerald-800 dark:text-emerald-200 mb-3">
                {t('gedcom.preview', 'Preview')}
              </h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-600 dark:text-gray-400">{t('gedcom.people_count', 'People')}</p>
                  <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{stats.total}</p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400">{t('gedcom.marriages_count', 'Marriages')}</p>
                  <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{stats.marriages}</p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400">{t('gedcom.roots_count', 'Top-level branches')}</p>
                  <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{stats.roots}</p>
                </div>
              </div>

              {/* How the GEDCOM maps onto NasabLink's model */}
              <ul className="mt-4 pt-4 border-t border-emerald-200 dark:border-emerald-800 text-xs text-gray-700 dark:text-gray-300 space-y-1">
                <li>
                  • {t('gedcom.note_append', 'These people are added to the existing tree. Each top-level branch appears as a separate root.')}
                </li>
                {stats.droppedSecondParents > 0 && (
                  <li>
                    • {t('gedcom.note_one_parent', 'NasabLink links one parent per child: the father becomes the parent and the mother is linked as his spouse.')}
                  </li>
                )}
                {stats.unknownGender > 0 && (
                  <li>
                    • {t('gedcom.note_gender', '{{count}} people have no recorded sex and will be imported as male — correct them after import.').replace('{{count}}', stats.unknownGender)}
                  </li>
                )}
              </ul>

              {/* Sample names */}
              <div className="mt-4 pt-4 border-t border-emerald-200 dark:border-emerald-800">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                  {t('gedcom.sample_names', 'Sample names:')}
                </p>
                <div className="flex flex-wrap gap-1">
                  {preview.people.slice(0, 10).map((person, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-white dark:bg-gray-700 text-xs text-gray-700 dark:text-gray-300 rounded border border-emerald-200 dark:border-emerald-700"
                    >
                      {person.name}
                    </span>
                  ))}
                  {preview.people.length > 10 && (
                    <span className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
                      +{preview.people.length - 10} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Import progress — a single request, so this is indeterminate rather
              than a per-person counter. */}
          {isImporting && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <svg className="animate-spin h-4 w-4 text-blue-600 dark:text-blue-300" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  {t('gedcom.step_importing', 'Importing {{count}} people…', { count: preview?.people.length || 0 })}
                </span>
              </div>
              <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2 overflow-hidden">
                <div className="bg-blue-600 dark:bg-blue-400 h-2 w-1/3 rounded-full animate-pulse" />
              </div>
            </div>
          )}

          {/* Result summary */}
          {result && (
            <div className="mb-2 space-y-3">
              <div className="p-4 rounded-lg border bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                  {t('gedcom.result_done', 'Import complete')}
                </h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">{t('gedcom.result_created', 'People added')}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{result.created}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">{t('gedcom.result_marriages', 'Spouses linked')}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{result.marriages}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">{t('gedcom.result_skipped', 'Skipped')}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{result.skipped}</p>
                  </div>
                </div>
              </div>

              {result.warnings.length > 0 && (
                <details className="p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <summary className="cursor-pointer text-sm font-medium text-gray-800 dark:text-gray-200">
                    {t('gedcom.result_warnings', '{{count}} notes about this import').replace('{{count}}', result.warnings.length)}
                  </summary>
                  <ul className="mt-2 text-xs text-gray-600 dark:text-gray-400 space-y-1 max-h-40 overflow-y-auto">
                    {result.warnings.map((warning, idx) => (
                      <li key={idx}>• {warning}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <button
            onClick={onClose}
            disabled={isImporting}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
          >
            {result ? t('common.close', 'Close') : t('common.cancel', 'Cancel')}
          </button>
          {result ? (
            <button
              onClick={onImportComplete}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors"
            >
              {t('gedcom.view_tree', 'Done')}
            </button>
          ) : (
            <button
              onClick={handleImport}
              disabled={!preview || !validation?.valid || isImporting}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isImporting ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {t('gedcom.importing', 'Importing...')}
                </>
              ) : (
                t('gedcom.import', 'Import to Tree')
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GedcomImporter;

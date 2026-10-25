import React, { useState } from 'react';
import useModalA11y from '../hooks/useModalA11y';
import useTreeFields from '../hooks/useTreeFields';
import { formatSpouseNames } from '../hooks/useTreeSettings';

const Field = ({ label, children }) => {
  if (children == null || children === '') return null;
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-900">{children}</dd>
    </div>
  );
};

/**
 * Read-only person detail popup. Shown from the node "view" button.
 * Optional onEdit opens the edit modal for editors.
 */
/**
 * @param {Array} [fields] field definitions supplied by the caller. Public and
 *   viewer-link pages receive them with the tree payload, since they cannot
 *   call the authenticated fields endpoint; everywhere else they are fetched.
 */
const PersonDetailModal = ({ person, treeId, fields, onClose, onEdit }) => {
  const modalRef = useModalA11y({ onClose, enabled: !!person });
  const [codeCopied, setCodeCopied] = useState(false);
  // Definitions supply the label and the order; the person row only has keys.
  const { fields: fetchedFields } = useTreeFields(fields ? null : treeId);
  const customFieldDefs = fields || fetchedFields;

  if (!person) return null;

  const genderLabel =
    person.gender === 'M' || person.gender === 'MALE' ? 'Male'
      : person.gender === 'F' || person.gender === 'FEMALE' ? 'Female'
        : null;

  const years = [
    person.birthYear != null ? `b. ${person.birthYear}` : null,
    person.deathYear != null ? `d. ${person.deathYear}` : null,
  ].filter(Boolean).join(' · ');

  const copyPublicCode = async () => {
    if (!person.publicCode) return;
    try {
      await navigator.clipboard.writeText(person.publicCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 1600);
    } catch (_) { /* ignore */ }
  };

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[2000] p-4 focus:outline-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="person-detail-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 pt-6 pb-4 flex-shrink-0 border-b border-gray-100">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 border border-gray-200 flex-shrink-0 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <h2 id="person-detail-title" className="text-xl font-bold text-gray-900 truncate">
                {person.name || person.arabicName || 'Person'}
              </h2>
              {person.arabicName && person.name && (
                <p className="arabic-text text-sm text-gray-600 mt-0.5">{person.arabicName}</p>
              )}
              {person.title && (
                <p className="text-sm text-primary-700 font-medium mt-1">{person.title}</p>
              )}
              {years && <p className="text-xs text-gray-500 mt-1">{years}</p>}
              {person.publicCode && (
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Person ID</span>
                  <code className="text-sm font-mono font-semibold text-primary-800 bg-primary-50 px-2 py-0.5 rounded">
                    {person.publicCode}
                  </code>
                  <button
                    type="button"
                    onClick={copyPublicCode}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary-700 hover:text-primary-900 transition-colors"
                    aria-label="Copy person ID"
                  >
                    {codeCopied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
              aria-label="Close"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <dl className="px-6 py-5 space-y-4 overflow-y-auto flex-1 min-h-0">
          <Field label="Generation">{person.generation != null ? person.generation : null}</Field>
          <Field label="Gender">{genderLabel}</Field>
          <Field label="Status">
            {person.isLiving === true ? 'Living' : person.isLiving === false ? 'Deceased' : null}
          </Field>
          <Field label="Place of origin">{person.placeOfOrigin}</Field>
          <Field label={(person.spouseNames?.length || 0) > 1 ? 'Spouses' : 'Spouse'}>
            {formatSpouseNames(person)}
          </Field>
          <Field label="Other parent">{person.coParentName}</Field>
          <Field label="Honorific">{person.honorificName}</Field>
          <Field label="Epithet">{person.epithet}</Field>
          <Field label="Patronymic">{person.patronymic}</Field>
          <Field label="Clan">{person.clanName}</Field>
          <Field label="Description">
            {person.description ? (
              <span className="whitespace-pre-wrap">{person.description}</span>
            ) : null}
          </Field>
          <Field label="Notes">
            {person.notes && person.notes !== 'LINEAGE_CONNECTION' ? (
              <span className="whitespace-pre-wrap">{person.notes}</span>
            ) : null}
          </Field>

          {customFieldDefs.map((f) => {
            const raw = person.customFields?.[f.fieldKey];
            if (raw == null || raw === '') return null;
            const display = f.fieldType === 'CHECKBOX'
              ? (raw === true || raw === 'true' ? 'Yes' : 'No')
              : String(raw);
            return (
              <Field key={f.fieldKey} label={f.label}>
                <span className="whitespace-pre-wrap">{display}</span>
              </Field>
            );
          })}
        </dl>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
          >
            Close
          </button>
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(person)}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-700 hover:bg-primary-800 rounded-lg transition-colors"
            >
              Edit
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PersonDetailModal;

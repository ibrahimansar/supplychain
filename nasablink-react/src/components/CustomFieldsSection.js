import React from 'react';
import { Input, Textarea, Select, Checkbox } from './ui/Input';

/**
 * Renders the person form's admin-defined fields.
 *
 * The shape comes entirely from the tree's field definitions, so this component
 * never knows what it is collecting — which is the point: a clan archive's
 * "lineage branch" and a village register's "house name" render through the
 * same code.
 *
 * @param {Array}  fields  definitions from the tree, already ordered
 * @param {object} values  current form state, keyed by fieldKey
 * @param {(key: string, value: any) => void} onChange
 * @param {string[]} [missingKeys] keys to flag as required-but-empty
 * @param {boolean} [loading]
 */
export default function CustomFieldsSection({
  fields,
  values,
  onChange,
  missingKeys = [],
  loading = false,
  title = 'Additional details',
}) {
  if (loading) {
    return (
      <div className="space-y-3" aria-busy="true">
        <div className="h-3 w-32 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-9 w-full rounded-lg bg-gray-100 dark:bg-gray-800" />
      </div>
    );
  }

  if (!fields || fields.length === 0) return null;

  const missing = new Set(missingKeys);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h4>
        <span className="text-[11px] text-gray-500 dark:text-gray-400">
          set up for this tree
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fields.map((f) => {
          const id = `cf-${f.fieldKey}`;
          const value = values?.[f.fieldKey];
          const hasError = missing.has(f.fieldKey);
          const describedBy = f.helpText ? `${id}-help` : undefined;

          // A textarea reads better across the full row than beside another field.
          const spanFull = f.fieldType === 'TEXTAREA' || f.fieldType === 'CHECKBOX';

          return (
            <div key={f.fieldKey} className={spanFull ? 'sm:col-span-2' : ''}>
              {f.fieldType === 'CHECKBOX' ? (
                <label htmlFor={id} className="flex items-start gap-2.5 cursor-pointer">
                  <Checkbox
                    id={id}
                    checked={value === true || value === 'true'}
                    onChange={(e) => onChange(f.fieldKey, e.target.checked)}
                    aria-describedby={describedBy}
                    className="mt-0.5"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {f.label}
                      {f.required && <span className="text-red-500 ms-1">*</span>}
                    </span>
                    {f.helpText && (
                      <span id={describedBy} className="block text-xs text-gray-500 dark:text-gray-400">
                        {f.helpText}
                      </span>
                    )}
                  </span>
                </label>
              ) : (
                <>
                  <label
                    htmlFor={id}
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    {f.label}
                    {f.required && <span className="text-red-500 ms-1">*</span>}
                  </label>

                  {f.fieldType === 'TEXTAREA' && (
                    <Textarea
                      id={id}
                      rows={3}
                      value={value ?? ''}
                      error={hasError}
                      aria-describedby={describedBy}
                      onChange={(e) => onChange(f.fieldKey, e.target.value)}
                    />
                  )}

                  {f.fieldType === 'SELECT' && (
                    <Select
                      id={id}
                      value={value ?? ''}
                      error={hasError}
                      aria-describedby={describedBy}
                      onChange={(e) => onChange(f.fieldKey, e.target.value)}
                    >
                      <option value="">Select…</option>
                      {(f.options || []).map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </Select>
                  )}

                  {(f.fieldType === 'TEXT' || f.fieldType === 'NUMBER' || f.fieldType === 'DATE') && (
                    <Input
                      id={id}
                      type={f.fieldType === 'NUMBER' ? 'number' : f.fieldType === 'DATE' ? 'date' : 'text'}
                      value={value ?? ''}
                      error={hasError}
                      aria-describedby={describedBy}
                      onChange={(e) => onChange(f.fieldKey, e.target.value)}
                    />
                  )}

                  {f.helpText && (
                    <p id={describedBy} className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {f.helpText}
                    </p>
                  )}
                </>
              )}

              {hasError && (
                <p className="mt-1 text-xs text-red-500 dark:text-red-400">
                  {f.label} is required.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

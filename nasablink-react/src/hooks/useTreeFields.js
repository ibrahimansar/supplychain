import { useCallback, useEffect, useRef, useState } from 'react';
import { treeAPI } from '../services/api';

/**
 * The tree's admin-defined person fields.
 *
 * Every person form needs these before it can render, so the API layer caches
 * them per tree; this hook only owns the request lifecycle. A failure resolves
 * to an empty list rather than an error state: a person form that cannot reach
 * the field service should still let someone save a name.
 *
 * @param {string|number|null} treeId
 * @param {{ includeDisabled?: boolean }} [opts]
 */
export default function useTreeFields(treeId, { includeDisabled = false } = {}) {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(!!treeId);
  const activeRef = useRef(true);

  useEffect(() => {
    activeRef.current = true;
    return () => { activeRef.current = false; };
  }, []);

  const load = useCallback(async ({ forceRefresh = false } = {}) => {
    if (!treeId) {
      setFields([]);
      setLoading(false);
      return [];
    }
    setLoading(true);
    try {
      const res = await treeAPI.getTreeFields(treeId, { includeDisabled, forceRefresh });
      const list = Array.isArray(res?.data) ? res.data : [];
      if (activeRef.current) setFields(list);
      return list;
    } catch (_) {
      if (activeRef.current) setFields([]);
      return [];
    } finally {
      if (activeRef.current) setLoading(false);
    }
  }, [treeId, includeDisabled]);

  useEffect(() => { load(); }, [load]);

  return { fields, loading, reload: load, setFields };
}

/**
 * Starting values for a form, so an uncontrolled input never becomes
 * controlled halfway through editing.
 *
 * @param {Array} fields definitions from {@link useTreeFields}
 * @param {object} [existing] values already on the person
 */
export function buildCustomFieldState(fields, existing = {}) {
  const out = {};
  (fields || []).forEach((f) => {
    const raw = existing?.[f.fieldKey];
    if (f.fieldType === 'CHECKBOX') out[f.fieldKey] = raw === true || raw === 'true';
    else out[f.fieldKey] = raw == null ? '' : String(raw);
  });
  return out;
}

/**
 * Converts form state to the request payload.
 *
 * Blank text becomes null so the server clears the key instead of storing an
 * empty string — `custom_fields` should hold answers, not placeholders.
 */
export function serialiseCustomFields(fields, state) {
  const out = {};
  (fields || []).forEach((f) => {
    const v = state?.[f.fieldKey];
    if (f.fieldType === 'CHECKBOX') out[f.fieldKey] = v === true || v === 'true';
    else out[f.fieldKey] = v == null || String(v).trim() === '' ? null : String(v).trim();
  });
  return out;
}

/** Client-side mirror of the server's required check, for inline messages. */
export function findMissingRequired(fields, state) {
  return (fields || []).filter((f) => {
    if (!f.required) return false;
    const v = state?.[f.fieldKey];
    if (f.fieldType === 'CHECKBOX') return v !== true && v !== 'true';
    return v == null || String(v).trim() === '';
  });
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { treeAPI } from '../services/api';

/**
 * This tree's customisation settings.
 *
 * Failure resolves to defaults rather than an error state: a form that cannot
 * reach the settings endpoint should still let someone record a name, and every
 * setting here is additive, so defaulting off is the safe direction.
 */
export default function useTreeSettings(treeId) {
  const [settings, setSettings] = useState(null);
  const activeRef = useRef(true);

  useEffect(() => {
    activeRef.current = true;
    return () => { activeRef.current = false; };
  }, []);

  const load = useCallback(async () => {
    if (!treeId) { setSettings({}); return {}; }
    try {
      const res = await treeAPI.getTreeCustomisation(treeId);
      const data = res?.data || {};
      if (activeRef.current) setSettings(data);
      return data;
    } catch (_) {
      if (activeRef.current) setSettings({});
      return {};
    }
  }, [treeId]);

  useEffect(() => { load(); }, [load]);

  return {
    settings: settings || {},
    loading: settings === null,
    allowMultipleSpouses: settings?.allowMultipleSpouses === true,
    reload: load,
  };
}

/** "Fatima, Khadija" — display only; the structured list stays the source of truth. */
export function formatSpouseNames(person) {
  const list = person?.spouseNames;
  if (Array.isArray(list) && list.length > 0) return list.join(', ');
  return person?.spouseName || '';
}

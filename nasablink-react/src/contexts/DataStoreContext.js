import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { meAPI } from '../services/api';
import { writeLastCount, STORAGE_KEYS } from '../utils/skeletonCount';

/**
 * DataStoreContext — lightweight in-memory store for data that should survive
 * React Router navigation without a re-fetch.
 *
 * Scope: trees list (the #1 cause of unnecessary reloads).
 *
 * Relationship to the LRU cache in api.js:
 *   - api.js cache  → prevents redundant network calls (survives page refresh via sessionStorage)
 *   - DataStore     → keeps React state alive across route unmounts (zero-latency re-renders)
 * Both layers work together: the store is the fast path for in-session navigation;
 * the API cache is the fallback for hard reloads.
 */

const TREES_STALE_AFTER = 5 * 60 * 1000; // 5 minutes

const DataStoreContext = createContext(null);

export function DataStoreProvider({ children }) {
  const { authenticated } = useAuth();

  // null  = never loaded
  // []    = loaded, user has no trees
  // [...] = loaded with data
  const [trees, setTreesRaw] = useState(null);
  const [treesLoadedAt, setTreesLoadedAt] = useState(null);

  /** Replace the full trees list and stamp the load time. */
  const setTreesList = useCallback((data) => {
    const list = Array.isArray(data) ? data : [];
    setTreesRaw(list);
    setTreesLoadedAt(Date.now());
    writeLastCount(STORAGE_KEYS.trees, list.length);
  }, []);

  /**
   * Optimistically update one tree's name in the list.
   * Called after a successful rename API call so the UI updates instantly.
   */
  const updateTreeName = useCallback((treeId, newName) => {
    setTreesRaw(prev =>
      prev
        ? prev.map(t => (t.familyTreeId === treeId ? { ...t, treeName: newName } : t))
        : prev
    );
  }, []);

  /** Remove a tree from the list after the user leaves (or deletes) it. */
  const removeTree = useCallback((treeId) => {
    setTreesRaw(prev =>
      prev ? prev.filter(t => String(t.familyTreeId) !== String(treeId)) : prev
    );
  }, []);

  /**
   * Bust the trees list — call after tree create or delete.
   * Clears both the React state and the API-layer sessionStorage cache.
   */
  const invalidateTrees = useCallback(() => {
    setTreesRaw(null);
    setTreesLoadedAt(null);
    meAPI.invalidateMyTrees();
  }, []);

  /** True when cached data is older than TREES_STALE_AFTER. */
  const isTreesStale = useCallback(() => {
    if (!treesLoadedAt) return true;
    return Date.now() - treesLoadedAt > TREES_STALE_AFTER;
  }, [treesLoadedAt]);

  // Clear everything on logout so the next user starts fresh.
  useEffect(() => {
    if (!authenticated) {
      setTreesRaw(null);
      setTreesLoadedAt(null);
    }
  }, [authenticated]);

  return (
    <DataStoreContext.Provider
      value={{
        trees,
        treesLoadedAt,
        isTreesStale,
        setTreesList,
        updateTreeName,
        removeTree,
        invalidateTrees,
      }}
    >
      {children}
    </DataStoreContext.Provider>
  );
}

export const useDataStore = () => {
  const ctx = useContext(DataStoreContext);
  if (!ctx) throw new Error('useDataStore must be used inside DataStoreProvider');
  return ctx;
};

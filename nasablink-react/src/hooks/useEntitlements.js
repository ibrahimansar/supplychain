import { useEffect, useRef, useState } from 'react';
import { meAPI } from '../services/api';

/**
 * What this account's plan currently allows.
 *
 * Shared so the banner that says "you can't create new ones" and the button
 * that creates them read the same answer. They used to decide separately, and
 * disagreed: the banner keyed off `overLimit` (used > limit) while the server
 * refuses at `used >= limit`, so a user sitting exactly on their limit saw no
 * banner, an enabled button, and a 403 only after naming the tree.
 *
 * `canCreateTree` is computed server-side for that reason — the rule lives in
 * one place rather than being re-derived here.
 *
 * A failed fetch resolves permissive: a plan lookup that is down should not
 * block someone from using the product. The server is the real gate.
 */
export default function useEntitlements() {
  const [entitlements, setEntitlements] = useState(null);
  const [loading, setLoading] = useState(true);
  const activeRef = useRef(true);

  useEffect(() => {
    activeRef.current = true;
    meAPI.getEntitlements()
      .then((res) => { if (activeRef.current) setEntitlements(res?.data || null); })
      .catch(() => { if (activeRef.current) setEntitlements(null); })
      .finally(() => { if (activeRef.current) setLoading(false); });
    return () => { activeRef.current = false; };
  }, []);

  const trees = entitlements?.trees;

  return {
    entitlements,
    loading,
    // Unknown means allowed — see above.
    canCreateTree: trees?.canCreateMore !== false,
    treesUsed: trees?.used ?? null,
    treeLimit: trees?.limit ?? null,
    isPlus: entitlements?.isPlus === true,
  };
}

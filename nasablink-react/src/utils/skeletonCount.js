/**
 * Helpers to keep loading skeletons from looking worse than the real list.
 * Persist last-known counts so a refresh doesn't flash 6 placeholders for 2 items.
 */

export function readLastCount(storageKey, fallback = 3, { min = 1, max = 4 } = {}) {
  try {
    const raw = sessionStorage.getItem(storageKey);
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return fallback;
    return Math.max(min, Math.min(max, Math.round(n) || fallback));
  } catch {
    return fallback;
  }
}

export function writeLastCount(storageKey, count) {
  try {
    const n = Array.isArray(count) ? count.length : Number(count);
    if (!Number.isFinite(n) || n < 0) return;
    sessionStorage.setItem(storageKey, String(Math.round(n)));
  } catch {
    /* ignore quota / private mode */
  }
}

export const STORAGE_KEYS = {
  trees: 'nasablink:skel:trees',
  members: 'nasablink:skel:members',
  viewerLinks: 'nasablink:skel:viewerLinks',
  connections: 'nasablink:skel:connections',
};

/**
 * Per-tree variant of a storage key.
 *
 * Counts differ wildly between trees — a 40-member tree and a 2-member tree
 * share nothing useful. Without scoping, opening the small one right after the
 * large one draws far too many placeholders, which is exactly the mismatch
 * these helpers exist to prevent.
 */
export function scopedKey(baseKey, scopeId) {
  return scopeId == null || scopeId === '' ? baseKey : `${baseKey}:${scopeId}`;
}

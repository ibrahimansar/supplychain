import { lazy } from 'react';

/**
 * React.lazy that survives a redeploy.
 *
 * Each build emits chunk filenames containing a content hash. A tab holding an
 * older index.html asks for hashes that no longer exist on the server, so the
 * dynamic import rejects with a chunk-load error. React then keeps Suspense in
 * its fallback, which is how a route ends up blank forever — and it only hits
 * the routes whose chunks actually changed, so it looks like those specific
 * pages are broken.
 *
 * One reload fetches the current index.html and the correct hashes. The attempt
 * is recorded in sessionStorage first so a genuinely missing chunk can't cause
 * a reload loop; the second failure is rethrown for the error boundary to show.
 *
 * @param {() => Promise<{default: React.ComponentType}>} factory
 * @param {string} name stable key for the reload guard (the page name)
 */
export default function lazyWithRetry(factory, name) {
  const key = `chunkReloaded:${name}`;

  return lazy(async () => {
    try {
      const module = await factory();
      // Loaded fine — clear the guard so a future redeploy may retry once more.
      try { sessionStorage.removeItem(key); } catch (_) { /* private mode */ }
      return module;
    } catch (error) {
      let alreadyTried = true;
      try {
        alreadyTried = sessionStorage.getItem(key) === '1';
        if (!alreadyTried) sessionStorage.setItem(key, '1');
      } catch (_) {
        // Without storage we cannot guard against looping, so don't reload.
        throw error;
      }

      if (alreadyTried) throw error;

      window.location.reload();
      // The reload replaces the page; never settle so nothing renders meanwhile.
      return new Promise(() => {});
    }
  });
}

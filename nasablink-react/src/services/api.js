import axios from 'axios';
import { API_BASE_URL } from '../config/env';
import odataAdapter from './odataAdapter';
import { appPathname, withBase } from '../config/basePath';
import { getApiErrorMessage, getApiErrorCode, getApiValidationErrors } from '../utils/apiError';
export { getApiErrorMessage, getApiErrorCode, getApiValidationErrors };

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  adapter: odataAdapter, // REST-style calls are served from the CAP OData service
  timeout: 30000, // 30s default — enough for normal calls on slow connections
});

// Retry configuration - DISABLED to prevent automatic retries
// const RETRY_CONFIG = {
//   maxRetries: 0, // Set to 0 to disable automatic retries
//   retryDelay: 1000,
//   retryCondition: (error) => {
//     // Never retry automatically - let user handle retries manually
//     return false;
//   }
// };

// Global error handler (will be set by ErrorProvider)
let globalErrorHandler = null;
export const setGlobalErrorHandler = (handler) => {
  globalErrorHandler = handler;
};

// ── Rate-limit circuit breaker ────────────────────────────────────────────────
// When a 429 is received we record the reset timestamp.  Every subsequent
// request is rejected *immediately* (no network call) until that time passes.
// This prevents cascading 429 storms where dozens of in-flight or queued
// requests all hammer the server after the limit is already exceeded.
let rateLimitedUntil = 0; // epoch ms; 0 = not rate-limited

export const isRateLimited = () => Date.now() < rateLimitedUntil;
export const getRateLimitResetMs = () => rateLimitedUntil;

// Request interceptor — short-circuit blocked requests before they touch the network
api.interceptors.request.use(
  (config) => {
    if (Date.now() < rateLimitedUntil) {
      const msLeft = rateLimitedUntil - Date.now();
      const secs   = Math.ceil(msLeft / 1000);
      // Build a synthetic error that looks exactly like a real 429 response so
      // all downstream error handlers (GlobalToaster, ErrorContext) work as-is.
      const blocked       = new Error(`Rate limit active — please wait ${secs}s`);
      blocked.isAxiosError = true;
      blocked.config       = config;
      blocked.response     = {
        status  : 429,
        data    : { message: `Too many requests. Please wait ${secs}s before trying again.` },
        headers : { 'x-ratelimit-reset-ms': String(rateLimitedUntil) },
      };
      return Promise.reject(blocked);
    }
    return config;
  },
  (error) => Promise.reject(error)
);
// ─────────────────────────────────────────────────────────────────────────────

// Retry helper function - DISABLED
// const retryRequest = async (config, retries = 0) => {
//   try {
//     return await api(config);
//   } catch (error) {
//     if (retries < RETRY_CONFIG.maxRetries && RETRY_CONFIG.retryCondition(error)) {
//       await new Promise(resolve => setTimeout(resolve, RETRY_CONFIG.retryDelay * Math.pow(2, retries)));
//       return retryRequest(config, retries + 1);
//     }
//     throw error;
//   }
// };

// ============================================
// LRU Cache Implementation for Memory Efficiency
// ============================================
const MAX_CACHE_SIZE = 100; // Maximum entries in cache
const CACHE_CLEANUP_INTERVAL = 5 * 60 * 1000; // Cleanup every 5 minutes

class LRUCache {
  constructor(maxSize = MAX_CACHE_SIZE) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  get(key) {
    if (!this.cache.has(key)) return undefined;
    // Move to end (most recently used)
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key, value) {
    // Delete existing to update order
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    // Evict oldest entries if at capacity
    while (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  delete(key) {
    this.cache.delete(key);
  }

  has(key) {
    return this.cache.has(key);
  }

  keys() {
    return this.cache.keys();
  }

  clear() {
    this.cache.clear();
  }

  size() {
    return this.cache.size;
  }
}

// How long past expiry a cached value may still be shown while it revalidates.
const STALE_GRACE_MS = 24 * 60 * 60 * 1000;

// Simple response cache (memory + sessionStorage) for GETs - with LRU eviction
const responseCache = new LRUCache(MAX_CACHE_SIZE);
const now = () => Date.now();
const cacheKey = (k) => `respCache:${k}`;
const cacheGet = (k) => {
  const entry = responseCache.get(k);
  if (entry && entry.expires > now()) return entry.data;
  // Remove expired entry
  if (entry) responseCache.delete(k);
  try {
    const raw = sessionStorage.getItem(cacheKey(k));
    if (raw) {
      const obj = JSON.parse(raw);
      if (obj.expires > now()) {
        responseCache.set(k, obj);
        return obj.data;
      }
      sessionStorage.removeItem(cacheKey(k));
    }
  } catch (_) {}
  return undefined;
};
const cacheSet = (k, data, ttlMs = 86400000) => {
  const entry = { data, expires: now() + Math.max(1000, ttlMs) };
  responseCache.set(k, entry);
  try { sessionStorage.setItem(cacheKey(k), JSON.stringify(entry)); } catch (_) {}
};
export const cacheInvalidateByPrefix = (prefix) => {
  try {
    for (const k of Array.from(responseCache.keys())) {
      if (k.startsWith(prefix)) responseCache.delete(k);
    }
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith('respCache:')) {
        const logical = key.slice('respCache:'.length);
        if (logical.startsWith(prefix)) sessionStorage.removeItem(key);
      }
    }
  } catch (_) {}
};

/**
 * Drops every cached response. Call on sign-in and sign-out.
 *
 * Cache keys such as `me:trees` are not scoped per user, and sessionStorage
 * survives a logout within the same tab. Without this, an empty tree list
 * cached before someone was granted access is replayed on their next sign-in
 * for the whole TTL — so they are told they have no trees — and one user's
 * cached data can be shown to the next user in the same browser.
 */
export const cacheClearAll = () => {
  try {
    responseCache.clear();
    etagCache.clear();
    inFlightRequests.clear();
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i);
      if (key && (key.startsWith('respCache:') || key.startsWith('etagCache:'))) {
        sessionStorage.removeItem(key);
      }
    }
  } catch (_) { /* private mode / quota — nothing to clear */ }
};

// ETag-aware cache (separate namespace) - with LRU eviction
const etagCache = new LRUCache(MAX_CACHE_SIZE);
const etagKey = (k) => `etagCache:${k}`;
const etagCacheGet = (k) => {
  const mem = etagCache.get(k);
  if (mem && mem.expires > now()) return { data: mem.data, etag: mem.etag };
  // Remove expired entry
  if (mem) etagCache.delete(k);
  try {
    const raw = sessionStorage.getItem(etagKey(k));
    if (raw) {
      const obj = JSON.parse(raw);
      if (obj.expires > now()) {
        etagCache.set(k, obj);
        return { data: obj.data, etag: obj.etag };
      }
      sessionStorage.removeItem(etagKey(k));
    }
  } catch (_) {}
  return undefined;
};
const etagCacheSet = (k, data, etag, ttlMs = 600000) => {
  const entry = { data, etag, expires: now() + Math.max(1000, ttlMs) };
  etagCache.set(k, entry);
  try { sessionStorage.setItem(etagKey(k), JSON.stringify(entry)); } catch (_) {}
};
/**
 * Last-known value for a cache key, ignoring freshness — the read half of
 * stale-while-revalidate.
 *
 * Callers seed their initial state with this so a repeat visit renders real
 * data on the first frame and refreshes in place, instead of showing a
 * skeleton while a request that will very likely 304 goes out. Returns
 * undefined on a genuine cold load, where a skeleton IS the right answer.
 *
 * Checks the ETag tier first (conditional-GET endpoints such as members and
 * stats), then the plain response cache. Unlike the regular getters this does
 * not evict on expiry, but it refuses entries stale by more than a day.
 */
export const peekCachedData = (key) => {
  const tiers = [[etagCache, etagKey], [responseCache, cacheKey]];
  for (const [store, storageKeyFor] of tiers) {
    let entry = store.get(key);
    if (!entry) {
      try {
        const raw = sessionStorage.getItem(storageKeyFor(key));
        if (raw) entry = JSON.parse(raw);
      } catch (_) { /* unparseable or unavailable storage */ }
    }
    if (entry && entry.data !== undefined && entry.expires + STALE_GRACE_MS > now()) {
      return entry.data;
    }
  }
  return undefined;
};

const etagInvalidateByPrefix = (prefix) => {
  try {
    for (const k of Array.from(etagCache.keys())) {
      if (k.startsWith(prefix)) etagCache.delete(k);
    }
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith('etagCache:')) {
        const logical = key.slice('etagCache:'.length);
        if (logical.startsWith(prefix)) sessionStorage.removeItem(key);
      }
    }
  } catch (_) {}
};

// ── In-flight request deduplication ────────────────────────────────────────
// Maps logical cache key → pending Promise so concurrent identical GETs share
// one network call instead of firing independently.
const inFlightRequests = new Map();

/**
 * Unified cached GET helper (Phase 2 core).
 * 1. Sync LRU hit → resolved Promise (zero overhead)
 * 2. In-flight hit → share the existing Promise
 * 3. Network call  → cache on settle, clean up in-flight entry
 */
const cachedGet = (url, key, ttlMs, axiosConfig = {}) => {
  const cached = cacheGet(key);
  if (cached !== undefined) return Promise.resolve({ data: cached, fromCache: true });

  if (inFlightRequests.has(key)) return inFlightRequests.get(key);

  const promise = api.get(url, axiosConfig)
    .then(res => {
      cacheSet(key, res.data, ttlMs);
      inFlightRequests.delete(key);
      return res;
    })
    .catch(err => {
      inFlightRequests.delete(key);
      throw err;
    });

  inFlightRequests.set(key, promise);
  return promise;
};

// Periodic cache cleanup to remove expired entries
const cleanupExpiredCache = () => {
  const currentTime = now();
  // Clean response cache
  for (const k of Array.from(responseCache.keys())) {
    const entry = responseCache.cache.get(k);
    if (entry && entry.expires <= currentTime) {
      responseCache.delete(k);
    }
  }
  // Clean etag cache
  for (const k of Array.from(etagCache.keys())) {
    const entry = etagCache.cache.get(k);
    if (entry && entry.expires <= currentTime) {
      etagCache.delete(k);
    }
  }
};

// Start periodic cleanup (only in browser environment)
if (typeof window !== 'undefined') {
  setInterval(cleanupExpiredCache, CACHE_CLEANUP_INTERVAL);
}

// Enhanced response interceptor with error context integration
api.interceptors.response.use(
  (response) => {
    // Clear any loading state if set
    if (globalErrorHandler) {
      globalErrorHandler.setLoading(false);
    }
    return response;
  },
  async (error) => {
    // NO automatic retries - disabled to prevent hitting rate limits multiple times
    // All retries should be manual user actions only

    // Set loading state
    if (globalErrorHandler) {
      globalErrorHandler.setLoading(false);
    }

    // Handle different error types
    if (error?.response?.status === 401) {
      if (appPathname() !== '/login') {
        window.location.href = withBase('/login');
      }
    } else if (error?.response?.status === 403) {
      // If forbidden, kick back to tree selector (or login if unauthenticated)
      const path = appPathname();
      if (path.startsWith('/trees/')) {
        window.location.href = withBase('/trees');
      }
      if (globalErrorHandler) {
        globalErrorHandler.addError(error, 'AUTHORIZATION');
      }
    } else if (error?.response?.status === 429) {
      const msg = getApiErrorMessage(error?.response?.data, 'Rate limit exceeded. Please wait and try again.');

      // ── Arm the circuit breaker ───────────────────────────────────────────
      // Parse the server-supplied reset time; fall back to 60 s from now.
      let resetAtMs;
      try {
        const headers = (error && error.response && error.response.headers) || {};
        const ra = headers['x-ratelimit-reset-ms'] || headers['X-RateLimit-Reset-MS']
                || headers['retry-after']            || headers['Retry-After'];
        if (ra) {
          // Header may be an absolute epoch-ms value or a relative "seconds to wait"
          const v = parseInt(ra, 10);
          if (!Number.isNaN(v)) {
            // If the value looks like a relative seconds value (< 1 000 000 000 000)
            // treat it as seconds-to-wait, otherwise as absolute epoch ms.
            resetAtMs = v < 1_000_000_000_000 ? Date.now() + v * 1000 : v;
          }
        }
      } catch (_) {}
      if (!resetAtMs) resetAtMs = Date.now() + 60_000; // safe default: 60 s

      // Block all subsequent requests until the window resets
      rateLimitedUntil = resetAtMs;

      // Auto-lift the circuit breaker when the window expires so the user
      // does not need to reload the page.
      const msUntilReset = resetAtMs - Date.now();
      if (msUntilReset > 0) {
        setTimeout(() => { rateLimitedUntil = 0; }, msUntilReset);
      }
      // ─────────────────────────────────────────────────────────────────────

      // Skip notification for requests that were *already* blocked by the
      // circuit breaker (isRateLimitBlocked flag) to avoid duplicate toasts.
      if (!error.isRateLimitBlocked) {
        try {
          if (window && typeof window.dispatchEvent === 'function') {
            window.dispatchEvent(new CustomEvent('nasablink:rate-limit', {
              detail: { message: msg, resetAtMs }
            }));
          }
        } catch (_) {}

        if (globalErrorHandler) {
          globalErrorHandler.addError({
            message: msg,
            resetAtMs,
            response: error.response
          }, 'API');
        }
      }
    } else if ([502, 503, 504].includes(error?.response?.status)) {
      // Gateway/Bad Gateway/Service Unavailable errors
      const userFriendlyError = {
        ...error,
        response: {
          ...error.response,
          data: {
            message: 'The service is currently down for maintenance. Please try again later.',
            status: error.response.status
          }
        }
      };

      if (globalErrorHandler) {
        globalErrorHandler.addError(userFriendlyError, 'NETWORK');
      }

      return Promise.reject(userFriendlyError);
    } else if (error?.response?.status >= 500) {
      // Server errors - show user-friendly message
      const userFriendlyError = {
        ...error,
        response: {
          ...error.response,
          data: {
            message: 'The service is currently down for maintenance. Please try again later.',
            status: error.response.status
          }
        }
      };

      if (globalErrorHandler) {
        globalErrorHandler.addError(userFriendlyError, 'NETWORK');
      }

      return Promise.reject(userFriendlyError);
    } else if (error?.response?.status >= 400 && error?.response?.status < 500) {
      // Client errors - use server message or generic message
      if (globalErrorHandler) {
        globalErrorHandler.addError(error, 'VALIDATION');
      }
    } else if (error?.code === 'ECONNABORTED' || error?.code === 'ENOTFOUND' || error?.code === 'ECONNREFUSED') {
      // Network errors
      const networkError = {
        ...error,
        response: {
          data: {
            message: 'Unable to connect. Please check your internet connection and try again.',
            status: 0
          }
        }
      };

      if (globalErrorHandler) {
        globalErrorHandler.addError(networkError, 'NETWORK');
      }

      return Promise.reject(networkError);
    } else if (error?.message?.includes('Network Error') || error?.message?.includes('Failed to fetch')) {
      // Generic network errors
      const networkError = {
        ...error,
        response: {
          data: {
            message: 'Network connection lost. Please check your internet connection.',
            status: 0
          }
        }
      };

      if (globalErrorHandler) {
        globalErrorHandler.addError(networkError, 'NETWORK');
      }

      return Promise.reject(networkError);
    } else {
      // Unknown errors
      if (globalErrorHandler) {
        globalErrorHandler.addError(error, 'UNKNOWN');
      }
    }

    return Promise.reject(error);
  }
);

// Tree API (multi-tree routes)
export const treeAPI = {
  _id: () => {
    if (typeof window === 'undefined') return null;
    if (window.NASAB_CURRENT_TREE_ID) return window.NASAB_CURRENT_TREE_ID;
    const m = appPathname().match(/^\/trees\/([^/]+)/);
    return m ? m[1] : null;
  },
  _path: (suffix = '') => {
    const id = treeAPI._id();
    if (!id) throw new Error('No active tree selected');
    return `/trees/${encodeURIComponent(id)}${suffix}`;
  },
  getTree: (forceRefresh = false) => {
    const id = treeAPI._id();
    const key = `tree:${id}:full`;
    if (forceRefresh) {
      responseCache.delete(key);
      inFlightRequests.delete(key);
    }
    return cachedGet(treeAPI._path('/tree'), key, 60_000, { timeout: 60_000 });
  },
  getChildren: (personId) => api.get(treeAPI._path(`/children/${personId}`)),
  getPerson: (personId) => api.get(treeAPI._path(`/person/${personId}`)),
  // No delete endpoint for viewer links; use revokeViewerLink instead and filter revoked links in UI
  getRoot: (forceRefresh = false) => {
    const id = treeAPI._id();
    const key = `tree:${id}:root`;
    if (forceRefresh) {
      responseCache.delete(key);
      inFlightRequests.delete(key);
    }
    return cachedGet(treeAPI._path('/root'), key, 60_000, { timeout: 60_000 });
  },
  
  // Tree meta (name, my role)
  getTreeInfo: (treeId) => {
    const key = `tree:${treeId}:info`;
    return cachedGet(`/trees/${encodeURIComponent(treeId)}/info`, key, 300_000);
  },
  
  updateTreeName: (treeId, name) => api.put(`/trees/${encodeURIComponent(treeId)}`, { name }).then(res => { cacheInvalidateByPrefix(`tree:${treeId}:`); return res; }),
  // Map to search endpoint to build lineage path
  getPersonPath: (personId) => api.get(`/search?id=${encodeURIComponent(personId)}`).then(res => ({ data: res.data.lineage || [] })),
  addPerson: (personData) => {
    const { parentId, ...data } = personData;
    const id = treeAPI._id();
    return api.post(treeAPI._path('/person'), { ...data, parentId }).then(res => { cacheInvalidateByPrefix(`tree:${id}:`); return res; });
  },
  updatePerson: (personId, personData) => api.put(treeAPI._path(`/person/${personId}`), personData).then(res => { cacheInvalidateByPrefix(`tree:${treeAPI._id()}:`); return res; }),
  deletePerson: (personId) => api.delete(treeAPI._path(`/person/${personId}`)).then(res => { cacheInvalidateByPrefix(`tree:${treeAPI._id()}:`); return res; }),
  // Whole-file GEDCOM import — one transactional request, not one per person.
  importGedcom: (treeId, payload) =>
    api.post(`/trees/${encodeURIComponent(treeId)}/gedcom/import`, payload, { timeout: 120000 })
      .then(res => { cacheInvalidateByPrefix(`tree:${treeId}:`); return res; }),
  reorderPerson: (treeId, personId, newOrderIndex) => api.post(`/trees/${encodeURIComponent(treeId)}/person/${encodeURIComponent(personId)}/reorder`, { orderIndex: newOrderIndex }).then(res => { cacheInvalidateByPrefix(`tree:${treeId}:`); return res; }),
  // Spouse management endpoints
  addSpouse: (personId, spouseId, spouseTreeId) => api.post(treeAPI._path(`/person/${personId}/spouse`), spouseTreeId ? { spouseId, spouseTreeId } : { spouseId }).then(res => { cacheInvalidateByPrefix(`tree:${treeAPI._id()}:`); return res; }),
  removeSpouse: (personId, treeId) => api.delete(treeAPI._path(`/person/${personId}/spouse`)).then(res => { cacheInvalidateByPrefix(`tree:${treeAPI._id()}:`); return res; }),
  getSpouse: (personId) => api.get(treeAPI._path(`/person/${personId}/spouse`)),
  /** Resolve person by public code (ABC123456) for spouse linking */
  lookupPersonByCode: (treeId, code) =>
    api.get(`/trees/${encodeURIComponent(treeId)}/persons/by-code/${encodeURIComponent(code)}`),
  generateTestData: (count) => api.post(treeAPI._path(`/generate-test-data?count=${count}`)).then(res => { cacheInvalidateByPrefix(`tree:${treeAPI._id()}:`); return res; }),
  // Person search within current tree
  searchPersons: (query) => api.get(treeAPI._path(`/search?name=${encodeURIComponent(query)}`)),
  // Person search across all approved linked trees — returns results with treeId + treeName
  searchLinkedTreePersons: (treeId, query) => api.get(`/trees/${encodeURIComponent(treeId)}/search/linked?name=${encodeURIComponent(query)}`),
  // Document management
  listDocuments: (treeId) => api.get(`/trees/${encodeURIComponent(treeId)}/documents`),
  uploadDocument: (treeId, formData) => api.post(`/trees/${encodeURIComponent(treeId)}/documents/upload`, formData),
  createTextDocument: (treeId, { name, content, linkedPersonId }) => {
    const params = new URLSearchParams({ name, content });
    if (linkedPersonId) {
      params.append('linkedPersonId', linkedPersonId);
    }
    return api.post(`/trees/${encodeURIComponent(treeId)}/documents/text`, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
  },
  downloadDocument: (treeId, documentId) => api.get(`/trees/${encodeURIComponent(treeId)}/documents/${encodeURIComponent(documentId)}/download`, {
    responseType: 'blob'
  }),
  deleteDocument: (treeId, documentId) => api.delete(`/trees/${encodeURIComponent(treeId)}/documents/${encodeURIComponent(documentId)}`),

  // Citation management (document ↔ person evidence links)
  getCitationsForPerson: (treeId, personId) =>
    cachedGet(
      `/trees/${encodeURIComponent(treeId)}/citations/person/${encodeURIComponent(personId)}`,
      `citations:${treeId}:${personId}`,
      2 * 60_000
    ),
  getCitationsForDocument: (treeId, documentId) => api.get(`/trees/${encodeURIComponent(treeId)}/citations/document/${encodeURIComponent(documentId)}`),
  getCitationsForField: (treeId, personId, fieldName) => api.get(`/trees/${encodeURIComponent(treeId)}/citations/person/${encodeURIComponent(personId)}/field/${encodeURIComponent(fieldName)}`),
  createCitation: (treeId, data) => api.post(`/trees/${encodeURIComponent(treeId)}/citations`, data)
    .then(res => { cacheInvalidateByPrefix(`citations:${treeId}:`); return res; }),
  updateCitation: (treeId, citationId, data) => api.put(`/trees/${encodeURIComponent(treeId)}/citations/${encodeURIComponent(citationId)}`, data)
    .then(res => { cacheInvalidateByPrefix(`citations:${treeId}:`); return res; }),
  deleteCitation: (treeId, citationId) => api.delete(`/trees/${encodeURIComponent(treeId)}/citations/${encodeURIComponent(citationId)}`)
    .then(res => { cacheInvalidateByPrefix(`citations:${treeId}:`); return res; }),

  searchPublicPersons: (treeId, token, query) => {
    return api.get(`/public/trees/${encodeURIComponent(treeId)}/search?name=${encodeURIComponent(query)}&token=${encodeURIComponent(token)}`);
  },
  // Admin endpoints
  getVerifiers: (treeId) => {
    const key = `admin:${treeId}:verifiers`;
    const cached = etagCacheGet(key);
    return api.get(`/admin/trees/${encodeURIComponent(treeId)}/verifiers`, {
      headers: cached?.etag ? { 'If-None-Match': cached.etag } : {},
      validateStatus: (s) => (s >= 200 && s < 300) || s === 304,
    }).then(res => {
      const etag = res.headers && (res.headers['etag'] || res.headers['ETag']);
      if (res.status === 304 && cached) {
        return { data: cached.data, headers: res.headers, status: 200 };
      }
      if (etag) etagCacheSet(key, res.data, etag, 600000);
      return res;
    });
  },
  addVerifier: (treeId, payload) => api.post(`/admin/trees/${encodeURIComponent(treeId)}/verifiers`, payload).then(res => { cacheInvalidateByPrefix(`admin:${treeId}:`); etagInvalidateByPrefix(`admin:${treeId}:`); return res; }),
  deleteVerifier: (treeId, membershipId) => api.delete(`/admin/trees/${encodeURIComponent(treeId)}/verifiers/${membershipId}`).then(res => { cacheInvalidateByPrefix(`admin:${treeId}:`); etagInvalidateByPrefix(`admin:${treeId}:`); return res; }),
  getViewerLinks: (treeId) => {
    const key = `admin:${treeId}:viewerLinks`;
    const cached = etagCacheGet(key);
    return api.get(`/admin/trees/${encodeURIComponent(treeId)}/viewer-links`, {
      headers: cached?.etag ? { 'If-None-Match': cached.etag } : {},
      validateStatus: (s) => (s >= 200 && s < 300) || s === 304,
    }).then(res => {
      const etag = res.headers && (res.headers['etag'] || res.headers['ETag']);
      if (res.status === 304 && cached) {
        return { data: cached.data, headers: res.headers, status: 200 };
      }
      if (etag) etagCacheSet(key, res.data, etag, 300000);
      return res;
    });
  },
  createViewerLink: (treeId, payload) => api.post(`/admin/trees/${encodeURIComponent(treeId)}/viewer-links`, payload).then(res => { cacheInvalidateByPrefix(`admin:${treeId}:viewerLinks`); etagInvalidateByPrefix(`admin:${treeId}:viewerLinks`); return res; }),
  revokeViewerLink: (treeId, id) => api.post(`/admin/trees/${encodeURIComponent(treeId)}/viewer-links/${id}/revoke`).then(res => { cacheInvalidateByPrefix(`admin:${treeId}:viewerLinks`); etagInvalidateByPrefix(`admin:${treeId}:viewerLinks`); return res; }),
  getMembers: (treeId) => {
    const key = `admin:${treeId}:members`;
    const cached = etagCacheGet(key);
    return api.get(`/trees/${encodeURIComponent(treeId)}/members`, {
      headers: cached?.etag ? { 'If-None-Match': cached.etag } : {},
      validateStatus: (s) => (s >= 200 && s < 300) || s === 304,
    }).then(res => {
      const etag = res.headers && (res.headers['etag'] || res.headers['ETag']);
      if (res.status === 304 && cached) {
        return { data: cached.data, headers: res.headers, status: 200 };
      }
      if (etag) etagCacheSet(key, res.data, etag, 600000);
      return res;
    });
  },
  getRoleLimits: (treeId) => api.get(`/trees/${encodeURIComponent(treeId)}/role-limits`),
  transferOwnership: (treeId, payload) => api.post(`/trees/${encodeURIComponent(treeId)}/owner`, payload).then(res => { cacheInvalidateByPrefix(`admin:${treeId}:`); etagInvalidateByPrefix(`admin:${treeId}:`); return res; }),
  removeMember: (treeId, userId) => api.delete(`/trees/${encodeURIComponent(treeId)}/members/${encodeURIComponent(userId)}`).then(res => { cacheInvalidateByPrefix(`admin:${treeId}:members`); etagInvalidateByPrefix(`admin:${treeId}:members`); return res; }),
  leaveTree: (treeId) => api.post(`/trees/${encodeURIComponent(treeId)}/leave`).then(res => {
    cacheInvalidateByPrefix(`admin:${treeId}:`);
    etagInvalidateByPrefix(`admin:${treeId}:`);
    cacheInvalidateByPrefix(`tree:${treeId}:`);
    cacheInvalidateByPrefix('me:trees');
    return res;
  }),
  getStats: (treeId) => {
    const key = `admin:${treeId}:stats`;
    const cached = etagCacheGet(key);
    return api.get(`/trees/${encodeURIComponent(treeId)}/stats`, {
      headers: cached?.etag ? { 'If-None-Match': cached.etag } : {},
      validateStatus: (s) => (s >= 200 && s < 300) || s === 304,
    }).then(res => {
      const etag = res.headers && (res.headers['etag'] || res.headers['ETag']);
      if (res.status === 304 && cached) {
        return { data: cached.data, headers: res.headers, status: 200 };
      }
      if (etag) etagCacheSet(key, res.data, etag, 86400000);
      return res;
    });
  },
  inviteMember: (treeId, payload) => api.post(`/trees/${encodeURIComponent(treeId)}/members/invite`, payload).then(res => { cacheInvalidateByPrefix(`admin:${treeId}:`); return res; }),
  // New viewer management under /trees/{id}/viewers
  inviteViewerByEmail: (treeId, email) => api.post(`/trees/${encodeURIComponent(treeId)}/viewers/invite`, { email }),
  listViewers: (treeId) => api.get(`/trees/${encodeURIComponent(treeId)}/viewers`),
  listViewerLinks: (treeId) => api.get(`/trees/${encodeURIComponent(treeId)}/viewers/share-links`)
    .then(res => { cacheSet(`viewers:${treeId}:links`, res.data, 300000); return res; }),
  createViewerShareLink: (treeId, payload) => api.post(`/trees/${encodeURIComponent(treeId)}/viewers/share-links`, payload)
    .then(res => { cacheInvalidateByPrefix(`viewers:${treeId}:`); return res; }),
  revokeViewerShareLink: (treeId, id) => api.post(`/trees/${encodeURIComponent(treeId)}/viewers/share-links/${id}/revoke`)
    .then(res => { cacheInvalidateByPrefix(`viewers:${treeId}:`); return res; }),
  consumeViewerLink: (treeId, token) => treeAPI.getPublicTree(treeId, token),
  updateRole: (treeId, userId, role) => api.post(`/trees/${encodeURIComponent(treeId)}/members/${encodeURIComponent(userId)}/role`, { role }),
  // Tree type management
  promoteTree: (treeId) => api.post(`/trees/${encodeURIComponent(treeId)}/promote`).then(res => { cacheInvalidateByPrefix(`admin:${treeId}:`); cacheInvalidateByPrefix(`tree:${treeId}:`); return res; }),
  demoteTree: (treeId) => api.post(`/trees/${encodeURIComponent(treeId)}/demote`).then(res => { cacheInvalidateByPrefix(`admin:${treeId}:`); cacheInvalidateByPrefix(`tree:${treeId}:`); return res; }),
  // Tree export
  exportTreeAsJson: (treeId) => api.get(`/admin/trees/${encodeURIComponent(treeId)}/export/json`, { responseType: 'blob' }),
  exportTreeAsGedcom: (treeId) => api.get(`/admin/trees/${encodeURIComponent(treeId)}/export/gedcom`, { responseType: 'blob' }),
  // Offloaded export: submit returns a job id immediately, then poll, then download.
  submitExport: (treeId, format = 'GEDCOM') =>
    api.post(`/admin/trees/${encodeURIComponent(treeId)}/exports?format=${encodeURIComponent(format)}`),
  getExportStatus: (treeId, jobId) =>
    api.get(`/admin/trees/${encodeURIComponent(treeId)}/exports/${encodeURIComponent(jobId)}`),
  downloadExport: (treeId, jobId) =>
    api.get(`/admin/trees/${encodeURIComponent(treeId)}/exports/${encodeURIComponent(jobId)}/download`, { responseType: 'blob' }),
  // No credentials: a contributor has no session, and sending one would make
  // the request depend on a cookie the browser may refuse cross-site anyway.
  getContributePage: (token) => {
    const pub = axios.create({ baseURL: API_BASE_URL, withCredentials: false });
    return pub.get(`/contribute/${encodeURIComponent(token)}`);
  },
  submitContribution: (token, body) => {
    const pub = axios.create({ baseURL: API_BASE_URL, withCredentials: false });
    return pub.post(`/contribute/${encodeURIComponent(token)}`, body);
  },
  getPublicTree: (treeId, token) => {
    const pub = axios.create({ baseURL: API_BASE_URL, withCredentials: false });
    return pub.get(`/public/trees/${encodeURIComponent(treeId)}/tree?token=${encodeURIComponent(token)}`);
  },
  getInvite: (token) => api.get(`/invites/${encodeURIComponent(token)}`),
  acceptInvite: (token) => api.post(`/invites/${encodeURIComponent(token)}/accept`),
  deleteTree: (treeId) => api.delete(`/trees/${encodeURIComponent(treeId)}`).then(res => { cacheInvalidateByPrefix(`tree:${treeId}:`); return res; }),

  // Tree Connection APIs (direct link — request/approve flow removed from UI)
  createDirectTreeLink: (treeId, targetTreeId) => api.post('/tree-connections/link', {
    treeId,
    targetTreeId,
  }).then(res => { cacheInvalidateByPrefix('conn:'); return res; }),
  getLinkedTrees: (treeId) => api.get(`/tree-connections/linked/${treeId}`)
    .then(res => { cacheSet(`conn:${treeId}:linked`, res.data, 300000); return res; }),
  removeTreeLink: (linkId) => api.delete(`/tree-connections/link/${linkId}`)
    .then(res => { cacheInvalidateByPrefix('conn:'); return res; }),

  // Person Link APIs (cross-tree person linking)
  createPersonLink: (data) => api.post('/person-links', data),
  getPersonLinks: (personId) => api.get(`/person-links/person/${personId}`),
  getTreePersonLinks: (treeId) => api.get(`/person-links/tree/${treeId}`),
  verifyPersonLink: (linkId) => api.post(`/person-links/${linkId}/verify`),
  removePersonLink: (linkId) => api.delete(`/person-links/${linkId}`),
  searchPublicTrees: (query) => api.get(`/explore/search`, { params: query }),
  getFeaturedTrees: () => api.get(`/explore/featured`),
  getExplorableTree: (treeId) => api.get(`/explore/trees/${treeId}`),
  updateTreeSettings: (treeId, settings) => api.put(`/trees/${encodeURIComponent(treeId)}`, settings).then(res => { cacheInvalidateByPrefix(`tree:${treeId}:`); return res; }),

  // --- Contribution links: asking relatives what they know ---
  createContributionLink: (treeId, body) =>
    api.post(`/trees/${encodeURIComponent(treeId)}/contributions/links`, body)
      .then(res => { cacheInvalidateByPrefix(`tree:${treeId}:contrib`); return res; }),
  listContributionLinks: (treeId) =>
    api.get(`/trees/${encodeURIComponent(treeId)}/contributions/links`),
  revokeContributionLink: (treeId, linkId) =>
    api.delete(`/trees/${encodeURIComponent(treeId)}/contributions/links/${linkId}`)
      .then(res => { cacheInvalidateByPrefix(`tree:${treeId}:contrib`); return res; }),
  listPendingContributions: (treeId) =>
    api.get(`/trees/${encodeURIComponent(treeId)}/contributions/pending`),
  pendingContributionCount: (treeId) =>
    api.get(`/trees/${encodeURIComponent(treeId)}/contributions/pending/count`),
  acceptContribution: (treeId, id) =>
    api.post(`/trees/${encodeURIComponent(treeId)}/contributions/pending/${id}/accept`),
  discardContribution: (treeId, id) =>
    api.post(`/trees/${encodeURIComponent(treeId)}/contributions/pending/${id}/discard`),

  // --- Per-tree customisation ---
  // Distinct from updateTreeSettings above, which edits the tree row itself
  // (name, visibility, layout). These are the behaviour toggles stored in
  // family_tree.settings. Cached like the field definitions: read on nearly
  // every tree screen, changed only by an admin, whose write clears it below.
  getTreeCustomisation: (treeId, { forceRefresh = false } = {}) => {
    const key = `tree:${treeId}:customisation`;
    if (forceRefresh) {
      responseCache.delete(key);
      inFlightRequests.delete(key);
    }
    return cachedGet(`/trees/${encodeURIComponent(treeId)}/settings`, key, 300_000);
  },
  updateTreeCustomisation: (treeId, settings) =>
    api.put(`/trees/${encodeURIComponent(treeId)}/settings`, settings)
      .then(res => { cacheInvalidateByPrefix(`tree:${treeId}:customisation`); return res; }),

  // --- Custom person fields (admin-configurable form) ---
  // Cached: every Add/Edit person modal needs the definitions, and they change
  // only when an admin edits them — at which point the writes below clear it.
  getTreeFields: (treeId, { includeDisabled = false, forceRefresh = false } = {}) => {
    const key = `tree:${treeId}:fields:${includeDisabled ? 'all' : 'enabled'}`;
    if (forceRefresh) {
      responseCache.delete(key);
      inFlightRequests.delete(key);
    }
    const qs = includeDisabled ? '?includeDisabled=true' : '';
    return cachedGet(`/trees/${encodeURIComponent(treeId)}/fields${qs}`, key, 300_000);
  },
  createTreeField: (treeId, field) =>
    api.post(`/trees/${encodeURIComponent(treeId)}/fields`, field)
      .then(res => { cacheInvalidateByPrefix(`tree:${treeId}:fields`); return res; }),
  updateTreeField: (treeId, fieldId, field) =>
    api.put(`/trees/${encodeURIComponent(treeId)}/fields/${fieldId}`, field)
      .then(res => { cacheInvalidateByPrefix(`tree:${treeId}:fields`); return res; }),
  deleteTreeField: (treeId, fieldId) =>
    api.delete(`/trees/${encodeURIComponent(treeId)}/fields/${fieldId}`)
      .then(res => { cacheInvalidateByPrefix(`tree:${treeId}:fields`); return res; }),
  reorderTreeFields: (treeId, fieldIds) =>
    api.put(`/trees/${encodeURIComponent(treeId)}/fields/order`, { fieldIds })
      .then(res => { cacheInvalidateByPrefix(`tree:${treeId}:fields`); return res; }),
};

// Me APIs
export const meAPI = {
  /**
   * Fetch the authenticated user's trees.
   * @param {{ background?: boolean }} opts
   *   background=true  → bypass cache read, fire a fresh network call (SWR refresh)
   *   background=false → serve from cache if fresh; deduplicate concurrent calls
   */
  getMyTrees: ({ background = false } = {}) => {
    const KEY = 'me:trees';
    const TTL = 5 * 60_000; // 5 minutes

    if (!background) {
      // Sync cache hit — instant return with no network call
      const cached = cacheGet(KEY);
      if (cached !== undefined) return Promise.resolve({ data: cached, fromCache: true });
    }

    // Background refreshes bypass in-flight dedup intentionally (we want fresh data)
    if (background) {
      return api.get('/me/trees').then(res => {
        cacheSet(KEY, res.data, TTL);
        return res;
      });
    }

    // First load: use in-flight dedup so concurrent callers share one request
    return cachedGet('/me/trees', KEY, TTL);
  },
  /** Bust the trees list cache (call after tree create / delete). */
  invalidateMyTrees: () => {
    cacheInvalidateByPrefix('me:trees');
    inFlightRequests.delete('me:trees');
  },
  getSubscription: () => api.get(`/me/subscription`),
  // Plan, usage and over-limit flags — what the UI needs to explain a downgrade.
  getEntitlements: () => api.get(`/me/entitlements`),
  // One-time 3-month Plus trial. 409 when already used or already subscribed.
  startTrial: () => api.post(`/me/trial`),
};

export const paymentAPI = {
  subscribe: (planId) => api.post('/payment/subscribe', { planId }),
  cancel: (subscriptionId) => api.post('/payment/cancel', { subscriptionId }),
  getStatus: () => api.get('/payment/status'),
};

export const gdprAPI = {
  getDeletionStatus: () => api.get('/gdpr/deletion-status'),
  getPrivacySettings: () => api.get('/gdpr/privacy-settings'),
  exportData: () => api.get('/gdpr/export', { responseType: 'blob' }),
  deleteAccount: (reason) => api.post('/gdpr/delete-account', { reason }),
  cancelDeletion: () => api.post('/gdpr/cancel-deletion'),
  savePrivacyConsents: (settings) => api.put('/gdpr/privacy-consents', settings),
};

export const monitoringAPI = {
  getStats: () => api.get('/monitoring/stats'),
  getDatabase: () => api.get('/monitoring/database'),
  getCache: () => api.get('/monitoring/cache'),
  getErrors: () => api.get('/monitoring/errors'),
  getRateLimits: () => api.get('/monitoring/rate-limits'),
  clearCache: () => api.post('/monitoring/cache/clear'),
};

export const gdprAdminAPI = {
  getPendingDeletions: () => api.get('/gdpr/admin/pending-deletions'),
  getDeletionRequests: () => api.get('/gdpr/admin/deletion-requests'),
  processDeletions: () => api.post('/gdpr/admin/process-deletions'),
};
// Helper: smart search that uses public or private search depending on context
export function smartSearchPersons(query) {
  const path = typeof window !== 'undefined' ? appPathname() : '';
  const publicTree = path.match(/^\/public-tree\/([^/]+)\/([^/]+)/);
  const viewerLink = path.match(/^\/view\/([^/]+)\/([^/]+)/);
  const m = publicTree || viewerLink;
  if (m) {
    const treeId = m[1];
    const token = m[2];
    return treeAPI.searchPublicPersons(treeId, token, query);
  }
  return treeAPI.searchPersons(query);
}

export const invalidateTreeCache = (treeId) => { try { cacheInvalidateByPrefix(`tree:${treeId}:`); } catch (_) {} };
export const invalidateAdminCache = (treeId) => { try { cacheInvalidateByPrefix(`admin:${treeId}:`); } catch (_) {} };
// Notification APIs
export const notificationAPI = {
  getNotifications: (limit = 20) => api.get(`/notifications?limit=${limit}`),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (id) => api.post(`/notifications/${id}/read`),
  markAllAsRead: () => api.post('/notifications/read-all'),
  deleteNotification: (id) => api.delete(`/notifications/${id}`),
  clearAll: () => api.delete('/notifications'),
};

// Research Question APIs
export const researchQuestionAPI = {
  getQuestions: (treeId, personId) =>
    cachedGet(
      `/trees/${encodeURIComponent(treeId)}/persons/${encodeURIComponent(personId)}/questions`,
      `questions:${treeId}:${personId}`,
      2 * 60_000
    ),
  createQuestion: (treeId, personId, question) =>
    api.post(`/trees/${encodeURIComponent(treeId)}/persons/${encodeURIComponent(personId)}/questions`, { question })
      .then(res => { cacheInvalidateByPrefix(`questions:${treeId}:${personId}`); return res; }),
  updateQuestion: (treeId, personId, questionId, data) =>
    api.put(`/trees/${encodeURIComponent(treeId)}/persons/${encodeURIComponent(personId)}/questions/${encodeURIComponent(questionId)}`, data)
      .then(res => { cacheInvalidateByPrefix(`questions:${treeId}:${personId}`); return res; }),
  deleteQuestion: (treeId, personId, questionId) =>
    api.delete(`/trees/${encodeURIComponent(treeId)}/persons/${encodeURIComponent(personId)}/questions/${encodeURIComponent(questionId)}`)
      .then(res => { cacheInvalidateByPrefix(`questions:${treeId}:${personId}`); return res; }),
};

// Validation API
export const validationAPI = {
  validateTree: (treeId) => api.get(`/trees/${encodeURIComponent(treeId)}/validate`),
};

// Tags API
export const tagAPI = {
  getTags: (treeId, personId) =>
    cachedGet(
      `/trees/${encodeURIComponent(treeId)}/persons/${encodeURIComponent(personId)}/tags`,
      `tags:${treeId}:${personId}`,
      5 * 60_000
    ),
  addTag: (treeId, personId, tag) =>
    api.post(`/trees/${encodeURIComponent(treeId)}/persons/${encodeURIComponent(personId)}/tags`, { tag })
      .then(res => { cacheInvalidateByPrefix(`tags:${treeId}:${personId}`); return res; }),
  removeTag: (treeId, personId, tag) =>
    api.delete(`/trees/${encodeURIComponent(treeId)}/persons/${encodeURIComponent(personId)}/tags/${encodeURIComponent(tag)}`)
      .then(res => { cacheInvalidateByPrefix(`tags:${treeId}:${personId}`); return res; }),
  getTreeTags: (treeId) => api.get(`/trees/${encodeURIComponent(treeId)}/tags`),
};

// Relationship Path API
export const relationshipPathAPI = {
  getPath: (treeId, fromId, toId) => api.get(`/trees/${encodeURIComponent(treeId)}/relationship-path?from=${encodeURIComponent(fromId)}&to=${encodeURIComponent(toId)}`),
};

// Workspace template packs (family, org, …)
export const templatesAPI = {
  list: () => api.get('/templates'),
  get: (templateId) => api.get(`/templates/${encodeURIComponent(templateId)}`),
};

// Admin Console APIs (exported as named functions, after all object/function definitions)
// Paginated + server-side searched. Returns an envelope:
// { users, page, size, total, totalPages, activeCount }
export const getAllUsers = ({ page = 0, size = 10, search = '' } = {}) => {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  if (search) params.set('search', search);
  return api.get(`/admin/console/users?${params}`);
};

// User-scoped limits for the admin Limits tab. Previously derived client-side
// from the full user list, which pagination broke.
export const getAdminUserLimits = ({ page = 0, size = 10 } = {}) =>
  api.get(`/admin/console/limits?page=${page}&size=${size}`);
export const getAllTrees = () => api.get('/admin/console/trees');
export const getUserLimits = (userId) => api.get(`/admin/limits/user/${encodeURIComponent(userId)}`);
export const getTreeLimits = (treeId) => api.get(`/admin/limits/tree/${encodeURIComponent(treeId)}`);
export const saveLimit = (limit) => api.post('/admin/limits', limit);
export const deleteLimit = (id) => api.delete(`/admin/limits/${encodeURIComponent(id)}`);

export default api;

// Centralized client environment config.
// All data calls go to the CAP OData V4 service (see services/odataAdapter.js). API_BASE_URL is kept only for the
// few legacy modules that still import it (health checks etc.); the old Spring /api backend no longer exists.
export const API_BASE_URL = process.env.REACT_APP_API_URL || '/odata/v4/nasablink';

export const PUBLIC_BASE_URL = process.env.REACT_APP_PUBLIC_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '');

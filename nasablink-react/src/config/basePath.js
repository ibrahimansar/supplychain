// The built app is served by Spring Boot under /nasablink (CRA "homepage"); in dev it runs at "/".
export const BASE_PATH = (process.env.PUBLIC_URL || '').replace(/\/$/, '');

/** window.location.pathname without the deployment prefix, so existing "/trees/.." matching keeps working. */
export const appPathname = () => {
  const p = (typeof window !== 'undefined' && window.location.pathname) || '';
  return BASE_PATH && p.startsWith(BASE_PATH) ? p.slice(BASE_PATH.length) || '/' : p;
};

/** For hard redirects (window.location.href = ...). */
export const withBase = (path) => `${BASE_PATH}${path}`;

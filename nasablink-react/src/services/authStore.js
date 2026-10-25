// CAP mock/basic auth. The original app used a Firebase/Google session cookie; on SAP BTP this would be the
// XSUAA/App Router login instead. Credentials live in sessionStorage so a tab refresh keeps you signed in.
const KEY = 'nasablink.basic';

export const getAuthHeader = () => {
  try { return sessionStorage.getItem(KEY) || null; } catch (_) { return null; }
};

export const setCredentials = (username, password) => {
  try { sessionStorage.setItem(KEY, `Basic ${btoa(`${username}:${password}`)}`); } catch (_) { /* ignore */ }
};

export const clearCredentials = () => {
  try { sessionStorage.removeItem(KEY); } catch (_) { /* ignore */ }
};

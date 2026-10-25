import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api, { cacheClearAll } from '../services/api';
import { fetchProfile } from '../services/odataAdapter';
import { setCredentials, clearCredentials, getAuthHeader } from '../services/authStore';

export const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

// ---------------------------------------------------------------------------
// Auth on SAP CAP: the original Firebase/Google session-cookie login is replaced by HTTP basic auth against the
// CAP mock users (admin/admin, user/user, alice/alice). On BTP this is where an XSUAA / App Router login goes.
// ---------------------------------------------------------------------------

// The UI reads `user.roles` as [{ treeId, role }] — build it from the OData myTrees() function.
const fetchUserRoles = async () => {
  try {
    const res = await api.get('/me/trees');
    return (res.data || []).map((t) => ({ treeId: t.familyTreeId, role: t.role })).filter((r) => r.treeId && r.role);
  } catch {
    return [];
  }
};

const loadProfile = async () => {
  if (!getAuthHeader()) return null;
  try {
    const profile = await fetchProfile();
    return { ...profile, roles: await fetchUserRoles() };
  } catch (e) {
    if (e?.response?.status === 401) { clearCredentials(); return null; }
    throw e;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const profile = await loadProfile();
      setUser(profile);
      return profile;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMe(); }, [fetchMe]);

  /** Signs in with a CAP (mock) user. Throws an Error with a user-facing message on failure. */
  const loginWithPassword = useCallback(async (username, password) => {
    cacheClearAll();
    setCredentials(username, password);
    try {
      const profile = await loadProfile();
      if (!profile) throw new Error('Invalid username or password.');
      setUser(profile);
      return profile;
    } catch (e) {
      clearCredentials();
      if (e.message === 'Network Error') throw new Error('Unable to reach the server. Is the CAP app running?');
      throw e;
    }
  }, []);

  const logout = useCallback(async () => {
    clearCredentials();
    cacheClearAll();
    setUser(null);
  }, []);

  const value = {
    user,
    loading,
    authenticated: !!user,
    loginWithPassword,
    logout,
    refreshUser: fetchMe,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

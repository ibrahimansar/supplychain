import React, { createContext, useContext, useMemo, useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { LOCALE_CODES, isRtlLocale, localeMeta } from './locales';
import en from './locales/en.json';
import ar from './locales/ar.json';
import ur from './locales/ur.json';
import fa from './locales/fa.json';
import ta from './locales/ta.json';
import hi from './locales/hi.json';
import bn from './locales/bn.json';
import ml from './locales/ml.json';
import te from './locales/te.json';
import id from './locales/id.json';
import ms from './locales/ms.json';
import tr from './locales/tr.json';
import fr from './locales/fr.json';
import es from './locales/es.json';

const LOCALES = { en, ar, ur, fa, ta, hi, bn, ml, te, id, ms, tr, fr, es };

// Anything declared in the registry must actually have a dictionary, or the
// picker offers a language that silently renders entirely in English.
if (process.env.NODE_ENV !== 'production') {
  const missing = LOCALE_CODES.filter((c) => !LOCALES[c]);
  if (missing.length) {
    console.error(`[i18n] No dictionary imported for: ${missing.join(', ')}`);
  }
}

const I18nContext = createContext({ t: (k, d) => d ?? k, locale: 'en', setLocale: () => {}, isRTL: false });

// Report each missing key once per session so a busy screen doesn't flood the console.
const reportedMissingKeys = new Set();
const warnMissingKey = (key, locale) => {
  if (process.env.NODE_ENV === 'production') return;
  const id = `${locale}:${key}`;
  if (reportedMissingKeys.has(id)) return;
  reportedMissingKeys.add(id);
  console.warn(
    `[i18n] Missing key "${key}" for locale "${locale}" — falling back to the inline English text. ` +
    `Add it to src/i18n/locales/*.json (see: npm run i18n:check).`,
  );
};

export const I18nProvider = ({ children }) => {
  const [locale, setLocale] = useState('en');
  const [isLoading, setIsLoading] = useState(true);
  const auth = useAuth();
  const { user, authenticated } = auth || { user: null, authenticated: false };

  useEffect(() => {
    if (auth === null) {
      // Auth context not ready yet, wait for it
      return;
    }

    if (authenticated && user?.languagePreference) {
      setLocale(user.languagePreference);
      setIsLoading(false);
    } else if (!authenticated) {
      // Fallback to localStorage for non-authenticated users
      try {
        const saved = localStorage.getItem('nasablink.locale');
        if (saved && LOCALES[saved]) setLocale(saved);
        else {
          const nav = (navigator.language || 'en').slice(0, 2);
          if (LOCALES[nav]) setLocale(nav);
        }
      } catch (_) {}
      setIsLoading(false);
    }
  }, [user, authenticated, auth]);

  const saveLocaleToServer = useCallback(async (newLocale) => {
    if (!auth || !authenticated) {
      // For non-authenticated users or when auth is not ready, just save to localStorage
      try { localStorage.setItem('nasablink.locale', newLocale); } catch (_) {}
      return;
    }

    try {
      await api.put('/me/language', { language: newLocale });
    } catch (error) {
      console.error('Failed to save language to server:', error);
      // Fallback to localStorage if server save fails
      try { localStorage.setItem('nasablink.locale', newLocale); } catch (_) {}
    }
  }, [auth, authenticated]);

  const setLocaleAndSave = useCallback(async (l) => {
    if (LOCALES[l]) {
      setLocale(l);
      await saveLocaleToServer(l);
      
      // Update HTML dir attribute for RTL support
      const isRTL = isRtlLocale(l);
      document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
      document.documentElement.setAttribute('lang', l);
    }
  }, [saveLocaleToServer]);
  
  // Set initial direction on mount
  useEffect(() => {
    const isRTL = isRtlLocale(locale);
    document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', locale);
  }, [locale]);

  const t = useMemo(() => {
    const dict = LOCALES[locale] || en;
    return (key, defaultValue) => {
      const parts = key.split('.');
      let cur = dict;
      for (const p of parts) {
        if (cur && Object.prototype.hasOwnProperty.call(cur, p)) cur = cur[p];
        else { cur = undefined; break; }
      }
      if (typeof cur === 'string') return cur;
      // Falling back means this string renders in English for every locale.
      // Silent in production, but loud in development so it gets noticed the
      // first time the screen renders rather than by a translator months later.
      warnMissingKey(key, locale);
      return defaultValue ?? key;
    };
  }, [locale]);

  const value = useMemo(() => ({ 
    t, 
    locale, 
    setLocale: setLocaleAndSave, 
    isLoading,
    isRTL: isRtlLocale(locale),
    localeMeta: localeMeta(locale)
  }), [t, locale, isLoading, setLocaleAndSave]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => useContext(I18nContext);


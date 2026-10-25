import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import Logo from '../components/Logo';

const LoginPage = () => {
  const { loginWithPassword, authenticated, user, loading: authLoading } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (!authLoading && authenticated) {
      navigate('/', { replace: true });
    }
  }, [authLoading, authenticated, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      setErr('');
      setLoading(true);
      await loginWithPassword(username.trim(), password);
    } catch (e) {
      let errorMessage = e.message || 'Login failed. Please try again.';
      if (!navigator.onLine) {
        errorMessage = 'No internet connection. Please check your network and try again.';
      } else if (e.name === 'TypeError' && e.message.includes('fetch')) {
        errorMessage = 'Unable to connect to the server. Please check your connection and try again.';
      }
      setErr(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || (authenticated && !user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950">
        <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          <span className="text-sm">{t('login.checking_session', 'Checking session\u2026')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-white dark:bg-gray-950 relative overflow-hidden">
      {/* Subtle background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-50/40 via-white to-accent-50/30 dark:from-primary-950/20 dark:via-gray-950 dark:to-gray-950" />
      <div className="absolute inset-0 opacity-20 dark:opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgb(139 92 246 / 0.1) 1px, transparent 0)', backgroundSize: '48px 48px' }} />
      <div className="absolute top-1/4 -right-32 w-96 h-96 bg-primary-200/30 dark:bg-primary-900/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -left-32 w-80 h-80 bg-accent-200/20 dark:bg-accent-900/10 rounded-full blur-3xl" />

      <div className="relative w-full max-w-sm">
        {/* Card */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl p-8 shadow-xl">
          <div className="flex flex-col items-center text-center mb-8">
            <Logo size={52} className="mb-5 rounded-2xl shadow-lg" />
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              {t('login.welcome', 'Welcome to NasabLink')}
            </h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {t('login.sign_in_continue', 'Sign in to access your family trees')}
            </p>
          </div>

          {err && (
            <div className="mb-6 p-3.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-xl">
              <div className="flex items-start gap-2.5">
                <svg className="h-4 w-4 text-red-500 mt-0.5 flex-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-red-800 dark:text-red-300">{t('login.login_error', 'Login Error')}</p>
                  <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">{err}</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-3">
            <input
              type="text" autoComplete="username" placeholder="Username" value={username}
              onChange={(e) => setUsername(e.target.value)} required
              className="w-full h-11 px-4 rounded-xl text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
            <input
              type="password" autoComplete="current-password" placeholder="Password" value={password}
              onChange={(e) => setPassword(e.target.value)} required
              className="w-full h-11 px-4 rounded-xl text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 px-6 rounded-xl text-sm font-semibold bg-primary-600 hover:bg-primary-700 text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
            <p className="text-xs text-center text-gray-400">Local users: admin/admin, user/user, alice/alice</p>
          </form>

          <p className="mt-6 text-xs text-center text-gray-400 dark:text-gray-500 leading-relaxed">
            {t('login.privacy_agreement', 'By continuing, you agree to our')}{' '}
            <Link to="/privacy" className="underline underline-offset-2 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
              Privacy Policy
            </Link>{' '}
            {t('login.and', 'and')}{' '}
            <Link to="/terms" className="underline underline-offset-2 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
              Terms of Service
            </Link>.
          </p>
        </div>

        {/* Back link */}
        <div className="mt-6 text-center">
          <Link to="/" className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            &larr; Back to home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

/**
 * Authentication screen: sign in, create account, and unlock.
 *
 * This component renders OUTSIDE AppProvider (there is no workspace yet), so it
 * must not call `useApp`. It keeps its own small language preference so the
 * screen itself is bilingual and RTL-aware, matching the rest of the app.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Eye, EyeOff, Globe, KeyRound, Loader2, Lock, Mail, ShieldCheck, WifiOff } from 'lucide-react';
import { AuthErrorCode, authApiAvailable, useAuth } from '../context/AuthContext';
import { translations } from '../constants/translations';
import type { Language } from '../types';

const LANG_KEY = 'devdesk_ui_lang_v1';

type Mode = 'login' | 'register' | 'unlock';

const ERROR_KEYS: Record<AuthErrorCode, keyof typeof translations.en> = {
  'invalid-credentials': 'authErrInvalidCredentials',
  'email-in-use': 'authErrEmailInUse',
  'invalid-input': 'authErrInvalidInput',
  'too-many-requests': 'authErrTooManyRequests',
  'server-error': 'authErrServer',
  'server-unavailable': 'authErrServerUnavailable',
  offline: 'authErrOffline',
  'cannot-verify-offline': 'authErrCannotVerifyOffline',
  'session-expired': 'authErrSessionExpired',
  unknown: 'authErrUnknown',
};

function initialLanguage(): Language {
  try {
    const stored = localStorage.getItem(LANG_KEY);
    if (stored === 'ar' || stored === 'en') return stored;
  } catch {
    /* ignore */
  }
  return typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('ar')
    ? 'ar'
    : 'en';
}

/** The workspace theme lives in encrypted storage, so use the OS preference here. */
function useSystemTheme(): void {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = (dark: boolean) => {
      document.documentElement.classList.toggle('dark', dark);
      document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
    };
    apply(media.matches);
    const listener = (event: MediaQueryListEvent) => apply(event.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);
}

const inputClass =
  'w-full px-3.5 py-2.5 rounded-xl text-sm bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors';

const labelClass = 'block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5';

export const AuthScreen: React.FC = () => {
  const { status, email, offline, isLoading, error, clearError, login, register, unlock, logout } =
    useAuth();

  const [mode, setMode] = useState<Mode>('login');
  const [lang, setLang] = useState<Language>(initialLanguage);
  const [emailInput, setEmailInput] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useSystemTheme();

  const t = useMemo(() => {
    const dict = translations[lang] || translations.en;
    return (key: keyof typeof translations.en): string =>
      (dict as Record<string, string>)[key] || translations.en[key] || key;
  }, [lang]);

  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const isLocked = status === 'locked';
  const activeMode: Mode = isLocked ? 'unlock' : mode;

  useEffect(() => {
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {
      /* ignore */
    }
  }, [lang]);

  // Prefill the stored account email on the unlock screen.
  useEffect(() => {
    if (isLocked && email && !emailInput) setEmailInput(email);
  }, [isLocked, email, emailInput]);

  const toggleLanguage = () => setLang((prev) => (prev === 'ar' ? 'en' : 'ar'));

  const switchMode = (next: Mode) => {
    setMode(next);
    setLocalError(null);
    clearError();
    setPassword('');
    setConfirmPassword('');
  };

  const errorText = localError
    ? localError
    : error
      ? t(ERROR_KEYS[error] ?? 'authErrUnknown')
      : null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLocalError(null);
    clearError();

    if (activeMode !== 'unlock' && emailInput.trim().length === 0) {
      setLocalError(t('authErrEmailRequired'));
      return;
    }
    if (password.length < 8) {
      setLocalError(t('authErrPasswordLength'));
      return;
    }
    if (activeMode === 'register' && password !== confirmPassword) {
      setLocalError(t('authErrPasswordMismatch'));
      return;
    }

    if (activeMode === 'unlock') {
      await unlock(password);
    } else if (activeMode === 'register') {
      await register(emailInput.trim(), password);
    } else {
      await login(emailInput.trim(), password);
    }
    // On success the provider switches status and this screen unmounts.
  };

  const title = isLocked
    ? t('authUnlockTitle')
    : activeMode === 'register'
      ? t('authCreateAccount')
      : t('authSignIn');
  const subtitle = isLocked
    ? t('authUnlockSubtitle')
    : activeMode === 'register'
      ? t('authCreateSubtitle')
      : t('authSignInSubtitle');
  const submitLabel = isLocked
    ? t('authUnlockButton')
    : activeMode === 'register'
      ? t('authCreateButton')
      : t('authSignInButton');

  return (
    <div
      dir={dir}
      lang={lang}
      className="min-h-screen flex items-center justify-center bg-neutral-100 dark:bg-neutral-950 p-4"
    >
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="flex items-center justify-center gap-2.5 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center shadow-sm">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-base font-bold text-neutral-900 dark:text-neutral-100 leading-tight">
              SaveDesk
            </div>
            <div className="text-[11px] text-neutral-500 dark:text-neutral-400">{t('appTagline')}</div>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 p-6 shadow-sm">
          <div className="flex items-start justify-between gap-3 mb-5">
            <div>
              <h1 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                {isLocked && <KeyRound className="w-4 h-4 text-blue-500" />}
                {title}
              </h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{subtitle}</p>
            </div>
            <button
              type="button"
              onClick={toggleLanguage}
              className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
              title={t('settingsLanguage')}
            >
              <Globe className="w-3.5 h-3.5" />
              {lang === 'ar' ? 'EN' : 'ع'}
            </button>
          </div>

          {isLocked && email && (
            <div className="mb-4 px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200/70 dark:border-neutral-800 text-[11px] text-neutral-600 dark:text-neutral-400">
              {t('authSignedInAs')} <span className="font-medium">{email}</span>
            </div>
          )}

          {offline && (
            <div className="mb-4 flex items-start gap-2 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-[11px] text-amber-700 dark:text-amber-400">
              <WifiOff className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{t('authOfflineNotice')}</span>
            </div>
          )}

          {!authApiAvailable && (
            <div className="mb-4 flex items-start gap-2 px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-[11px] text-rose-700 dark:text-rose-400">
              <WifiOff className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{t('authErrNoApi')}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {!isLocked && (
              <div>
                <label className={labelClass} htmlFor="auth-email">
                  {t('email')}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-neutral-400 absolute top-1/2 -translate-y-1/2 start-3 pointer-events-none" />
                  <input
                    id="auth-email"
                    type="email"
                    autoComplete="username"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className={`${inputClass} ps-9`}
                    placeholder="you@example.com"
                  />
                </div>
              </div>
            )}

            <div>
              <label className={labelClass} htmlFor="auth-password">
                {t('password')}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-neutral-400 absolute top-1/2 -translate-y-1/2 start-3 pointer-events-none" />
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={activeMode === 'register' ? 'new-password' : 'current-password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${inputClass} ps-9 pe-10`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute top-1/2 -translate-y-1/2 end-2.5 p-1 rounded-md text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {activeMode === 'register' && (
              <div>
                <label className={labelClass} htmlFor="auth-confirm">
                  {t('authConfirmPassword')}
                </label>
                <input
                  id="auth-confirm"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={inputClass}
                  placeholder="••••••••"
                />
              </div>
            )}

            {errorText && (
              <div className="px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-[11px] text-rose-700 dark:text-rose-400">
                {errorText}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('authWorking')}
                </>
              ) : (
                submitLabel
              )}
            </button>
          </form>

          {activeMode === 'register' && (
            <p className="mt-3 text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400">
              {t('authPasswordHint')}
            </p>
          )}

          {isLocked ? (
            <button
              type="button"
              onClick={logout}
              className="mt-4 w-full text-[11px] font-medium text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors cursor-pointer"
            >
              {t('authUseDifferentAccount')}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => switchMode(activeMode === 'register' ? 'login' : 'register')}
              className="mt-4 w-full text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              {activeMode === 'register' ? t('authSwitchToLogin') : t('authSwitchToRegister')}
            </button>
          )}
        </div>

        <p className="mt-4 text-[11px] leading-relaxed text-center text-neutral-500 dark:text-neutral-400">
          {t('authE2eeNote')}
        </p>
      </div>
    </div>
  );
};

/** Backwards-compatible alias (the component was previously login-only). */
export const LoginScreen: React.FC = () => <AuthScreen />;

/** Small boot screen shown while the stored session is validated. */
export const AuthBootScreen: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-neutral-100 dark:bg-neutral-950">
    <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
      <Loader2 className="w-4 h-4 animate-spin" />
      SaveDesk
    </div>
  </div>
);

/**
 * Authentication + vault unlocking.
 *
 * States
 *  - initializing    : restoring a stored session and validating it via GET /api/me
 *  - unauthenticated : no session → login or register
 *  - locked          : valid session, but the password is still required to
 *                      derive the AES key that decrypts the vault
 *  - authenticated   : key derived, workspace hydrated and syncing
 *
 * The API contract is the one actually implemented in api/auth.ts:
 *   POST /api/auth { action, email, password } → { token, vaultSalt, user }
 *   GET  /api/me    (Bearer)                   → { user, vaultSalt }
 *
 * The password is never stored and the derived key lives only in memory inside
 * storageService, so every app start asks for the password once ("locked").
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { storageService, SyncStatus } from '../storage/storageService';
import { sessionStore } from '../session/sessionStore';
import { API_AVAILABLE, getMe, postAuth } from '../api/client';

export type AuthStatus = 'initializing' | 'unauthenticated' | 'locked' | 'authenticated';

export interface AuthUser {
  id: string;
  email: string;
}

/** Machine-readable failure codes; the auth screen localizes them. */
export type AuthErrorCode =
  | 'invalid-credentials'
  | 'email-in-use'
  | 'invalid-input'
  | 'too-many-requests'
  | 'server-error'
  | 'offline'
  | 'cannot-verify-offline'
  | 'session-expired'
  | 'unknown';

interface AuthContextType {
  status: AuthStatus;
  user: AuthUser | null;
  /** Email of the stored session; prefilled on the unlock screen. */
  email: string | null;
  /** True when the startup session check could not reach the server. */
  offline: boolean;
  isLoading: boolean;
  error: AuthErrorCode | null;
  clearError: () => void;
  syncStatus: SyncStatus;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string) => Promise<boolean>;
  unlock: (password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

function mapApiError(status: number, network: boolean): AuthErrorCode {
  if (network) return 'offline';
  if (status === 401) return 'invalid-credentials';
  if (status === 409) return 'email-in-use';
  if (status === 400) return 'invalid-input';
  if (status === 429) return 'too-many-requests';
  if (status >= 500) return 'server-error';
  return 'unknown';
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<AuthStatus>('initializing');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [salt, setSalt] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AuthErrorCode | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() => storageService.getSyncStatus());

  // Guards the one-shot bootstrap against React StrictMode double renders.
  const bootstrapRan = useRef(false);

  // ------------------------------------------------------------ observability

  useEffect(() => storageService.onStatusChange(setSyncStatus), []);

  const forceSignOut = useCallback((reason: AuthErrorCode | null) => {
    sessionStore.clear();
    storageService.lock();
    setUser(null);
    setEmail(null);
    setSalt(null);
    setError(reason);
    setStatus('unauthenticated');
  }, []);

  useEffect(
    () =>
      storageService.onAuthError(() => {
        // The server rejected our token (expired, or rotated on another device).
        forceSignOut('session-expired');
      }),
    [forceSignOut],
  );

  // ------------------------------------------------------------ bootstrap

  useEffect(() => {
    if (bootstrapRan.current) return;
    bootstrapRan.current = true;

    const session = sessionStore.load();
    if (!session) {
      setStatus('unauthenticated');
      return;
    }

    storageService.setSession(session.token);
    setEmail(session.email || null);
    setSalt(session.salt);

    void (async () => {
      const me = await getMe(session.token);
      if (me.ok) {
        setUser(me.data.user);
        setEmail(me.data.user.email);
        setSalt(me.data.vaultSalt);
        sessionStore.save({
          token: session.token,
          salt: me.data.vaultSalt,
          email: me.data.user.email,
        });
        setOffline(false);
        setStatus('locked');
        return;
      }
      if (me.unauthorized) {
        // The stored token is no longer valid — never pretend otherwise.
        forceSignOut(null);
        return;
      }
      // Server unreachable: keep the session and allow an offline unlock from
      // the encrypted local mirror.
      setOffline(true);
      setStatus('locked');
    })();
  }, [forceSignOut]);

  // ------------------------------------------------------------ helpers

  const finishUnlock = useCallback(async (): Promise<boolean> => {
    const remote = await storageService.unlockRemote();
    if (!remote.ok) {
      storageService.clearKey();
      setError(
        remote.reason === 'incorrect-password' ? 'invalid-credentials' : 'cannot-verify-offline',
      );
      return false;
    }
    storageService.startSync();
    setError(null);
    setStatus('authenticated');
    // Upload local data when this account has no blob yet (first device).
    void storageService.seedRemoteIfEmpty();
    return true;
  }, []);

  const completeAuth = useCallback(
    async (token: string, vaultSalt: string, account: AuthUser, password: string) => {
      sessionStore.save({ token, salt: vaultSalt, email: account.email });
      storageService.setSession(token);
      setUser(account);
      setEmail(account.email);
      setSalt(vaultSalt);
      // The server just verified the password, so an unreadable local mirror
      // must not block this login.
      await storageService.unlockLocal(password, vaultSalt, true);
      return finishUnlock();
    },
    [finishUnlock],
  );

  // ------------------------------------------------------------ actions

  const login = useCallback(
    async (loginEmail: string, password: string): Promise<boolean> => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await postAuth('login', loginEmail.trim(), password);
        if (!res.ok) {
          setError(mapApiError(res.status, res.network));
          return false;
        }
        return await completeAuth(res.data.token, res.data.vaultSalt, res.data.user, password);
      } finally {
        setIsLoading(false);
      }
    },
    [completeAuth],
  );

  const register = useCallback(
    async (registerEmail: string, password: string): Promise<boolean> => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await postAuth('register', registerEmail.trim(), password);
        if (!res.ok) {
          setError(mapApiError(res.status, res.network));
          return false;
        }
        return await completeAuth(res.data.token, res.data.vaultSalt, res.data.user, password);
      } finally {
        setIsLoading(false);
      }
    },
    [completeAuth],
  );

  const unlock = useCallback(
    async (password: string): Promise<boolean> => {
      if (!salt) {
        setError('unknown');
        return false;
      }
      setIsLoading(true);
      setError(null);
      try {
        // Offline-verifiable path: the encrypted local mirror. A failure here is
        // not conclusive (it can also mean a corrupt mirror), so the remote
        // fetch below makes the decision.
        await storageService.unlockLocal(password, salt);
        return await finishUnlock();
      } finally {
        setIsLoading(false);
      }
    },
    [finishUnlock, salt],
  );

  const logout = useCallback(() => {
    forceSignOut(null);
  }, [forceSignOut]);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo(
    () => ({
      status,
      user,
      email: email || user?.email || null,
      offline,
      isLoading,
      error,
      clearError,
      syncStatus,
      login,
      register,
      unlock,
      logout,
    }),
    [
      status,
      user,
      email,
      offline,
      isLoading,
      error,
      clearError,
      syncStatus,
      login,
      register,
      unlock,
      logout,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

/** True when this build has an API to talk to at all. */
export const authApiAvailable = API_AVAILABLE;

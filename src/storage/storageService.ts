/**
 * DevDesk storage service — the sync engine for a single-user, multi-device app.
 *
 * Data flow
 * ---------
 *   UI mutation → in-memory state → encrypted local mirror (localStorage)
 *                                → debounced push to /api/workspace
 *   pull scheduler (15 s, window focus, tab visible, back online, app start)
 *                                → /api/workspace?meta=1 (cheap version check)
 *                                → full blob only when the version changed
 *
 * Guarantees
 * ----------
 *  - The server only ever receives AES-256-GCM ciphertext; the key is derived
 *    from the password + server-provided vault salt and never leaves memory.
 *  - The local mirror is encrypted with the same key (no plaintext at rest once
 *    the app has been unlocked once).
 *  - Remote data never overwrites local data that is newer (the server
 *    `updatedAtMs` is compared against the last local mutation time), and a
 *    failed or empty response never wipes local data.
 *  - Pushing is blocked until the password has been cryptographically verified,
 *    so a mistyped password can never overwrite the stored blob.
 *
 * Nothing here logs plaintext, keys, passwords or ciphertext.
 */
import {
  ApiKeyItem,
  PromptItem,
  McpServerItem,
  SkillItem,
  BookmarkItem,
  VaultItem,
  NoteItem,
  TodoItem,
  SnippetItem,
  ClipboardItem,
  ActivityItem,
  UserSettings,
  DevDeskBackup,
} from '../types';
import { initialSettings } from '../constants/demoData';
import { encryptData, decryptData, deriveKey } from '../utils/crypto';
import { API_AVAILABLE, getWorkspaceBlob, getWorkspaceMeta, putWorkspaceBlob } from '../api/client';

const MIRROR_KEY = 'devdesk_mirror_v1';
/** Pre-encryption plaintext key; read once for migration, then deleted. */
const LEGACY_STATE_KEY = 'devdesk_workspace_v1';

const PUSH_DEBOUNCE_MS = 1800;
const PULL_INTERVAL_MS = 15000;
/** Tolerance when comparing the server clock against the local clock. */
const CLOCK_SKEW_MS = 10000;

export interface StorageState {
  apiKeys: ApiKeyItem[];
  prompts: PromptItem[];
  mcpServers: McpServerItem[];
  skills: SkillItem[];
  bookmarks: BookmarkItem[];
  vaultItems: VaultItem[];
  notes: NoteItem[];
  todos: TodoItem[];
  snippets: SnippetItem[];
  clipboard: ClipboardItem[];
  activity: ActivityItem[];
  settings: UserSettings;
}

export type SyncState =
  | 'disabled' // this build cannot reach an API (Electron without VITE_API_URL)
  | 'locked' // no session / not unlocked yet
  | 'idle' // unlocked and in sync
  | 'syncing'
  | 'offline' // last attempt failed at the transport level
  | 'unverified' // password not verified yet → pushing blocked
  | 'error'; // server rejected the request (non-401)

export interface SyncStatus {
  state: SyncState;
  lastSyncedAtMs: number | null;
  /** Generic, secret-free description of the last failure. */
  lastError: string | null;
  pendingPush: boolean;
}

export interface UnlockResult {
  ok: boolean;
  /** Machine-readable reason; the UI maps it to a localized message. */
  reason?: 'incorrect-password' | 'cannot-verify-offline' | 'no-api';
}

/** Decrypted local mirror plus the sync bookkeeping stored alongside it. */
interface MirrorContents {
  state: StorageState;
  /** True when the mirror may hold changes the server has not seen yet. */
  dirty: boolean;
  mutationAtMs: number | null;
}

type RemoteListener = (state: StorageState) => void;
type StatusListener = (status: SyncStatus) => void;
type AuthErrorListener = () => void;

function emptyState(): StorageState {
  return {
    apiKeys: [],
    prompts: [],
    mcpServers: [],
    skills: [],
    bookmarks: [],
    vaultItems: [],
    notes: [],
    todos: [],
    snippets: [],
    clipboard: [],
    activity: [],
    settings: { ...initialSettings },
  };
}

function hasUserData(state: StorageState): boolean {
  return (
    state.apiKeys.length > 0 ||
    state.prompts.length > 0 ||
    state.mcpServers.length > 0 ||
    state.skills.length > 0 ||
    state.bookmarks.length > 0 ||
    state.vaultItems.length > 0 ||
    state.notes.length > 0 ||
    state.todos.length > 0 ||
    state.snippets.length > 0 ||
    state.clipboard.length > 0
  );
}

class SecureStorageService {
  private state: StorageState = emptyState();

  /** AES-GCM key derived from password + vault salt. Memory only. */
  private encryptionKey: CryptoKey | null = null;
  private token: string | null = null;
  /** True once the password has been proven correct against real ciphertext. */
  private keyVerified = false;

  /** Server `updatedAtMs` of the blob version we last saw. */
  private lastRemoteUpdatedAtMs: number | null = null;
  /** Local clock reading of the most recent mutation (tie-break for LWW). */
  private lastLocalMutationAtMs: number | null = null;

  /** Monotonic counters so a mutation during a request still triggers a push. */
  private mutationCounter = 0;
  private pushedMutationCounter = 0;
  private pushTimer: ReturnType<typeof setTimeout> | null = null;
  private pushInFlight: Promise<void> | null = null;

  private pullTimer: ReturnType<typeof setInterval> | null = null;
  private pullInFlight: Promise<void> | null = null;
  private listenersBound = false;

  private syncState: SyncState = API_AVAILABLE ? 'locked' : 'disabled';
  private lastSyncedAtMs: number | null = null;
  private lastError: string | null = null;

  private remoteListeners = new Set<RemoteListener>();
  private statusListeners = new Set<StatusListener>();
  private authErrorListeners = new Set<AuthErrorListener>();

  private mirrorWriteChain: Promise<void> = Promise.resolve();
  /** Set when an encrypted mirror exists but cannot be decrypted. */
  private mirrorUnreadable = false;

  // ------------------------------------------------------------ subscriptions

  /** Fires only when a REMOTE change was applied locally. */
  onRemoteUpdate(listener: RemoteListener): () => void {
    this.remoteListeners.add(listener);
    return () => this.remoteListeners.delete(listener);
  }

  onStatusChange(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.getSyncStatus());
    return () => this.statusListeners.delete(listener);
  }

  /** Fires when the server rejects our token (expired or revoked). */
  onAuthError(listener: AuthErrorListener): () => void {
    this.authErrorListeners.add(listener);
    return () => this.authErrorListeners.delete(listener);
  }

  getSyncStatus(): SyncStatus {
    return {
      state: this.syncState,
      lastSyncedAtMs: this.lastSyncedAtMs,
      lastError: this.lastError,
      pendingPush: this.mutationCounter !== this.pushedMutationCounter,
    };
  }

  private setSyncState(state: SyncState, error: string | null = null): void {
    this.syncState = state;
    this.lastError = error;
    if (state === 'idle') this.lastSyncedAtMs = Date.now();
    const status = this.getSyncStatus();
    for (const listener of this.statusListeners) listener(status);
  }

  private raiseAuthError(): void {
    for (const listener of this.authErrorListeners) listener();
  }

  private emitRemoteUpdate(): void {
    const snapshot = this.getState();
    for (const listener of this.remoteListeners) listener(snapshot);
  }

  // ------------------------------------------------------------ session

  setSession(token: string | null): void {
    this.token = token;
    if (!token) this.keyVerified = false;
  }

  hasSession(): boolean {
    return Boolean(this.token);
  }

  /**
   * Derives the vault key from the password + vault salt and restores whatever
   * local state can be decrypted, WITHOUT touching the network.
   *
   * `serverVerified` must be true only when the server has just confirmed the
   * password (login/register): in that case an unreadable mirror is treated as
   * corrupt rather than as evidence of a wrong password.
   */
  async unlockLocal(
    password: string,
    salt: string,
    serverVerified = false,
  ): Promise<UnlockResult> {
    let key: CryptoKey;
    try {
      key = await deriveKey(password, salt);
    } catch {
      return { ok: false, reason: 'incorrect-password' };
    }
    this.encryptionKey = key;
    this.keyVerified = false;
    this.mirrorUnreadable = false;

    // 1. Encrypted mirror written by a previous unlock.
    let mirror: MirrorContents | null = null;
    const rawMirror = this.readRaw(MIRROR_KEY);
    if (rawMirror) {
      mirror = await this.decryptMirror(rawMirror);
      if (mirror) this.keyVerified = true;
      else if (!serverVerified) this.mirrorUnreadable = true;
    } else {
      // 2. Pre-encryption plaintext mirror (one-time migration path).
      const legacy = this.readLegacyState();
      if (legacy) {
        mirror = { state: legacy, dirty: false, mutationAtMs: null };
        this.keyVerified = true;
      }
    }

    if (mirror) {
      this.state = mirror.state;
      if (mirror.dirty) {
        // The last session ended before its changes reached the server: keep
        // them pending so the remote copy cannot silently discard them.
        this.mutationCounter = 1;
        this.pushedMutationCounter = 0;
        this.lastLocalMutationAtMs = mirror.mutationAtMs ?? Date.now();
      }
      return { ok: true };
    }

    if (this.mirrorUnreadable) {
      // Existing local data we cannot read: do not clobber it. The remote fetch
      // in `unlockRemote` decides whether the password is actually wrong.
      return { ok: false, reason: 'incorrect-password' };
    }

    // No local data at all: the password can only be verified against the server.
    return { ok: true };
  }

  /** Forgets the derived key (failed unlock attempt) without dropping the session. */
  clearKey(): void {
    this.encryptionKey = null;
    this.keyVerified = false;
    this.mirrorUnreadable = false;
  }

  /**
   * Verifies the password against the stored blob (when there is one) and adopts
   * the remote state. Safe to call repeatedly; never wipes local data.
   */
  async unlockRemote(): Promise<UnlockResult> {
    if (!this.encryptionKey) return { ok: false, reason: 'incorrect-password' };
    if (!this.token) return { ok: false, reason: 'no-api' };

    const result = await getWorkspaceBlob(this.token);
    if (!result.ok) {
      if (result.unauthorized) {
        this.raiseAuthError();
        return { ok: false, reason: 'no-api' };
      }
      // Offline: keep whatever the local mirror provided.
      if (this.keyVerified) {
        this.setSyncState('offline', 'Server unreachable');
        return { ok: true };
      }
      return { ok: false, reason: 'cannot-verify-offline' };
    }

    const blob = result.data;
    this.lastRemoteUpdatedAtMs = blob.updatedAtMs;

    if (!blob.data || !blob.iv) {
      // Remote is empty. With an unreadable mirror, a wrong password is the far
      // more likely explanation than a corrupt mirror — refuse instead of
      // overwriting the account with an empty workspace later.
      if (this.mirrorUnreadable && !this.keyVerified) {
        return { ok: false, reason: 'incorrect-password' };
      }
      this.keyVerified = true;
      this.setSyncState('idle');
      // Persist the (empty) verified state so a later launch can verify the
      // password offline without contacting the server.
      this.scheduleMirrorWrite();
      return { ok: true };
    }

    let remoteState: StorageState;
    try {
      const plaintext = await decryptData(blob.data, blob.iv, this.encryptionKey);
      remoteState = this.normalizeState(JSON.parse(plaintext));
    } catch {
      // AES-GCM authentication failed → almost certainly a wrong password.
      return { ok: false, reason: 'incorrect-password' };
    }

    this.keyVerified = true;
    this.mirrorUnreadable = false;
    this.setSyncState('idle');
    this.adoptRemote(remoteState, blob.updatedAtMs);
    return { ok: true };
  }

  /**
   * Adopts a remote state unless this device still holds a local change that is
   * at least as new (unsynced edit from a previous session, or an edit made
   * inside the push debounce window). Never called with an empty payload.
   */
  private adoptRemote(remoteState: StorageState, remoteUpdatedAtMs: number | null): void {
    const pendingLocalWrites = this.mutationCounter !== this.pushedMutationCounter;
    const localIsNewer =
      pendingLocalWrites &&
      this.lastLocalMutationAtMs !== null &&
      (remoteUpdatedAtMs === null || remoteUpdatedAtMs <= this.lastLocalMutationAtMs + CLOCK_SKEW_MS);

    if (localIsNewer) {
      // Keep the local state and let the debounced push win.
      this.schedulePush();
      return;
    }

    this.state = remoteState;
    if (pendingLocalWrites) {
      // Remote wins: drop the superseded local write so it cannot bounce back.
      this.pushedMutationCounter = this.mutationCounter;
      if (this.pushTimer) {
        clearTimeout(this.pushTimer);
        this.pushTimer = null;
      }
    }
    if (remoteUpdatedAtMs !== null) this.lastRemoteUpdatedAtMs = remoteUpdatedAtMs;
    this.scheduleMirrorWrite();
    this.emitRemoteUpdate();
  }

  /**
   * First-device bootstrap: uploads the local workspace when the server has no
   * blob for this account yet. Returns true when local data is now on the server.
   */
  async seedRemoteIfEmpty(): Promise<boolean> {
    if (!this.token || !this.encryptionKey || !this.keyVerified) return false;
    if (this.lastRemoteUpdatedAtMs !== null) return false;
    if (!hasUserData(this.state)) return false;
    this.markDirty();
    await this.pushNow();
    return this.getSyncStatus().state === 'idle';
  }

  /** Drops the key + session and stops all background work (logout). */
  lock(): void {
    this.stopSync();
    if (this.pushTimer) {
      clearTimeout(this.pushTimer);
      this.pushTimer = null;
    }
    this.encryptionKey = null;
    this.token = null;
    this.keyVerified = false;
    this.mirrorUnreadable = false;
    this.lastRemoteUpdatedAtMs = null;
    this.lastLocalMutationAtMs = null;
    this.state = emptyState();
    this.mutationCounter = 0;
    this.pushedMutationCounter = 0;
    this.syncState = API_AVAILABLE ? 'locked' : 'disabled';
    this.lastError = null;
    const status = this.getSyncStatus();
    for (const listener of this.statusListeners) listener(status);
  }

  // ------------------------------------------------------------ mirror I/O

  private readRaw(key: string): string | null {
    try {
      const value = localStorage.getItem(key);
      return value && value.length > 0 ? value : null;
    } catch {
      return null;
    }
  }

  private async decryptMirror(raw: string): Promise<MirrorContents | null> {
    if (!this.encryptionKey) return null;
    try {
      const parsed = JSON.parse(raw) as {
        v?: number;
        iv?: string;
        data?: string;
        dirty?: boolean;
        mutationAtMs?: number;
      };
      if (!parsed || parsed.v !== 1 || !parsed.iv || !parsed.data) return null;
      const plaintext = await decryptData(parsed.data, parsed.iv, this.encryptionKey);
      return {
        state: this.normalizeState(JSON.parse(plaintext)),
        dirty: parsed.dirty === true,
        mutationAtMs: typeof parsed.mutationAtMs === 'number' ? parsed.mutationAtMs : null,
      };
    } catch {
      return null;
    }
  }

  private readLegacyState(): StorageState | null {
    const raw = this.readRaw(LEGACY_STATE_KEY);
    if (!raw) return null;
    try {
      return this.normalizeState(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  /** Queues an encrypted mirror write of the current state (ordered, best-effort). */
  private scheduleMirrorWrite(): void {
    if (!this.encryptionKey || !this.keyVerified) return;
    const snapshot = this.state;
    this.mirrorWriteChain = this.mirrorWriteChain
      .then(() => this.writeMirror(snapshot))
      .catch(() => {
        /* storage full or unavailable: keep running in memory */
      });
  }

  private async writeMirror(state: StorageState): Promise<void> {
    if (!this.encryptionKey || !this.keyVerified) return;
    const encrypted = await encryptData(JSON.stringify(state), this.encryptionKey);
    const payload = JSON.stringify({
      v: 1,
      iv: encrypted.iv,
      data: encrypted.data,
      savedAtMs: Date.now(),
      // Persisted sync bookkeeping: lets the next launch know that this device
      // may still hold changes the server has not seen yet.
      dirty: this.mutationCounter !== this.pushedMutationCounter,
      mutationAtMs: this.lastLocalMutationAtMs,
    });
    try {
      localStorage.setItem(MIRROR_KEY, payload);
      // Migration finished: the plaintext copy is no longer needed.
      localStorage.removeItem(LEGACY_STATE_KEY);
    } catch {
      /* ignore: the mirror is an optimization, the server copy is authoritative */
    }
  }

  private normalizeState(parsed: unknown): StorageState {
    const raw = (parsed ?? {}) as Partial<StorageState>;
    return {
      apiKeys: raw.apiKeys ?? [],
      prompts: raw.prompts ?? [],
      mcpServers: raw.mcpServers ?? [],
      skills: raw.skills ?? [],
      bookmarks: raw.bookmarks ?? [],
      vaultItems: raw.vaultItems ?? [],
      notes: raw.notes ?? [],
      todos: raw.todos ?? [],
      snippets: raw.snippets ?? [],
      clipboard: raw.clipboard ?? [],
      activity: raw.activity ?? [],
      settings: { ...initialSettings, ...(raw.settings ?? {}) },
    };
  }

  // ------------------------------------------------------------ push

  private markDirty(): void {
    this.mutationCounter += 1;
    this.lastLocalMutationAtMs = Date.now();
    this.scheduleMirrorWrite();
    this.schedulePush();
  }

  private schedulePush(): void {
    if (this.pushTimer) clearTimeout(this.pushTimer);
    this.pushTimer = setTimeout(() => {
      this.pushTimer = null;
      void this.pushNow();
    }, PUSH_DEBOUNCE_MS);
  }

  /** Encrypts and uploads the current state. Never throws. */
  async pushNow(): Promise<void> {
    if (this.pushInFlight) return this.pushInFlight;
    if (!this.token || !this.encryptionKey) return;
    if (!this.keyVerified) {
      // Refuse to write so a mistyped password cannot destroy the stored blob.
      this.setSyncState('unverified', 'Password not verified');
      return;
    }
    if (this.mutationCounter === this.pushedMutationCounter) return;

    const counterAtStart = this.mutationCounter;
    const snapshot = this.state;
    const token = this.token;
    const key = this.encryptionKey;

    this.pushInFlight = (async () => {
      try {
        this.setSyncState('syncing');
        const encrypted = await encryptData(JSON.stringify(snapshot), key);
        const result = await putWorkspaceBlob(token, {
          data: encrypted.data,
          iv: encrypted.iv,
        });

        if (!result.ok) {
          if (result.unauthorized) {
            this.raiseAuthError();
            this.setSyncState('error', 'Session expired');
          } else if (result.network) {
            this.setSyncState('offline', 'Server unreachable');
          } else {
            this.setSyncState('error', result.error);
          }
          this.schedulePush(); // retry later; local data stays intact
          return;
        }

        this.pushedMutationCounter = counterAtStart;
        if (typeof result.data.updatedAtMs === 'number') {
          this.lastRemoteUpdatedAtMs = result.data.updatedAtMs;
        }
        // Refresh the mirror so its persisted "dirty" flag reflects the push.
        this.scheduleMirrorWrite();
        const stillDirty = this.mutationCounter !== this.pushedMutationCounter;
        this.setSyncState(stillDirty ? 'syncing' : 'idle');
        if (stillDirty) this.schedulePush();
      } catch {
        this.setSyncState('offline', 'Upload failed');
        this.schedulePush();
      } finally {
        this.pushInFlight = null;
      }
    })();

    return this.pushInFlight;
  }

  // ------------------------------------------------------------ pull

  /** Cheap version check first; downloads the blob only when it changed. */
  async pullNow(force = false): Promise<void> {
    if (this.pullInFlight) return this.pullInFlight;
    if (!this.token || !this.encryptionKey || !this.keyVerified) return;

    const token = this.token;
    const key = this.encryptionKey;

    this.pullInFlight = (async () => {
      try {
        if (!force) {
          const meta = await getWorkspaceMeta(token);
          if (!meta.ok) {
            if (meta.unauthorized) {
              this.raiseAuthError();
              this.setSyncState('error', 'Session expired');
            } else {
              this.setSyncState('offline', meta.error);
            }
            return;
          }
          const remoteMs = meta.data.updatedAtMs;
          if (remoteMs === null) {
            // No blob yet (or it disappeared): never wipe local data.
            if (this.syncState !== 'idle' && this.mutationCounter === this.pushedMutationCounter) {
              this.setSyncState('idle');
            }
            return;
          }
          if (remoteMs === this.lastRemoteUpdatedAtMs) {
            if (this.syncState !== 'idle' && this.mutationCounter === this.pushedMutationCounter) {
              this.setSyncState('idle');
            }
            return;
          }
        }

        const result = await getWorkspaceBlob(token);
        if (!result.ok) {
          if (result.unauthorized) {
            this.raiseAuthError();
            this.setSyncState('error', 'Session expired');
          } else {
            this.setSyncState('offline', result.error);
          }
          return;
        }

        const blob = result.data;
        if (!blob.data || !blob.iv || blob.updatedAtMs === null) {
          return; // Empty or malformed reply: keep local state untouched.
        }

        const pendingLocalWrites = this.mutationCounter !== this.pushedMutationCounter;
        if (
          pendingLocalWrites &&
          this.lastLocalMutationAtMs !== null &&
          blob.updatedAtMs <= this.lastLocalMutationAtMs + CLOCK_SKEW_MS
        ) {
          // Our pending write is at least as new as the server copy → let the
          // debounced push win instead of dropping local edits.
          return;
        }

        let remoteState: StorageState;
        try {
          const plaintext = await decryptData(blob.data, blob.iv, key);
          remoteState = this.normalizeState(JSON.parse(plaintext));
        } catch {
          // Cannot decrypt (e.g. the blob was written with another password).
          this.setSyncState('error', 'Stored data could not be decrypted');
          return;
        }

        this.setSyncState('idle');
        this.adoptRemote(remoteState, blob.updatedAtMs);
      } catch {
        this.setSyncState('offline', 'Sync failed');
      } finally {
        this.pullInFlight = null;
      }
    })();

    return this.pullInFlight;
  }

  // ------------------------------------------------------------ scheduler

  startSync(): void {
    if (!API_AVAILABLE) return;
    if (!this.pullTimer) {
      this.pullTimer = setInterval(() => {
        // Hidden tabs do not poll; becoming visible pulls immediately.
        if (typeof document !== 'undefined' && document.hidden) return;
        void this.pullNow();
      }, PULL_INTERVAL_MS);
    }

    if (!this.listenersBound && typeof window !== 'undefined') {
      window.addEventListener('focus', this.handleFocusOrVisible);
      window.addEventListener('online', this.handleOnline);
      document.addEventListener('visibilitychange', this.handleFocusOrVisible);
      window.addEventListener('beforeunload', this.handleBeforeUnload);
      this.listenersBound = true;
    }
  }

  stopSync(): void {
    if (this.pullTimer) {
      clearInterval(this.pullTimer);
      this.pullTimer = null;
    }
    if (this.listenersBound && typeof window !== 'undefined') {
      window.removeEventListener('focus', this.handleFocusOrVisible);
      window.removeEventListener('online', this.handleOnline);
      document.removeEventListener('visibilitychange', this.handleFocusOrVisible);
      window.removeEventListener('beforeunload', this.handleBeforeUnload);
      this.listenersBound = false;
    }
  }

  private handleFocusOrVisible = (): void => {
    if (typeof document !== 'undefined' && document.hidden) return;
    void this.pullNow();
  };

  private handleOnline = (): void => {
    void this.pushNow();
    void this.pullNow();
  };

  /**
   * Best-effort final push. `beforeunload` cannot await promises, so an edit made
   * inside the debounce window may only exist in the mirror until the next
   * launch, which then pushes it.
   */
  private handleBeforeUnload = (): void => {
    if (this.mutationCounter !== this.pushedMutationCounter) void this.pushNow();
  };

  // ------------------------------------------------------------ public API

  public getState(): StorageState {
    return { ...this.state };
  }

  public logActivity(
    action: ActivityItem['action'],
    itemType: ActivityItem['itemType'],
    title: string,
  ): StorageState {
    const newItem: ActivityItem = {
      id: 'act-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      action,
      itemType,
      title,
      timestamp: new Date().toISOString(),
    };
    return this.saveState({ activity: [newItem, ...this.state.activity.slice(0, 49)] });
  }

  public saveState(partial: Partial<StorageState>): StorageState {
    this.state = { ...this.state, ...partial };
    this.markDirty();
    return this.getState();
  }

  public exportAll(): DevDeskBackup {
    return {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      appName: 'DevDesk',
      version: '1.0.0',
      data: this.getState(),
    };
  }

  public importData(
    jsonContent: string,
    mode: 'replace' | 'merge' = 'merge',
  ): { success: boolean; message: string } {
    try {
      const parsed = JSON.parse(jsonContent);
      if (!parsed || parsed.schemaVersion !== 1 || !parsed.data) {
        return { success: false, message: 'Invalid backup file schema. Required schemaVersion: 1' };
      }

      const imported = parsed.data as StorageState;
      let next: StorageState;

      if (mode === 'replace') {
        next = {
          apiKeys: imported.apiKeys || [],
          prompts: imported.prompts || [],
          mcpServers: imported.mcpServers || [],
          skills: imported.skills || [],
          bookmarks: imported.bookmarks || [],
          vaultItems: imported.vaultItems || [],
          notes: imported.notes || [],
          todos: imported.todos || [],
          snippets: imported.snippets || [],
          clipboard: imported.clipboard || [],
          activity: imported.activity || [],
          settings: { ...initialSettings, ...(imported.settings || {}) },
        };
      } else {
        const mergeArr = <T extends { id: string }>(current: T[], incoming: T[] = []) => {
          const map = new Map<string, T>();
          current.forEach((item) => map.set(item.id, item));
          incoming.forEach((item) => map.set(item.id, item));
          return Array.from(map.values());
        };

        next = {
          apiKeys: mergeArr(this.state.apiKeys, imported.apiKeys),
          prompts: mergeArr(this.state.prompts, imported.prompts),
          mcpServers: mergeArr(this.state.mcpServers, imported.mcpServers),
          skills: mergeArr(this.state.skills, imported.skills),
          bookmarks: mergeArr(this.state.bookmarks, imported.bookmarks),
          vaultItems: mergeArr(this.state.vaultItems, imported.vaultItems),
          notes: mergeArr(this.state.notes, imported.notes),
          todos: mergeArr(this.state.todos, imported.todos),
          snippets: mergeArr(this.state.snippets, imported.snippets),
          clipboard: mergeArr(this.state.clipboard, imported.clipboard),
          activity: [...(imported.activity || []), ...this.state.activity].slice(0, 50),
          settings: { ...this.state.settings, ...(imported.settings || {}) },
        };
      }

      this.saveState(next);
      return { success: true, message: 'Data imported successfully' };
    } catch (err: unknown) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Failed to parse JSON file',
      };
    }
  }

  public removeDemoData(): StorageState {
    const isNotDemo = (item: { id: string }) => !item.id.startsWith('demo-');
    return this.saveState({
      apiKeys: this.state.apiKeys.filter(isNotDemo),
      prompts: this.state.prompts.filter(isNotDemo),
      mcpServers: this.state.mcpServers.filter(isNotDemo),
      skills: this.state.skills.filter(isNotDemo),
      bookmarks: this.state.bookmarks.filter(isNotDemo),
      vaultItems: this.state.vaultItems.filter(isNotDemo),
      notes: this.state.notes.filter(isNotDemo),
      todos: this.state.todos.filter(isNotDemo),
      snippets: this.state.snippets.filter(isNotDemo),
      clipboard: this.state.clipboard.filter(isNotDemo),
      activity: this.state.activity.filter(
        (a) => !a.id.startsWith('act-1') && !a.id.startsWith('act-2'),
      ),
    });
  }

  /**
   * Wipes the workspace. The encrypted mirror is overwritten on the next write
   * and the empty workspace is pushed, so a reset propagates to other devices.
   */
  public resetAll(): StorageState {
    this.state = emptyState();
    this.markDirty();
    return this.getState();
  }
}

export const storageService = new SecureStorageService();

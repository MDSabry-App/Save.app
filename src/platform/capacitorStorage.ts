/**
 * Capacitor (mobile) storage adapter — replaces localStorage mirror with
 * Capacitor Storage + SQLite via @capacitor-community/sqlite.
 *
 * The sync engine (storageService.ts) is UNCHANGED except the mirror I/O
 * functions are swapped: localStorage → Capacitor Storage.
 */
import { Storage } from '@capacitor/storage';
import { Capacitor } from '@capacitor/core';

const MIRROR_KEY = 'devdesk_mirror_v1';
const LEGACY_STATE_KEY = 'devdesk_workspace_v1';

// ---------- low-level mirror I/O ----------

export async function readRaw(key: string): Promise<string | null> {
  try {
    const { value } = await Storage.get({ key });
    return value && value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

export async function writeRaw(key: string, value: string): Promise<void> {
  try {
    await Storage.set({ key, value });
  } catch {
    /* ignore: storage full or unavailable */
  }
}

export async function removeRaw(key: string): Promise<void> {
  try {
    await Storage.remove({ key });
  } catch {
    /* ignore */
  }
}

// ---------- mirror helpers ----------

export function mirrorKey(): string { return MIRROR_KEY; }
export function legacyKey(): string { return LEGACY_STATE_KEY; }

/**
 * Replace all localStorage mirror calls in storageService.ts:
 *   - this.readRaw(key)        → await readRaw(key)
 *   - localStorage.setItem(...)→ await writeRaw(key, value)
 *   - localStorage.removeItem  → await removeRaw(key)
 *
 * The rest of storageService.ts stays identical.
 */

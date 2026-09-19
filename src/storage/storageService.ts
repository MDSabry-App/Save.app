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
import {
  initialSettings,
  demoApiKeys,
  demoPrompts,
  demoMcpServers,
  demoSkills,
  demoBookmarks,
  demoVaultItems,
  demoNotes,
  demoTodos,
  demoSnippets,
  demoClipboard,
  demoActivity,
} from '../constants/demoData';
import { encryptData, decryptData, deriveKey } from '../utils/crypto';

const STORAGE_KEY = 'devdesk_workspace_v1';
const DEMO_SEEDED_KEY = 'devdesk_demo_seeded_v1';

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

class SecureStorageService {
  private state: StorageState;
  private encryptionKey: CryptoKey | null = null;
  private initialized = false;

  constructor() {
    this.state = {
      apiKeys: [], prompts: [], mcpServers: [], skills: [], bookmarks: [],
      vaultItems: [], notes: [], todos: [], snippets: [], clipboard: [], activity: [],
      settings: initialSettings
    };
    this.initialized = true;
  }

  setEncryptionKey(salt: string | null, password: string | null) {
    if (salt && password) {
      deriveKey(password, salt).then(key => {
        this.encryptionKey = key;
      });
    } else {
      this.encryptionKey = null;
    }
  }

  async loadRemote(): Promise<StorageState> {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return this.state;

      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/data/workspace`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) return this.state;

      const { data: encrypted, iv } = await res.json();
      if (!encrypted || !iv || !this.encryptionKey) return this.state;

      const plaintext = await decryptData(encrypted, iv, this.encryptionKey);
      this.state = JSON.parse(plaintext);
      return this.state;
    } catch {
      return this.state;
    }
  }

  private saveToDisk(state: StorageState) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }

  async saveRemote(): Promise<void> {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token || !this.encryptionKey) return;

      const encrypted = await encryptData(JSON.stringify(this.state), this.encryptionKey);

      await fetch(`${import.meta.env.VITE_API_URL}/api/data/workspace`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(encrypted),
      });
    } catch {}
  }

  public getState(): StorageState {
    return { ...this.state };
  }

  public logActivity(action: ActivityItem['action'], itemType: ActivityItem['itemType'], title: string) {
    const newItem: ActivityItem = {
      id: 'act-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      action, itemType, title,
      timestamp: new Date().toISOString(),
    };
    this.state.activity = [newItem, ...this.state.activity.slice(0, 49)];
    this.saveToDisk(this.state);
    this.saveRemote();
  }

  public saveState(partial: Partial<StorageState>): StorageState {
    this.state = { ...this.state, ...partial };
    this.saveToDisk(this.state);
    this.saveRemote();
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

  public importData(jsonContent: string, mode: 'replace' | 'merge' = 'merge'): { success: boolean; message: string } {
    try {
      const parsed = JSON.parse(jsonContent);
      if (!parsed || parsed.schemaVersion !== 1 || !parsed.data) {
        return { success: false, message: 'Invalid backup file schema. Required schemaVersion: 1' };
      }

      const imported = parsed.data as StorageState;

      if (mode === 'replace') {
        this.state = {
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

        this.state = {
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

      this.saveToDisk(this.state);
      this.logActivity('exported', 'data', `Imported data (${mode} mode)`);
      return { success: true, message: 'Data imported successfully' };
    } catch (err: unknown) {
      return { success: false, message: err instanceof Error ? err.message : 'Failed to parse JSON file' };
    }
  }

  public removeDemoData(): StorageState {
    const isNotDemo = (item: { id: string }) => !item.id.startsWith('demo-');
    this.state = {
      ...this.state,
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
      activity: this.state.activity.filter((a) => !a.id.startsWith('act-1') && !a.id.startsWith('act-2')),
    };
    this.saveToDisk(this.state);
    this.saveRemote();
    return this.getState();
  }

  public resetAll(): StorageState {
    localStorage.removeItem(STORAGE_KEY);
    this.state = {
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
      settings: initialSettings,
    };
    this.saveToDisk(this.state);
    return this.getState();
  }
}

export const storageService = new SecureStorageService();

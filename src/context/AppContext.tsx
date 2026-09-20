import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  ViewMode,
  ToastMessage,
  Language,
  Direction,
} from '../types';
import { storageService, StorageState } from '../storage/storageService';
import { translations } from '../constants/translations';
import { platform } from '../platform';

interface AppContextType {
  // Navigation & UI
  currentView: ViewMode;
  setCurrentView: (view: ViewMode) => void;
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  isCommandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  isSearchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Language & Direction
  language: Language;
  direction: Direction;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations.en) => string;

  // Theme & Settings
  settings: UserSettings;
  updateSettings: (partial: Partial<UserSettings>) => void;

  // Toasts
  toasts: ToastMessage[];
  addToast: (msg: { message: string; type?: ToastMessage['type']; title?: string }) => void;
  removeToast: (id: string) => void;

  // State Collections
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

  // CRUD Operations
  saveApiKey: (item: Omit<ApiKeyItem, 'id' | 'createdAt'> & { id?: string }) => void;
  deleteApiKey: (id: string) => void;
  toggleApiKeyFavorite: (id: string) => void;
  updateApiKeyStatus: (id: string, status: 'active' | 'inactive') => void;

  savePrompt: (item: Omit<PromptItem, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => void;
  deletePrompt: (id: string) => void;
  togglePromptFavorite: (id: string) => void;
  duplicatePrompt: (id: string) => void;

  saveMcpServer: (item: Omit<McpServerItem, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => void;
  deleteMcpServer: (id: string) => void;
  toggleMcpFavorite: (id: string) => void;
  duplicateMcpServer: (id: string) => void;

  saveSkill: (item: Omit<SkillItem, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => void;
  deleteSkill: (id: string) => void;
  toggleSkillFavorite: (id: string) => void;
  duplicateSkill: (id: string) => void;

  saveBookmark: (item: Omit<BookmarkItem, 'id' | 'createdAt'> & { id?: string }) => void;
  deleteBookmark: (id: string) => void;
  toggleBookmarkFavorite: (id: string) => void;

  saveVaultItem: (item: Omit<VaultItem, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => void;
  deleteVaultItem: (id: string) => void;
  toggleVaultFavorite: (id: string) => void;

  saveNote: (item: Omit<NoteItem, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => void;
  deleteNote: (id: string) => void;
  toggleNotePin: (id: string) => void;
  toggleNoteFavorite: (id: string) => void;

  saveTodo: (item: Omit<TodoItem, 'id' | 'createdAt'> & { id?: string }) => void;
  deleteTodo: (id: string) => void;
  toggleTodoStatus: (id: string) => void;
  toggleTodoFavorite: (id: string) => void;

  saveSnippet: (item: Omit<SnippetItem, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => void;
  deleteSnippet: (id: string) => void;
  toggleSnippetFavorite: (id: string) => void;
  duplicateSnippet: (id: string) => void;

  addClipboardItem: (text: string) => void;
  deleteClipboardItem: (id: string) => void;
  toggleClipboardFavorite: (id: string) => void;
  clearClipboard: () => void;

  // Backup & Maintenance
  exportAllData: () => void;
  importAllData: (jsonStr: string, mode?: 'merge' | 'replace') => boolean;
  removeDemoData: () => void;
  resetAllData: () => void;
  copyToClipboard: (text: string, label?: string) => Promise<boolean>;

  // Cross-device sync
  /** Forces an immediate pull (used by the "sync now" action in Settings). */
  syncNow: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<StorageState>(() => storageService.getState());
  const [currentView, setCurrentView] = useState<ViewMode>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isCommandPaletteOpen, setCommandPaletteOpen] = useState<boolean>(false);
  const [isSearchOpen, setSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Cross-device sync: adopt state pulled from another device.
  // Only fires for remote updates, so local edits are not re-applied twice.
  useEffect(
    () =>
      storageService.onRemoteUpdate((next) => {
        setState(next);
      }),
    [],
  );

  // Apply language and direction to html document
  useEffect(() => {
    const lang = state.settings.language || 'en';
    const dir = state.settings.direction || (lang === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;

    // Apply dark class and colorScheme
    if (state.settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    } else if (state.settings.theme === 'light') {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    } else {
      // System
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const applySystem = (isDark: boolean) => {
        if (isDark) {
          document.documentElement.classList.add('dark');
          document.documentElement.style.colorScheme = 'dark';
        } else {
          document.documentElement.classList.remove('dark');
          document.documentElement.style.colorScheme = 'light';
        }
      };
      applySystem(mediaQuery.matches);
      const listener = (e: MediaQueryListEvent) => applySystem(e.matches);
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [state.settings.language, state.settings.direction, state.settings.theme]);

  // Toast manager
  const addToast = useCallback(
    ({ message, type = 'info', title }: { message: string; type?: ToastMessage['type']; title?: string }) => {
      const id = 'toast-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5);
      const newToast: ToastMessage = { id, message, type, title, durationMs: 3500 };
      setToasts((prev) => [...prev, newToast]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3500);
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const copyToClipboard = useCallback(
    async (text: string, label = 'Copied to clipboard') => {
      const success = await platform.clipboard.writeText(text);
      if (success) {
        addToast({ message: label, type: 'success' });
        // Also log to internal clipboard history
        if (text.length > 0) {
          const newClip: ClipboardItem = {
            id: 'clip-' + Date.now(),
            text,
            isFavorite: false,
            copiedAt: new Date().toISOString(),
            characterCount: text.length,
          };
          const updatedClips = [newClip, ...state.clipboard.filter((c) => c.text !== text).slice(0, 49)];
          const newState = storageService.saveState({ clipboard: updatedClips });
          setState(newState);
        }
      } else {
        addToast({ message: 'Failed to copy to clipboard', type: 'error' });
      }
      return success;
    },
    [addToast, state.clipboard]
  );

  // Translation helper
  const t = useCallback(
    (key: keyof typeof translations.en): string => {
      const lang = state.settings.language || 'en';
      const dict = translations[lang] || translations.en;
      return (dict as Record<string, string>)[key] || translations.en[key] || key;
    },
    [state.settings.language]
  );

  // Language setter
  const setLanguage = useCallback(
    (lang: Language) => {
      const direction: Direction = lang === 'ar' ? 'rtl' : 'ltr';
      const updatedSettings: UserSettings = {
        ...state.settings,
        language: lang,
        direction,
      };
      const newState = storageService.saveState({ settings: updatedSettings });
      setState(newState);
      addToast({
        message: lang === 'ar' ? 'تم تبديل اللغة إلى العربية' : 'Switched to English',
        type: 'info',
      });
    },
    [state.settings, addToast]
  );

  const updateSettings = useCallback((partial: Partial<UserSettings>) => {
    setState((prev) => {
      const updated = { ...prev.settings, ...partial };
      return storageService.saveState({ settings: updated });
    });
  }, []);

  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed((prev) => !prev);
  }, []);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setSearchOpen(false);
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // API Key operations
  const saveApiKey = useCallback(
    (item: Omit<ApiKeyItem, 'id' | 'createdAt'> & { id?: string }) => {
      setState((prev) => {
        const isNew = !item.id;
        const id = item.id || 'api-' + Date.now();
        const createdAt = isNew ? new Date().toISOString() : prev.apiKeys.find((k) => k.id === id)?.createdAt || new Date().toISOString();
        const fullItem: ApiKeyItem = {
          ...item,
          id,
          createdAt,
        };

        const apiKeys = isNew
          ? [fullItem, ...prev.apiKeys]
          : prev.apiKeys.map((k) => (k.id === id ? fullItem : k));

        storageService.logActivity(isNew ? 'created' : 'updated', 'api-key', fullItem.name);
        return storageService.saveState({ apiKeys });
      });
      addToast({ message: 'API Key saved', type: 'success' });
    },
    [addToast]
  );

  const deleteApiKey = useCallback(
    (id: string) => {
      setState((prev) => {
        const target = prev.apiKeys.find((k) => k.id === id);
        const apiKeys = prev.apiKeys.filter((k) => k.id !== id);
        if (target) storageService.logActivity('deleted', 'api-key', target.name);
        return storageService.saveState({ apiKeys });
      });
      addToast({ message: 'API Key removed', type: 'info' });
    },
    [addToast]
  );

  const toggleApiKeyFavorite = useCallback((id: string) => {
    setState((prev) => {
      const apiKeys = prev.apiKeys.map((k) => (k.id === id ? { ...k, isFavorite: !k.isFavorite } : k));
      return storageService.saveState({ apiKeys });
    });
  }, []);

  const updateApiKeyStatus = useCallback((id: string, status: 'active' | 'inactive') => {
    setState((prev) => {
      const apiKeys = prev.apiKeys.map((k) => (k.id === id ? { ...k, status } : k));
      return storageService.saveState({ apiKeys });
    });
  }, []);

  // Prompts
  const savePrompt = useCallback(
    (item: Omit<PromptItem, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
      setState((prev) => {
        const isNew = !item.id;
        const id = item.id || 'pr-' + Date.now();
        const now = new Date().toISOString();
        const createdAt = isNew ? now : prev.prompts.find((p) => p.id === id)?.createdAt || now;

        const fullItem: PromptItem = {
          ...item,
          id,
          createdAt,
          updatedAt: now,
        };

        const prompts = isNew ? [fullItem, ...prev.prompts] : prev.prompts.map((p) => (p.id === id ? fullItem : p));
        storageService.logActivity(isNew ? 'created' : 'updated', 'prompt', fullItem.title);
        return storageService.saveState({ prompts });
      });
      addToast({ message: 'Prompt saved', type: 'success' });
    },
    [addToast]
  );

  const deletePrompt = useCallback(
    (id: string) => {
      setState((prev) => {
        const target = prev.prompts.find((p) => p.id === id);
        const prompts = prev.prompts.filter((p) => p.id !== id);
        if (target) storageService.logActivity('deleted', 'prompt', target.title);
        return storageService.saveState({ prompts });
      });
      addToast({ message: 'Prompt deleted', type: 'info' });
    },
    [addToast]
  );

  const togglePromptFavorite = useCallback((id: string) => {
    setState((prev) => {
      const prompts = prev.prompts.map((p) => (p.id === id ? { ...p, isFavorite: !p.isFavorite } : p));
      return storageService.saveState({ prompts });
    });
  }, []);

  const duplicatePrompt = useCallback(
    (id: string) => {
      const target = state.prompts.find((p) => p.id === id);
      if (!target) return;
      savePrompt({
        ...target,
        title: `${target.title} (Copy)`,
        id: undefined,
      });
    },
    [state.prompts, savePrompt]
  );

  // MCP Servers
  const saveMcpServer = useCallback(
    (item: Omit<McpServerItem, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
      setState((prev) => {
        const isNew = !item.id;
        const id = item.id || 'mcp-' + Date.now();
        const now = new Date().toISOString();
        const createdAt = isNew ? now : prev.mcpServers.find((m) => m.id === id)?.createdAt || now;

        const fullItem: McpServerItem = {
          ...item,
          id,
          createdAt,
          updatedAt: now,
        };

        const mcpServers = isNew ? [fullItem, ...prev.mcpServers] : prev.mcpServers.map((m) => (m.id === id ? fullItem : m));
        storageService.logActivity(isNew ? 'created' : 'updated', 'mcp', fullItem.name);
        return storageService.saveState({ mcpServers });
      });
      addToast({ message: 'MCP configuration saved', type: 'success' });
    },
    [addToast]
  );

  const deleteMcpServer = useCallback(
    (id: string) => {
      setState((prev) => {
        const target = prev.mcpServers.find((m) => m.id === id);
        const mcpServers = prev.mcpServers.filter((m) => m.id !== id);
        if (target) storageService.logActivity('deleted', 'mcp', target.name);
        return storageService.saveState({ mcpServers });
      });
      addToast({ message: 'MCP server removed', type: 'info' });
    },
    [addToast]
  );

  const toggleMcpFavorite = useCallback((id: string) => {
    setState((prev) => {
      const mcpServers = prev.mcpServers.map((m) => (m.id === id ? { ...m, isFavorite: !m.isFavorite } : m));
      return storageService.saveState({ mcpServers });
    });
  }, []);

  const duplicateMcpServer = useCallback(
    (id: string) => {
      const target = state.mcpServers.find((m) => m.id === id);
      if (!target) return;
      saveMcpServer({
        ...target,
        name: `${target.name} (Copy)`,
        id: undefined,
      });
    },
    [state.mcpServers, saveMcpServer]
  );

  // Skills
  const saveSkill = useCallback(
    (item: Omit<SkillItem, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
      setState((prev) => {
        const isNew = !item.id;
        const id = item.id || 'sk-' + Date.now();
        const now = new Date().toISOString();
        const createdAt = isNew ? now : prev.skills.find((s) => s.id === id)?.createdAt || now;

        const fullItem: SkillItem = {
          ...item,
          id,
          createdAt,
          updatedAt: now,
        };

        const skills = isNew ? [fullItem, ...prev.skills] : prev.skills.map((s) => (s.id === id ? fullItem : s));
        storageService.logActivity(isNew ? 'created' : 'updated', 'skill', fullItem.name);
        return storageService.saveState({ skills });
      });
      addToast({ message: 'Skill saved', type: 'success' });
    },
    [addToast]
  );

  const deleteSkill = useCallback(
    (id: string) => {
      setState((prev) => {
        const target = prev.skills.find((s) => s.id === id);
        const skills = prev.skills.filter((s) => s.id !== id);
        if (target) storageService.logActivity('deleted', 'skill', target.name);
        return storageService.saveState({ skills });
      });
      addToast({ message: 'Skill deleted', type: 'info' });
    },
    [addToast]
  );

  const toggleSkillFavorite = useCallback((id: string) => {
    setState((prev) => {
      const skills = prev.skills.map((s) => (s.id === id ? { ...s, isFavorite: !s.isFavorite } : s));
      return storageService.saveState({ skills });
    });
  }, []);

  const duplicateSkill = useCallback(
    (id: string) => {
      const target = state.skills.find((s) => s.id === id);
      if (!target) return;
      saveSkill({
        ...target,
        name: `${target.name} (Copy)`,
        id: undefined,
      });
    },
    [state.skills, saveSkill]
  );

  // Bookmarks
  const saveBookmark = useCallback(
    (item: Omit<BookmarkItem, 'id' | 'createdAt'> & { id?: string }) => {
      setState((prev) => {
        const isNew = !item.id;
        const id = item.id || 'bm-' + Date.now();
        const createdAt = isNew ? new Date().toISOString() : prev.bookmarks.find((b) => b.id === id)?.createdAt || new Date().toISOString();

        const fullItem: BookmarkItem = {
          ...item,
          id,
          createdAt,
        };

        const bookmarks = isNew ? [fullItem, ...prev.bookmarks] : prev.bookmarks.map((b) => (b.id === id ? fullItem : b));
        storageService.logActivity(isNew ? 'created' : 'updated', 'bookmark', fullItem.title);
        return storageService.saveState({ bookmarks });
      });
      addToast({ message: 'Bookmark saved', type: 'success' });
    },
    [addToast]
  );

  const deleteBookmark = useCallback(
    (id: string) => {
      setState((prev) => {
        const target = prev.bookmarks.find((b) => b.id === id);
        const bookmarks = prev.bookmarks.filter((b) => b.id !== id);
        if (target) storageService.logActivity('deleted', 'bookmark', target.title);
        return storageService.saveState({ bookmarks });
      });
      addToast({ message: 'Bookmark removed', type: 'info' });
    },
    [addToast]
  );

  const toggleBookmarkFavorite = useCallback((id: string) => {
    setState((prev) => {
      const bookmarks = prev.bookmarks.map((b) => (b.id === id ? { ...b, isFavorite: !b.isFavorite } : b));
      return storageService.saveState({ bookmarks });
    });
  }, []);

  // Vault Items
  const saveVaultItem = useCallback(
    (item: Omit<VaultItem, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
      setState((prev) => {
        const isNew = !item.id;
        const id = item.id || 'vt-' + Date.now();
        const now = new Date().toISOString();
        const createdAt = isNew ? now : prev.vaultItems.find((v) => v.id === id)?.createdAt || now;

        const fullItem: VaultItem = {
          ...item,
          id,
          createdAt,
          updatedAt: now,
        };

        const vaultItems = isNew ? [fullItem, ...prev.vaultItems] : prev.vaultItems.map((v) => (v.id === id ? fullItem : v));
        storageService.logActivity(isNew ? 'created' : 'updated', 'vault', fullItem.website);
        return storageService.saveState({ vaultItems });
      });
      addToast({ message: 'Credentials saved in vault', type: 'success' });
    },
    [addToast]
  );

  const deleteVaultItem = useCallback(
    (id: string) => {
      setState((prev) => {
        const target = prev.vaultItems.find((v) => v.id === id);
        const vaultItems = prev.vaultItems.filter((v) => v.id !== id);
        if (target) storageService.logActivity('deleted', 'vault', target.website);
        return storageService.saveState({ vaultItems });
      });
      addToast({ message: 'Vault entry deleted', type: 'info' });
    },
    [addToast]
  );

  const toggleVaultFavorite = useCallback((id: string) => {
    setState((prev) => {
      const vaultItems = prev.vaultItems.map((v) => (v.id === id ? { ...v, isFavorite: !v.isFavorite } : v));
      return storageService.saveState({ vaultItems });
    });
  }, []);

  // Notes
  const saveNote = useCallback(
    (item: Omit<NoteItem, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
      setState((prev) => {
        const isNew = !item.id;
        const id = item.id || 'nt-' + Date.now();
        const now = new Date().toISOString();
        const createdAt = isNew ? now : prev.notes.find((n) => n.id === id)?.createdAt || now;

        const fullItem: NoteItem = {
          ...item,
          id,
          createdAt,
          updatedAt: now,
        };

        const notes = isNew ? [fullItem, ...prev.notes] : prev.notes.map((n) => (n.id === id ? fullItem : n));
        storageService.logActivity(isNew ? 'created' : 'updated', 'note', fullItem.title);
        return storageService.saveState({ notes });
      });
      addToast({ message: 'Note saved', type: 'success' });
    },
    [addToast]
  );

  const deleteNote = useCallback(
    (id: string) => {
      setState((prev) => {
        const target = prev.notes.find((n) => n.id === id);
        const notes = prev.notes.filter((n) => n.id !== id);
        if (target) storageService.logActivity('deleted', 'note', target.title);
        return storageService.saveState({ notes });
      });
      addToast({ message: 'Note deleted', type: 'info' });
    },
    [addToast]
  );

  const toggleNotePin = useCallback((id: string) => {
    setState((prev) => {
      const notes = prev.notes.map((n) => (n.id === id ? { ...n, isPinned: !n.isPinned } : n));
      return storageService.saveState({ notes });
    });
  }, []);

  const toggleNoteFavorite = useCallback((id: string) => {
    setState((prev) => {
      const notes = prev.notes.map((n) => (n.id === id ? { ...n, isFavorite: !n.isFavorite } : n));
      return storageService.saveState({ notes });
    });
  }, []);

  // Todos
  const saveTodo = useCallback(
    (item: Omit<TodoItem, 'id' | 'createdAt'> & { id?: string }) => {
      setState((prev) => {
        const isNew = !item.id;
        const id = item.id || 'td-' + Date.now();
        const createdAt = isNew ? new Date().toISOString() : prev.todos.find((t) => t.id === id)?.createdAt || new Date().toISOString();

        const fullItem: TodoItem = {
          ...item,
          id,
          createdAt,
        };

        const todos = isNew ? [fullItem, ...prev.todos] : prev.todos.map((t) => (t.id === id ? fullItem : t));
        storageService.logActivity(isNew ? 'created' : 'updated', 'todo', fullItem.title);
        return storageService.saveState({ todos });
      });
      addToast({ message: 'Task saved', type: 'success' });
    },
    [addToast]
  );

  const deleteTodo = useCallback(
    (id: string) => {
      setState((prev) => {
        const target = prev.todos.find((t) => t.id === id);
        const todos = prev.todos.filter((t) => t.id !== id);
        if (target) storageService.logActivity('deleted', 'todo', target.title);
        return storageService.saveState({ todos });
      });
      addToast({ message: 'Task removed', type: 'info' });
    },
    [addToast]
  );

  const toggleTodoStatus = useCallback(
    (id: string) => {
      setState((prev) => {
        const todos = prev.todos.map((t) => {
          if (t.id === id) {
            const nextStatus = t.status === 'pending' ? 'completed' : 'pending';
            return {
              ...t,
              status: nextStatus as 'pending' | 'completed',
              completedAt: nextStatus === 'completed' ? new Date().toISOString() : undefined,
            };
          }
          return t;
        });
        return storageService.saveState({ todos });
      });
    },
    []
  );

  const toggleTodoFavorite = useCallback((id: string) => {
    setState((prev) => {
      const todos = prev.todos.map((t) => (t.id === id ? { ...t, isFavorite: !t.isFavorite } : t));
      return storageService.saveState({ todos });
    });
  }, []);

  // Snippets
  const saveSnippet = useCallback(
    (item: Omit<SnippetItem, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
      setState((prev) => {
        const isNew = !item.id;
        const id = item.id || 'sn-' + Date.now();
        const now = new Date().toISOString();
        const createdAt = isNew ? now : prev.snippets.find((s) => s.id === id)?.createdAt || now;

        const fullItem: SnippetItem = {
          ...item,
          id,
          createdAt,
          updatedAt: now,
        };

        const snippets = isNew ? [fullItem, ...prev.snippets] : prev.snippets.map((s) => (s.id === id ? fullItem : s));
        storageService.logActivity(isNew ? 'created' : 'updated', 'snippet', fullItem.title);
        return storageService.saveState({ snippets });
      });
      addToast({ message: 'Snippet saved', type: 'success' });
    },
    [addToast]
  );

  const deleteSnippet = useCallback(
    (id: string) => {
      setState((prev) => {
        const target = prev.snippets.find((s) => s.id === id);
        const snippets = prev.snippets.filter((s) => s.id !== id);
        if (target) storageService.logActivity('deleted', 'snippet', target.title);
        return storageService.saveState({ snippets });
      });
      addToast({ message: 'Snippet deleted', type: 'info' });
    },
    [addToast]
  );

  const toggleSnippetFavorite = useCallback((id: string) => {
    setState((prev) => {
      const snippets = prev.snippets.map((s) => (s.id === id ? { ...s, isFavorite: !s.isFavorite } : s));
      return storageService.saveState({ snippets });
    });
  }, []);

  const duplicateSnippet = useCallback(
    (id: string) => {
      const target = state.snippets.find((s) => s.id === id);
      if (!target) return;
      saveSnippet({
        ...target,
        title: `${target.title} (Copy)`,
        id: undefined,
      });
    },
    [state.snippets, saveSnippet]
  );

  // Clipboard
  const addClipboardItem = useCallback((text: string) => {
    if (!text.trim()) return;
    setState((prev) => {
      const newClip: ClipboardItem = {
        id: 'clip-' + Date.now(),
        text,
        isFavorite: false,
        copiedAt: new Date().toISOString(),
        characterCount: text.length,
      };
      const filtered = prev.clipboard.filter((c) => c.text !== text);
      const clipboard = [newClip, ...filtered.slice(0, 49)];
      return storageService.saveState({ clipboard });
    });
  }, []);

  const deleteClipboardItem = useCallback((id: string) => {
    setState((prev) => {
      const clipboard = prev.clipboard.filter((c) => c.id !== id);
      return storageService.saveState({ clipboard });
    });
  }, []);

  const toggleClipboardFavorite = useCallback((id: string) => {
    setState((prev) => {
      const clipboard = prev.clipboard.map((c) => (c.id === id ? { ...c, isFavorite: !c.isFavorite } : c));
      return storageService.saveState({ clipboard });
    });
  }, []);

  const clearClipboard = useCallback(() => {
    setState((prev) => {
      const clipboard = prev.clipboard.filter((c) => c.isFavorite);
      return storageService.saveState({ clipboard });
    });
    addToast({ message: 'Non-favorite clipboard history cleared', type: 'info' });
  }, [addToast]);

  // Backup & Restore
  const exportAllData = useCallback(() => {
    const backup = storageService.exportAll();
    const jsonStr = JSON.stringify(backup, null, 2);
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `savedesk-backup-${dateStr}.json`;
    platform.fileSystem.saveFile(filename, jsonStr, 'application/json');
    addToast({ message: `Exported workspace backup: ${filename}`, type: 'success' });
  }, [addToast]);

  const importAllData = useCallback(
    (jsonStr: string, mode: 'merge' | 'replace' = 'merge') => {
      const result = storageService.importData(jsonStr, mode);
      if (result.success) {
        setState(storageService.getState());
        addToast({ message: result.message, type: 'success' });
        return true;
      } else {
        addToast({ message: result.message, type: 'error' });
        return false;
      }
    },
    [addToast]
  );

  const removeDemoData = useCallback(() => {
    const newState = storageService.removeDemoData();
    setState(newState);
    addToast({ message: 'Demo data removed from workspace', type: 'info' });
  }, [addToast]);

  const resetAllData = useCallback(() => {
    const newState = storageService.resetAll();
    setState(newState);
    addToast({ message: 'Workspace reset to clean state', type: 'warning' });
  }, [addToast]);

  const syncNow = useCallback(async () => {
    await storageService.pullNow(true);
    setState(storageService.getState());
  }, []);

  return (
    <AppContext.Provider
      value={{
        currentView,
        setCurrentView,
        isSidebarCollapsed,
        toggleSidebar,
        isCommandPaletteOpen,
        setCommandPaletteOpen,
        isSearchOpen,
        setSearchOpen,
        searchQuery,
        setSearchQuery,
        language: state.settings.language,
        direction: state.settings.direction,
        setLanguage,
        t,
        settings: state.settings,
        updateSettings,
        toasts,
        addToast,
        removeToast,
        apiKeys: state.apiKeys,
        prompts: state.prompts,
        mcpServers: state.mcpServers,
        skills: state.skills,
        bookmarks: state.bookmarks,
        vaultItems: state.vaultItems,
        notes: state.notes,
        todos: state.todos,
        snippets: state.snippets,
        clipboard: state.clipboard,
        activity: state.activity,
        saveApiKey,
        deleteApiKey,
        toggleApiKeyFavorite,
        updateApiKeyStatus,
        savePrompt,
        deletePrompt,
        togglePromptFavorite,
        duplicatePrompt,
        saveMcpServer,
        deleteMcpServer,
        toggleMcpFavorite,
        duplicateMcpServer,
        saveSkill,
        deleteSkill,
        toggleSkillFavorite,
        duplicateSkill,
        saveBookmark,
        deleteBookmark,
        toggleBookmarkFavorite,
        saveVaultItem,
        deleteVaultItem,
        toggleVaultFavorite,
        saveNote,
        deleteNote,
        toggleNotePin,
        toggleNoteFavorite,
        saveTodo,
        deleteTodo,
        toggleTodoStatus,
        toggleTodoFavorite,
        saveSnippet,
        deleteSnippet,
        toggleSnippetFavorite,
        duplicateSnippet,
        addClipboardItem,
        deleteClipboardItem,
        toggleClipboardFavorite,
        clearClipboard,
        exportAllData,
        importAllData,
        removeDemoData,
        resetAllData,
        copyToClipboard,
        syncNow,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export type ViewMode =
  | 'dashboard'
  | 'api-keys'
  | 'prompts'
  | 'mcp'
  | 'skills'
  | 'bookmarks'
  | 'passwords'
  | 'notes'
  | 'todos'
  | 'snippets'
  | 'dev-tools'
  | 'clipboard'
  | 'favorites'
  | 'activity'
  | 'settings';

export type Language = 'en' | 'ar';
export type Direction = 'ltr' | 'rtl';
export type Theme = 'light' | 'dark' | 'system';

export interface ApiKeyItem {
  id: string;
  provider: string;
  name: string;
  apiKey: string;
  baseURL: string;
  model: string;
  environment: 'Development' | 'Staging' | 'Production' | 'Test';
  tags: string[];
  notes: string;
  status: 'active' | 'inactive';
  isFavorite: boolean;
  createdAt: string;
  lastTested?: string;
  lastTestStatus?: 'success' | 'error' | 'pending';
}

export interface ApiTestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  endpoint: string;
  headers: { key: string; value: string }[];
  body: string;
  timeoutMs: number;
}

export interface ApiTestResponse {
  status: number;
  statusText: string;
  timeMs: number;
  headers: Record<string, string>;
  body: string;
  isJson: boolean;
  error?: string;
  corsBlocked?: boolean;
}

export interface PromptItem {
  id: string;
  title: string;
  description: string;
  prompt: string;
  category: string;
  tags: string[];
  variables: string[];
  modelRecommendation?: string;
  notes: string;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface McpServerItem {
  id: string;
  name: string;
  description: string;
  type: 'stdio' | 'http' | 'sse';
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
  notes: string;
  tags: string[];
  status: 'active' | 'inactive';
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SkillItem {
  id: string;
  name: string;
  description: string;
  category: string;
  content: string; // Markdown
  tags: string[];
  version: string;
  author: string;
  tools: string[];
  notes: string;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BookmarkItem {
  id: string;
  title: string;
  url: string;
  description: string;
  category:
    | 'Development'
    | 'AI'
    | 'Documentation'
    | 'Tools'
    | 'Learning'
    | 'Design'
    | 'Productivity'
    | 'Social'
    | 'Other';
  tags: string[];
  isFavorite: boolean;
  icon?: string;
  notes: string;
  createdAt: string;
}

export interface VaultItem {
  id: string;
  website: string;
  username: string;
  password: string;
  email: string;
  url: string;
  notes: string;
  tags: string[];
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NoteItem {
  id: string;
  title: string;
  content: string; // Markdown
  category?: string;
  isPinned: boolean;
  isFavorite: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface TodoItem {
  id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  tags: string[];
  status: 'pending' | 'completed';
  subtasks: Subtask[];
  isFavorite: boolean;
  createdAt: string;
  completedAt?: string;
}

export interface SnippetItem {
  id: string;
  title: string;
  language: string;
  description: string;
  code: string;
  tags: string[];
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClipboardItem {
  id: string;
  text: string;
  isFavorite: boolean;
  copiedAt: string;
  characterCount: number;
}

export interface ActivityItem {
  id: string;
  action: 'created' | 'updated' | 'deleted' | 'copied' | 'tested' | 'exported';
  itemType:
    | 'api-key'
    | 'prompt'
    | 'mcp'
    | 'skill'
    | 'bookmark'
    | 'vault'
    | 'note'
    | 'todo'
    | 'snippet'
    | 'clipboard'
    | 'data';
  title: string;
  timestamp: string;
}

export interface UserSettings {
  theme: Theme;
  language: Language;
  direction: Direction;
  autoLockMinutes: number;
  maskSensitiveByDefault: boolean;
  clearClipboardMinutes: number;
  enableNativeNotifications: boolean;
  dashboardWidgets: {
    stats: boolean;
    quickActions: boolean;
    favorites: boolean;
    recentActivity: boolean;
    quickTools: boolean;
  };
}

export interface ToastMessage {
  id: string;
  title?: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  durationMs?: number;
}

export interface SaveDeskBackup {
  schemaVersion: 1;
  exportedAt: string;
  appName: string;
  version: string;
  data: {
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
  };
}

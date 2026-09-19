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
} from '../types';

export const initialSettings: UserSettings = {
  theme: 'dark',
  language: 'en',
  direction: 'ltr',
  autoLockMinutes: 0,
  maskSensitiveByDefault: true,
  clearClipboardMinutes: 0,
  enableNativeNotifications: true,
  dashboardWidgets: {
    stats: true,
    quickActions: true,
    favorites: true,
    recentActivity: true,
    quickTools: true,
  },
};

export const demoApiKeys: ApiKeyItem[] = [
  {
    id: 'demo-api-1',
    provider: 'OpenAI',
    name: 'OpenAI GPT-4o Production',
    apiKey: 'sk-proj-demo-open-ai-production-key-9982481',
    baseURL: 'https://api.openai.com/v1',
    model: 'gpt-4o',
    environment: 'Production',
    tags: ['ai', 'chat', 'vision'],
    notes: 'Primary production key for conversational agents and completions.',
    status: 'active',
    isFavorite: true,
    createdAt: '2026-09-10T10:00:00Z',
    lastTested: '2026-09-18T12:00:00Z',
    lastTestStatus: 'success',
  },
  {
    id: 'demo-api-2',
    provider: 'Google Gemini',
    name: 'Gemini 2.5 Flash Staging',
    apiKey: 'AIzaSyDemoGeminiKeyStaging99214710',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta',
    model: 'gemini-2.5-flash',
    environment: 'Staging',
    tags: ['gemini', 'multimodal', 'fast'],
    notes: 'High-throughput low-latency model for rapid processing.',
    status: 'active',
    isFavorite: true,
    createdAt: '2026-09-12T14:30:00Z',
  },
  {
    id: 'demo-api-3',
    provider: 'Anthropic',
    name: 'Claude 3.7 Sonnet Dev',
    apiKey: 'sk-ant-api03-demoAnthropicClaudeDev9923',
    baseURL: 'https://api.anthropic.com/v1',
    model: 'claude-3-7-sonnet-20250219',
    environment: 'Development',
    tags: ['claude', 'coding', 'reasoning'],
    notes: 'Used for complex architectural code review and refactoring.',
    status: 'active',
    isFavorite: false,
    createdAt: '2026-09-15T09:15:00Z',
  },
];

export const demoPrompts: PromptItem[] = [
  {
    id: 'demo-prompt-1',
    title: 'Senior TypeScript & React Code Reviewer',
    description: 'Deep architectural and performance code review focusing on strict typing, modularity, and memory leaks.',
    prompt: `You are an elite Senior TypeScript and React Architect.
Please thoroughly review the following {{component_name}} component in {{language}}.

Source Code:
\`\`\`{{language}}
{{source_code}}
\`\`\`

Analyze the code against:
1. Strict type-safety and anti-slop architecture
2. State management and unnecessary re-render hazards
3. Performance, memoization, and accessibility (WCAG AA)
4. Proposed surgical refactoring improvements`,
    category: 'Engineering',
    tags: ['react', 'typescript', 'architecture', 'code-review'],
    variables: ['component_name', 'language', 'source_code'],
    modelRecommendation: 'Claude 3.7 Sonnet / GPT-4o',
    notes: 'Extracts exact improvements and fixes edge cases.',
    isFavorite: true,
    createdAt: '2026-09-11T11:00:00Z',
    updatedAt: '2026-09-17T15:30:00Z',
  },
  {
    id: 'demo-prompt-2',
    title: 'REST API Contract & OpenAPI 3.1 Spec Generator',
    description: 'Transform entity schema descriptions into production-ready OpenAPI / Swagger specifications.',
    prompt: `Act as a Principal API Architect. Write a complete OpenAPI 3.1 specification for the {{service_name}} service.
Entities involved: {{entities}}.
Security scheme: Bearer JWT.
Include full schema validation, error response structures (400, 401, 403, 404, 500), and representative JSON examples.`,
    category: 'Backend',
    tags: ['api', 'openapi', 'swagger', 'backend'],
    variables: ['service_name', 'entities'],
    modelRecommendation: 'Gemini 2.5 Pro / GPT-4o',
    notes: 'Generates valid YAML schema.',
    isFavorite: false,
    createdAt: '2026-09-14T08:20:00Z',
    updatedAt: '2026-09-14T08:20:00Z',
  },
];

export const demoMcpServers: McpServerItem[] = [
  {
    id: 'demo-mcp-1',
    name: 'Filesystem Workspace Server',
    description: 'Local filesystem access provider allowing agents to read and modify files in a sandboxed directory.',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem', '/workspace/projects'],
    env: {
      NODE_ENV: 'production',
    },
    notes: 'Official Anthropic Model Context Protocol filesystem server.',
    tags: ['filesystem', 'stdio', 'local'],
    status: 'active',
    isFavorite: true,
    createdAt: '2026-09-13T16:00:00Z',
    updatedAt: '2026-09-13T16:00:00Z',
  },
  {
    id: 'demo-mcp-2',
    name: 'GitHub Repository Protocol',
    description: 'Provides tools to query GitHub repositories, PRs, and issues over stdio.',
    type: 'stdio',
    command: 'docker',
    args: ['run', '-i', '--rm', '-e', 'GITHUB_PERSONAL_ACCESS_TOKEN', 'mcp/github'],
    env: {
      GITHUB_PERSONAL_ACCESS_TOKEN: 'ghp_demoTokenPlaceholder',
    },
    notes: 'Handles automated PR reviews and issue triaging.',
    tags: ['github', 'vcs', 'automation'],
    status: 'active',
    isFavorite: false,
    createdAt: '2026-09-16T12:10:00Z',
    updatedAt: '2026-09-16T12:10:00Z',
  },
];

export const demoSkills: SkillItem[] = [
  {
    id: 'demo-skill-1',
    name: 'Next-Gen React & Tailwind Engineering',
    description: 'Engineering principles, token limits management, and accessible UI patterns for production SPAs.',
    category: 'Frontend',
    content: `# React & Tailwind Craftsmanship Standards

## 1. Zero AI Slop Architecture
- Reject generic purple/blue glowing gradients.
- Use mathematically consistent spacing (8pt grid system).
- Implement logical CSS properties (\`padding-inline\`, \`margin-inline\`) for seamless RTL/LTR compatibility.

## 2. State & Token Discipline
- Separate data layers, repositories, and UI views into modular files.
- Prefer local key-value state and indexed storage abstractions over monolithic state blobs.

## 3. Keyboard Accessibility
- All primary actions must respond to \`Ctrl+K\` / \`Ctrl+/\` and keyboard navigation.
`,
    tags: ['react', 'tailwind', 'standards', 'accessibility'],
    version: '1.2.0',
    author: 'DevDesk Engineering Team',
    tools: ['typescript', 'tailwind', 'vite'],
    notes: 'Exportable directly as SKILL.md for IDE agents.',
    isFavorite: true,
    createdAt: '2026-09-12T09:00:00Z',
    updatedAt: '2026-09-18T10:00:00Z',
  },
];

export const demoBookmarks: BookmarkItem[] = [
  {
    id: 'demo-bm-1',
    title: 'GitHub Dashboard',
    url: 'https://github.com',
    description: 'Code repositories, pull requests, and GitHub Actions CI pipelines.',
    category: 'Development',
    tags: ['code', 'git', 'collaboration'],
    isFavorite: true,
    notes: 'Daily hub for active open-source and commercial codebases.',
    createdAt: '2026-09-10T11:00:00Z',
  },
  {
    id: 'demo-bm-2',
    title: 'Tailwind CSS Documentation',
    url: 'https://tailwindcss.com/docs',
    description: 'Official utility-first CSS framework documentation.',
    category: 'Documentation',
    tags: ['css', 'styling', 'frontend'],
    isFavorite: true,
    notes: 'Reference for classes, breakpoints, and theme configuration.',
    createdAt: '2026-09-11T12:00:00Z',
  },
  {
    id: 'demo-bm-3',
    title: 'Model Context Protocol (MCP)',
    url: 'https://modelcontextprotocol.io',
    description: 'Open specification for connecting AI models to external tools and context sources.',
    category: 'AI',
    tags: ['ai', 'protocol', 'mcp', 'standard'],
    isFavorite: false,
    notes: 'Specs and quickstart guides for MCP servers.',
    createdAt: '2026-09-15T15:00:00Z',
  },
];

export const demoVaultItems: VaultItem[] = [
  {
    id: 'demo-vault-1',
    website: 'GitHub Enterprise',
    username: 'devdesk_lead',
    password: 'vX7#mK9$qL2!pA8@zR4',
    email: 'team@devdesk.local',
    url: 'https://github.com/login',
    notes: 'Primary developer account with 2FA backup codes stored safely.',
    tags: ['work', 'git', 'critical'],
    isFavorite: true,
    createdAt: '2026-09-10T14:00:00Z',
    updatedAt: '2026-09-10T14:00:00Z',
  },
  {
    id: 'demo-vault-2',
    website: 'AWS Console',
    username: 'cloud_infra_admin',
    password: 'jH8*nB3&vC9^wZ1!mQ5',
    email: 'infra@devdesk.local',
    url: 'https://aws.amazon.com/console',
    notes: 'Root IAM administrative credentials.',
    tags: ['cloud', 'aws', 'infrastructure'],
    isFavorite: false,
    createdAt: '2026-09-12T16:00:00Z',
    updatedAt: '2026-09-12T16:00:00Z',
  },
];

export const demoNotes: NoteItem[] = [
  {
    id: 'demo-note-1',
    title: 'DevDesk Local Architecture & Tauri Roadmap',
    content: `# DevDesk Architecture & Native Roadmap

### 1. Storage Strategy
- Browser mode: IndexedDB + LocalStorage repository layer.
- Electron/Tauri mode: Local SQLite database + OS Keychain integration.

### 2. Network Isolation
- Browser tests display CORS warnings gracefully.
- Desktop native HTTP bypasses all browser CORS restrictions safely.

### 3. Key Bindings
- \`Ctrl + K\`: Global Search across all resources
- \`Ctrl + Shift + P\`: Command Palette
- \`Ctrl + N\`: Quick create new item`,
    isPinned: true,
    isFavorite: true,
    tags: ['architecture', 'roadmap', 'desktop'],
    createdAt: '2026-09-10T12:00:00Z',
    updatedAt: '2026-09-18T11:00:00Z',
  },
  {
    id: 'demo-note-2',
    title: 'Sprint Planning Notes - Q4 Launch',
    content: `## Release Checklist
- [x] Complete UI design system in dark/light mode
- [x] Integrate full bidirectional Arabic RTL & English LTR
- [x] Implement API key tester with timing and headers
- [x] Build developer utilities (Base64, JSON, Regex, Hash)
- [ ] Finalize electron-builder Windows installer package`,
    isPinned: false,
    isFavorite: false,
    tags: ['sprint', 'tasks', 'roadmap'],
    createdAt: '2026-09-16T10:00:00Z',
    updatedAt: '2026-09-17T16:20:00Z',
  },
];

export const demoTodos: TodoItem[] = [
  {
    id: 'demo-todo-1',
    title: 'Package DevDesk as Windows Electron App (.exe)',
    description: 'Configure electron main process, preload bridge, and electron-builder NSIS script.',
    priority: 'urgent',
    dueDate: '2026-09-25',
    tags: ['desktop', 'electron', 'windows'],
    status: 'pending',
    subtasks: [
      { id: 'st-1', title: 'Write secure electron/main.ts and preload.ts', completed: true },
      { id: 'st-2', title: 'Create platform adapter abstraction', completed: true },
      { id: 'st-3', title: 'Verify native HTTP IPC handler for CORS bypass', completed: true },
      { id: 'st-4', title: 'Build production package', completed: false },
    ],
    isFavorite: true,
    createdAt: '2026-09-16T09:00:00Z',
  },
  {
    id: 'demo-todo-2',
    title: 'Audit API Key Manager Masking & Copy Actions',
    description: 'Verify sensitive keys are never exposed in plaintext logs or screen previews.',
    priority: 'high',
    dueDate: '2026-09-20',
    tags: ['security', 'audit'],
    status: 'completed',
    subtasks: [],
    isFavorite: false,
    createdAt: '2026-09-14T11:30:00Z',
    completedAt: '2026-09-18T10:00:00Z',
  },
  {
    id: 'demo-todo-3',
    title: 'Review RTL typography & logical margins in Arabic',
    description: 'Ensure breadcrumbs, dropdowns, and cards mirror seamlessly in Arabic mode.',
    priority: 'medium',
    dueDate: '2026-09-22',
    tags: ['i18n', 'rtl', 'ui'],
    status: 'pending',
    subtasks: [
      { id: 'st-5', title: 'Check sidebar icons and chevron rotations', completed: true },
      { id: 'st-6', title: 'Verify tables and modals text-align: start', completed: true },
    ],
    isFavorite: false,
    createdAt: '2026-09-17T14:00:00Z',
  },
];

export const demoSnippets: SnippetItem[] = [
  {
    id: 'demo-snip-1',
    title: 'TypeScript Safe Fetch Wrapper with AbortController & Timeout',
    language: 'TypeScript',
    description: 'Production-ready resilient HTTP client helper handling timeouts and generic JSON typing.',
    code: `export async function fetchWithTimeout<T>(
  url: string,
  options: RequestInit = {},
  timeoutMs = 8000
): Promise<T> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(\`HTTP \${res.status}: \${res.statusText}\`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(id);
  }
}`,
    tags: ['typescript', 'http', 'async', 'utilities'],
    isFavorite: true,
    createdAt: '2026-09-11T13:00:00Z',
    updatedAt: '2026-09-11T13:00:00Z',
  },
  {
    id: 'demo-snip-2',
    title: 'Tailwind CSS Logical Property Border Utilities',
    language: 'CSS',
    description: 'Direction-aware logical borders for seamless LTR and RTL layouts.',
    code: `/* Logical border dividers */
.divider-inline-start {
  border-inline-start: 1px solid var(--border-color);
}

.padding-inline-fluid {
  padding-inline: clamp(1rem, 2vw, 2.5rem);
}`,
    tags: ['css', 'tailwind', 'rtl'],
    isFavorite: false,
    createdAt: '2026-09-15T11:00:00Z',
    updatedAt: '2026-09-15T11:00:00Z',
  },
];

export const demoClipboard: ClipboardItem[] = [
  {
    id: 'demo-clip-1',
    text: 'npm run build && electron-builder --win',
    isFavorite: true,
    copiedAt: '2026-09-18T13:45:00Z',
    characterCount: 39,
  },
  {
    id: 'demo-clip-2',
    text: 'https://github.com/modelcontextprotocol/servers',
    isFavorite: false,
    copiedAt: '2026-09-18T11:20:00Z',
    characterCount: 47,
  },
];

export const demoActivity: ActivityItem[] = [
  {
    id: 'act-1',
    action: 'tested',
    itemType: 'api-key',
    title: 'OpenAI GPT-4o Production (200 OK - 215ms)',
    timestamp: '2026-09-18T12:00:00Z',
  },
  {
    id: 'act-2',
    action: 'created',
    itemType: 'prompt',
    title: 'Senior TypeScript & React Code Reviewer',
    timestamp: '2026-09-17T15:30:00Z',
  },
  {
    id: 'act-3',
    action: 'updated',
    itemType: 'mcp',
    title: 'Filesystem Workspace Server',
    timestamp: '2026-09-16T12:10:00Z',
  },
  {
    id: 'act-4',
    action: 'created',
    itemType: 'bookmark',
    title: 'Tailwind CSS Documentation',
    timestamp: '2026-09-15T15:00:00Z',
  },
  {
    id: 'act-5',
    action: 'copied',
    itemType: 'snippet',
    title: 'TypeScript Safe Fetch Wrapper',
    timestamp: '2026-09-15T11:05:00Z',
  },
];

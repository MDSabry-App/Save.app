import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  LayoutDashboard,
  Star,
  Clock,
  Key,
  FileCode,
  Terminal,
  BookOpen,
  Code2,
  Wrench,
  Lock,
  Bookmark,
  FileText,
  CheckSquare,
  ClipboardList,
  Settings,
} from 'lucide-react';
import { ViewMode } from '../../types';

export const Sidebar: React.FC = () => {
  const {
    currentView,
    setCurrentView,
    isSidebarCollapsed,
    apiKeys,
    prompts,
    mcpServers,
    skills,
    bookmarks,
    vaultItems,
    notes,
    todos,
    snippets,
    t,
  } = useApp();

  interface NavItem {
    id: ViewMode;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
  }

  interface NavSection {
    title: string;
    items: NavItem[];
  }

  const sections: NavSection[] = [
    {
      title: t('navDashboard'),
      items: [
        { id: 'dashboard', label: t('navHome'), icon: LayoutDashboard },
        { id: 'favorites', label: t('navFavorites'), icon: Star },
        { id: 'activity', label: t('navActivity'), icon: Clock },
      ],
    },
    {
      title: t('navDeveloperTools'),
      items: [
        { id: 'api-keys', label: t('navApiKeys'), icon: Key, count: apiKeys.length },
        { id: 'prompts', label: t('navPrompts'), icon: FileCode, count: prompts.length },
        { id: 'mcp', label: t('navMcp'), icon: Terminal, count: mcpServers.length },
        { id: 'skills', label: t('navSkills'), icon: BookOpen, count: skills.length },
        { id: 'snippets', label: t('navSnippets'), icon: Code2, count: snippets.length },
        { id: 'dev-tools', label: t('navDevTools'), icon: Wrench },
      ],
    },
    {
      title: t('navPersonal'),
      items: [
        { id: 'passwords', label: t('passwordVault'), icon: Lock, count: vaultItems.length },
        { id: 'bookmarks', label: t('navBookmarks'), icon: Bookmark, count: bookmarks.length },
        { id: 'notes', label: t('navNotes'), icon: FileText, count: notes.length },
        {
          id: 'todos',
          label: t('navTodos'),
          icon: CheckSquare,
          count: todos.filter((td) => td.status === 'pending').length,
        },
      ],
    },
    {
      title: t('navUtilities'),
      items: [
        { id: 'clipboard', label: t('navClipboard'), icon: ClipboardList },
      ],
    },
    {
      title: t('navSystem'),
      items: [
        { id: 'settings', label: t('navSettings'), icon: Settings },
      ],
    },
  ];

  return (
    <aside
      id="app-sidebar"
      className={`h-[calc(100vh-3.5rem)] border-e border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/50 backdrop-blur-md flex flex-col transition-all duration-200 select-none overflow-y-auto ${
        isSidebarCollapsed ? 'w-16' : 'w-60'
      }`}
    >
      <div className="p-3 space-y-5 flex-1">
        {sections.map((section, sIdx) => (
          <div key={sIdx} className="space-y-1">
            {!isSidebarCollapsed && (
              <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                {section.title}
              </div>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    id={`sidebar-nav-${item.id}`}
                    onClick={() => setCurrentView(item.id)}
                    title={isSidebarCollapsed ? item.label : undefined}
                    className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer text-start relative group ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-xs font-semibold'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/60'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-transform ${
                        isActive ? 'text-white' : 'text-neutral-500 dark:text-neutral-400 group-hover:scale-105'
                      }`}
                    />

                    {!isSidebarCollapsed && (
                      <div className="flex-1 flex items-center justify-between min-w-0">
                        <span className="truncate">{item.label}</span>
                        {item.count !== undefined && item.count > 0 && (
                          <span
                            className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono shrink-0 ms-1 ${
                              isActive
                                ? 'bg-blue-700/60 text-white'
                                : 'bg-neutral-200/70 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                            }`}
                          >
                            {item.count}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};

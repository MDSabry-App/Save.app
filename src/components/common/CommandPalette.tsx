import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Key,
  Terminal,
  FileCode,
  Bookmark,
  Lock,
  FileText,
  CheckSquare,
  Code2,
  Wrench,
  Settings,
  Download,
  Upload,
  SunMoon,
  Globe,
  Search,
  ArrowRight,
} from 'lucide-react';
import { ViewMode } from '../../types';

interface CommandItem {
  id: string;
  title: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  shortcut?: string;
}

export const CommandPalette: React.FC = () => {
  const {
    isCommandPaletteOpen,
    setCommandPaletteOpen,
    setCurrentView,
    exportAllData,
    settings,
    updateSettings,
    language,
    setLanguage,
    t,
  } = useApp();

  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCommandPaletteOpen) {
      setSearch('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isCommandPaletteOpen]);

  if (!isCommandPaletteOpen) return null;

  const navigateTo = (view: ViewMode) => {
    setCurrentView(view);
    setCommandPaletteOpen(false);
  };

  const commands: CommandItem[] = [
    {
      id: 'cmd-nav-dashboard',
      title: t('navHome'),
      category: t('navDashboard'),
      icon: Terminal,
      action: () => navigateTo('dashboard'),
    },
    {
      id: 'cmd-nav-api-keys',
      title: t('navApiKeys'),
      category: t('navDeveloperTools'),
      icon: Key,
      action: () => navigateTo('api-keys'),
    },
    {
      id: 'cmd-nav-prompts',
      title: t('navPrompts'),
      category: t('navDeveloperTools'),
      icon: FileCode,
      action: () => navigateTo('prompts'),
    },
    {
      id: 'cmd-nav-mcp',
      title: t('navMcp'),
      category: t('navDeveloperTools'),
      icon: Terminal,
      action: () => navigateTo('mcp'),
    },
    {
      id: 'cmd-nav-skills',
      title: t('navSkills'),
      category: t('navDeveloperTools'),
      icon: FileText,
      action: () => navigateTo('skills'),
    },
    {
      id: 'cmd-nav-bookmarks',
      title: t('navBookmarks'),
      category: t('navPersonal'),
      icon: Bookmark,
      action: () => navigateTo('bookmarks'),
    },
    {
      id: 'cmd-nav-passwords',
      title: t('navPasswords'),
      category: t('navPersonal'),
      icon: Lock,
      action: () => navigateTo('passwords'),
    },
    {
      id: 'cmd-nav-notes',
      title: t('navNotes'),
      category: t('navPersonal'),
      icon: FileText,
      action: () => navigateTo('notes'),
    },
    {
      id: 'cmd-nav-todos',
      title: t('navTodos'),
      category: t('navPersonal'),
      icon: CheckSquare,
      action: () => navigateTo('todos'),
    },
    {
      id: 'cmd-nav-snippets',
      title: t('navSnippets'),
      category: t('navDeveloperTools'),
      icon: Code2,
      action: () => navigateTo('snippets'),
    },
    {
      id: 'cmd-nav-devtools',
      title: t('navDevTools'),
      category: t('navUtilities'),
      icon: Wrench,
      action: () => navigateTo('dev-tools'),
    },
    {
      id: 'cmd-nav-settings',
      title: t('navSettings'),
      category: t('navSystem'),
      icon: Settings,
      action: () => navigateTo('settings'),
    },
    {
      id: 'cmd-act-export',
      title: t('exportAll'),
      category: t('settingsData'),
      icon: Download,
      action: () => {
        exportAllData();
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'cmd-act-theme',
      title: `${t('themeLight')} / ${t('themeDark')}`,
      category: t('settingsAppearance'),
      icon: SunMoon,
      action: () => {
        const isDark =
          settings.theme === 'dark' ||
          (settings.theme === 'system' &&
            typeof window !== 'undefined' &&
            window.matchMedia('(prefers-color-scheme: dark)').matches);
        const next = isDark ? 'light' : 'dark';
        updateSettings({ theme: next });
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'cmd-act-lang',
      title: language === 'en' ? 'التبديل إلى العربية (RTL)' : 'Switch to English (LTR)',
      category: t('settingsLanguage'),
      icon: Globe,
      action: () => {
        setLanguage(language === 'en' ? 'ar' : 'en');
        setCommandPaletteOpen(false);
      },
    },
  ];

  const filtered = commands.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filtered.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      setCommandPaletteOpen(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/60 backdrop-blur-xs"
      onClick={() => setCommandPaletteOpen(false)}
    >
      <div
        className="w-full max-w-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center px-4 py-3.5 border-b border-neutral-200 dark:border-neutral-800">
          <Search className="w-4 h-4 text-neutral-400 me-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder={`${t('commandPalette')} — ${t('search')}...`}
            className="w-full bg-transparent text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-hidden"
          />
          <kbd className="text-[10px] text-neutral-400 font-mono px-1.5 py-0.5 border border-neutral-200 dark:border-neutral-700 rounded bg-neutral-100 dark:bg-neutral-800">
            ESC
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-neutral-400">
              No matching commands found
            </div>
          ) : (
            filtered.map((cmd, idx) => {
              const Icon = cmd.icon;
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={cmd.id}
                  onClick={() => cmd.action()}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs transition-colors cursor-pointer text-start ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : 'text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isSelected ? 'text-white' : 'text-neutral-400 dark:text-neutral-500'
                      }`}
                    />
                    <span className="font-medium">{cmd.title}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] ${
                        isSelected
                          ? 'bg-blue-700/50 text-blue-100'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400'
                      }`}
                    >
                      {cmd.category}
                    </span>
                    {isSelected && <ArrowRight className="w-3.5 h-3.5" />}
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="px-4 py-2 bg-neutral-50 dark:bg-neutral-950/60 border-t border-neutral-200 dark:border-neutral-800 text-[11px] text-neutral-400 flex items-center justify-between">
          <span>Navigate: ↑ ↓</span>
          <span>Execute: ↵</span>
          <span>Close: Esc</span>
        </div>
      </div>
    </div>
  );
};

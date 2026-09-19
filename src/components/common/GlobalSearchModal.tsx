import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Search,
  Key,
  FileCode,
  Terminal,
  FileText,
  Bookmark,
  CheckSquare,
  Code2,
  Lock,
  ArrowRight,
  Tag,
} from 'lucide-react';
import { ViewMode } from '../../types';

interface SearchResultItem {
  id: string;
  type: ViewMode;
  typeName: string;
  title: string;
  subtitle: string;
  tags: string[];
  icon: React.ComponentType<{ className?: string }>;
}

export const GlobalSearchModal: React.FC = () => {
  const {
    isSearchOpen,
    setSearchOpen,
    setCurrentView,
    apiKeys,
    prompts,
    mcpServers,
    skills,
    bookmarks,
    notes,
    todos,
    snippets,
    vaultItems,
    t,
  } = useApp();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSearchOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isSearchOpen]);

  if (!isSearchOpen) return null;

  const results: SearchResultItem[] = [];
  const q = query.toLowerCase().trim();

  // Index items if query exists
  if (q) {
    // API Keys
    apiKeys.forEach((k) => {
      if (
        k.name.toLowerCase().includes(q) ||
        k.provider.toLowerCase().includes(q) ||
        k.model.toLowerCase().includes(q) ||
        k.tags.some((t) => t.toLowerCase().includes(q))
      ) {
        results.push({
          id: k.id,
          type: 'api-keys',
          typeName: t('navApiKeys'),
          title: k.name,
          subtitle: `${k.provider} • ${k.model || k.environment}`,
          tags: k.tags,
          icon: Key,
        });
      }
    });

    // Prompts
    prompts.forEach((p) => {
      if (
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.prompt.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
      ) {
        results.push({
          id: p.id,
          type: 'prompts',
          typeName: t('navPrompts'),
          title: p.title,
          subtitle: p.description || p.category,
          tags: p.tags,
          icon: FileCode,
        });
      }
    });

    // MCP
    mcpServers.forEach((m) => {
      if (
        m.name.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.tags.some((t) => t.toLowerCase().includes(q))
      ) {
        results.push({
          id: m.id,
          type: 'mcp',
          typeName: t('navMcp'),
          title: m.name,
          subtitle: `${m.type.toUpperCase()} • ${m.description || m.command || ''}`,
          tags: m.tags,
          icon: Terminal,
        });
      }
    });

    // Skills
    skills.forEach((s) => {
      if (
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q))
      ) {
        results.push({
          id: s.id,
          type: 'skills',
          typeName: t('navSkills'),
          title: s.name,
          subtitle: s.description || s.category,
          tags: s.tags,
          icon: FileText,
        });
      }
    });

    // Bookmarks
    bookmarks.forEach((b) => {
      if (
        b.title.toLowerCase().includes(q) ||
        b.url.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q) ||
        b.tags.some((t) => t.toLowerCase().includes(q))
      ) {
        results.push({
          id: b.id,
          type: 'bookmarks',
          typeName: t('navBookmarks'),
          title: b.title,
          subtitle: b.url,
          tags: b.tags,
          icon: Bookmark,
        });
      }
    });

    // Vault
    vaultItems.forEach((v) => {
      if (
        v.website.toLowerCase().includes(q) ||
        v.username.toLowerCase().includes(q) ||
        v.email.toLowerCase().includes(q) ||
        v.tags.some((t) => t.toLowerCase().includes(q))
      ) {
        results.push({
          id: v.id,
          type: 'passwords',
          typeName: t('passwordVault'),
          title: v.website,
          subtitle: v.username || v.email,
          tags: v.tags,
          icon: Lock,
        });
      }
    });

    // Notes
    notes.forEach((n) => {
      if (
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.tags.some((t) => t.toLowerCase().includes(q))
      ) {
        results.push({
          id: n.id,
          type: 'notes',
          typeName: t('navNotes'),
          title: n.title,
          subtitle: n.content.substring(0, 70),
          tags: n.tags,
          icon: FileText,
        });
      }
    });

    // Todos
    todos.forEach((td) => {
      if (
        td.title.toLowerCase().includes(q) ||
        (td.description && td.description.toLowerCase().includes(q)) ||
        td.tags.some((t) => t.toLowerCase().includes(q))
      ) {
        results.push({
          id: td.id,
          type: 'todos',
          typeName: t('navTodos'),
          title: td.title,
          subtitle: `${td.priority.toUpperCase()} priority • ${td.status}`,
          tags: td.tags,
          icon: CheckSquare,
        });
      }
    });

    // Snippets
    snippets.forEach((sn) => {
      if (
        sn.title.toLowerCase().includes(q) ||
        sn.code.toLowerCase().includes(q) ||
        sn.language.toLowerCase().includes(q) ||
        sn.tags.some((t) => t.toLowerCase().includes(q))
      ) {
        results.push({
          id: sn.id,
          type: 'snippets',
          typeName: t('navSnippets'),
          title: sn.title,
          subtitle: `${sn.language} snippet`,
          tags: sn.tags,
          icon: Code2,
        });
      }
    });
  }

  const handleSelect = (item: SearchResultItem) => {
    setCurrentView(item.type);
    setSearchOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        handleSelect(results[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setSearchOpen(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/60 backdrop-blur-xs"
      onClick={() => setSearchOpen(false)}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center px-4 py-3.5 border-b border-neutral-200 dark:border-neutral-800">
          <Search className="w-4 h-4 text-neutral-400 me-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder={t('searchPlaceholder')}
            className="w-full bg-transparent text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-hidden"
          />
          <kbd className="text-[10px] text-neutral-400 font-mono px-1.5 py-0.5 border border-neutral-200 dark:border-neutral-700 rounded bg-neutral-100 dark:bg-neutral-800">
            ESC
          </kbd>
        </div>

        <div className="max-h-96 overflow-y-auto p-2">
          {!query.trim() ? (
            <div className="py-12 text-center text-xs text-neutral-400">
              Type keywords to search across API Keys, Prompts, MCPs, Skills, Bookmarks, Notes, and Code Snippets...
            </div>
          ) : results.length === 0 ? (
            <div className="py-12 text-center text-xs text-neutral-400">
              No results found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            results.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={`${item.type}-${item.id}-${idx}`}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-start justify-between p-3 rounded-xl text-xs transition-colors cursor-pointer text-start ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : 'text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800/60'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                        isSelected
                          ? 'bg-blue-700 text-white'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{item.title}</div>
                      <div
                        className={`text-[11px] truncate mt-0.5 ${
                          isSelected ? 'text-blue-100' : 'text-neutral-500 dark:text-neutral-400'
                        }`}
                      >
                        {item.subtitle}
                      </div>
                      {item.tags && item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {item.tags.slice(0, 3).map((tag, tIdx) => (
                            <span
                              key={tIdx}
                              className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] ${
                                isSelected
                                  ? 'bg-blue-700/60 text-blue-100'
                                  : 'bg-neutral-200/60 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                              }`}
                            >
                              <Tag className="w-2.5 h-2.5" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] shrink-0 ms-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                        isSelected
                          ? 'bg-blue-700/50 text-white'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
                      }`}
                    >
                      {item.typeName}
                    </span>
                    {isSelected && <ArrowRight className="w-3.5 h-3.5" />}
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="px-4 py-2 bg-neutral-50 dark:bg-neutral-950/60 border-t border-neutral-200 dark:border-neutral-800 text-[11px] text-neutral-400 flex items-center justify-between">
          <span>Results: {results.length}</span>
          <span>Open: ↵</span>
        </div>
      </div>
    </div>
  );
};

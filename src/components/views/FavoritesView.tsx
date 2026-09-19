import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Star,
  Key,
  FileCode,
  Terminal,
  BookOpen,
  Bookmark,
  Lock,
  FileText,
  CheckSquare,
  Code2,
  ExternalLink,
  Copy,
} from 'lucide-react';
import { Badge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';

export const FavoritesView: React.FC = () => {
  const {
    apiKeys,
    prompts,
    mcpServers,
    skills,
    bookmarks,
    vaultItems,
    notes,
    todos,
    snippets,
    setCurrentView,
    copyToClipboard,
    t,
  } = useApp();

  const favApiKeys = apiKeys.filter((k) => k.isFavorite);
  const favPrompts = prompts.filter((p) => p.isFavorite);
  const favMcp = mcpServers.filter((m) => m.isFavorite);
  const favSkills = skills.filter((s) => s.isFavorite);
  const favBookmarks = bookmarks.filter((b) => b.isFavorite);
  const favVault = vaultItems.filter((v) => v.isFavorite);
  const favNotes = notes.filter((n) => n.isFavorite);
  const favTodos = todos.filter((td) => td.isFavorite);
  const favSnippets = snippets.filter((s) => s.isFavorite);

  const totalFavorites =
    favApiKeys.length +
    favPrompts.length +
    favMcp.length +
    favSkills.length +
    favBookmarks.length +
    favVault.length +
    favNotes.length +
    favTodos.length +
    favSnippets.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
            {t('navFavorites')}
          </h1>
          <Badge variant="primary">{totalFavorites} Pinned</Badge>
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          Unified access to all your starred developer resources, prompts, keys, and bookmarks.
        </p>
      </div>

      {totalFavorites === 0 ? (
        <EmptyState
          icon={Star}
          title="No favorites pinned yet"
          description="Click the star icon on any API key, prompt, bookmark, or note to pin it here for rapid access."
        />
      ) : (
        <div className="space-y-6">
          {/* Bookmarks */}
          {favBookmarks.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                  <Bookmark className="w-3.5 h-3.5 text-blue-500" />
                  <span>Favorite Bookmarks ({favBookmarks.length})</span>
                </span>
                <button
                  onClick={() => setCurrentView('bookmarks')}
                  className="text-xs text-blue-600 hover:underline cursor-pointer"
                >
                  View all
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {favBookmarks.map((b) => (
                  <div
                    key={b.id}
                    className="p-3 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between"
                  >
                    <div className="truncate mr-2">
                      <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                        {b.title}
                      </div>
                      <div className="text-[10px] text-neutral-400 truncate">{b.url}</div>
                    </div>
                    <a
                      href={b.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 text-neutral-400 hover:text-blue-500 shrink-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Prompts */}
          {favPrompts.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5 text-purple-500" />
                  <span>Favorite Prompts ({favPrompts.length})</span>
                </span>
                <button
                  onClick={() => setCurrentView('prompts')}
                  className="text-xs text-blue-600 hover:underline cursor-pointer"
                >
                  View all
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {favPrompts.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between"
                  >
                    <div className="truncate mr-2">
                      <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                        {p.title}
                      </div>
                      <div className="text-[10px] text-neutral-400 truncate">{p.category}</div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(p.prompt, 'Prompt copied')}
                      className="p-1 text-neutral-400 hover:text-purple-500 shrink-0 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Snippets */}
          {favSnippets.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Favorite Snippets ({favSnippets.length})</span>
                </span>
                <button
                  onClick={() => setCurrentView('snippets')}
                  className="text-xs text-blue-600 hover:underline cursor-pointer"
                >
                  View all
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {favSnippets.map((s) => (
                  <div
                    key={s.id}
                    className="p-3 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between"
                  >
                    <div className="truncate mr-2">
                      <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                        {s.title}
                      </div>
                      <div className="text-[10px] text-neutral-400 truncate">{s.language}</div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(s.code, 'Snippet copied')}
                      className="p-1 text-neutral-400 hover:text-emerald-500 shrink-0 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* API Keys */}
          {favApiKeys.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-amber-500" />
                  <span>Favorite API Keys ({favApiKeys.length})</span>
                </span>
                <button
                  onClick={() => setCurrentView('api-keys')}
                  className="text-xs text-blue-600 hover:underline cursor-pointer"
                >
                  View all
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {favApiKeys.map((k) => (
                  <div
                    key={k.id}
                    className="p-3 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between"
                  >
                    <div className="truncate mr-2">
                      <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                        {k.name}
                      </div>
                      <div className="text-[10px] text-neutral-400 truncate">{k.provider}</div>
                    </div>
                    <Badge variant={k.status === 'active' ? 'success' : 'neutral'}>
                      {k.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

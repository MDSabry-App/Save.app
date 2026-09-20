import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Key,
  FileCode,
  Terminal,
  BookOpen,
  Bookmark,
  Lock,
  FileText,
  CheckSquare,
  Code2,
  Plus,
  Star,
  Clock,
  Sparkles,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  SlidersHorizontal,
} from 'lucide-react';
import { Badge } from '../common/Badge';

export const DashboardView: React.FC = () => {
  const {
    apiKeys,
    prompts,
    mcpServers,
    skills,
    bookmarks,
    notes,
    todos,
    snippets,
    activity,
    setCurrentView,
    settings,
    updateSettings,
    t,
  } = useApp();

  const activeKeysCount = apiKeys.filter((k) => k.status === 'active').length;
  const pendingTodosCount = todos.filter((td) => td.status === 'pending').length;

  const allFavorites = [
    ...apiKeys.filter((k) => k.isFavorite).map((k) => ({ type: 'api-keys' as const, title: k.name, sub: k.provider, icon: Key })),
    ...prompts.filter((p) => p.isFavorite).map((p) => ({ type: 'prompts' as const, title: p.title, sub: p.category, icon: FileCode })),
    ...mcpServers.filter((m) => m.isFavorite).map((m) => ({ type: 'mcp' as const, title: m.name, sub: m.type.toUpperCase(), icon: Terminal })),
    ...skills.filter((s) => s.isFavorite).map((s) => ({ type: 'skills' as const, title: s.name, sub: s.category, icon: BookOpen })),
    ...bookmarks.filter((b) => b.isFavorite).map((b) => ({ type: 'bookmarks' as const, title: b.title, sub: b.url, icon: Bookmark })),
    ...notes.filter((n) => n.isFavorite).map((n) => ({ type: 'notes' as const, title: n.title, sub: 'Note', icon: FileText })),
    ...snippets.filter((s) => s.isFavorite).map((s) => ({ type: 'snippets' as const, title: s.title, sub: s.language, icon: Code2 })),
  ];

  const widgets = settings.dashboardWidgets;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold tracking-tight">SaveDesk Workspace</h1>
            <Badge variant="default" className="bg-white/20 text-white border-white/30 text-[10px]">
              Offline-First
            </Badge>
          </div>
          <p className="text-xs text-blue-100 max-w-xl leading-relaxed">
            {t('appTagline')}. Fast, private, and desktop-ready productivity environment.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentView('settings')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/15 hover:bg-white/25 text-white backdrop-blur-xs transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Customize</span>
          </button>
        </div>
      </div>

      {/* Quick Actions Bar */}
      {widgets.quickActions && (
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2.5 flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            <span>{t('quickActions')}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {[
              { label: t('apiKey'), icon: Key, view: 'api-keys' as const, color: 'text-blue-500' },
              { label: 'Password', icon: Lock, view: 'passwords' as const, color: 'text-amber-500' },
              { label: 'Prompt', icon: FileCode, view: 'prompts' as const, color: 'text-purple-500' },
              { label: 'MCP', icon: Terminal, view: 'mcp' as const, color: 'text-emerald-500' },
              { label: 'Skill', icon: BookOpen, view: 'skills' as const, color: 'text-sky-500' },
              { label: 'Bookmark', icon: Bookmark, view: 'bookmarks' as const, color: 'text-indigo-500' },
              { label: 'Note', icon: FileText, view: 'notes' as const, color: 'text-teal-500' },
              { label: 'Todo', icon: CheckSquare, view: 'todos' as const, color: 'text-rose-500' },
            ].map((qa, idx) => {
              const Icon = qa.icon;
              return (
                <button
                  key={idx}
                  onClick={() => setCurrentView(qa.view)}
                  className="flex flex-col items-center justify-center p-3 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 hover:border-blue-500/60 dark:hover:border-blue-500/60 hover:shadow-sm transition-all cursor-pointer group text-center"
                >
                  <div className={`p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 mb-1.5 group-hover:scale-110 transition-transform ${qa.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-medium text-neutral-700 dark:text-neutral-300">
                    {qa.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Overview Stats Cards */}
      {widgets.stats && (
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2.5">
            {t('overviewStats')}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div
              onClick={() => setCurrentView('api-keys')}
              className="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all cursor-pointer flex items-center justify-between"
            >
              <div>
                <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{activeKeysCount}</div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{t('activeKeys')}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                <Key className="w-5 h-5" />
              </div>
            </div>

            <div
              onClick={() => setCurrentView('prompts')}
              className="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all cursor-pointer flex items-center justify-between"
            >
              <div>
                <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{prompts.length}</div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{t('totalPrompts')}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
                <FileCode className="w-5 h-5" />
              </div>
            </div>

            <div
              onClick={() => setCurrentView('todos')}
              className="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all cursor-pointer flex items-center justify-between"
            >
              <div>
                <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{pendingTodosCount}</div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{t('pendingTasks')}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
                <CheckSquare className="w-5 h-5" />
              </div>
            </div>

            <div
              onClick={() => setCurrentView('bookmarks')}
              className="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all cursor-pointer flex items-center justify-between"
            >
              <div>
                <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{bookmarks.length}</div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{t('totalBookmarks')}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                <Bookmark className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Middle Section: Quick Tools Shortcuts */}
      {widgets.quickTools && (
        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>{t('quickTools')}</span>
            </div>
            <button
              onClick={() => setCurrentView('dev-tools')}
              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>All Utilities</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {[
              { title: 'JSON Formatter', desc: 'Prettify, minify & validate', view: 'dev-tools' as const },
              { title: 'Password Generator', desc: 'Secure passwords & entropy', view: 'passwords' as const },
              { title: 'Regex Tester', desc: 'Live pattern match testing', view: 'dev-tools' as const },
              { title: 'Base64 & URL', desc: 'Encode / decode strings', view: 'dev-tools' as const },
              { title: 'QR Code Maker', desc: 'Generate downloadable QR', view: 'dev-tools' as const },
            ].map((tool, tIdx) => (
              <button
                key={tIdx}
                onClick={() => setCurrentView(tool.view)}
                className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 border border-neutral-200/60 dark:border-neutral-700/60 hover:border-blue-300 dark:hover:border-blue-800 text-start transition-all cursor-pointer"
              >
                <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 mb-0.5">
                  {tool.title}
                </div>
                <div className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                  {tool.desc}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Two Column Grid: Pinned Favorites & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pinned Favorites */}
        {widgets.favorites && (
          <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>{t('pinnedFavorites')}</span>
              </div>
              <button
                onClick={() => setCurrentView('favorites')}
                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View all ({allFavorites.length})</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="flex-1 space-y-2">
              {allFavorites.length === 0 ? (
                <div className="py-8 text-center text-xs text-neutral-400">
                  {t('noFavorites')}
                </div>
              ) : (
                allFavorites.slice(0, 5).map((fav, fIdx) => {
                  const Icon = fav.icon;
                  return (
                    <button
                      key={fIdx}
                      onClick={() => setCurrentView(fav.type)}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800 text-start transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 shrink-0">
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-neutral-900 dark:text-neutral-100 truncate">
                            {fav.title}
                          </div>
                          <div className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate">
                            {fav.sub}
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {fav.type}
                      </Badge>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        {widgets.recentActivity && (
          <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                <span>{t('recentActivity')}</span>
              </div>
              <button
                onClick={() => setCurrentView('activity')}
                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Full Log</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="flex-1 space-y-2">
              {activity.length === 0 ? (
                <div className="py-8 text-center text-xs text-neutral-400">
                  {t('noRecentActivity')}
                </div>
              ) : (
                activity.slice(0, 5).map((act) => {
                  const dateFormatted = new Date(act.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <div
                      key={act.id}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-neutral-100 dark:border-neutral-800 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Badge
                          variant={
                            act.action === 'created'
                              ? 'success'
                              : act.action === 'updated'
                              ? 'primary'
                              : act.action === 'tested'
                              ? 'warning'
                              : 'default'
                          }
                          className="capitalize text-[10px] shrink-0"
                        >
                          {act.action}
                        </Badge>
                        <span className="font-medium text-neutral-800 dark:text-neutral-200 truncate">
                          {act.title}
                        </span>
                      </div>
                      <span className="text-[10px] text-neutral-400 font-mono shrink-0 ms-2">
                        {dateFormatted}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import {
  Search,
  Command,
  Plus,
  Sun,
  Moon,
  Globe,
  PanelLeftClose,
  PanelLeft,
  Key,
  FileCode,
  Lock,
  Bookmark,
  FileText,
  CheckSquare,
  Monitor,
  RefreshCw,
  LogOut,
  Cloud,
  CloudOff,
  Loader2,
  CircleAlert,
} from 'lucide-react';
import { platform } from '../../platform';

export const Header: React.FC = () => {
  const {
    isSidebarCollapsed,
    toggleSidebar,
    setSearchOpen,
    setCommandPaletteOpen,
    setCurrentView,
    language,
    setLanguage,
    settings,
    updateSettings,
    addToast,
    t,
    syncNow,
  } = useApp();

  const { user, syncStatus, logout } = useAuth();

  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const quickAddRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (quickAddRef.current && !quickAddRef.current.contains(event.target as Node)) {
        setIsQuickAddOpen(false);
      }
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) {
        setIsAccountOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleQuickAdd = (view: any) => {
    setCurrentView(view);
    setIsQuickAddOpen(false);
  };

  const isDark =
    settings.theme === 'dark' ||
    (settings.theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  const toggleTheme = () => {
    const nextTheme = isDark ? 'light' : 'dark';
    updateSettings({ theme: nextTheme });
    addToast({
      message:
        nextTheme === 'light'
          ? language === 'ar'
            ? 'تم تفعيل الوضع النهاري (الفاتح)'
            : 'Switched to Light Mode'
          : language === 'ar'
          ? 'تم تفعيل الوضع الليلي (الداكن)'
          : 'Switched to Dark Mode',
      type: 'info',
    });
  };

  return (
    <header
      id="app-header"
      className="h-14 border-b border-neutral-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md px-4 flex items-center justify-between gap-3 sticky top-0 z-30 select-none"
    >
      {/* Left / Start Section */}
      <div className="flex items-center gap-3">
        <button
          id="sidebar-toggle-btn"
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isSidebarCollapsed ? <PanelLeft className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
        </button>

        <div className="hidden sm:flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-xs">
            S
          </div>
          <div>
            <div className="font-semibold text-xs text-neutral-900 dark:text-neutral-100 tracking-tight leading-none">
              SaveDesk
            </div>
            <div className="text-[10px] text-neutral-500 dark:text-neutral-400 leading-tight">
              v1.0.0
            </div>
          </div>
        </div>

        {/* Platform Indicator */}
        <div className="hidden md:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200/60 dark:border-neutral-700/60">
          <Monitor className="w-3 h-3 text-emerald-500" />
          <span>{platform.info.isElectron ? 'Desktop Native' : 'Desktop Ready'}</span>
        </div>
      </div>

      {/* Middle: Global Search Trigger */}
      <div className="flex-1 max-w-md mx-2">
        <button
          id="global-search-trigger"
          onClick={() => setSearchOpen(true)}
          className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/60 text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all cursor-pointer text-xs"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5" />
            <span className="truncate">{t('searchPlaceholder')}</span>
          </div>
          <kbd className="hidden sm:inline-block font-mono text-[10px] px-1.5 py-0.5 rounded bg-neutral-200/70 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-300/60 dark:border-neutral-700/60">
            Ctrl K
          </kbd>
        </button>
      </div>

      {/* Right / End Controls */}
      <div className="flex items-center gap-1.5">
        {/* Quick Add Dropdown */}
        <div className="relative" ref={quickAddRef}>
          <button
            id="quick-add-btn"
            onClick={() => setIsQuickAddOpen(!isQuickAddOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('add')}</span>
          </button>

          {isQuickAddOpen && (
            <div className="absolute end-0 mt-1.5 w-48 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl py-1 z-40 animate-in fade-in zoom-in-95 duration-75">
              <button
                onClick={() => handleQuickAdd('api-keys')}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-start cursor-pointer"
              >
                <Key className="w-3.5 h-3.5 text-blue-500" />
                <span>{t('apiKey')}</span>
              </button>
              <button
                onClick={() => handleQuickAdd('prompts')}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-start cursor-pointer"
              >
                <FileCode className="w-3.5 h-3.5 text-purple-500" />
                <span>{t('navPrompts')}</span>
              </button>
              <button
                onClick={() => handleQuickAdd('passwords')}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-start cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5 text-amber-500" />
                <span>{t('passwordVault')}</span>
              </button>
              <button
                onClick={() => handleQuickAdd('bookmarks')}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-start cursor-pointer"
              >
                <Bookmark className="w-3.5 h-3.5 text-emerald-500" />
                <span>{t('navBookmarks')}</span>
              </button>
              <button
                onClick={() => handleQuickAdd('notes')}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-start cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-sky-500" />
                <span>{t('navNotes')}</span>
              </button>
              <button
                onClick={() => handleQuickAdd('todos')}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-start cursor-pointer"
              >
                <CheckSquare className="w-3.5 h-3.5 text-rose-500" />
                <span>{t('navTodos')}</span>
              </button>
            </div>
          )}
        </div>

        {/* Command Palette Trigger */}
        <button
          id="command-palette-trigger"
          onClick={() => setCommandPaletteOpen(true)}
          className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          title="Command Palette (Ctrl+Shift+P)"
        >
          <Command className="w-4 h-4" />
        </button>

        {/* Language switcher */}
        <button
          id="language-switch-btn"
          onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          title={language === 'en' ? 'التبديل للعربية' : 'Switch to English'}
        >
          <Globe className="w-3.5 h-3.5 text-neutral-500" />
          <span className="text-[11px] font-semibold">{language === 'en' ? 'AR' : 'EN'}</span>
        </button>

        {/* Theme toggle */}
        <button
          id="theme-toggle-btn"
          onClick={toggleTheme}
          className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          title={
            isDark
              ? language === 'ar'
                ? 'التبديل إلى الوضع النهاري (الفاتح)'
                : 'Switch to Light Mode'
              : language === 'ar'
              ? 'التبديل إلى الوضع الليلي (الداكن)'
              : 'Switch to Dark Mode'
          }
          aria-label={
            isDark
              ? language === 'ar'
                ? 'التبديل إلى الوضع النهاري'
                : 'Switch to Light Mode'
              : language === 'ar'
                ? 'التبديل إلى الوضع الليلي'
                : 'Switch to Dark Mode'
          }
        >
          {isDark ? (
            <Sun className="w-4 h-4 text-amber-500 hover:text-amber-400 transition-colors" />
          ) : (
            <Moon className="w-4 h-4 text-neutral-600 hover:text-neutral-800 transition-colors" />
          )}
        </button>

        {/* Account & sync */}
        <div className="relative" ref={accountRef}>
          <button
            id="account-menu-btn"
            onClick={() => setIsAccountOpen((prev) => !prev)}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            title={user?.email || t('authSignIn')}
          >
            <SyncDot state={syncStatus.state} />
            <span className="hidden sm:inline text-[11px] font-semibold">
              {(user?.email || '—').slice(0, 1).toUpperCase()}
            </span>
          </button>

          {isAccountOpen && (
            <div className="absolute end-0 mt-1.5 w-64 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl py-1 z-40">
              <div className="px-3 py-2 border-b border-neutral-100 dark:border-neutral-800">
                <div className="text-[10px] uppercase tracking-wide text-neutral-400">
                  {t('authSignedInAs')}
                </div>
                <div className="text-xs font-medium text-neutral-800 dark:text-neutral-200 truncate">
                  {user?.email || '—'}
                </div>
                <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-neutral-500 dark:text-neutral-400">
                  <SyncDot state={syncStatus.state} />
                  <span>{syncStatusLabel(syncStatus.state, t)}</span>
                  {syncStatus.pendingPush && <span>· {t('syncPending')}</span>}
                </div>
              </div>

              <button
                onClick={() => {
                  void syncNow();
                  setIsAccountOpen(false);
                  addToast({ message: t('syncSyncing'), type: 'info' });
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-start cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-blue-500" />
                <span>{t('syncSyncing').replace('...', '')}</span>
              </button>

              <button
                onClick={() => {
                  setIsAccountOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-start cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{t('authSignOut')}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

const SyncDot: React.FC<{ state: SyncStatusLike }> = ({ state }) => {
  if (state === 'syncing') {
    return <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />;
  }
  if (state === 'error' || state === 'unverified') {
    return <CircleAlert className="w-3.5 h-3.5 text-amber-500" />;
  }
  if (state === 'offline' || state === 'disabled' || state === 'locked') {
    return <CloudOff className="w-3.5 h-3.5 text-neutral-400" />;
  }
  return <Cloud className="w-3.5 h-3.5 text-emerald-500" />;
};

type SyncStatusLike = ReturnType<typeof useAuth>['syncStatus']['state'];

function syncStatusLabel(state: SyncStatusLike, t: (key: any) => string): string {
  switch (state) {
    case 'syncing':
      return t('syncSyncing');
    case 'offline':
      return t('syncOffline');
    case 'error':
      return t('syncError');
    case 'unverified':
      return t('syncUnverified');
    case 'disabled':
      return t('syncDisabled');
    case 'locked':
      return t('syncOffline');
    default:
      return t('syncIdle');
  }
}

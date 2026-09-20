import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Settings,
  Sun,
  Moon,
  Laptop,
  Globe,
  Download,
  Upload,
  RotateCcw,
  Trash2,
  HardDrive,
  Cpu,
  Package,
  CheckCircle2,
  AlertTriangle,
  Info,
  ShieldCheck,
} from 'lucide-react';
import { Badge } from '../common/Badge';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { platform } from '../../platform';
import { useAuth } from '../../context/AuthContext';
import { sessionStore } from '../../session/sessionStore';

export const SettingsView: React.FC = () => {
  const {
    settings,
    updateSettings,
    language,
    setLanguage,
    exportAllData,
    importAllData,
    resetAllData,
    removeDemoData,
    apiKeys,
    prompts,
    mcpServers,
    skills,
    bookmarks,
    vaultItems,
    notes,
    todos,
    snippets,
    addToast,
    t,
  } = useApp();

  const { syncStatus, user } = useAuth();

  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Storage Stats Calculation
  const estimatedStorage = useMemoStorageSize();

  function useMemoStorageSize() {
    try {
      // Encrypted local mirror (plus the legacy plaintext key, if a pre-sync
      // build left one behind — it is deleted after the first unlock).
      const mirror = localStorage.getItem('devdesk_mirror_v1') || '';
      const legacy = localStorage.getItem('devdesk_workspace_v1') || '';
      const bytes = new Blob([mirror]).size + new Blob([legacy]).size;
      const kb = (bytes / 1024).toFixed(1);
      return { bytes, kb };
    } catch {
      return { bytes: 0, kb: '0' };
    }
  }

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const success = importAllData(text, 'replace');
      if (!success) {
        setImportError('Invalid backup file structure.');
      } else {
        setImportError(null);
        addToast({ message: 'Backup restored successfully!', type: 'success' });
      }
    } catch (err: any) {
      setImportError('Failed to read file: ' + err.message);
    }
    e.target.value = '';
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
          {t('navSettings')}
        </h1>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          Configure appearance, internationalization, data backup, and platform runtime settings.
        </p>
      </div>

      {/* Appearance & Language */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Theme Settings */}
        <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            <Sun className="w-4 h-4 text-amber-500" />
            <span>{t('settingsAppearance')}</span>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Choose light, dark, or system-matching visual appearance.
          </p>

          <div className="grid grid-cols-3 gap-2 pt-1">
            <button
              onClick={() => {
                updateSettings({ theme: 'light' });
                addToast({
                  message: language === 'ar' ? 'تم تفعيل الوضع النهاري (الفاتح)' : 'Switched to Light mode',
                  type: 'info',
                });
              }}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                settings.theme === 'light'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold'
                  : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
              }`}
            >
              <Sun className="w-4 h-4 text-amber-500" />
              <span>{t('themeLight')}</span>
            </button>

            <button
              onClick={() => {
                updateSettings({ theme: 'dark' });
                addToast({
                  message: language === 'ar' ? 'تم تفعيل الوضع الليلي (الداكن)' : 'Switched to Dark mode',
                  type: 'info',
                });
              }}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                settings.theme === 'dark'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold'
                  : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
              }`}
            >
              <Moon className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
              <span>{t('themeDark')}</span>
            </button>

            <button
              onClick={() => {
                updateSettings({ theme: 'system' });
                addToast({
                  message: language === 'ar' ? 'تم ضبط المظهر تلقائياً وفق النظام' : 'Switched to System theme',
                  type: 'info',
                });
              }}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                settings.theme === 'system'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold'
                  : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
              }`}
            >
              <Laptop className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
              <span>{t('themeSystem')}</span>
            </button>
          </div>
        </div>

        {/* Language & Direction Settings */}
        <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            <Globe className="w-4 h-4 text-blue-500" />
            <span>{t('settingsLanguage')}</span>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Switch between English (LTR) and Arabic (RTL) with bidirectional UI layout.
          </p>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => setLanguage('en')}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                language === 'en'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold'
                  : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
              }`}
            >
              <span>{t('langEn')}</span>
            </button>

            <button
              onClick={() => setLanguage('ar')}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                language === 'ar'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold'
                  : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
              }`}
            >
              <span>{t('langAr')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Data Management Section */}
      <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            <HardDrive className="w-4 h-4 text-emerald-500" />
            <span>{t('settingsData')}</span>
          </div>
          <span className="text-xs text-neutral-400 font-mono">
            {estimatedStorage.kb} KB used
          </span>
        </div>

        {/* Breakdown counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200/60 dark:border-neutral-800/60">
            <span className="text-neutral-500">API Keys:</span>{' '}
            <span className="font-semibold text-neutral-800 dark:text-neutral-200">{apiKeys.length}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200/60 dark:border-neutral-800/60">
            <span className="text-neutral-500">Prompts:</span>{' '}
            <span className="font-semibold text-neutral-800 dark:text-neutral-200">{prompts.length}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200/60 dark:border-neutral-800/60">
            <span className="text-neutral-500">MCP Servers:</span>{' '}
            <span className="font-semibold text-neutral-800 dark:text-neutral-200">{mcpServers.length}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200/60 dark:border-neutral-800/60">
            <span className="text-neutral-500">Skills:</span>{' '}
            <span className="font-semibold text-neutral-800 dark:text-neutral-200">{skills.length}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200/60 dark:border-neutral-800/60">
            <span className="text-neutral-500">Bookmarks:</span>{' '}
            <span className="font-semibold text-neutral-800 dark:text-neutral-200">{bookmarks.length}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200/60 dark:border-neutral-800/60">
            <span className="text-neutral-500">Vault Items:</span>{' '}
            <span className="font-semibold text-neutral-800 dark:text-neutral-200">{vaultItems.length}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200/60 dark:border-neutral-800/60">
            <span className="text-neutral-500">Notes:</span>{' '}
            <span className="font-semibold text-neutral-800 dark:text-neutral-200">{notes.length}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200/60 dark:border-neutral-800/60">
            <span className="text-neutral-500">Todos:</span>{' '}
            <span className="font-semibold text-neutral-800 dark:text-neutral-200">{todos.length}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap pt-2 border-t border-neutral-100 dark:border-neutral-800">
          <button
            onClick={exportAllData}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{t('exportAll')}</span>
          </button>

          <label className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>{t('importData')}</span>
            <input
              type="file"
              accept=".json"
              onChange={handleFileImport}
              className="hidden"
            />
          </label>

          <button
            onClick={() => setConfirmResetOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-800 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{t('removeDemo')}</span>
          </button>

          <button
            onClick={() => setConfirmClearOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>{t('resetData')}</span>
          </button>
        </div>

        {importError && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span>{importError}</span>
          </div>
        )}
      </div>

      {/* Encryption, account & sync */}
      <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>{t('settingsSecurity')}</span>
        </div>
        <p className="text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
          {t('securityNotice')}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200/60 dark:border-neutral-800/60 space-y-1">
            <span className="text-neutral-400">Account</span>
            <div className="font-semibold text-neutral-800 dark:text-neutral-200 truncate">
              {user?.email || '—'}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200/60 dark:border-neutral-800/60 space-y-1">
            <span className="text-neutral-400">Password & key</span>
            <div className="font-semibold text-neutral-800 dark:text-neutral-200">
              Not stored — requested once per launch
            </div>
          </div>
        </div>
      </div>

      {/* Platform & Native Packaging Section */}
      <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          <Cpu className="w-4 h-4 text-purple-500" />
          <span>Platform & Desktop Packaging Architecture</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200/60 dark:border-neutral-800/60 space-y-1">
            <span className="text-neutral-400">Environment</span>
            <div className="font-semibold text-neutral-800 dark:text-neutral-200">
              {platform.info.isDesktop ? 'Electron Desktop Client' : 'Browser Web App'}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200/60 dark:border-neutral-800/60 space-y-1">
            <span className="text-neutral-400">Target Platform</span>
            <div className="font-semibold text-neutral-800 dark:text-neutral-200 font-mono">
              {platform.info.platform}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200/60 dark:border-neutral-800/60 space-y-1">
            <span className="text-neutral-400">Storage Adapter</span>
            <div className="font-semibold text-neutral-800 dark:text-neutral-200">
              Encrypted mirror (AES-GCM)
            </div>
          </div>
          <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200/60 dark:border-neutral-800/60 space-y-1">
            <span className="text-neutral-400">API Endpoint</span>
            <div className="font-semibold text-neutral-800 dark:text-neutral-200 font-mono truncate" title={sessionStore.apiBaseLabel()}>
              {sessionStore.apiBaseLabel()}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200/60 dark:border-neutral-800/60 space-y-1">
            <span className="text-neutral-400">Sync Status</span>
            <div className="font-semibold text-neutral-800 dark:text-neutral-200">
              {syncStatus.state}
              {syncStatus.pendingPush ? ' · pending' : ''}
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200/60 dark:border-neutral-800/60 text-xs text-neutral-600 dark:text-neutral-400 space-y-2">
          <div className="font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
            <Package className="w-4 h-4 text-blue-500" />
            <span>Packaging into Native Desktop (Tauri or Electron)</span>
          </div>
          <p className="leading-relaxed">
            SaveDesk is architected using strict platform abstractions (<code className="font-mono text-purple-500">src/platform/</code>).
            To package this codebase as a native desktop binary for Windows, macOS, or Linux:
          </p>
          <div className="p-3 rounded-lg bg-neutral-900 text-neutral-200 font-mono text-[11px] space-y-1">
            <div># Electron build</div>
            <div>npm install -D electron electron-builder</div>
            <div>npx electron-builder build --win --mac --linux</div>
          </div>
        </div>
      </div>

      {/* About Box */}
      <div className="p-4 rounded-2xl bg-neutral-100/60 dark:bg-neutral-900/40 text-center text-xs text-neutral-500 space-y-1">
        <div className="font-semibold text-neutral-700 dark:text-neutral-300">
          SaveDesk — Developer & Personal Utility Dashboard v1.0.0
        </div>
        <div>Engineered for high performance, local privacy, and multi-model workflow orchestration.</div>
      </div>

      {/* Confirm Reset Dialog */}
      <ConfirmDialog
        isOpen={confirmResetOpen}
        title="Remove Demo Data"
        message="This will remove seeded sample records from your workspace. Your custom added items will remain. Continue?"
        onConfirm={() => {
          removeDemoData();
          setConfirmResetOpen(false);
        }}
        onCancel={() => setConfirmResetOpen(false)}
      />

      {/* Confirm Clear All Dialog */}
      <ConfirmDialog
        isOpen={confirmClearOpen}
        title="Reset All Workspace Data"
        message="WARNING: This will reset all stored API keys, prompts, passwords, notes, and tasks from your workspace to clean state. Continue?"
        onConfirm={() => {
          resetAllData();
          setConfirmClearOpen(false);
        }}
        onCancel={() => setConfirmClearOpen(false)}
      />
    </div>
  );
};

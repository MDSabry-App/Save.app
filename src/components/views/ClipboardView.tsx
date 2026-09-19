import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ClipboardList,
  Search,
  Copy,
  Star,
  Trash2,
  Clock,
  Plus,
  RotateCcw,
} from 'lucide-react';
import { Badge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';
import { ConfirmDialog } from '../common/ConfirmDialog';

export const ClipboardView: React.FC = () => {
  const {
    clipboard,
    addClipboardItem,
    deleteClipboardItem,
    toggleClipboardFavorite,
    clearClipboard,
    copyToClipboard,
    t,
  } = useApp();

  const [search, setSearch] = useState('');
  const [newText, setNewText] = useState('');
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const filteredItems = useMemo(() => {
    return clipboard
      .filter((item) => item.text.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;
        return new Date(b.copiedAt).getTime() - new Date(a.copiedAt).getTime();
      });
  }, [clipboard, search]);

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;
    addClipboardItem(newText.trim());
    setNewText('');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
              {t('navClipboard')}
            </h1>
            <Badge variant="primary">{clipboard.length} Entries</Badge>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Local clipboard history to quickly retrieve text clips, commands, and snippets.
          </p>
        </div>

        {clipboard.length > 0 && (
          <button
            onClick={() => setConfirmClearOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 border border-rose-200 dark:border-rose-900/50 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {/* Manual Quick Add Box */}
      <form onSubmit={handleManualAdd} className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 space-y-2">
        <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
          Save Quick Clip
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Type or paste text to store in clipboard history..."
            className="flex-1 px-3 py-2 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-hidden"
          />
          <button
            type="submit"
            className="px-4 py-2 text-xs font-medium rounded-xl text-white bg-blue-600 hover:bg-blue-700 shadow-sm cursor-pointer shrink-0"
          >
            Save Clip
          </button>
        </div>
      </form>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter clipboard entries..."
          className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-hidden"
        />
      </div>

      {/* List */}
      {filteredItems.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Clipboard history is empty"
          description="Whenever you copy items in DevDesk or add text above, it will be retained here."
        />
      ) : (
        <div className="space-y-2.5">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 hover:shadow-xs transition-all flex items-start justify-between gap-3"
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <pre className="font-mono text-xs text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap word-break-all max-h-32 overflow-y-auto">
                  {item.text}
                </pre>
                <div className="flex items-center gap-3 text-[11px] text-neutral-400">
                  <span>{item.characterCount} characters</span>
                  <span>•</span>
                  <span>{new Date(item.copiedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => copyToClipboard(item.text, 'Clip copied!')}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                  title="Copy"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={() => toggleClipboardFavorite(item.id)}
                  className={`p-1.5 rounded-lg cursor-pointer ${
                    item.isFavorite
                      ? 'text-amber-500'
                      : 'text-neutral-400 hover:text-neutral-600'
                  }`}
                  title="Favorite"
                >
                  <Star className="w-4 h-4 fill-current" />
                </button>
                <button
                  onClick={() => deleteClipboardItem(item.id)}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-500 cursor-pointer"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirm Clear */}
      <ConfirmDialog
        isOpen={confirmClearOpen}
        title="Clear Clipboard History"
        message="Are you sure you want to remove all saved clips from your history?"
        onConfirm={() => {
          clearClipboard();
          setConfirmClearOpen(false);
        }}
        onCancel={() => setConfirmClearOpen(false)}
      />
    </div>
  );
};

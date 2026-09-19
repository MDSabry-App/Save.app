import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Code2,
  Plus,
  Search,
  Copy,
  Star,
  Trash2,
  Edit2,
  Tag,
  CopyCheck,
  FileCode,
  Layers,
  X,
} from 'lucide-react';
import { SnippetItem } from '../../types';
import { Badge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';
import { ConfirmDialog } from '../common/ConfirmDialog';

const POPULAR_LANGUAGES = [
  'typescript',
  'javascript',
  'python',
  'bash',
  'sql',
  'json',
  'html',
  'css',
  'rust',
  'go',
  'dockerfile',
  'yaml',
];

export const SnippetsView: React.FC = () => {
  const {
    snippets,
    saveSnippet,
    deleteSnippet,
    toggleSnippetFavorite,
    duplicateSnippet,
    copyToClipboard,
    t,
  } = useApp();

  const [search, setSearch] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSnippet, setEditingSnippet] = useState<SnippetItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form
  const [title, setTitle] = useState('');
  const [language, setLanguage] = useState('typescript');
  const [description, setDescription] = useState('');
  const [code, setCode] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  const languages = useMemo(() => {
    const set = new Set<string>();
    snippets.forEach((s) => s.language && set.add(s.language));
    return ['all', ...Array.from(set)];
  }, [snippets]);

  const filteredSnippets = useMemo(() => {
    return snippets
      .filter((item) => {
        const matchesSearch =
          item.title.toLowerCase().includes(search.toLowerCase()) ||
          item.description.toLowerCase().includes(search.toLowerCase()) ||
          item.code.toLowerCase().includes(search.toLowerCase()) ||
          item.tags.some((tag) => tag.toLowerCase().includes(search.toLowerCase()));

        const matchesLang = selectedLanguage === 'all' || item.language === selectedLanguage;

        return matchesSearch && matchesLang;
      })
      .sort((a, b) => {
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [snippets, search, selectedLanguage]);

  const openAddModal = () => {
    setEditingSnippet(null);
    setTitle('');
    setLanguage('typescript');
    setDescription('');
    setCode('');
    setTagsInput('');
    setIsModalOpen(true);
  };

  const openEditModal = (item: SnippetItem) => {
    setEditingSnippet(item);
    setTitle(item.title);
    setLanguage(item.language);
    setDescription(item.description);
    setCode(item.code);
    setTagsInput(item.tags.join(', '));
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !code.trim()) return;

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    saveSnippet({
      id: editingSnippet ? editingSnippet.id : undefined,
      title: title.trim(),
      language,
      description: description.trim(),
      code: code.trim(),
      tags,
      isFavorite: editingSnippet ? editingSnippet.isFavorite : false,
    });

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
              {t('navSnippets')}
            </h1>
            <Badge variant="primary">{snippets.length} Snippets</Badge>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Store reusable code fragments, boilerplate configs, and shell scripts.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Snippet</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search snippets by name, code, language, or tags..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1">
          {languages.map((lang) => (
            <button
              key={lang}
              onClick={() => setSelectedLanguage(lang)}
              className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                selectedLanguage === lang
                  ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                  : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border border-neutral-200/80 dark:border-neutral-800 hover:bg-neutral-50'
              }`}
            >
              {lang === 'all' ? 'All Languages' : lang}
            </button>
          ))}
        </div>
      </div>

      {/* Snippets List */}
      {filteredSnippets.length === 0 ? (
        <EmptyState
          icon={Code2}
          title="No code snippets found"
          description="Keep your favorite regexes, SQL queries, algorithms, and curl requests handy."
          actionLabel="Add Snippet"
          onAction={openAddModal}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSnippets.map((snippet) => (
            <div
              key={snippet.id}
              className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 hover:shadow-xs transition-all flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                      {snippet.title}
                    </h3>
                    {snippet.description && (
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-1">
                        {snippet.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="neutral">{snippet.language}</Badge>
                    <button
                      onClick={() => toggleSnippetFavorite(snippet.id)}
                      className={`p-1 rounded-md transition-colors cursor-pointer ${
                        snippet.isFavorite
                          ? 'text-amber-500'
                          : 'text-neutral-400 hover:text-neutral-600'
                      }`}
                    >
                      <Star className="w-4 h-4 fill-current" />
                    </button>
                  </div>
                </div>

                {/* Code Box */}
                <div className="relative group">
                  <pre className="p-3 font-mono text-xs bg-neutral-950 text-neutral-100 rounded-xl overflow-x-auto max-h-48 leading-relaxed">
                    {snippet.code}
                  </pre>
                  <button
                    onClick={() => copyToClipboard(snippet.code, 'Snippet copied to clipboard')}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-neutral-800/80 text-neutral-300 hover:bg-neutral-700 hover:text-white transition-opacity opacity-0 group-hover:opacity-100 cursor-pointer"
                    title="Copy code"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Tags */}
                {snippet.tags.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    {snippet.tags.map((t, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom bar */}
              <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800/80 text-xs">
                <button
                  onClick={() => copyToClipboard(snippet.code, 'Snippet copied')}
                  className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Code</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => duplicateSnippet(snippet.id)}
                    className="p-1 rounded-md text-neutral-400 hover:text-neutral-600 cursor-pointer"
                    title="Duplicate"
                  >
                    <Layers className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => openEditModal(snippet)}
                    className="p-1 rounded-md text-neutral-400 hover:text-neutral-600 cursor-pointer"
                    title="Edit"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteId(snippet.id)}
                    className="p-1 rounded-md text-neutral-400 hover:text-rose-500 cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800">
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                {editingSnippet ? 'Edit Code Snippet' : 'New Code Snippet'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Snippet Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Debounce Utility Hook"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-hidden"
                  >
                    {POPULAR_LANGUAGES.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Short note on what this snippet does..."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Code *
                </label>
                <textarea
                  rows={8}
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Paste snippet code here..."
                  className="w-full p-3 font-mono text-xs rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="react, hooks, performance"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-medium rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-medium rounded-xl text-white bg-blue-600 hover:bg-blue-700 shadow-sm cursor-pointer"
                >
                  {editingSnippet ? 'Save Changes' : 'Create Snippet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteId}
        title="Delete Snippet"
        message="Are you sure you want to permanently delete this code snippet?"
        onConfirm={() => {
          if (deleteId) deleteSnippet(deleteId);
          setDeleteId(null);
        }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
};

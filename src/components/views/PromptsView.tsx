import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  FileCode,
  Plus,
  Copy,
  Star,
  Edit2,
  Trash2,
  CopyPlus,
  Play,
  Download,
  Tag,
  Sliders,
  Check,
  Sparkles,
} from 'lucide-react';
import { PromptItem } from '../../types';
import { Badge } from '../common/Badge';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { EmptyState } from '../common/EmptyState';
import { platform } from '../../platform';

// Extract all {{variable}} placeholders from a prompt string
function extractVariables(text: string): string[] {
  const matches = text.match(/\{\{([a-zA-Z0-9_-]+)\}\}/g);
  if (!matches) return [];
  const unique = Array.from(new Set(matches.map((m) => m.replace(/[{}]/g, '').trim())));
  return unique;
}

export const PromptsView: React.FC = () => {
  const {
    prompts,
    savePrompt,
    deletePrompt,
    togglePromptFavorite,
    duplicatePrompt,
    copyToClipboard,
    t,
  } = useApp();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Form
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [promptText, setPromptText] = useState('');
  const [category, setCategory] = useState('Engineering');
  const [modelRecommendation, setModelRecommendation] = useState('');
  const [tags, setTags] = useState('');
  const [notes, setNotes] = useState('');

  // Interactive Runner modal
  const [runningPrompt, setRunningPrompt] = useState<PromptItem | null>(null);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});

  const detectedVariables = useMemo(() => extractVariables(promptText), [promptText]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    prompts.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [prompts]);

  const filtered = prompts.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase()) ||
      p.prompt.toLowerCase().includes(search.toLowerCase()) ||
      p.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const handleOpenAdd = () => {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setPromptText('');
    setCategory('Engineering');
    setModelRecommendation('Claude 3.7 / GPT-4o');
    setTags('');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: PromptItem) => {
    setEditingId(item.id);
    setTitle(item.title);
    setDescription(item.description);
    setPromptText(item.prompt);
    setCategory(item.category);
    setModelRecommendation(item.modelRecommendation || '');
    setTags(item.tags.join(', '));
    setNotes(item.notes);
    setIsModalOpen(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !promptText.trim()) return;

    savePrompt({
      id: editingId || undefined,
      title: title.trim(),
      description: description.trim(),
      prompt: promptText.trim(),
      category: category.trim() || 'General',
      modelRecommendation: modelRecommendation.trim(),
      variables: extractVariables(promptText),
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      notes: notes.trim(),
      isFavorite: editingId ? prompts.find((p) => p.id === editingId)?.isFavorite || false : false,
    });

    setIsModalOpen(false);
  };

  const handleOpenRunner = (promptItem: PromptItem) => {
    setRunningPrompt(promptItem);
    const initialVars: Record<string, string> = {};
    promptItem.variables.forEach((v) => {
      initialVars[v] = '';
    });
    setVariableValues(initialVars);
  };

  const compiledPrompt = useMemo(() => {
    if (!runningPrompt) return '';
    let result = runningPrompt.prompt;
    Object.entries(variableValues).forEach(([key, val]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, val || `{{${key}}}`);
    });
    return result;
  }, [runningPrompt, variableValues]);

  const handleExportSingle = (item: PromptItem) => {
    const filename = `${item.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-prompt.json`;
    platform.fileSystem.saveFile(filename, JSON.stringify(item, null, 2), 'application/json');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
              {t('navPrompts')}
            </h1>
            <Badge variant="primary">{prompts.length}</Badge>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Build, organize, parameterize, and run variable-rich prompt templates.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 shadow-sm transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Prompt</span>
        </button>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="flex-1 w-full">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search prompts by title, description, keywords..."
            className="w-full px-3.5 py-2 text-xs rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-hidden focus:border-blue-500"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 text-xs rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-hidden w-full sm:w-auto"
        >
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Prompts Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={FileCode}
          title="No prompts found"
          description="Create structured system instructions and prompt templates with dynamic variables."
          actionLabel="New Prompt"
          onAction={handleOpenAdd}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      onClick={() => togglePromptFavorite(item.id)}
                      className="cursor-pointer"
                      title={item.isFavorite ? 'Unfavorite' : 'Favorite'}
                    >
                      <Star
                        className={`w-4 h-4 ${
                          item.isFavorite
                            ? 'text-amber-500 fill-amber-500'
                            : 'text-neutral-400 hover:text-amber-500'
                        }`}
                      />
                    </button>
                    <h3 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 truncate">
                      {item.title}
                    </h3>
                  </div>

                  <Badge variant="primary" className="shrink-0">
                    {item.category}
                  </Badge>
                </div>

                {item.description && (
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                )}

                {/* Prompt snippet preview */}
                <div className="p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-950/60 font-mono text-[11px] text-neutral-600 dark:text-neutral-300 line-clamp-3 border border-neutral-200/60 dark:border-neutral-800/60">
                  {item.prompt}
                </div>

                {/* Variables */}
                {item.variables.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[10px] text-neutral-400 font-medium">Variables:</span>
                    {item.variables.map((v, vIdx) => (
                      <span
                        key={vIdx}
                        className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/50"
                      >
                        {`{{${v}}}`}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center justify-between pt-4 mt-3 border-t border-neutral-100 dark:border-neutral-800">
                <div className="text-[10px] text-neutral-400">
                  {item.modelRecommendation && <span>Rec: {item.modelRecommendation}</span>}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenRunner(item)}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 rounded-lg transition-colors cursor-pointer"
                    title="Fill Variables & Run"
                  >
                    <Play className="w-3 h-3 fill-purple-600 dark:fill-purple-400" />
                    <span>Run</span>
                  </button>

                  <button
                    onClick={() => copyToClipboard(item.prompt, 'Prompt copied')}
                    className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                    title="Copy Prompt"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => duplicatePrompt(item.id)}
                    className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                    title="Duplicate Prompt"
                  >
                    <CopyPlus className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleExportSingle(item)}
                    className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                    title="Export JSON"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleOpenEdit(item)}
                    className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                    title="Edit"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => setDeleteTargetId(item.id)}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
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

      {/* Interactive Variable Fill & Runner Modal */}
      {runningPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-500" />
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  {runningPrompt.title}
                </h3>
              </div>
              <button
                onClick={() => setRunningPrompt(null)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 text-xs px-2 py-1 rounded cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {runningPrompt.variables.length > 0 ? (
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Fill Template Variables:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {runningPrompt.variables.map((v) => (
                      <div key={v} className="space-y-1">
                        <label className="text-xs font-mono text-purple-600 dark:text-purple-400">
                          {`{{${v}}}`}
                        </label>
                        <input
                          type="text"
                          value={variableValues[v] || ''}
                          onChange={(e) =>
                            setVariableValues({ ...variableValues, [v]: e.target.value })
                          }
                          placeholder={`Value for ${v}...`}
                          className="w-full px-3 py-1.5 text-xs rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-neutral-500">
                  This prompt has no dynamic variables. Ready to copy below.
                </p>
              )}

              <div className="space-y-1.5 pt-2 border-t border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Compiled Prompt Preview:
                  </label>
                  <button
                    onClick={() => copyToClipboard(compiledPrompt, 'Compiled prompt copied!')}
                    className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy Compiled Prompt</span>
                  </button>
                </div>
                <div className="p-3.5 rounded-xl bg-neutral-950 text-neutral-100 font-mono text-xs leading-relaxed max-h-60 overflow-y-auto whitespace-pre-wrap border border-neutral-800">
                  {compiledPrompt}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl p-6 overflow-hidden max-h-[90vh] flex flex-col">
            <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
              {editingId ? 'Edit Prompt' : 'Create New Prompt'}
            </h3>

            <form onSubmit={handleSaveForm} className="space-y-3.5 overflow-y-auto flex-1 pr-1">
              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  {t('promptTitle')} *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Senior TypeScript Code Reviewer"
                  className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    {t('category')}
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Engineering, Writing, Analysis"
                    className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Recommended Model
                  </label>
                  <input
                    type="text"
                    value={modelRecommendation}
                    onChange={(e) => setModelRecommendation(e.target.value)}
                    placeholder="Claude 3.7 / GPT-4o"
                    className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief summary of what this prompt accomplishes"
                  className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    {t('promptTemplate')} *
                  </label>
                  <span className="text-[10px] text-neutral-400">
                    Tip: Use <code className="text-purple-500 font-mono">{`{{variable}}`}</code> for dynamic fields
                  </span>
                </div>
                <textarea
                  rows={6}
                  required
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  placeholder="Act as a... Provide {{task_details}} using {{framework}}..."
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                />
              </div>

              {detectedVariables.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-neutral-400 font-medium">Auto-detected variables:</span>
                  {detectedVariables.map((v, i) => (
                    <span
                      key={i}
                      className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-300"
                    >
                      {`{{${v}}}`}
                    </span>
                  ))}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  {t('tags')}
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="code-review, typescript, agent"
                  className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg cursor-pointer"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm cursor-pointer"
                >
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deleteTargetId)}
        title="Delete Prompt"
        message="Are you sure you want to delete this prompt template?"
        onConfirm={() => {
          if (deleteTargetId) {
            deletePrompt(deleteTargetId);
            setDeleteTargetId(null);
          }
        }}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
};

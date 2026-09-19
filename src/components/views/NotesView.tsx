import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  FileText,
  Plus,
  Copy,
  Star,
  Pin,
  Edit2,
  Trash2,
  Eye,
  FileCode,
  Tag,
  Clock,
} from 'lucide-react';
import { NoteItem } from '../../types';
import { Badge } from '../common/Badge';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { EmptyState } from '../common/EmptyState';

export const NotesView: React.FC = () => {
  const {
    notes,
    saveNote,
    deleteNote,
    toggleNoteFavorite,
    toggleNotePin,
    copyToClipboard,
    t,
  } = useApp();

  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Form
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('Scratchpad');
  const [tags, setTags] = useState('');
  const [previewMode, setPreviewMode] = useState(false);

  // All tags
  const allTags = Array.from(
    new Set(notes.flatMap((n) => n.tags).filter(Boolean))
  );

  // Sorted: pinned first, then updated date
  const sortedAndFiltered = notes
    .filter((n) => {
      const matchesSearch =
        n.title.toLowerCase().includes(search.toLowerCase()) ||
        n.content.toLowerCase().includes(search.toLowerCase()) ||
        n.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
      const matchesTag = selectedTag === 'all' || n.tags.includes(selectedTag);
      return matchesSearch && matchesTag;
    })
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  const handleOpenAdd = () => {
    setEditingId(null);
    setTitle('');
    setContent('# New Note\n\n');
    setCategory('Scratchpad');
    setTags('');
    setPreviewMode(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: NoteItem) => {
    setEditingId(item.id);
    setTitle(item.title);
    setContent(item.content);
    setCategory(item.category || 'Scratchpad');
    setTags(item.tags.join(', '));
    setPreviewMode(false);
    setIsModalOpen(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    saveNote({
      id: editingId || undefined,
      title: title.trim(),
      content: content.trim(),
      category: category.trim() || 'Scratchpad',
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      isPinned: editingId ? notes.find((n) => n.id === editingId)?.isPinned || false : false,
      isFavorite: editingId ? notes.find((n) => n.id === editingId)?.isFavorite || false : false,
    });

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
              {t('navNotes')}
            </h1>
            <Badge variant="primary">{notes.length}</Badge>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Quick Markdown notes, architecture scratchpads, and technical memos.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 shadow-sm transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Note</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="flex-1 w-full">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes content, title, tags..."
            className="w-full px-3.5 py-2 text-xs rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-hidden focus:border-blue-500"
          />
        </div>

        {allTags.length > 0 && (
          <select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-hidden w-full sm:w-auto"
          >
            <option value="all">All Tags</option>
            {allTags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Notes Grid */}
      {sortedAndFiltered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No notes found"
          description="Create Markdown memos, architecture snippets, or quick developer cheat sheets."
          actionLabel="New Note"
          onAction={handleOpenAdd}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {sortedAndFiltered.map((item) => {
            const wordCount = item.content.trim() ? item.content.trim().split(/\s+/).length : 0;

            return (
              <div
                key={item.id}
                className={`p-4 rounded-xl bg-white dark:bg-neutral-900 border transition-all flex flex-col justify-between space-y-3 ${
                  item.isPinned
                    ? 'border-blue-400/60 dark:border-blue-600/50 bg-blue-50/20 dark:bg-blue-950/10'
                    : 'border-neutral-200/80 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <button
                        onClick={() => toggleNotePin(item.id)}
                        className="cursor-pointer"
                        title={item.isPinned ? 'Unpin' : 'Pin to top'}
                      >
                        <Pin
                          className={`w-4 h-4 ${
                            item.isPinned
                              ? 'text-blue-600 fill-blue-600'
                              : 'text-neutral-400 hover:text-blue-500'
                          }`}
                        />
                      </button>
                      <button
                        onClick={() => toggleNoteFavorite(item.id)}
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

                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {item.category || 'General'}
                    </Badge>
                  </div>

                  {/* Content Preview */}
                  <div className="p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-950/60 font-mono text-[11px] text-neutral-600 dark:text-neutral-300 line-clamp-4 border border-neutral-200/60 dark:border-neutral-800/60 leading-relaxed whitespace-pre-wrap">
                    {item.content}
                  </div>

                  {/* Tags */}
                  {item.tags.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap pt-1">
                      {item.tags.map((tag, tIdx) => (
                        <span
                          key={tIdx}
                          className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.2 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                        >
                          <Tag className="w-2.5 h-2.5" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bottom Controls */}
                <div className="flex items-center justify-between pt-3 border-t border-neutral-100 dark:border-neutral-800 text-[10px] text-neutral-400">
                  <span>{wordCount} words</span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => copyToClipboard(item.content, 'Note content copied')}
                      className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                      title="Copy Markdown"
                    >
                      <Copy className="w-3.5 h-3.5" />
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
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl p-6 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                {editingId ? 'Edit Note' : 'Create New Note'}
              </h3>
              <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setPreviewMode(false)}
                  className={`px-2.5 py-1 rounded-md ${
                    !previewMode ? 'bg-white dark:bg-neutral-900 font-medium shadow-xs' : 'text-neutral-500'
                  }`}
                >
                  Write
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode(true)}
                  className={`px-2.5 py-1 rounded-md ${
                    previewMode ? 'bg-white dark:bg-neutral-900 font-medium shadow-xs' : 'text-neutral-500'
                  }`}
                >
                  Preview
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveForm} className="space-y-3.5 overflow-y-auto flex-1 pr-1">
              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Note Title"
                  className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Category
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Scratchpad, Architecture, Meeting"
                    className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Tags
                  </label>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="react, release, docker"
                    className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Content (Markdown)
                </label>
                {previewMode ? (
                  <div className="w-full h-64 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 overflow-y-auto text-xs text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap font-mono">
                    {content || 'Nothing to preview'}
                  </div>
                ) : (
                  <textarea
                    rows={10}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="# Write markdown here..."
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                  />
                )}
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
        title="Delete Note"
        message="Are you sure you want to delete this note?"
        onConfirm={() => {
          if (deleteTargetId) {
            deleteNote(deleteTargetId);
            setDeleteTargetId(null);
          }
        }}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
};

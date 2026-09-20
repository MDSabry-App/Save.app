import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  BookOpen,
  Plus,
  Copy,
  Star,
  Edit2,
  Trash2,
  CopyPlus,
  Download,
  Tag,
  Eye,
  FileCode,
  Sparkles,
} from 'lucide-react';
import { SkillItem } from '../../types';
import { Badge } from '../common/Badge';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { EmptyState } from '../common/EmptyState';
import { platform } from '../../platform';

export const SkillsView: React.FC = () => {
  const {
    skills,
    saveSkill,
    deleteSkill,
    toggleSkillFavorite,
    duplicateSkill,
    copyToClipboard,
    t,
  } = useApp();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Form
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Frontend');
  const [content, setContent] = useState('');
  const [version, setVersion] = useState('1.0.0');
  const [author, setAuthor] = useState('');
  const [tools, setTools] = useState('');
  const [tags, setTags] = useState('');
  const [notes, setNotes] = useState('');

  // Active view mode for skill cards: 'raw' or 'preview'
  const [previewCardMap, setPreviewCardMap] = useState<Record<string, boolean>>({});

  const filtered = skills.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase()) ||
      s.content.toLowerCase().includes(search.toLowerCase()) ||
      s.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || s.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(skills.map((s) => s.category).filter(Boolean)));

  const handleOpenAdd = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setCategory('Frontend');
    setContent(`# Skill Instructions\n\n## Overview\nGuidelines for development tools and agent capabilities.\n\n## Best Practices\n- Practice 1\n- Practice 2\n`);
    setVersion('1.0.0');
    setAuthor('SaveDesk');
    setTools('typescript, react');
    setTags('standards, ui');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: SkillItem) => {
    setEditingId(item.id);
    setName(item.name);
    setDescription(item.description);
    setCategory(item.category);
    setContent(item.content);
    setVersion(item.version || '1.0.0');
    setAuthor(item.author || '');
    setTools((item.tools || []).join(', '));
    setTags(item.tags.join(', '));
    setNotes(item.notes);
    setIsModalOpen(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !content.trim()) return;

    saveSkill({
      id: editingId || undefined,
      name: name.trim(),
      description: description.trim(),
      category: category.trim() || 'General',
      content: content.trim(),
      version: version.trim() || '1.0.0',
      author: author.trim(),
      tools: tools
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      notes: notes.trim(),
      isFavorite: editingId ? skills.find((s) => s.id === editingId)?.isFavorite || false : false,
    });

    setIsModalOpen(false);
  };

  // Dedicated "Export as SKILL.md" action
  const handleExportSkillMd = (item: SkillItem) => {
    const yamlHeader = `---
name: ${item.name}
description: "${item.description.replace(/"/g, '\\"')}"
version: ${item.version || '1.0.0'}
author: ${item.author || 'SaveDesk'}
tools: [${(item.tools || []).map((t) => `"${t}"`).join(', ')}]
category: ${item.category}
tags: [${item.tags.map((t) => `"${t}"`).join(', ')}]
---

${item.content}
`;
    const filename = `SKILL.md`;
    platform.fileSystem.saveFile(filename, yamlHeader, 'text/markdown');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
              {t('navSkills')}
            </h1>
            <Badge variant="primary">{skills.length}</Badge>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Standardized developer and AI agent skills with YAML frontmatter and SKILL.md export.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 shadow-sm transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Skill</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="flex-1 w-full">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search skills by name, description, keywords..."
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

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No skills found"
          description="Create modular agent and developer instructions exportable as standard SKILL.md files."
          actionLabel="New Skill"
          onAction={handleOpenAdd}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((item) => {
            const isPreview = Boolean(previewCardMap[item.id]);

            return (
              <div
                key={item.id}
                className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all space-y-3"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => toggleSkillFavorite(item.id)}
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
                        {item.name}
                      </h3>
                      <Badge variant="primary">{item.category}</Badge>
                      <Badge variant="outline">v{item.version || '1.0.0'}</Badge>
                      {item.author && (
                        <span className="text-[11px] text-neutral-400">by {item.author}</span>
                      )}
                    </div>

                    {item.description && (
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0 self-end lg:self-center">
                    <button
                      onClick={() => handleExportSkillMd(item)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200/80 dark:border-emerald-800/50 rounded-lg transition-colors cursor-pointer"
                      title="Export as SKILL.md"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{t('exportSkill')}</span>
                    </button>

                    <button
                      onClick={() =>
                        setPreviewCardMap((prev) => ({ ...prev, [item.id]: !prev[item.id] }))
                      }
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors cursor-pointer"
                      title={isPreview ? 'View Raw' : 'Preview'}
                    >
                      {isPreview ? <FileCode className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{isPreview ? t('raw') : t('preview')}</span>
                    </button>

                    <button
                      onClick={() => copyToClipboard(item.content, 'Skill instructions copied')}
                      className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                      title="Copy Markdown Content"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => duplicateSkill(item.id)}
                      className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                      title="Duplicate"
                    >
                      <CopyPlus className="w-3.5 h-3.5" />
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

                {/* Content Box */}
                <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-200/60 dark:border-neutral-800/60 text-xs font-mono max-h-52 overflow-y-auto leading-relaxed text-neutral-700 dark:text-neutral-300">
                  <pre className="whitespace-pre-wrap">{item.content}</pre>
                </div>

                {/* Tools & Tags */}
                <div className="flex items-center justify-between gap-2 flex-wrap pt-1 text-[11px]">
                  {item.tools && item.tools.length > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="text-neutral-400">Tools:</span>
                      {item.tools.map((tool, tIdx) => (
                        <span
                          key={tIdx}
                          className="px-1.5 py-0.2 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 font-mono text-[10px]"
                        >
                          {tool}
                        </span>
                      ))}
                    </div>
                  )}

                  {item.tags.length > 0 && (
                    <div className="flex items-center gap-1">
                      {item.tags.map((tag, tIdx) => (
                        <span
                          key={tIdx}
                          className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                        >
                          <Tag className="w-2.5 h-2.5" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
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
            <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
              {editingId ? 'Edit Skill' : 'Create New Skill'}
            </h3>

            <form onSubmit={handleSaveForm} className="space-y-3.5 overflow-y-auto flex-1 pr-1">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Skill Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Next-Gen React Engineering"
                    className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    {t('category')}
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Frontend, Backend, AI"
                    className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    {t('skillVersion')}
                  </label>
                  <input
                    type="text"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    placeholder="1.0.0"
                    className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    {t('skillAuthor')}
                  </label>
                  <input
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="Author or team name"
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
                  placeholder="Summary of guidelines or agent tools provided"
                  className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  {t('skillContent')} *
                </label>
                <textarea
                  rows={8}
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="# Markdown content..."
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    {t('skillTools')}
                  </label>
                  <input
                    type="text"
                    value={tools}
                    onChange={(e) => setTools(e.target.value)}
                    placeholder="typescript, bash, git"
                    className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    {t('tags')}
                  </label>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="react, standards, ui"
                    className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                  />
                </div>
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
        title="Delete Skill"
        message="Are you sure you want to delete this skill instruction set?"
        onConfirm={() => {
          if (deleteTargetId) {
            deleteSkill(deleteTargetId);
            setDeleteTargetId(null);
          }
        }}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Terminal,
  Plus,
  Copy,
  Star,
  Edit2,
  Trash2,
  CopyPlus,
  Download,
  Tag,
  Code2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { McpServerItem } from '../../types';
import { Badge } from '../common/Badge';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { EmptyState } from '../common/EmptyState';
import { platform } from '../../platform';

export const McpView: React.FC = () => {
  const {
    mcpServers,
    saveMcpServer,
    deleteMcpServer,
    toggleMcpFavorite,
    duplicateMcpServer,
    copyToClipboard,
    t,
  } = useApp();

  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Form
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<McpServerItem['type']>('stdio');
  const [command, setCommand] = useState('npx');
  const [argsRaw, setArgsRaw] = useState('');
  const [envRaw, setEnvRaw] = useState('');
  const [url, setUrl] = useState('');
  const [tags, setTags] = useState('');
  const [notes, setNotes] = useState('');

  // Selected for config preview
  const [selectedMcp, setSelectedMcp] = useState<McpServerItem | null>(null);

  const filtered = mcpServers.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.description.toLowerCase().includes(search.toLowerCase()) ||
      m.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    const matchesType = selectedType === 'all' || m.type === selectedType;
    return matchesSearch && matchesType;
  });

  const handleOpenAdd = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setType('stdio');
    setCommand('npx');
    setArgsRaw('-y\n@modelcontextprotocol/server-filesystem\n/path/to/dir');
    setEnvRaw('NODE_ENV=production');
    setUrl('');
    setTags('');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: McpServerItem) => {
    setEditingId(item.id);
    setName(item.name);
    setDescription(item.description);
    setType(item.type);
    setCommand(item.command || '');
    setArgsRaw((item.args || []).join('\n'));
    setEnvRaw(
      item.env
        ? Object.entries(item.env)
            .map(([k, v]) => `${k}=${v}`)
            .join('\n')
        : ''
    );
    setUrl(item.url || '');
    setTags(item.tags.join(', '));
    setNotes(item.notes);
    setIsModalOpen(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const parsedArgs = argsRaw
      .split('\n')
      .map((a) => a.trim())
      .filter(Boolean);

    const parsedEnv: Record<string, string> = {};
    envRaw.split('\n').forEach((line) => {
      const idx = line.indexOf('=');
      if (idx > 0) {
        const k = line.substring(0, idx).trim();
        const v = line.substring(idx + 1).trim();
        if (k) parsedEnv[k] = v;
      }
    });

    saveMcpServer({
      id: editingId || undefined,
      name: name.trim(),
      description: description.trim(),
      type,
      command: type === 'stdio' ? command.trim() : undefined,
      args: type === 'stdio' ? parsedArgs : undefined,
      env: type === 'stdio' && Object.keys(parsedEnv).length > 0 ? parsedEnv : undefined,
      url: type !== 'stdio' ? url.trim() : undefined,
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      notes: notes.trim(),
      status: 'active',
      isFavorite: editingId ? mcpServers.find((m) => m.id === editingId)?.isFavorite || false : false,
    });

    setIsModalOpen(false);
  };

  // Generate standard Claude/Cursor mcpServers JSON snippet
  const generateMcpJson = (item: McpServerItem) => {
    const key = item.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    const config: any = {
      mcpServers: {
        [key]:
          item.type === 'stdio'
            ? {
                command: item.command,
                args: item.args || [],
                ...(item.env && Object.keys(item.env).length > 0 ? { env: item.env } : {}),
              }
            : {
                type: item.type,
                url: item.url,
              },
      },
    };
    return JSON.stringify(config, null, 2);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
              {t('navMcp')}
            </h1>
            <Badge variant="primary">{mcpServers.length}</Badge>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Manage Model Context Protocol servers for Claude Desktop, Cursor, and agent runtimes.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 shadow-sm transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add MCP Server</span>
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="flex-1 w-full">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search MCP servers by name, command, tags..."
            className="w-full px-3.5 py-2 text-xs rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-hidden focus:border-blue-500"
          />
        </div>

        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="px-3 py-2 text-xs rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-hidden w-full sm:w-auto"
        >
          <option value="all">All Types</option>
          <option value="stdio">stdio</option>
          <option value="http">http</option>
          <option value="sse">sse</option>
        </select>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Terminal}
          title="No MCP servers configured"
          description="Add stdio or HTTP Model Context Protocol servers to generate instant Claude Desktop and Cursor configs."
          actionLabel="Add MCP Server"
          onAction={handleOpenAdd}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          {filtered.map((item) => {
            const configJson = generateMcpJson(item);

            return (
              <div
                key={item.id}
                className="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all space-y-3"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => toggleMcpFavorite(item.id)}
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
                      <Badge variant="primary">{item.type.toUpperCase()}</Badge>
                      <Badge variant={item.status === 'active' ? 'success' : 'default'}>
                        {item.status}
                      </Badge>
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
                      onClick={() => copyToClipboard(configJson, 'MCP JSON config copied')}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors cursor-pointer"
                      title="Copy Configuration JSON"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Config</span>
                    </button>

                    <button
                      onClick={() => duplicateMcpServer(item.id)}
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

                {/* Command / URL preview */}
                <div className="bg-neutral-950 text-neutral-200 p-3 rounded-xl font-mono text-xs overflow-x-auto border border-neutral-800 flex items-center justify-between gap-2">
                  <div className="truncate">
                    {item.type === 'stdio' ? (
                      <span>
                        <span className="text-emerald-400 font-semibold">{item.command}</span>{' '}
                        {(item.args || []).join(' ')}
                      </span>
                    ) : (
                      <span className="text-sky-400">{item.url}</span>
                    )}
                  </div>
                </div>

                {/* Tags */}
                {item.tags.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {item.tags.map((tag, tIdx) => (
                      <span
                        key={tIdx}
                        className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
                      >
                        <Tag className="w-2.5 h-2.5 text-neutral-400" />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl p-6 overflow-hidden max-h-[90vh] flex flex-col">
            <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
              {editingId ? 'Edit MCP Server' : 'Add MCP Server'}
            </h3>

            <form onSubmit={handleSaveForm} className="space-y-3.5 overflow-y-auto flex-1 pr-1">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Server Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. filesystem-workspace"
                    className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    {t('mcpType')}
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                  >
                    <option value="stdio">stdio</option>
                    <option value="http">http</option>
                    <option value="sse">sse</option>
                  </select>
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
                  placeholder="Local filesystem access provider for Claude or Cursor"
                  className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                />
              </div>

              {type === 'stdio' ? (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                      Command *
                    </label>
                    <input
                      type="text"
                      required
                      value={command}
                      onChange={(e) => setCommand(e.target.value)}
                      placeholder="npx, node, docker, python"
                      className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                      Arguments (one per line)
                    </label>
                    <textarea
                      rows={3}
                      value={argsRaw}
                      onChange={(e) => setArgsRaw(e.target.value)}
                      placeholder="-y&#10;@modelcontextprotocol/server-filesystem&#10;/workspace"
                      className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                      Environment Variables (KEY=VALUE per line)
                    </label>
                    <textarea
                      rows={2}
                      value={envRaw}
                      onChange={(e) => setEnvRaw(e.target.value)}
                      placeholder="API_TOKEN=xxx&#10;DEBUG=true"
                      className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Endpoint URL *
                  </label>
                  <input
                    type="url"
                    required
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://mcp.example.com/sse"
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                  />
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
                  placeholder="filesystem, local, stdio"
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
        title="Delete MCP Configuration"
        message="Are you sure you want to delete this MCP server configuration?"
        onConfirm={() => {
          if (deleteTargetId) {
            deleteMcpServer(deleteTargetId);
            setDeleteTargetId(null);
          }
        }}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
};

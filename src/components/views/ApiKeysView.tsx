import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Key,
  Plus,
  Copy,
  Check,
  Eye,
  EyeOff,
  Trash2,
  Edit2,
  Play,
  Star,
  ExternalLink,
  Shield,
  Tag,
  Clock,
  AlertCircle,
  CheckCircle2,
  Terminal,
  Send,
  Sparkles,
} from 'lucide-react';
import { ApiKeyItem, ApiTestConfig, ApiTestResponse } from '../../types';
import { Badge } from '../common/Badge';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { EmptyState } from '../common/EmptyState';
import { platform } from '../../platform';

const COMMON_PROVIDERS = [
  { name: 'OpenAI', defaultBase: 'https://api.openai.com/v1', defaultModel: 'gpt-4o', testEndpoint: 'https://api.openai.com/v1/models' },
  { name: 'Google Gemini', defaultBase: 'https://generativelanguage.googleapis.com/v1beta', defaultModel: 'gemini-2.5-flash', testEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models' },
  { name: 'Anthropic', defaultBase: 'https://api.anthropic.com/v1', defaultModel: 'claude-3-7-sonnet-20250219', testEndpoint: 'https://api.anthropic.com/v1/models' },
  { name: 'OpenRouter', defaultBase: 'https://openrouter.ai/api/v1', defaultModel: 'openai/gpt-4o', testEndpoint: 'https://openrouter.ai/api/v1/models' },
  { name: 'Groq', defaultBase: 'https://api.groq.com/openai/v1', defaultModel: 'llama-3.3-70b-versatile', testEndpoint: 'https://api.groq.com/openai/v1/models' },
  { name: 'Mistral', defaultBase: 'https://api.mistral.ai/v1', defaultModel: 'mistral-large-latest', testEndpoint: 'https://api.groq.com/openai/v1/models' },
  { name: 'DeepSeek', defaultBase: 'https://api.deepseek.com/v1', defaultModel: 'deepseek-chat', testEndpoint: 'https://api.deepseek.com/v1/models' },
  { name: 'xAI', defaultBase: 'https://api.x.ai/v1', defaultModel: 'grok-2-latest', testEndpoint: 'https://api.x.ai/v1/models' },
  { name: 'Moonshot', defaultBase: 'https://api.moonshot.cn/v1', defaultModel: 'moonshot-v1-8k', testEndpoint: 'https://api.moonshot.cn/v1/models' },
  { name: 'Custom', defaultBase: '', defaultModel: '', testEndpoint: '' },
];

export const ApiKeysView: React.FC = () => {
  const {
    apiKeys,
    saveApiKey,
    deleteApiKey,
    toggleApiKeyFavorite,
    updateApiKeyStatus,
    copyToClipboard,
    t,
  } = useApp();

  const [search, setSearch] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [provider, setProvider] = useState('OpenAI');
  const [name, setName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [baseURL, setBaseURL] = useState('https://api.openai.com/v1');
  const [model, setModel] = useState('gpt-4o');
  const [environment, setEnvironment] = useState<ApiKeyItem['environment']>('Production');
  const [tags, setTags] = useState('');
  const [notes, setNotes] = useState('');

  // Unmasked keys map for visibility toggle
  const [unmaskedMap, setUnmaskedMap] = useState<Record<string, boolean>>({});

  // API Tester Panel State
  const [activeTestingKey, setActiveTestingKey] = useState<ApiKeyItem | null>(null);
  const [testConfig, setTestConfig] = useState<ApiTestConfig>({
    method: 'GET',
    endpoint: '',
    headers: [{ key: 'Authorization', value: '' }],
    body: '',
    timeoutMs: 8000,
  });
  const [testResponse, setTestResponse] = useState<ApiTestResponse | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const filteredKeys = apiKeys.filter((k) => {
    const matchesSearch =
      k.name.toLowerCase().includes(search.toLowerCase()) ||
      k.provider.toLowerCase().includes(search.toLowerCase()) ||
      k.model.toLowerCase().includes(search.toLowerCase()) ||
      k.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));

    const matchesProvider = selectedProvider === 'all' || k.provider === selectedProvider;
    return matchesSearch && matchesProvider;
  });

  const handleOpenAdd = () => {
    setEditingId(null);
    setProvider('OpenAI');
    setName('');
    setApiKey('');
    setBaseURL('https://api.openai.com/v1');
    setModel('gpt-4o');
    setEnvironment('Production');
    setTags('');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: ApiKeyItem) => {
    setEditingId(item.id);
    setProvider(item.provider);
    setName(item.name);
    setApiKey(item.apiKey);
    setBaseURL(item.baseURL);
    setModel(item.model);
    setEnvironment(item.environment);
    setTags(item.tags.join(', '));
    setNotes(item.notes);
    setIsModalOpen(true);
  };

  const handleProviderChange = (newProvider: string) => {
    setProvider(newProvider);
    const match = COMMON_PROVIDERS.find((p) => p.name === newProvider);
    if (match && match.name !== 'Custom') {
      setBaseURL(match.defaultBase);
      setModel(match.defaultModel);
    }
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !apiKey.trim()) return;

    saveApiKey({
      id: editingId || undefined,
      provider,
      name: name.trim(),
      apiKey: apiKey.trim(),
      baseURL: baseURL.trim(),
      model: model.trim(),
      environment,
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      notes: notes.trim(),
      status: 'active',
      isFavorite: editingId ? apiKeys.find((k) => k.id === editingId)?.isFavorite || false : false,
    });

    setIsModalOpen(false);
  };

  const toggleMask = (id: string) => {
    setUnmaskedMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Open Test Console for specific key
  const handleOpenTester = (keyItem: ApiKeyItem) => {
    setActiveTestingKey(keyItem);
    const providerPreset = COMMON_PROVIDERS.find((p) => p.name === keyItem.provider);
    const defaultEndpoint = providerPreset?.testEndpoint || `${keyItem.baseURL}/models`;

    let authHeaderValue = `Bearer ${keyItem.apiKey}`;
    if (keyItem.provider === 'Google Gemini') {
      authHeaderValue = keyItem.apiKey;
    } else if (keyItem.provider === 'Anthropic') {
      authHeaderValue = keyItem.apiKey;
    }

    setTestConfig({
      method: 'GET',
      endpoint: defaultEndpoint,
      headers: [
        { key: keyItem.provider === 'Anthropic' ? 'x-api-key' : 'Authorization', value: authHeaderValue },
        { key: 'Content-Type', value: 'application/json' },
      ],
      body: '',
      timeoutMs: 8000,
    });
    setTestResponse(null);
  };

  const handleRunTest = async () => {
    if (!testConfig.endpoint.trim()) return;
    setIsTesting(true);
    setTestResponse(null);

    const response = await platform.http.sendRequest(testConfig);
    setTestResponse(response);
    setIsTesting(false);

    if (activeTestingKey) {
      saveApiKey({
        ...activeTestingKey,
        lastTested: new Date().toISOString(),
        lastTestStatus: response.status >= 200 && response.status < 300 ? 'success' : 'error',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
              {t('navApiKeys')}
            </h1>
            <Badge variant="primary">{apiKeys.length}</Badge>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Store, mask, categorize, and test your LLM and developer API keys securely.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 shadow-sm transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add API Key</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="flex-1 w-full">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter keys by name, provider, model, tags..."
            className="w-full px-3.5 py-2 text-xs rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-hidden focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <select
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-hidden"
          >
            <option value="all">All Providers</option>
            {COMMON_PROVIDERS.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* API Keys List */}
      {filteredKeys.length === 0 ? (
        <EmptyState
          icon={Key}
          title="No API keys found"
          description="Add your first API credentials for OpenAI, Gemini, Anthropic, or custom endpoints."
          actionLabel="Add API Key"
          onAction={handleOpenAdd}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filteredKeys.map((item) => {
            const isUnmasked = Boolean(unmaskedMap[item.id]);
            const maskedKey = isUnmasked
              ? item.apiKey
              : item.apiKey.slice(0, 7) + '•'.repeat(Math.max(10, item.apiKey.length - 11)) + item.apiKey.slice(-4);

            return (
              <div
                key={item.id}
                className={`p-4 rounded-xl bg-white dark:bg-neutral-900 border transition-all ${
                  item.status === 'inactive'
                    ? 'border-neutral-200/50 dark:border-neutral-800/50 opacity-70'
                    : 'border-neutral-200/80 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left info */}
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <button
                        onClick={() => toggleApiKeyFavorite(item.id)}
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
                      <span className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 truncate">
                        {item.name}
                      </span>
                      <Badge variant="primary">{item.provider}</Badge>
                      <Badge variant="outline">{item.environment}</Badge>
                      <Badge
                        variant={item.status === 'active' ? 'success' : 'default'}
                        className="cursor-pointer"
                      >
                        {item.status}
                      </Badge>
                      {item.lastTestStatus && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-neutral-400">
                          {item.lastTestStatus === 'success' ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <AlertCircle className="w-3 h-3 text-rose-500" />
                          )}
                          <span>Tested</span>
                        </span>
                      )}
                    </div>

                    {/* Key & Endpoint Row */}
                    <div className="flex items-center gap-2 font-mono text-xs text-neutral-600 dark:text-neutral-300 bg-neutral-50 dark:bg-neutral-950/60 px-3 py-1.5 rounded-lg border border-neutral-200/60 dark:border-neutral-800/60 w-fit max-w-full overflow-x-auto">
                      <Key className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                      <span className="select-all truncate">{maskedKey}</span>
                      <button
                        onClick={() => toggleMask(item.id)}
                        className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-0.5 rounded cursor-pointer ms-1 shrink-0"
                        title={isUnmasked ? 'Mask key' : 'Reveal key'}
                      >
                        {isUnmasked ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => copyToClipboard(item.apiKey, 'API Key copied to clipboard')}
                        className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-0.5 rounded cursor-pointer shrink-0"
                        title="Copy Key"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Meta info */}
                    <div className="flex items-center gap-3 text-[11px] text-neutral-500 dark:text-neutral-400 flex-wrap pt-0.5">
                      {item.model && <span>Model: <code className="text-neutral-700 dark:text-neutral-300 font-mono">{item.model}</code></span>}
                      {item.baseURL && <span className="truncate max-w-xs">Base: {item.baseURL}</span>}
                    </div>

                    {/* Tags */}
                    {item.tags.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
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

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
                    <button
                      onClick={() => handleOpenTester(item)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200/80 dark:border-emerald-800/50 transition-colors cursor-pointer"
                      title="Test API Endpoint"
                    >
                      <Play className="w-3.5 h-3.5 fill-emerald-600 dark:fill-emerald-400" />
                      <span>{t('test')}</span>
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

      {/* API Testing Drawer / Modal */}
      {activeTestingKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-500" />
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  {t('testApiHeading')} — {activeTestingKey.name}
                </h3>
              </div>
              <button
                onClick={() => setActiveTestingKey(null)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 text-xs px-2 py-1 rounded cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Endpoint configuration */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  {t('endpoint')}
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={testConfig.method}
                    onChange={(e) => setTestConfig({ ...testConfig, method: e.target.value as any })}
                    className="px-2.5 py-2 text-xs font-mono font-semibold rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                  <input
                    type="text"
                    value={testConfig.endpoint}
                    onChange={(e) => setTestConfig({ ...testConfig, endpoint: e.target.value })}
                    placeholder="https://api.openai.com/v1/models"
                    className="flex-1 px-3 py-2 text-xs font-mono rounded-lg bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                  />
                  <button
                    onClick={handleRunTest}
                    disabled={isTesting}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    {isTesting ? <Clock className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    <span>{isTesting ? t('testing') : t('sendRequest')}</span>
                  </button>
                </div>
              </div>

              {/* Notice regarding CORS */}
              <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>{t('corsNotice')}</span>
              </div>

              {/* Response Panel */}
              {testResponse && (
                <div className="space-y-2 border-t border-neutral-200 dark:border-neutral-800 pt-4">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                        {t('responseStatus')}:
                      </span>
                      <Badge
                        variant={
                          testResponse.status >= 200 && testResponse.status < 300
                            ? 'success'
                            : testResponse.status === 0
                            ? 'warning'
                            : 'error'
                        }
                      >
                        {testResponse.status} {testResponse.statusText}
                      </Badge>
                      <span className="text-neutral-500 text-[11px]">
                        {testResponse.timeMs} ms
                      </span>
                    </div>

                    <button
                      onClick={() => copyToClipboard(testResponse.body, 'Response body copied')}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{t('copy')}</span>
                    </button>
                  </div>

                  <div className="bg-neutral-950 text-neutral-100 p-3.5 rounded-xl font-mono text-xs max-h-64 overflow-y-auto leading-relaxed border border-neutral-800">
                    <pre className="whitespace-pre-wrap word-break-all">
                      {testResponse.body || 'No response body received'}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Key Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl p-6 overflow-hidden">
            <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
              {editingId ? 'Edit API Key' : 'Add New API Key'}
            </h3>

            <form onSubmit={handleSaveForm} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    {t('provider')}
                  </label>
                  <select
                    value={provider}
                    onChange={(e) => handleProviderChange(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                  >
                    {COMMON_PROVIDERS.map((p) => (
                      <option key={p.name} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    {t('environment')}
                  </label>
                  <select
                    value={environment}
                    onChange={(e) => setEnvironment(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                  >
                    <option value="Production">Production</option>
                    <option value="Staging">Staging</option>
                    <option value="Development">Development</option>
                    <option value="Test">Test</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  {t('keyName')} *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Production GPT-4o Key"
                  className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  {t('apiKey')} *
                </label>
                <input
                  type="password"
                  required
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    {t('baseURL')}
                  </label>
                  <input
                    type="text"
                    value={baseURL}
                    onChange={(e) => setBaseURL(e.target.value)}
                    placeholder="https://api..."
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    {t('model')}
                  </label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="e.g. gpt-4o"
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  {t('tags')}
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="ai, chat, production"
                  className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  {t('notes')}
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional usage notes or rate limit reminders"
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
        title="Delete API Key"
        message="Are you sure you want to delete this API key? This action cannot be undone."
        onConfirm={() => {
          if (deleteTargetId) {
            deleteApiKey(deleteTargetId);
            setDeleteTargetId(null);
          }
        }}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
};

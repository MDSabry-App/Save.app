import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Lock,
  Plus,
  Copy,
  Star,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  KeyRound,
  Sparkles,
  Tag,
  Check,
  ArrowRight,
  Info,
} from 'lucide-react';
import { VaultItem } from '../../types';
import { Badge } from '../common/Badge';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { EmptyState } from '../common/EmptyState';

// Helper to compute entropy
function calculateEntropy(password: string, poolSize: number): number {
  if (!password || poolSize === 0) return 0;
  return Math.round(password.length * Math.log2(poolSize));
}

export const VaultView: React.FC = () => {
  const {
    vaultItems,
    saveVaultItem,
    deleteVaultItem,
    toggleVaultFavorite,
    copyToClipboard,
    t,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'vault' | 'generator'>('vault');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Generator State
  const [genLength, setGenLength] = useState(16);
  const [genUppercase, setGenUppercase] = useState(true);
  const [genLowercase, setGenLowercase] = useState(true);
  const [genNumbers, setGenNumbers] = useState(true);
  const [genSymbols, setGenSymbols] = useState(true);
  const [genExcludeAmbiguous, setGenExcludeAmbiguous] = useState(true);
  const [genPassphraseMode, setGenPassphraseMode] = useState(false);
  const [genWordCount, setGenWordCount] = useState(4);
  const [generatedPassword, setGeneratedPassword] = useState('');

  // Password visibility map
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  // Vault form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formWebsite, setFormWebsite] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formTags, setFormTags] = useState('');

  // Generate a password
  const generatePassword = () => {
    if (genPassphraseMode) {
      const words = [
        'apple', 'bridge', 'castle', 'dragon', 'ember', 'falcon', 'galaxy', 'harbor',
        'island', 'jungle', 'knight', 'legend', 'meteor', 'nebula', 'ocean', 'planet',
        'quantum', 'river', 'shadow', 'timber', 'unity', 'vector', 'winter', 'zenith'
      ];
      const selected: string[] = [];
      for (let i = 0; i < genWordCount; i++) {
        const randWord = words[Math.floor(Math.random() * words.length)];
        selected.push(randWord.charAt(0).toUpperCase() + randWord.slice(1));
      }
      const num = Math.floor(Math.random() * 90 + 10);
      setGeneratedPassword(selected.join('-') + '-' + num);
      return;
    }

    let upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let lower = 'abcdefghijklmnopqrstuvwxyz';
    let numbers = '0123456789';
    let symbols = '!@#$%^&*()_+~|}{[]:;?><,.-=';

    if (genExcludeAmbiguous) {
      upper = upper.replace(/[IO]/g, '');
      lower = lower.replace(/[lo]/g, '');
      numbers = numbers.replace(/[01]/g, '');
    }

    let pool = '';
    if (genUppercase) pool += upper;
    if (genLowercase) pool += lower;
    if (genNumbers) pool += numbers;
    if (genSymbols) pool += symbols;

    if (!pool) pool = lower;

    let res = '';
    for (let i = 0; i < genLength; i++) {
      const randIdx = Math.floor(Math.random() * pool.length);
      res += pool[randIdx];
    }
    setGeneratedPassword(res);
  };

  useEffect(() => {
    generatePassword();
  }, [
    genLength,
    genUppercase,
    genLowercase,
    genNumbers,
    genSymbols,
    genExcludeAmbiguous,
    genPassphraseMode,
    genWordCount,
  ]);

  // Compute strength & entropy
  const { entropy, strengthScore, strengthLabel, strengthColor } = useMemo(() => {
    let poolSize = 0;
    if (genPassphraseMode) {
      poolSize = 2048;
    } else {
      if (genUppercase) poolSize += 26;
      if (genLowercase) poolSize += 26;
      if (genNumbers) poolSize += 10;
      if (genSymbols) poolSize += 30;
    }

    const ent = calculateEntropy(generatedPassword, poolSize);
    let score = Math.min(100, Math.round((ent / 100) * 100));
    if (generatedPassword.length < 8) score = Math.min(score, 30);

    let label = 'Weak';
    let color = 'bg-rose-500';
    if (score >= 80) {
      label = 'Very Strong';
      color = 'bg-emerald-500';
    } else if (score >= 60) {
      label = 'Strong';
      color = 'bg-blue-500';
    } else if (score >= 40) {
      label = 'Moderate';
      color = 'bg-amber-500';
    }

    return { entropy: ent, strengthScore: score, strengthLabel: label, strengthColor: color };
  }, [generatedPassword, genPassphraseMode, genUppercase, genLowercase, genNumbers, genSymbols]);

  const filteredVault = vaultItems.filter((v) => {
    return (
      v.website.toLowerCase().includes(search.toLowerCase()) ||
      v.username.toLowerCase().includes(search.toLowerCase()) ||
      v.email.toLowerCase().includes(search.toLowerCase()) ||
      v.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
    );
  });

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormWebsite('');
    setFormUsername('');
    setFormPassword('');
    setFormEmail('');
    setFormUrl('');
    setFormNotes('');
    setFormTags('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: VaultItem) => {
    setEditingId(item.id);
    setFormWebsite(item.website);
    setFormUsername(item.username);
    setFormPassword(item.password);
    setFormEmail(item.email);
    setFormUrl(item.url);
    setFormNotes(item.notes);
    setFormTags(item.tags.join(', '));
    setIsModalOpen(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formWebsite.trim() || !formPassword.trim()) return;

    saveVaultItem({
      id: editingId || undefined,
      website: formWebsite.trim(),
      username: formUsername.trim(),
      password: formPassword.trim(),
      email: formEmail.trim(),
      url: formUrl.trim(),
      notes: formNotes.trim(),
      tags: formTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      isFavorite: editingId ? vaultItems.find((v) => v.id === editingId)?.isFavorite || false : false,
    });

    setIsModalOpen(false);
  };

  const handleSaveGeneratedToVault = () => {
    setEditingId(null);
    setFormWebsite('');
    setFormUsername('');
    setFormPassword(generatedPassword);
    setFormEmail('');
    setFormUrl('');
    setFormNotes('');
    setFormTags('');
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
              {t('passwordVault')}
            </h1>
            <Badge variant="primary">{vaultItems.length}</Badge>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Local credential management and high-entropy cryptographic password generator.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="inline-flex rounded-xl bg-neutral-200/70 dark:bg-neutral-800 p-0.5 text-xs">
            <button
              onClick={() => setActiveTab('vault')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                activeTab === 'vault'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400'
              }`}
            >
              Vault Entries ({vaultItems.length})
            </button>
            <button
              onClick={() => setActiveTab('generator')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                activeTab === 'generator'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400'
              }`}
            >
              Generator
            </button>
          </div>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Item</span>
          </button>
        </div>
      </div>

      {/* Security Architecture Callout */}
      <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200/70 dark:border-neutral-800 text-[11px] text-neutral-600 dark:text-neutral-400 flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-neutral-800 dark:text-neutral-200">Security Architecture: </span>
          Vault entries are part of the encrypted workspace: AES-256-GCM with a key derived from your password (PBKDF2), held in memory only. The encrypted copy on the server cannot be read without that password, and values stay masked until you reveal them.
        </div>
      </div>

      {activeTab === 'generator' ? (
        /* Password Generator Tab */
        <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 space-y-6 max-w-2xl mx-auto">
          {/* Display Output */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Generated Secret
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-neutral-400">
                  {generatedPassword.length} chars • {entropy} bits entropy
                </span>
                <Badge variant="primary" className="text-[10px]">
                  {strengthLabel}
                </Badge>
              </div>
            </div>

            <div className="relative">
              <input
                type="text"
                readOnly
                value={generatedPassword}
                className="w-full px-4 py-3 text-sm font-mono tracking-wide rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 pr-24 select-all"
              />
              <div className="absolute end-2 top-2 flex items-center gap-1">
                <button
                  onClick={generatePassword}
                  className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 hover:bg-neutral-200/60 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                  title="Regenerate"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => copyToClipboard(generatedPassword, 'Password copied!')}
                  className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 hover:bg-neutral-200/60 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                  title="Copy Password"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Strength Bar */}
            <div className="h-1.5 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
              <div
                className={`h-full ${strengthColor} transition-all duration-300`}
                style={{ width: `${strengthScore}%` }}
              />
            </div>
          </div>

          {/* Options */}
          <div className="space-y-4 pt-2 border-t border-neutral-200 dark:border-neutral-800">
            {/* Mode switch */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                {t('passphraseMode')}
              </span>
              <input
                type="checkbox"
                checked={genPassphraseMode}
                onChange={(e) => setGenPassphraseMode(e.target.checked)}
                className="rounded border-neutral-300 dark:border-neutral-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </div>

            {genPassphraseMode ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-600 dark:text-neutral-400">Word Count</span>
                  <span className="font-mono font-semibold">{genWordCount}</span>
                </div>
                <input
                  type="range"
                  min={3}
                  max={8}
                  value={genWordCount}
                  onChange={(e) => setGenWordCount(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-600 dark:text-neutral-400">{t('passwordLength')}</span>
                    <span className="font-mono font-semibold">{genLength}</span>
                  </div>
                  <input
                    type="range"
                    min={8}
                    max={64}
                    value={genLength}
                    onChange={(e) => setGenLength(Number(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <label className="flex items-center gap-2 text-xs text-neutral-700 dark:text-neutral-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={genUppercase}
                      onChange={(e) => setGenUppercase(e.target.checked)}
                      className="rounded border-neutral-300 text-blue-600"
                    />
                    <span>{t('includeUppercase')}</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-neutral-700 dark:text-neutral-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={genLowercase}
                      onChange={(e) => setGenLowercase(e.target.checked)}
                      className="rounded border-neutral-300 text-blue-600"
                    />
                    <span>{t('includeLowercase')}</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-neutral-700 dark:text-neutral-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={genNumbers}
                      onChange={(e) => setGenNumbers(e.target.checked)}
                      className="rounded border-neutral-300 text-blue-600"
                    />
                    <span>{t('includeNumbers')}</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-neutral-700 dark:text-neutral-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={genSymbols}
                      onChange={(e) => setGenSymbols(e.target.checked)}
                      className="rounded border-neutral-300 text-blue-600"
                    />
                    <span>{t('includeSymbols')}</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-neutral-700 dark:text-neutral-300 cursor-pointer col-span-2">
                    <input
                      type="checkbox"
                      checked={genExcludeAmbiguous}
                      onChange={(e) => setGenExcludeAmbiguous(e.target.checked)}
                      className="rounded border-neutral-300 text-blue-600"
                    />
                    <span>{t('excludeAmbiguous')}</span>
                  </label>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-neutral-200 dark:border-neutral-800">
            <button
              onClick={handleSaveGeneratedToVault}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t('saveToVault')}</span>
            </button>
          </div>
        </div>
      ) : (
        /* Vault Entries Tab */
        <div className="space-y-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search vault by website, username, email, tags..."
            className="w-full px-3.5 py-2 text-xs rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-hidden focus:border-blue-500"
          />

          {filteredVault.length === 0 ? (
            <EmptyState
              icon={Lock}
              title="No credentials stored in vault"
              description="Store logins, developer tokens, and administrative credentials safely."
              actionLabel="Add Vault Item"
              onAction={handleOpenAdd}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredVault.map((item) => {
                const isVisible = Boolean(visiblePasswords[item.id]);

                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <button
                          onClick={() => toggleVaultFavorite(item.id)}
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
                          {item.website}
                        </h3>
                      </div>

                      {item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-neutral-400 hover:text-blue-500 p-1 rounded transition-colors"
                          title="Open website"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>

                    {/* Username & Password */}
                    <div className="space-y-1.5 text-xs">
                      {item.username && (
                        <div className="flex items-center justify-between bg-neutral-50 dark:bg-neutral-950/60 px-3 py-1.5 rounded-lg border border-neutral-200/60 dark:border-neutral-800/60">
                          <span className="text-neutral-500 font-medium">User:</span>
                          <span className="font-mono text-neutral-800 dark:text-neutral-200 truncate mx-2">
                            {item.username}
                          </span>
                          <button
                            onClick={() => copyToClipboard(item.username, 'Username copied')}
                            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
                            title="Copy Username"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      <div className="flex items-center justify-between bg-neutral-50 dark:bg-neutral-950/60 px-3 py-1.5 rounded-lg border border-neutral-200/60 dark:border-neutral-800/60">
                        <span className="text-neutral-500 font-medium">Pass:</span>
                        <span className="font-mono text-neutral-800 dark:text-neutral-200 truncate mx-2">
                          {isVisible ? item.password : '••••••••••••••••'}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() =>
                              setVisiblePasswords((prev) => ({ ...prev, [item.id]: !prev[item.id] }))
                            }
                            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
                            title={isVisible ? 'Hide password' : 'Show password'}
                          >
                            {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => copyToClipboard(item.password, 'Password copied')}
                            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
                            title="Copy Password"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {item.notes && (
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-2">
                        {item.notes}
                      </p>
                    )}

                    {/* Bottom Controls */}
                    <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800">
                      <div className="flex items-center gap-1 flex-wrap">
                        {item.tags.map((tag, tIdx) => (
                          <span
                            key={tIdx}
                            className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center gap-1">
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
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl p-6 overflow-hidden">
            <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
              {editingId ? 'Edit Credentials' : 'Add New Credentials'}
            </h3>

            <form onSubmit={handleSaveForm} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  {t('website')} *
                </label>
                <input
                  type="text"
                  required
                  value={formWebsite}
                  onChange={(e) => setFormWebsite(e.target.value)}
                  placeholder="e.g. GitHub Enterprise"
                  className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    {t('username')}
                  </label>
                  <input
                    type="text"
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    placeholder="john_doe"
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    {t('email')}
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    {t('password')} *
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormPassword(generatedPassword)}
                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    Paste Generated Password
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder="Enter secret"
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Login URL
                </label>
                <input
                  type="url"
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Tags
                </label>
                <input
                  type="text"
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                  placeholder="work, critical, dev"
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
        title="Delete Vault Item"
        message="Are you sure you want to permanently delete these credentials?"
        onConfirm={() => {
          if (deleteTargetId) {
            deleteVaultItem(deleteTargetId);
            setDeleteTargetId(null);
          }
        }}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
};

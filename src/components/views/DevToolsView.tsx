import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Wrench,
  Code2,
  FileJson,
  Binary,
  ShieldAlert,
  Link2,
  Hash,
  Regex,
  Palette,
  Clock,
  Copy,
  Check,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Play,
  Sparkles,
} from 'lucide-react';
import { Badge } from '../common/Badge';

type ToolId =
  | 'json'
  | 'base64'
  | 'jwt'
  | 'url'
  | 'hash'
  | 'regex'
  | 'color'
  | 'epoch';

export const DevToolsView: React.FC = () => {
  const { copyToClipboard, t } = useApp();
  const [activeTool, setActiveTool] = useState<ToolId>('json');

  // ===================== 1. JSON Tool =====================
  const [jsonInput, setJsonInput] = useState('{\n  "name": "DevDesk",\n  "version": "1.0.0",\n  "features": ["keys", "prompts", "mcp", "skills"]\n}');
  const [jsonOutput, setJsonOutput] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);

  const handleFormatJson = (spaces: number) => {
    try {
      const parsed = JSON.parse(jsonInput);
      setJsonOutput(JSON.stringify(parsed, null, spaces));
      setJsonError(null);
    } catch (err: any) {
      setJsonError(err.message);
    }
  };

  const handleMinifyJson = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      setJsonOutput(JSON.stringify(parsed));
      setJsonError(null);
    } catch (err: any) {
      setJsonError(err.message);
    }
  };

  // ===================== 2. Base64 Tool =====================
  const [b64Input, setB64Input] = useState('Hello, DevDesk Engineer!');
  const [b64Output, setB64Output] = useState('');
  const [b64UrlSafe, setB64UrlSafe] = useState(false);
  const [b64Error, setB64Error] = useState<string | null>(null);

  const handleB64Encode = () => {
    try {
      let encoded = btoa(unescape(encodeURIComponent(b64Input)));
      if (b64UrlSafe) {
        encoded = encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      }
      setB64Output(encoded);
      setB64Error(null);
    } catch (err: any) {
      setB64Error('Encoding failed: ' + err.message);
    }
  };

  const handleB64Decode = () => {
    try {
      let str = b64Input;
      if (b64UrlSafe) {
        str = str.replace(/-/g, '+').replace(/_/g, '/');
        while (str.length % 4) {
          str += '=';
        }
      }
      const decoded = decodeURIComponent(escape(atob(str)));
      setB64Output(decoded);
      setB64Error(null);
    } catch (err: any) {
      setB64Error('Invalid Base64 string: ' + err.message);
    }
  };

  // ===================== 3. JWT Tool =====================
  const [jwtInput, setJwtInput] = useState(
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFsaWNlIERvZSIsImlhdCI6MTUxNjIzOTAyMiwiZXhwIjoyNTE2MjM5MDIyfQ.4S_c8p30yYF6H6fG0_F'
  );

  const decodedJwt = useMemo(() => {
    try {
      const parts = jwtInput.trim().split('.');
      if (parts.length !== 3) {
        return { valid: false, error: 'JWT must have 3 dot-separated segments' };
      }
      const header = JSON.parse(atob(parts[0]));
      const payload = JSON.parse(atob(parts[1]));
      const signature = parts[2];

      let isExpired = false;
      let expDateStr = 'None';
      if (payload.exp) {
        const expDate = new Date(payload.exp * 1000);
        isExpired = expDate.getTime() < Date.now();
        expDateStr = expDate.toLocaleString();
      }

      return {
        valid: true,
        header: JSON.stringify(header, null, 2),
        payload: JSON.stringify(payload, null, 2),
        signature,
        isExpired,
        expDateStr,
      };
    } catch (e: any) {
      return { valid: false, error: e.message };
    }
  }, [jwtInput]);

  // ===================== 4. URL Tool =====================
  const [urlInput, setUrlInput] = useState('https://api.devdesk.local/v1/search?q=developer+tools&category=ai&sort=recent');
  const [urlOutput, setUrlOutput] = useState('');

  const parsedQueryParams = useMemo(() => {
    try {
      const urlObj = new URL(urlInput);
      const params: { key: string; value: string }[] = [];
      urlObj.searchParams.forEach((value, key) => {
        params.push({ key, value });
      });
      return { valid: true, params, origin: urlObj.origin, pathname: urlObj.pathname };
    } catch {
      // Try parsing as raw query string
      try {
        const qs = urlInput.startsWith('?') ? urlInput.slice(1) : urlInput;
        const sp = new URLSearchParams(qs);
        const params: { key: string; value: string }[] = [];
        sp.forEach((value, key) => {
          params.push({ key, value });
        });
        return { valid: params.length > 0, params, origin: '', pathname: '' };
      } catch {
        return { valid: false, params: [] };
      }
    }
  }, [urlInput]);

  // ===================== 5. Hash Tool =====================
  const [hashInput, setHashInput] = useState('SecretDevString123');
  const [hashAlgorithm, setHashAlgorithm] = useState<'SHA-256' | 'SHA-512' | 'SHA-1'>('SHA-256');
  const [calculatedHash, setCalculatedHash] = useState('');
  const [verifyHash, setVerifyHash] = useState('');

  const computeHash = async (text: string, algo: string) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest(algo, data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  };

  useEffect(() => {
    computeHash(hashInput, hashAlgorithm).then((h) => setCalculatedHash(h));
  }, [hashInput, hashAlgorithm]);

  const isHashMatch = useMemo(() => {
    if (!verifyHash.trim()) return null;
    return verifyHash.trim().toLowerCase() === calculatedHash.toLowerCase();
  }, [verifyHash, calculatedHash]);

  // ===================== 6. Regex Tool =====================
  const [regexPattern, setRegexPattern] = useState('\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b');
  const [regexFlags, setRegexFlags] = useState('g');
  const [regexTestString, setRegexTestString] = useState(
    'Contact support@devdesk.com or security@enterprise.org for questions. Invalid: user@.com'
  );

  const regexResults = useMemo(() => {
    try {
      const reg = new RegExp(regexPattern, regexFlags);
      const matches: string[] = [];
      let m;
      if (regexFlags.includes('g')) {
        let match;
        while ((match = reg.exec(regexTestString)) !== null) {
          matches.push(match[0]);
          if (match.index === reg.lastIndex) reg.lastIndex++;
        }
      } else {
        const single = reg.exec(regexTestString);
        if (single) matches.push(single[0]);
      }
      return { valid: true, matches, error: null };
    } catch (e: any) {
      return { valid: false, matches: [], error: e.message };
    }
  }, [regexPattern, regexFlags, regexTestString]);

  // ===================== 7. Color Converter =====================
  const [colorHex, setColorHex] = useState('#2563EB');

  // Convert Hex to RGB
  const rgbValues = useMemo(() => {
    let clean = colorHex.replace('#', '');
    if (clean.length === 3) {
      clean = clean.split('').map((c) => c + c).join('');
    }
    const r = parseInt(clean.substring(0, 2), 16) || 0;
    const g = parseInt(clean.substring(2, 4), 16) || 0;
    const b = parseInt(clean.substring(4, 6), 16) || 0;
    return { r, g, b, str: `rgb(${r}, ${g}, ${b})` };
  }, [colorHex]);

  // Convert RGB to HSL
  const hslValues = useMemo(() => {
    let { r, g, b } = rgbValues;
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    let l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }

    const hDeg = Math.round(h * 360);
    const sPct = Math.round(s * 100);
    const lPct = Math.round(l * 100);
    return { h: hDeg, s: sPct, l: lPct, str: `hsl(${hDeg}, ${sPct}%, ${lPct}%)` };
  }, [rgbValues]);

  // Complementary Color
  const complementaryHex = useMemo(() => {
    let { h, s, l } = hslValues;
    const compH = (h + 180) % 360;
    return `hsl(${compH}, ${s}%, ${l}%)`;
  }, [hslValues]);

  // ===================== 8. Epoch Tool =====================
  const [currentEpoch, setCurrentEpoch] = useState(Math.floor(Date.now() / 1000));
  const [epochInput, setEpochInput] = useState(String(Math.floor(Date.now() / 1000)));
  const [dateInput, setDateInput] = useState(new Date().toISOString().slice(0, 16));

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentEpoch(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const epochOutput = useMemo(() => {
    const num = Number(epochInput);
    if (isNaN(num)) return null;
    const ms = epochInput.length > 10 ? num : num * 1000;
    const date = new Date(ms);
    return {
      local: date.toLocaleString(),
      utc: date.toUTCString(),
      iso: date.toISOString(),
      relative: getRelativeTime(date),
    };
  }, [epochInput]);

  function getRelativeTime(date: Date): string {
    const diffSec = Math.round((Date.now() - date.getTime()) / 1000);
    if (Math.abs(diffSec) < 60) return `${diffSec} seconds ago`;
    const diffMin = Math.round(diffSec / 60);
    if (Math.abs(diffMin) < 60) return `${diffMin} minutes ago`;
    const diffHrs = Math.round(diffMin / 60);
    if (Math.abs(diffHrs) < 24) return `${diffHrs} hours ago`;
    const diffDays = Math.round(diffHrs / 24);
    return `${diffDays} days ago`;
  }

  const dateToEpoch = useMemo(() => {
    const parsed = new Date(dateInput);
    if (isNaN(parsed.getTime())) return null;
    return {
      seconds: Math.floor(parsed.getTime() / 1000),
      ms: parsed.getTime(),
    };
  }, [dateInput]);

  const TOOLS = [
    { id: 'json' as ToolId, name: 'JSON Formatter', icon: FileJson },
    { id: 'base64' as ToolId, name: 'Base64', icon: Binary },
    { id: 'jwt' as ToolId, name: 'JWT Debugger', icon: ShieldAlert },
    { id: 'url' as ToolId, name: 'URL Encoder', icon: Link2 },
    { id: 'hash' as ToolId, name: 'Hash Generator', icon: Hash },
    { id: 'regex' as ToolId, name: 'Regex Tester', icon: Regex },
    { id: 'color' as ToolId, name: 'Color Palette', icon: Palette },
    { id: 'epoch' as ToolId, name: 'Timestamp / Epoch', icon: Clock },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
            {t('navDevTools')}
          </h1>
          <Badge variant="primary">{TOOLS.length} Utilities</Badge>
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          Handy developer toolset for rapid inspection, encoding, hashing, and parsing.
        </p>
      </div>

      {/* Tool Tabs Horizontal Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-neutral-200/80 dark:border-neutral-800">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;

          return (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200/80 dark:border-blue-800/60 shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{tool.name}</span>
            </button>
          );
        })}
      </div>

      {/* TOOL 1: JSON FORMATTER */}
      {activeTool === 'json' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-neutral-700 dark:text-neutral-300">Input JSON</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleFormatJson(2)}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                >
                  Format (2 spaces)
                </button>
                <button
                  onClick={() => handleFormatJson(4)}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 cursor-pointer"
                >
                  4 spaces
                </button>
                <button
                  onClick={handleMinifyJson}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 cursor-pointer"
                >
                  Minify
                </button>
              </div>
            </div>
            <textarea
              rows={14}
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              className="w-full p-3 font-mono text-xs rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100"
              placeholder="Paste raw JSON here..."
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-neutral-700 dark:text-neutral-300">Formatted Output</span>
              {jsonOutput && (
                <button
                  onClick={() => copyToClipboard(jsonOutput, 'JSON copied')}
                  className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </button>
              )}
            </div>

            {jsonError ? (
              <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 font-mono text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  <span>Invalid JSON Syntax</span>
                </div>
                <div>{jsonError}</div>
              </div>
            ) : (
              <div className="w-full h-72 p-3 font-mono text-xs rounded-xl bg-neutral-950 text-neutral-100 border border-neutral-800 overflow-y-auto whitespace-pre leading-relaxed">
                {jsonOutput || 'Click "Format" to process JSON'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TOOL 2: BASE64 */}
      {activeTool === 'base64' && (
        <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 space-y-4 max-w-2xl">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Input String
            </label>
            <textarea
              rows={4}
              value={b64Input}
              onChange={(e) => setB64Input(e.target.value)}
              className="w-full p-3 font-mono text-xs rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-neutral-700 dark:text-neutral-300 cursor-pointer">
              <input
                type="checkbox"
                checked={b64UrlSafe}
                onChange={(e) => setB64UrlSafe(e.target.checked)}
                className="rounded border-neutral-300 text-blue-600"
              />
              <span>URL-safe Base64 (replace +/ with -_ and strip padding =)</span>
            </label>

            <div className="flex items-center gap-2">
              <button
                onClick={handleB64Encode}
                className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
              >
                Encode to Base64
              </button>
              <button
                onClick={handleB64Decode}
                className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 cursor-pointer"
              >
                Decode from Base64
              </button>
            </div>
          </div>

          {b64Error ? (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-mono">
              {b64Error}
            </div>
          ) : (
            <div className="space-y-1 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-neutral-700 dark:text-neutral-300">Result</span>
                {b64Output && (
                  <button
                    onClick={() => copyToClipboard(b64Output, 'Base64 result copied')}
                    className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </button>
                )}
              </div>
              <div className="p-3 font-mono text-xs rounded-xl bg-neutral-950 text-neutral-100 border border-neutral-800 overflow-x-auto whitespace-pre-wrap word-break-all min-h-[60px]">
                {b64Output || 'Output will appear here...'}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TOOL 3: JWT DEBUGGER */}
      {activeTool === 'jwt' && (
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Encoded JWT Token
            </label>
            <input
              type="text"
              value={jwtInput}
              onChange={(e) => setJwtInput(e.target.value)}
              className="w-full p-2.5 font-mono text-xs rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 select-all"
              placeholder="eyJhbGciOi..."
            />
          </div>

          {decodedJwt.valid ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Header & Expiry */}
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                      Header (Algorithm & Type)
                    </span>
                    <button
                      onClick={() => copyToClipboard(decodedJwt.header || '', 'Header copied')}
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </button>
                  </div>
                  <pre className="font-mono text-xs bg-neutral-950 text-neutral-100 p-3 rounded-lg overflow-x-auto">
                    {decodedJwt.header}
                  </pre>
                </div>

                <div className="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-2">
                  <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Token Expiration Status
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge variant={decodedJwt.isExpired ? 'error' : 'success'}>
                      {decodedJwt.isExpired ? 'EXPIRED' : 'ACTIVE / VALID'}
                    </Badge>
                    <span className="text-xs text-neutral-500">
                      Expiry Date: <code className="font-mono text-neutral-700 dark:text-neutral-300">{decodedJwt.expDateStr}</code>
                    </span>
                  </div>
                </div>
              </div>

              {/* Payload */}
              <div className="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Decoded Payload Claims
                  </span>
                  <button
                    onClick={() => copyToClipboard(decodedJwt.payload || '', 'Payload copied')}
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </button>
                </div>
                <pre className="font-mono text-xs bg-neutral-950 text-neutral-100 p-3 rounded-lg overflow-y-auto max-h-72">
                  {decodedJwt.payload}
                </pre>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-mono">
              {decodedJwt.error}
            </div>
          )}
        </div>
      )}

      {/* TOOL 4: URL ENCODER & QUERY PARSER */}
      {activeTool === 'url' && (
        <div className="space-y-4 max-w-3xl">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Input URL / Query String
            </label>
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="w-full p-2.5 font-mono text-xs rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setUrlOutput(encodeURI(urlInput))}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 cursor-pointer"
            >
              Encode URI
            </button>
            <button
              onClick={() => setUrlOutput(decodeURI(urlInput))}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 cursor-pointer"
            >
              Decode URI
            </button>
            <button
              onClick={() => setUrlOutput(encodeURIComponent(urlInput))}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 cursor-pointer"
            >
              Encode Component
            </button>
            <button
              onClick={() => setUrlOutput(decodeURIComponent(urlInput))}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 cursor-pointer"
            >
              Decode Component
            </button>
          </div>

          {urlOutput && (
            <div className="p-3 bg-neutral-950 text-neutral-100 rounded-xl font-mono text-xs flex items-center justify-between">
              <span className="truncate mr-2">{urlOutput}</span>
              <button
                onClick={() => copyToClipboard(urlOutput, 'URL copied')}
                className="text-blue-400 hover:underline shrink-0 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Query Params Breakdown */}
          {parsedQueryParams.valid && parsedQueryParams.params.length > 0 && (
            <div className="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-2">
              <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Parsed Query Parameters ({parsedQueryParams.params.length})
              </span>
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {parsedQueryParams.params.map((p, idx) => (
                  <div key={idx} className="py-2 flex items-center justify-between text-xs font-mono">
                    <span className="text-blue-600 dark:text-blue-400 font-semibold">{p.key}</span>
                    <span className="text-neutral-700 dark:text-neutral-300">{p.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TOOL 5: HASH GENERATOR & VERIFIER */}
      {activeTool === 'hash' && (
        <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 space-y-4 max-w-2xl">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Input String
            </label>
            <textarea
              rows={3}
              value={hashInput}
              onChange={(e) => setHashInput(e.target.value)}
              className="w-full p-3 font-mono text-xs rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100"
            />
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-neutral-600 dark:text-neutral-400">Algorithm:</span>
            {(['SHA-256', 'SHA-512', 'SHA-1'] as const).map((algo) => (
              <label key={algo} className="flex items-center gap-1.5 text-xs text-neutral-700 dark:text-neutral-300 cursor-pointer">
                <input
                  type="radio"
                  name="hashalgo"
                  checked={hashAlgorithm === algo}
                  onChange={() => setHashAlgorithm(algo)}
                />
                <span>{algo}</span>
              </label>
            ))}
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                Calculated Digest ({hashAlgorithm})
              </span>
              <button
                onClick={() => copyToClipboard(calculatedHash, 'Hash copied')}
                className="flex items-center gap-1 text-blue-600 hover:underline cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </button>
            </div>
            <div className="p-3 font-mono text-xs rounded-xl bg-neutral-950 text-neutral-100 border border-neutral-800 word-break-all select-all">
              {calculatedHash}
            </div>
          </div>

          {/* Verify Hash */}
          <div className="space-y-1 pt-2 border-t border-neutral-200 dark:border-neutral-800">
            <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Compare Against Expected Hash
            </label>
            <input
              type="text"
              value={verifyHash}
              onChange={(e) => setVerifyHash(e.target.value)}
              placeholder="Paste checksum to verify match..."
              className="w-full p-2.5 font-mono text-xs rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100"
            />
            {isHashMatch !== null && (
              <div className="pt-1">
                {isHashMatch ? (
                  <Badge variant="success" className="gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Exact Hash Match! Verified.</span>
                  </Badge>
                ) : (
                  <Badge variant="error" className="gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Hash Mismatch! Checksum does not match.</span>
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TOOL 6: REGEX TESTER */}
      {activeTool === 'regex' && (
        <div className="space-y-4 max-w-3xl">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Pattern (Regular Expression)
              </label>
              <div className="flex items-center gap-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-1.5">
                <span className="text-neutral-400 font-mono">/</span>
                <input
                  type="text"
                  value={regexPattern}
                  onChange={(e) => setRegexPattern(e.target.value)}
                  className="flex-1 font-mono text-xs bg-transparent border-0 focus:outline-hidden text-neutral-900 dark:text-neutral-100"
                />
                <span className="text-neutral-400 font-mono">/</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Flags
              </label>
              <input
                type="text"
                value={regexFlags}
                onChange={(e) => setRegexFlags(e.target.value)}
                placeholder="g, i, m, s"
                className="w-full px-3 py-2 font-mono text-xs rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Test String
            </label>
            <textarea
              rows={4}
              value={regexTestString}
              onChange={(e) => setRegexTestString(e.target.value)}
              className="w-full p-3 font-mono text-xs rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100"
            />
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                Matches Found ({regexResults.matches.length})
              </span>
            </div>

            {regexResults.valid ? (
              regexResults.matches.length > 0 ? (
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  {regexResults.matches.map((m, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-mono text-xs border border-emerald-200 dark:border-emerald-800"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-neutral-400">No matches found with this pattern.</p>
              )
            ) : (
              <div className="text-xs font-mono text-rose-500">{regexResults.error}</div>
            )}
          </div>
        </div>
      )}

      {/* TOOL 7: COLOR PALETTE */}
      {activeTool === 'color' && (
        <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 space-y-5 max-w-2xl">
          <div className="flex items-center gap-4">
            <input
              type="color"
              value={colorHex}
              onChange={(e) => setColorHex(e.target.value)}
              className="w-14 h-14 rounded-xl cursor-pointer border-0 p-0"
            />
            <div className="space-y-1">
              <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Selected Color
              </span>
              <input
                type="text"
                value={colorHex}
                onChange={(e) => setColorHex(e.target.value)}
                className="px-3 py-1.5 font-mono text-xs rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-1">
              <span className="text-[10px] text-neutral-400 font-medium">HEX</span>
              <div className="flex items-center justify-between text-xs font-mono">
                <span>{colorHex.toUpperCase()}</span>
                <button
                  onClick={() => copyToClipboard(colorHex.toUpperCase(), 'HEX copied')}
                  className="text-neutral-400 hover:text-neutral-600 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-1">
              <span className="text-[10px] text-neutral-400 font-medium">RGB</span>
              <div className="flex items-center justify-between text-xs font-mono">
                <span>{rgbValues.str}</span>
                <button
                  onClick={() => copyToClipboard(rgbValues.str, 'RGB copied')}
                  className="text-neutral-400 hover:text-neutral-600 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-1">
              <span className="text-[10px] text-neutral-400 font-medium">HSL</span>
              <div className="flex items-center justify-between text-xs font-mono">
                <span>{hslValues.str}</span>
                <button
                  onClick={() => copyToClipboard(hslValues.str, 'HSL copied')}
                  className="text-neutral-400 hover:text-neutral-600 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TOOL 8: TIMESTAMP & EPOCH */}
      {activeTool === 'epoch' && (
        <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 space-y-5 max-w-2xl">
          {/* Live current epoch */}
          <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-900/50 flex items-center justify-between">
            <div>
              <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                Current Unix Epoch (Seconds)
              </span>
              <div className="text-2xl font-mono font-bold text-blue-900 dark:text-blue-100">
                {currentEpoch}
              </div>
            </div>
            <button
              onClick={() => copyToClipboard(String(currentEpoch), 'Current epoch copied')}
              className="p-2 rounded-lg bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300 shadow-xs hover:bg-neutral-100 cursor-pointer"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>

          {/* Epoch to Date */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Convert Epoch to Date
            </label>
            <input
              type="text"
              value={epochInput}
              onChange={(e) => setEpochInput(e.target.value)}
              className="w-full p-2.5 font-mono text-xs rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100"
            />

            {epochOutput && (
              <div className="p-3 rounded-xl bg-neutral-950 text-neutral-100 font-mono text-xs space-y-1.5">
                <div><span className="text-neutral-400">Local: </span>{epochOutput.local}</div>
                <div><span className="text-neutral-400">UTC: </span>{epochOutput.utc}</div>
                <div><span className="text-neutral-400">Relative: </span>{epochOutput.relative}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

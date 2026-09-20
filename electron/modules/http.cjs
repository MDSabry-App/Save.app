// Native HTTP layer for the API Testing Console AND for workspace sync
// (the renderer's /api/* calls run through this transport in desktop mode, so
// cross-origin requests to the deployed API work without CORS restrictions).
// Request/response shapes mirror the renderer's ApiTestConfig / ApiTestResponse
// types (src/types/index.ts).
const { net } = require('electron');

// Response cap fed back to the UI. Large enough for a full encrypted workspace
// blob (the server accepts up to ~3 MB of ciphertext).
const MAX_BODY_BYTES = 8 * 1024 * 1024;
// Request cap: an encrypted workspace blob is base64 ciphertext, so allow more
// than the plaintext size. Below the server's own body limit.
const MAX_REQUEST_BODY_BYTES = 4 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 10000;
const MAX_TIMEOUT_MS = 120000;
const ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

function validateConfig(config) {
  if (!config || typeof config !== 'object') {
    throw new Error('Invalid request configuration.');
  }
  const { method, endpoint, headers, body, timeoutMs } = config;

  if (typeof endpoint !== 'string' || !/^https?:\/\//i.test(endpoint)) {
    throw new Error('Endpoint must be a valid http(s) URL.');
  }
  if (!ALLOWED_METHODS.includes(method)) {
    throw new Error(`Unsupported HTTP method: ${method}`);
  }
  if (headers !== undefined && !Array.isArray(headers)) {
    throw new Error('Headers must be an array of {key, value} pairs.');
  }
  if (body !== undefined && typeof body !== 'string') {
    throw new Error('Request body must be a string.');
  }
  if (body && body.length > MAX_REQUEST_BODY_BYTES) {
    throw new Error('Request body exceeds 1 MB.');
  }

  let resolvedTimeout = DEFAULT_TIMEOUT_MS;
  if (timeoutMs !== undefined) {
    if (!Number.isFinite(timeoutMs) || timeoutMs < 1000 || timeoutMs > MAX_TIMEOUT_MS) {
      throw new Error(`timeoutMs must be between 1000 and ${MAX_TIMEOUT_MS}.`);
    }
    resolvedTimeout = timeoutMs;
  }

  return { method, endpoint, headers: headers || [], body: body || '', timeoutMs: resolvedTimeout };
}

function sendNativeRequest(config) {
  return new Promise((resolve) => {
    const started = Date.now();

    let validated;
    try {
      validated = validateConfig(config);
    } catch (err) {
      resolve({
        status: 400,
        statusText: 'Invalid Request Config',
        timeMs: 0,
        headers: {},
        body: '',
        isJson: false,
        error: err instanceof Error ? err.message : 'Invalid request configuration.',
      });
      return;
    }

    const { method, endpoint, headers, body, timeoutMs } = validated;

    const respond = (partial) => {
      resolve({
        status: 0,
        statusText: 'Network Error',
        timeMs: Math.max(1, Date.now() - started),
        headers: {},
        body: '',
        isJson: false,
        ...partial,
      });
    };

    let request;
    try {
      request = net.request({
        method,
        url: endpoint,
        // Bypass the renderer session cache/cookies: each API test is a clean,
        // direct request (and credentials never touch the app session).
        useSessionCookies: false,
      });
    } catch (err) {
      respond({ error: err instanceof Error ? err.message : 'Failed to create request.' });
      return;
    }

    let settled = false;
    const finish = (payload) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutTimer);
      resolve(payload);
    };

    const timeoutTimer = setTimeout(() => {
      try {
        request.abort();
      } catch {
        // Already aborted/completed.
      }
      finish({
        status: 408,
        statusText: 'Request Timeout',
        timeMs: Math.max(1, Date.now() - started),
        error: `Request timed out after ${timeoutMs} ms.`,
      });
    }, timeoutMs);

    request.on('response', (response) => {
      const chunks = [];
      let totalBytes = 0;
      let truncated = false;

      response.on('data', (chunk) => {
        totalBytes += chunk.length;
        if (totalBytes <= MAX_BODY_BYTES) {
          chunks.push(chunk);
        } else {
          truncated = true;
        }
      });

      response.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        const respHeaders = {};
        for (const [key, value] of Object.entries(response.headers || {})) {
          respHeaders[key] = Array.isArray(value) ? value.join(', ') : String(value);
        }

        let isJson = false;
        try {
          JSON.parse(text);
          isJson = true;
        } catch {
          isJson = false;
        }

        finish({
          status: response.statusCode || 0,
          statusText:
            response.statusMessage ||
            (response.statusCode === 200 ? 'OK' : 'Response Received'),
          timeMs: Math.max(1, Date.now() - started),
          headers: respHeaders,
          body: truncated ? text + '\n\n[Truncated at 2 MB]' : text,
          isJson,
        });
      });

      response.on('error', (err) => {
        finish({
          statusText: 'Network Error',
          error: err instanceof Error ? err.message : 'Response stream error.',
        });
      });
    });

    request.on('error', (err) => {
      finish({
        statusText: 'Network Error',
        error: err instanceof Error ? err.message : 'Request failed.',
      });
    });

    for (const header of headers) {
      if (header && typeof header.key === 'string' && typeof header.value === 'string' && header.key.trim()) {
        try {
          request.setHeader(header.key.trim(), header.value);
        } catch {
          // Skip malformed header names instead of failing the whole request.
        }
      }
    }

    if (['POST', 'PUT', 'PATCH'].includes(method) && body) {
      request.write(body, 'utf8');
    }
    request.end();
  });
}

function registerHttpHandlers(ipcMain) {
  ipcMain.handle('http:request', async (_event, config) => {
    try {
      return await sendNativeRequest(config);
    } catch (err) {
      return {
        status: 500,
        statusText: 'Electron Native Request Error',
        timeMs: 0,
        headers: {},
        body: '',
        isJson: false,
        error: err instanceof Error ? err.message : 'Unknown native request error.',
      };
    }
  });
}

module.exports = { registerHttpHandlers, sendNativeRequest };

import { ApiTestConfig, ApiTestResponse } from '../types';
import { IClipboardAdapter, IFileSystemAdapter, IHttpAdapter, INotificationAdapter } from './types';

export class BrowserHttpAdapter implements IHttpAdapter {
  async sendRequest(config: ApiTestConfig): Promise<ApiTestResponse> {
    const startTime = performance.now();
    const headersObj: Record<string, string> = {};
    for (const h of config.headers) {
      if (h.key.trim()) {
        headersObj[h.key.trim()] = h.value;
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs || 10000);

    try {
      const fetchOptions: RequestInit = {
        method: config.method,
        headers: headersObj,
        signal: controller.signal,
      };

      if (['POST', 'PUT', 'PATCH'].includes(config.method) && config.body.trim()) {
        fetchOptions.body = config.body;
      }

      const res = await fetch(config.endpoint, fetchOptions);
      clearTimeout(timeoutId);
      const timeMs = Math.round(performance.now() - startTime);

      const respHeaders: Record<string, string> = {};
      res.headers.forEach((val, key) => {
        respHeaders[key] = val;
      });

      const text = await res.text();
      let isJson = false;
      try {
        JSON.parse(text);
        isJson = true;
      } catch {
        isJson = false;
      }

      return {
        status: res.status,
        statusText: res.statusText || (res.status === 200 ? 'OK' : 'Response Received'),
        timeMs,
        headers: respHeaders,
        body: text,
        isJson,
      };
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const timeMs = Math.round(performance.now() - startTime);
      const isAbort = err instanceof Error && err.name === 'AbortError';
      const isCorsError =
        err instanceof TypeError &&
        (err.message.includes('Failed to fetch') || err.message.includes('NetworkError'));

      return {
        status: isAbort ? 408 : isCorsError ? 0 : 500,
        statusText: isAbort ? 'Request Timeout' : isCorsError ? 'CORS Restricted' : 'Network Error',
        timeMs,
        headers: {},
        body: isCorsError
          ? `[Browser CORS Limitation]\nThe target endpoint blocked this in-browser cross-origin request. In DevDesk desktop mode (Electron), requests are sent through the native background HTTP layer without CORS restrictions.`
          : err instanceof Error
            ? err.message
            : 'Unknown request error',
        isJson: false,
        corsBlocked: isCorsError,
        error: err instanceof Error ? err.message : 'Request failed',
      };
    }
  }
}

export class BrowserClipboardAdapter implements IClipboardAdapter {
  async readText(): Promise<string> {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        return await navigator.clipboard.readText();
      }
    } catch {
      // Fallback
    }
    return '';
  }

  async writeText(text: string): Promise<boolean> {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      return success;
    } catch {
      return false;
    }
  }
}

export class BrowserFileSystemAdapter implements IFileSystemAdapter {
  async saveFile(filename: string, content: string, mimeType = 'application/json'): Promise<boolean> {
    try {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return true;
    } catch {
      return false;
    }
  }

  async openFile(accept = '.json'): Promise<{ filename: string; content: string } | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept;
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) {
          resolve(null);
          return;
        }
        try {
          const content = await file.text();
          resolve({ filename: file.name, content });
        } catch {
          resolve(null);
        }
      };
      input.click();
    });
  }
}

export class BrowserNotificationAdapter implements INotificationAdapter {
  sendNotification(title: string, options?: { body?: string; icon?: string }): void {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      new Notification(title, options);
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then((perm) => {
        if (perm === 'granted') {
          new Notification(title, options);
        }
      });
    }
  }
}

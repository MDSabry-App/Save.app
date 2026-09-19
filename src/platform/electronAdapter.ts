import { ApiTestConfig, ApiTestResponse } from '../types';
import { IClipboardAdapter, IFileSystemAdapter, IHttpAdapter, INotificationAdapter } from './types';
import { BrowserClipboardAdapter, BrowserFileSystemAdapter, BrowserHttpAdapter, BrowserNotificationAdapter } from './browserAdapter';

export class ElectronHttpAdapter implements IHttpAdapter {
  private fallback = new BrowserHttpAdapter();

  async sendRequest(config: ApiTestConfig): Promise<ApiTestResponse> {
    if (window.desktopAPI?.http?.request) {
      try {
        return await window.desktopAPI.http.request(config);
      } catch (err: unknown) {
        return {
          status: 500,
          statusText: 'Electron Native Request Error',
          timeMs: 0,
          headers: {},
          body: err instanceof Error ? err.message : 'Electron IPC error',
          isJson: false,
          error: err instanceof Error ? err.message : 'Unknown IPC error',
        };
      }
    }
    return this.fallback.sendRequest(config);
  }
}

export class ElectronClipboardAdapter implements IClipboardAdapter {
  private fallback = new BrowserClipboardAdapter();

  async readText(): Promise<string> {
    if (window.desktopAPI?.clipboard?.readText) {
      return await window.desktopAPI.clipboard.readText();
    }
    return this.fallback.readText();
  }

  async writeText(text: string): Promise<boolean> {
    if (window.desktopAPI?.clipboard?.writeText) {
      return await window.desktopAPI.clipboard.writeText(text);
    }
    return this.fallback.writeText(text);
  }
}

export class ElectronFileSystemAdapter implements IFileSystemAdapter {
  private fallback = new BrowserFileSystemAdapter();

  async saveFile(filename: string, content: string, mimeType = 'application/json'): Promise<boolean> {
    if (window.desktopAPI?.fs?.saveFile) {
      return await window.desktopAPI.fs.saveFile(filename, content, mimeType);
    }
    return this.fallback.saveFile(filename, content, mimeType);
  }

  async openFile(accept = '.json'): Promise<{ filename: string; content: string } | null> {
    if (window.desktopAPI?.fs?.openFile) {
      return await window.desktopAPI.fs.openFile(accept);
    }
    return this.fallback.openFile(accept);
  }
}

export class ElectronNotificationAdapter implements INotificationAdapter {
  private fallback = new BrowserNotificationAdapter();

  sendNotification(title: string, options?: { body?: string; icon?: string }): void {
    if (window.desktopAPI?.notifications?.send) {
      window.desktopAPI.notifications.send(title, options);
    } else {
      this.fallback.sendNotification(title, options);
    }
  }
}

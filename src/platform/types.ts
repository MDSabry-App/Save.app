import { ApiTestConfig, ApiTestResponse } from '../types';

export interface PlatformInfo {
  isElectron: boolean;
  isDesktop: boolean;
  platform: 'browser' | 'electron-win32' | 'electron-darwin' | 'electron-linux';
  version: string;
}

export interface IHttpAdapter {
  sendRequest(config: ApiTestConfig): Promise<ApiTestResponse>;
}

export interface IClipboardAdapter {
  readText(): Promise<string>;
  writeText(text: string): Promise<boolean>;
}

export interface IFileSystemAdapter {
  saveFile(filename: string, content: string, mimeType?: string): Promise<boolean>;
  openFile(accept?: string): Promise<{ filename: string; content: string } | null>;
}

export interface INotificationAdapter {
  sendNotification(title: string, options?: { body?: string; icon?: string }): void;
}

export interface IPlatform {
  info: PlatformInfo;
  http: IHttpAdapter;
  clipboard: IClipboardAdapter;
  fileSystem: IFileSystemAdapter;
  notification: INotificationAdapter;
}

// Window typing for Electron bridge
declare global {
  interface Window {
    desktopAPI?: {
      isElectron: boolean;
      platform: string;
      version: string;
      http: {
        request: (config: ApiTestConfig) => Promise<ApiTestResponse>;
      };
      clipboard: {
        readText: () => Promise<string>;
        writeText: (text: string) => Promise<boolean>;
      };
      fs: {
        saveFile: (filename: string, content: string, mimeType?: string) => Promise<boolean>;
        openFile: (accept?: string) => Promise<{ filename: string; content: string } | null>;
      };
      notifications: {
        send: (title: string, options?: { body?: string }) => Promise<boolean>;
      };
      window: {
        minimize: () => void;
        maximize: () => void;
        close: () => void;
      };
      app?: {
        getInfo: () => Promise<{
          version: string;
          electron: string;
          chrome: string;
          node: string;
          platform: string;
          userDataPath: string;
        }>;
        openExternal: (url: string) => Promise<boolean>;
      };
    };
  }
}

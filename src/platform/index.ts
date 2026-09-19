import { IPlatform, PlatformInfo } from './types';
import {
  BrowserClipboardAdapter,
  BrowserFileSystemAdapter,
  BrowserHttpAdapter,
  BrowserNotificationAdapter,
} from './browserAdapter';
import {
  ElectronClipboardAdapter,
  ElectronFileSystemAdapter,
  ElectronHttpAdapter,
  ElectronNotificationAdapter,
} from './electronAdapter';

export function detectPlatform(): PlatformInfo {
  const isElectron = Boolean(window.desktopAPI?.isElectron);
  const platform = window.desktopAPI?.platform as PlatformInfo['platform'] || 'browser';
  return {
    isElectron,
    isDesktop: isElectron,
    platform,
    version: window.desktopAPI?.version || '1.0.0',
  };
}

export function createPlatform(): IPlatform {
  const info = detectPlatform();

  if (info.isElectron) {
    return {
      info,
      http: new ElectronHttpAdapter(),
      clipboard: new ElectronClipboardAdapter(),
      fileSystem: new ElectronFileSystemAdapter(),
      notification: new ElectronNotificationAdapter(),
    };
  }

  return {
    info,
    http: new BrowserHttpAdapter(),
    clipboard: new BrowserClipboardAdapter(),
    fileSystem: new BrowserFileSystemAdapter(),
    notification: new BrowserNotificationAdapter(),
  };
}

export const platform = createPlatform();
export * from './types';

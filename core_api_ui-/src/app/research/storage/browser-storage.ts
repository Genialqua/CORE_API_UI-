import { InjectionToken } from '@angular/core';

/** Minimal key/value storage, injectable so services can be tested without real localStorage. */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class MemoryStorage implements KeyValueStorage {
  private readonly data = new Map<string, string>();
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
}

function resolveBrowserStorage(): KeyValueStorage {
  try {
    if (typeof localStorage !== 'undefined') {
      const probe = '__re_probe__';
      localStorage.setItem(probe, probe);
      localStorage.removeItem(probe);
      return localStorage;
    }
  } catch {
    // Storage can be unavailable (private mode, disabled cookies); fall back to memory.
  }
  return new MemoryStorage();
}

export const BROWSER_STORAGE = new InjectionToken<KeyValueStorage>('BROWSER_STORAGE', {
  providedIn: 'root',
  factory: resolveBrowserStorage,
});

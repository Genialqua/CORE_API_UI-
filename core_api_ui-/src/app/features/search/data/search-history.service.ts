import { Injectable, computed, inject, signal } from '@angular/core';
import { SearchParams } from '../../../research/models/paper.model';
import { BROWSER_STORAGE } from '../../../research/storage/browser-storage';

export interface HistoryEntry {
  query: string;
  yearFrom: number | null;
  yearTo: number | null;
  totalHits: number | null;
  searchedAt: number;
}

export interface SavedSearch {
  id: string;
  query: string;
  yearFrom: number | null;
  yearTo: number | null;
  sort: SearchParams['sort'];
  pageSize: number;
  savedAt: number;
}

const HISTORY_KEY = 'research-explorer:history';
const SAVED_KEY = 'research-explorer:saved';
export const MAX_HISTORY = 10;
export const MAX_SAVED = 25;

function sameSearch(a: { query: string; yearFrom: number | null; yearTo: number | null }, b: typeof a): boolean {
  return a.query.trim().toLowerCase() === b.query.trim().toLowerCase() && a.yearFrom === b.yearFrom && a.yearTo === b.yearTo;
}

/** Persists recent and saved searches locally (no account is required for this tool). */
@Injectable({ providedIn: 'root' })
export class SearchHistoryService {
  private readonly storage = inject(BROWSER_STORAGE);

  private readonly historyState = signal<HistoryEntry[]>(this.read<HistoryEntry>(HISTORY_KEY));
  private readonly savedState = signal<SavedSearch[]>(this.read<SavedSearch>(SAVED_KEY));

  readonly history = this.historyState.asReadonly();
  readonly saved = this.savedState.asReadonly();
  readonly hasAny = computed(() => this.historyState().length > 0 || this.savedState().length > 0);

  record(params: SearchParams, totalHits: number | null): void {
    const entry: HistoryEntry = {
      query: params.query.trim(),
      yearFrom: params.yearFrom,
      yearTo: params.yearTo,
      totalHits,
      searchedAt: Date.now(),
    };
    this.historyState.update((list) => [entry, ...list.filter((item) => !sameSearch(item, entry))].slice(0, MAX_HISTORY));
    this.write(HISTORY_KEY, this.historyState());
  }

  clearHistory(): void {
    this.historyState.set([]);
    this.write(HISTORY_KEY, []);
  }

  isSaved(params: Pick<SearchParams, 'query' | 'yearFrom' | 'yearTo'>): boolean {
    return this.savedState().some((item) => sameSearch(item, params));
  }

  /** Saves the search, or removes it when already saved. Returns the new saved state. */
  toggleSaved(params: SearchParams): boolean {
    if (this.isSaved(params)) {
      this.savedState.update((list) => list.filter((item) => !sameSearch(item, params)));
      this.write(SAVED_KEY, this.savedState());
      return false;
    }
    const saved: SavedSearch = {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      query: params.query.trim(),
      yearFrom: params.yearFrom,
      yearTo: params.yearTo,
      sort: params.sort,
      pageSize: params.pageSize,
      savedAt: Date.now(),
    };
    this.savedState.update((list) => [saved, ...list].slice(0, MAX_SAVED));
    this.write(SAVED_KEY, this.savedState());
    return true;
  }

  removeSaved(id: string): void {
    this.savedState.update((list) => list.filter((item) => item.id !== id));
    this.write(SAVED_KEY, this.savedState());
  }

  private read<T>(key: string): T[] {
    try {
      const parsed: unknown = JSON.parse(this.storage.getItem(key) ?? '[]');
      return Array.isArray(parsed) ? (parsed.filter((item) => item && typeof item.query === 'string') as T[]) : [];
    } catch {
      return [];
    }
  }

  private write(key: string, value: unknown): void {
    try {
      this.storage.setItem(key, JSON.stringify(value));
    } catch {
      // Quota exceeded or storage disabled: keep in-memory state only.
    }
  }
}

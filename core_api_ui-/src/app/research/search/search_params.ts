
import { Params } from '@angular/router';
import { SearchParams, SortOption } from '../models/paper.model';

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 10;
export const MIN_YEAR = 1900;
export const MAX_RESULT_WINDOW = 10_000;

export const SORT_OPTIONS: ReadonlyArray<{
  value: SortOption;
  label: string;
}> = [
  { value: 'relevance', label: 'Most relevant' },
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
];

const DEFAULT_SORT: SortOption = 'relevance';

const isSortOption = (value: unknown): value is SortOption =>
  SORT_OPTIONS.some(({ value: option }) => option === value);

export function maxYear(now: Date = new Date()): number {
  return now.getFullYear() + 1;
}

/**
 * Returns a supported page size.
 * Invalid values fall back to the default.
 * Unsupported values are normalized to the nearest option.
 */
export function normalizePageSize(value: unknown): number {
  const requestedSize = Number(value);

  if (!Number.isFinite(requestedSize) || requestedSize <= 0) {
    return DEFAULT_PAGE_SIZE;
  }

  return PAGE_SIZE_OPTIONS.reduce((closest, option) =>
    Math.abs(option - requestedSize) < Math.abs(closest - requestedSize)
      ? option
      : closest
  );
}

/**
 * Validates a publication year.
 * Returns null when the value is missing or outside the supported range.
 */
export function normalizeYear(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const year = Number(value);

  if (!Number.isInteger(year) || year < MIN_YEAR || year > maxYear()) {
    return null;
  }

  return year;
}

function normalizeSort(value: unknown): SortOption {
  return isSortOption(value) ? value : DEFAULT_SORT;
}

function normalizePage(value: unknown): number {
  const page = Number(value);

  return Number.isSafeInteger(page) && page >= 1 ? page : 1;
}

/**
 * Calculates the last page available within the API result window.
 */
export function maxReachablePage(
  totalHits: number,
  pageSize: number,
  maxResultWindow: number = MAX_RESULT_WINDOW
): number {
  const safeTotalHits = Number.isFinite(totalHits)
    ? Math.max(0, totalHits)
    : 0;

  const safePageSize = Number.isInteger(pageSize) && pageSize > 0
    ? pageSize
    : DEFAULT_PAGE_SIZE;

  const safeResultWindow = Number.isFinite(maxResultWindow)
    ? Math.max(0, maxResultWindow)
    : MAX_RESULT_WINDOW;

  const reachableHits = Math.min(safeTotalHits, safeResultWindow);

  return Math.max(1, Math.ceil(reachableHits / safePageSize));
}

/**
 * Converts URL query parameters into validated search parameters.
 */
export function paramsFromQueryParams(
  queryParams: Params
): SearchParams | null {
  const query =
    typeof queryParams['q'] === 'string'
      ? queryParams['q'].trim()
      : '';

  if (!query) {
    return null;
  }

  let yearFrom = normalizeYear(queryParams['from']);
  let yearTo = normalizeYear(queryParams['to']);

  if (yearFrom !== null && yearTo !== null && yearFrom > yearTo) {
    [yearFrom, yearTo] = [yearTo, yearFrom];
  }

  return {
    query,
    page: normalizePage(queryParams['page']),
    pageSize: normalizePageSize(queryParams['size']),
    sort: normalizeSort(queryParams['sort']),
    yearFrom,
    yearTo,
  };
}

/**
 * Converts search parameters into URL query parameters.
 * Default values are omitted to keep URLs concise.
 */
export function toQueryParams(params: SearchParams): Params {
  return {
    q: params.query,
    page: params.page > 1 ? params.page : null,
    size: params.pageSize !== DEFAULT_PAGE_SIZE
      ? params.pageSize
      : null,
    sort: params.sort !== DEFAULT_SORT ? params.sort : null,
    from: params.yearFrom,
    to: params.yearTo,
  };
}

/**
 * Compares two search parameter objects.
 */
export function sameSearchParams(
  a: SearchParams | null,
  b: SearchParams | null
): boolean {
  if (a === b) {
    return true;
  }

  if (!a || !b) {
    return false;
  }

  return (
    a.query === b.query &&
    a.page === b.page &&
    a.pageSize === b.pageSize &&
    a.sort === b.sort &&
    a.yearFrom === b.yearFrom &&
    a.yearTo === b.yearTo
  );
}

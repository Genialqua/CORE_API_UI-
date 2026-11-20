import {
  HttpClient,
  HttpHeaders,
  HttpParams,
} from '@angular/common/http';

import {
  Injectable,
  inject,
} from '@angular/core';

import {
  Observable,
  catchError,
  finalize,
  map,
  of,
  retry,
  shareReplay,
  throwError,
  timer,
} from 'rxjs';

import {
  CoreAggregateResponseDto,
  CoreSearchResponseDto,
} from '../models/research-api.types';

import {
  AggregationField,
  Aggregations,
  SearchParams,
  SearchResult,
  SortOption,
} from '../models/paper.model';

import {
  buildCoreQuery,
  validateQuery,
} from '../search/query-parser';

import {
  normalizePageSize,
} from '../search/search_params';

import {
  ApiError,
  isRetryable,
  toApiError,
} from './api-error';

import {
  CORE_API_CONFIG,
} from './research-api.config';

import {
  mapCoreWork,
} from './research-work.mapper';

import {
  ResponseCache,
} from './response-cache';

const SORT_PARAM: Record<SortOption, string | null> = {
  relevance: null,
  newest: 'yearPublished:desc',
  oldest: 'yearPublished:asc',
};

@Injectable({
  providedIn: 'root',
})
export class CoreApiService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(CORE_API_CONFIG);

  private readonly searchCache =
    new ResponseCache<SearchResult>();

  private readonly aggregateCache =
    new ResponseCache<Aggregations>();

  private readonly inFlight =
    new Map<string, Observable<unknown>>();

  /**
   * CORE authentication headers.
   */
  private get headers(): HttpHeaders {
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    if (this.config.apiKey.trim()) {
      headers['Authorization'] =
        `Bearer ${this.config.apiKey.trim()}`;
    }

    return new HttpHeaders(headers);
  }

  /**
   * Validates and builds the CORE query.
   */
  resolveCoreQuery(
    params: Pick<
      SearchParams,
      'query' | 'yearFrom' | 'yearTo'
    >,
  ): string {
    const validation = validateQuery(params.query);

    if (!validation.valid) {
      const error: ApiError = {
        kind: 'bad-request',
        message:
          validation.errors[0]?.message ??
          'Invalid query.',
        status: null,
        retryAfterSeconds: null,
      };

      throw error;
    }

    return buildCoreQuery(
      validation.normalized,
      params,
    );
  }

  /**
   * Searches CORE works.
   */
  searchWorks(
    params: SearchParams,
  ): Observable<SearchResult> {
    let coreQuery: string;

    try {
      coreQuery = this.resolveCoreQuery(params);
    } catch (error) {
      return throwError(() => error);
    }

    const pageSize = Math.min(
      normalizePageSize(params.pageSize),
      this.config.maxPageSize,
    );

    const maxPage = Math.max(
      1,
      Math.floor(
        this.config.maxResultWindow / pageSize,
      ),
    );

    const page = Math.min(
      Math.max(1, params.page),
      maxPage,
    );

    const offset = (page - 1) * pageSize;
    const sort = SORT_PARAM[params.sort];

    let httpParams = new HttpParams()
      .set('q', coreQuery)
      .set('limit', pageSize)
      .set('offset', offset);

    if (sort) {
      httpParams = httpParams.set('sort', sort);
    }

    const cacheKey =
      `search|${httpParams.toString()}`;

    const cached = this.searchCache.get(cacheKey);

    if (cached) {
      return of(cached);
    }

    return this.dedupe(cacheKey, () =>
      this.http
        .get<CoreSearchResponseDto>(
          `${this.config.baseUrl}/search/works/`,
          {
            headers: this.headers,
            params: httpParams,
          },
        )
        .pipe(
          this.withResilience(),

          map((response): SearchResult => ({
            coreQuery,

            totalHits: Math.max(
              0,
              response?.totalHits ?? 0,
            ),

            page,
            pageSize,

            papers: (
              response?.results ?? []
            ).map(mapCoreWork),
          })),

          map((result) => {
            this.searchCache.set(
              cacheKey,
              result,
            );

            return result;
          }),
        ),
    );
  }

  /**
   * Requests aggregations from CORE.
   *
   * NOTE:
   * The existing /search/works/aggregate route
   * has not been verified against the official
   * CORE API documentation. This request may
   * return 404 until a supported endpoint is
   * confirmed.
   */
  aggregateWorks(
    params: Pick<
      SearchParams,
      'query' | 'yearFrom' | 'yearTo'
    >,
    fields: AggregationField[],
  ): Observable<Aggregations> {
    let coreQuery: string;

    try {
      coreQuery = this.resolveCoreQuery(params);
    } catch (error) {
      return throwError(() => error);
    }

    const sortedFields = [
      ...new Set(fields),
    ].sort();

    const cacheKey =
      `aggregate|${coreQuery}|${sortedFields.join(',')}`;

    const cached =
      this.aggregateCache.get(cacheKey);

    if (cached) {
      return of(cached);
    }

    return this.dedupe(cacheKey, () =>
      this.http
        .post<CoreAggregateResponseDto>(
          `${this.config.baseUrl}/search/works/aggregate`,
          {
            q: coreQuery,
            aggregations: sortedFields,
          },
          {
            headers: this.headers,
          },
        )
        .pipe(
          this.withResilience(),

          map((response) => {
            const aggregations: Aggregations = {};

            for (const field of sortedFields) {
              aggregations[field] =
                response?.aggregations?.[field] ?? {};
            }

            this.aggregateCache.set(
              cacheKey,
              aggregations,
            );

            return aggregations;
          }),
        ),
    );
  }

  /**
   * Clears cached search and aggregation results.
   */
  clearCache(): void {
    this.searchCache.clear();
    this.aggregateCache.clear();
  }

  /**
   * Handles API errors and retries transient failures.
   */
  private withResilience<T>() {
    return (source: Observable<T>) =>
      source.pipe(
        catchError((error) =>
          throwError(() => toApiError(error)),
        ),

        retry({
          count: this.config.retryCount,

          delay: (
            error: ApiError,
            attempt,
          ) =>
            isRetryable(error)
              ? timer(
                  this.config.retryDelayMs * attempt,
                )
              : throwError(() => error),
        }),
      );
  }

  /**
   * Prevents duplicate simultaneous requests.
   */
  private dedupe<T>(
    key: string,
    factory: () => Observable<T>,
  ): Observable<T> {
    const existing =
      this.inFlight.get(key) as
        | Observable<T>
        | undefined;

    if (existing) {
      return existing;
    }

    const shared = factory().pipe(
      finalize(() => {
        this.inFlight.delete(key);
      }),

      shareReplay({
        bufferSize: 1,
        refCount: true,
      }),
    );

    this.inFlight.set(key, shared);

    return shared;
  }
}
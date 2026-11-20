import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, distinctUntilChanged, map, of, switchMap, tap } from 'rxjs';
import { ApiError, toApiError } from '../../../research/api/api-error';
import { CORE_API_CONFIG } from '../../../research/api/research-api.config';
import { CoreApiService } from '../../../research/api/research-api.service';
import { AggregationField, Aggregations, SearchParams, SearchResult } from '../../../research/models/paper.model';
import { maxReachablePage, sameSearchParams } from '../../../research/search/search_params';
import { SearchHistoryService } from '../../search/data/search-history.service';

export type LoadStatus = 'idle' | 'loading' | 'success' | 'error';

export const ANALYTICS_FIELDS: AggregationField[] = ['yearPublished', 'publisher', 'documentType'];

interface LoadRequest {
  params: SearchParams;
  /** Incremented by retry() so an identical request bypasses de-duplication. */
  attempt: number;
}

/**
 * Feature state for search + analytics, exposed as read-only signals.
 * Requests flow through RxJS so that:
 * - identical consecutive requests are dropped (distinctUntilChanged)
 * - a newer request cancels a slower in-flight one (switchMap), preventing stale results
 * - analytics are only re-fetched when the query or year filters change, not on paging/sorting
 */
@Injectable()
export class SearchStore {
  private readonly api = inject(CoreApiService);
  private readonly history = inject(SearchHistoryService);
  private readonly config = inject(CORE_API_CONFIG);

  private readonly paramsState = signal<SearchParams | null>(null);
  private readonly statusState = signal<LoadStatus>('idle');
  private readonly resultState = signal<SearchResult | null>(null);
  private readonly errorState = signal<ApiError | null>(null);
  private readonly analyticsStatusState = signal<LoadStatus>('idle');
  private readonly aggregationsState = signal<Aggregations | null>(null);
  private readonly analyticsErrorState = signal<ApiError | null>(null);

  readonly params = this.paramsState.asReadonly();
  readonly status = this.statusState.asReadonly();
  readonly result = this.resultState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly analyticsStatus = this.analyticsStatusState.asReadonly();
  readonly aggregations = this.aggregationsState.asReadonly();
  readonly analyticsError = this.analyticsErrorState.asReadonly();

  readonly papers = computed(() => this.resultState()?.papers ?? []);
  readonly totalHits = computed(() => this.resultState()?.totalHits ?? 0);
  readonly isLoading = computed(() => this.statusState() === 'loading');
  readonly isEmpty = computed(() => this.statusState() === 'success' && this.papers().length === 0);
  readonly totalPages = computed(() => {
    const result = this.resultState();
    return result ? maxReachablePage(result.totalHits, result.pageSize, this.config.maxResultWindow) : 0;
  });
  /** True when CORE has more matches than can be paged through (Elasticsearch result window). */
  readonly isTruncated = computed(() => this.totalHits() > this.config.maxResultWindow);
  readonly rangeStart = computed(() => {
    const result = this.resultState();
    return result && result.papers.length > 0 ? (result.page - 1) * result.pageSize + 1 : 0;
  });
  readonly rangeEnd = computed(() => {
    const result = this.resultState();
    return result ? (result.page - 1) * result.pageSize + result.papers.length : 0;
  });

  private readonly searchRequests = new Subject<LoadRequest>();
  private readonly analyticsRequests = new Subject<LoadRequest>();
  private attempt = 0;

  constructor() {
    const destroyRef = inject(DestroyRef);

    this.searchRequests
      .pipe(
        distinctUntilChanged((a, b) => a.attempt === b.attempt && sameSearchParams(a.params, b.params)),
        tap(({ params }) => {
          this.paramsState.set(params);
          this.statusState.set('loading');
          this.errorState.set(null);
        }),
        switchMap(({ params }) =>
          this.api.searchWorks(params).pipe(
            map((result) => ({ params, result, error: null as ApiError | null })),
            catchError((error: unknown) => of({ params, result: null, error: toApiError(error) })),
          ),
        ),
        takeUntilDestroyed(destroyRef),
      )
      .subscribe(({ params, result, error }) => {
        if (error) {
          this.resultState.set(null);
          this.errorState.set(error);
          this.statusState.set('error');
          return;
        }
        this.resultState.set(result);
        this.statusState.set('success');
        if (params.page === 1) this.history.record(params, result?.totalHits ?? null);
      });

    this.analyticsRequests
      .pipe(
        distinctUntilChanged(
          (a, b) =>
            a.attempt === b.attempt &&
            a.params.query === b.params.query &&
            a.params.yearFrom === b.params.yearFrom &&
            a.params.yearTo === b.params.yearTo,
        ),
        tap(() => {
          this.analyticsStatusState.set('loading');
          this.analyticsErrorState.set(null);
        }),
        switchMap(({ params }) =>
          this.api.aggregateWorks(params, ANALYTICS_FIELDS).pipe(
            map((aggregations) => ({ aggregations, error: null as ApiError | null })),
            catchError((error: unknown) => of({ aggregations: null, error: toApiError(error) })),
          ),
        ),
        takeUntilDestroyed(destroyRef),
      )
      .subscribe(({ aggregations, error }) => {
        this.aggregationsState.set(aggregations);
        this.analyticsErrorState.set(error);
        this.analyticsStatusState.set(error ? 'error' : 'success');
      });
  }

  /** Loads results for the given params. Pass null to reset to the idle (no search) state. */
  load(params: SearchParams | null): void {
    if (!params) {
      this.reset();
      return;
    }
    const request = { params, attempt: this.attempt };
    this.searchRequests.next(request);
    this.analyticsRequests.next(request);
  }

  retry(): void {
    const params = this.paramsState();
    if (!params) return;
    this.attempt++;
    this.load(params);
  }

  private reset(): void {
    this.attempt++;
    this.paramsState.set(null);
    this.statusState.set('idle');
    this.resultState.set(null);
    this.errorState.set(null);
    this.analyticsStatusState.set('idle');
    this.aggregationsState.set(null);
    this.analyticsErrorState.set(null);
  }
}


import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';

import { toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';

import {
  Paper,
  SearchParams,
  SortOption,
} from '../../../research/models/paper.model';

import {
  DEFAULT_PAGE_SIZE,
  paramsFromQueryParams,
  toQueryParams,
} from '../../../research/search/search_params';

import {
  downloadFile,
  papersToCsv,
  papersToJson,
  slugifyQuery,
} from '../../../shared/export/export-results';

import { AnalyticsPanel } from '../../analytics/analytics-panel/analytics-panel';

import { Pagination } from '../components/pagination/pagination';
import { PaperCard } from '../components/paper-card/paper-card';
import { PaperDetail } from '../components/paper-detail/paper-detail';

import {
  EmptyState,
  ErrorState,
  ResultsSkeleton,
} from '../components/result-states/result-states';

import {
  ExportFormat,
  ResultsToolbar,
  YearRangeChange,
} from '../components/results-toolbar/results-toolbar';

import {
  EXAMPLE_QUERIES,
  SearchBar,
} from '../components/search-bar/search-bar';

import {
  HistorySelection,
  SearchHistoryPanel,
} from '../components/search-history-panel/search-history-panel';

import { SearchHistoryService } from '../data/search-history.service';
import { SearchStore } from '../data/search.store';

/**
 * Route-level container for research discovery.
 *
 * The URL is the single source of truth for search state.
 * This supports shareable searches, browser navigation,
 * and persistent search filters.
 */
@Component({
  selector: 'app-search-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [SearchStore],
  imports: [
    SearchBar,
    ResultsToolbar,
    PaperCard,
    PaperDetail,
    Pagination,
    ResultsSkeleton,
    EmptyState,
    ErrorState,
    SearchHistoryPanel,
    AnalyticsPanel,
  ],
  templateUrl: './search-page.html',
})
export class SearchPage {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly title = inject(Title);

  protected readonly store = inject(SearchStore);
  protected readonly history = inject(SearchHistoryService);

  /**
   * Create a mutable copy of the example queries.
   * This is compatible with child components expecting string[].
   */
  protected readonly examples: string[] = [...EXAMPLE_QUERIES];

  protected readonly selectedPaper = signal<Paper | null>(null);

  private readonly queryParams = toSignal(
    this.route.queryParams,
    { initialValue: {} },
  );

  protected readonly urlParams = computed(() =>
    paramsFromQueryParams(this.queryParams()),
  );

  protected readonly currentQuery = computed(() =>
    this.urlParams()?.query ?? '',
  );

  protected readonly isSaved = computed(() => {
    const params = this.urlParams();

    return params
      ? this.history.isSaved(params)
      : false;
  });

  protected readonly hasYearFilter = computed(() => {
    const params = this.urlParams();

    return !!params && (
      params.yearFrom !== null ||
      params.yearTo !== null
    );
  });

  protected readonly selectedYear = computed(() => {
    const params = this.urlParams();

    return (
      params &&
      params.yearFrom !== null &&
      params.yearFrom === params.yearTo
    )
      ? params.yearFrom
      : null;
  });

  constructor() {
    effect(() => {
      const params = this.urlParams();

      this.store.load(params);

      this.title.setTitle(
        params
          ? `${params.query} · Sterling Research`
          : 'Sterling Research · Open-access paper search',
      );
    });
  }

  /**
   * Initiates a new search and resets pagination.
   */
  protected onSearch(query: string): void {
    const current = this.urlParams();

    this.navigate({
      query,
      page: 1,
      pageSize: current?.pageSize ?? DEFAULT_PAGE_SIZE,
      sort: current?.sort ?? 'relevance',
      yearFrom: current?.yearFrom ?? null,
      yearTo: current?.yearTo ?? null,
    });
  }

  /**
   * Navigates to a selected results page.
   */
  protected onPageChange(page: number): void {
    this.patch({ page });

    if (typeof document !== 'undefined') {
      document
        .getElementById('results-heading')
        ?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
    }
  }

  /**
   * Changes the number of results displayed per page.
   */
  protected onPageSizeChange(pageSize: number): void {
    this.patch({
      pageSize,
      page: 1,
    });
  }

  /**
   * Changes result sorting.
   */
  protected onSortChange(sort: SortOption): void {
    this.patch({
      sort,
      page: 1,
    });
  }

  /**
   * Applies a publication year range.
   */
  protected onYearRange(range: YearRangeChange): void {
    this.patch({
      ...range,
      page: 1,
    });
  }

  /**
   * Filters results by a selected publication year.
   * Selecting the same year again clears the filter.
   */
  protected onYearSelected(year: number): void {
    if (this.selectedYear() === year) {
      this.patch({
        yearFrom: null,
        yearTo: null,
        page: 1,
      });

      return;
    }

    this.patch({
      yearFrom: year,
      yearTo: year,
      page: 1,
    });
  }

  /**
   * Restores a search from search history.
   */
  protected onHistorySelect(selection: HistorySelection): void {
    this.navigate({
      query: selection.query,
      page: 1,
      pageSize:
        selection.pageSize ??
        this.urlParams()?.pageSize ??
        DEFAULT_PAGE_SIZE,
      sort: selection.sort ?? 'relevance',
      yearFrom: selection.yearFrom,
      yearTo: selection.yearTo,
    });
  }

  /**
   * Saves or removes the current search.
   */
  protected toggleSave(): void {
    const params = this.urlParams();

    if (params) {
      this.history.toggleSaved(params);
    }
  }

  /**
   * Exports the currently displayed research papers.
   */
  protected exportResults(format: ExportFormat): void {
    const papers = this.store.papers();
    const params = this.urlParams();

    if (!papers.length || !params) {
      return;
    }

    const filename =
      `sterling-research-${slugifyQuery(params.query)}-p${params.page}`;

    if (format === 'csv') {
      downloadFile(
        `\uFEFF${papersToCsv(papers)}`,
        `${filename}.csv`,
        'text/csv;charset=utf-8',
      );

      return;
    }

    downloadFile(
      papersToJson(papers),
      `${filename}.json`,
      'application/json',
    );
  }

  /**
   * Updates selected search parameters while preserving
   * the remaining URL state.
   */
  private patch(changes: Partial<SearchParams>): void {
    const current = this.urlParams();

    if (!current) {
      return;
    }

    this.navigate({
      ...current,
      ...changes,
    });
  }

  /**
   * Synchronizes search state with the URL.
   */
  private navigate(params: SearchParams): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: toQueryParams(params),
    });
  }
}

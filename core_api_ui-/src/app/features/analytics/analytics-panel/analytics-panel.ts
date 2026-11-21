
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  output,
  signal,
  viewChildren,
} from '@angular/core';

import { DecimalPipe, PercentPipe } from '@angular/common';

import { ApiError } from '../../../research/api/api-error';
import { Aggregations, Paper } from '../../../research/models/paper.model';
import { LoadStatus } from '../../search/data/search.store';

import { BarChart } from '../bar-chart/bar-chart';

import {
  ChartDatum,
  authorCounts,
  summarizeTrend,
  topEntries,
  yearCountsFromPapers,
  yearSeries,
} from '../chart-aggregation';

type AnalyticsTab = 'year' | 'publisher' | 'type' | 'author';

interface AnalyticsTabOption {
  id: AnalyticsTab;
  label: string;
}

const TABS: AnalyticsTabOption[] = [
  { id: 'year', label: 'By year' },
  { id: 'publisher', label: 'Publishers' },
  { id: 'type', label: 'Document types' },
  { id: 'author', label: 'Authors' },
];

@Component({
  selector: 'app-analytics-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BarChart, DecimalPipe, PercentPipe],
  template: `
    <section class="panel analytics-panel" aria-labelledby="analytics-heading">
      <!-- Panel header -->
      <header class="analytics-header">
        <div class="analytics-heading-group">
          <div class="analytics-heading-icon" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.7"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M3 3v18h18"></path>
              <path d="m18 9-5 5-4-4-5 5"></path>
              <path d="M18 9h-5"></path>
              <path d="M18 9v5"></path>
            </svg>
          </div>

          <div>
            <h2 id="analytics-heading" class="panel-title">
              Research analytics
            </h2>

            <p class="analytics-description">
              Explore publication patterns and research distribution.
            </p>
          </div>
        </div>

        <span
          class="analytics-scope"
          [class.scope-current]="scopeLabel() === 'Current page'"
          [attr.title]="scopeLabel() === 'Current page'
            ? 'Statistics are based on papers on the current page.'
            : 'Statistics are based on all matching papers.'"
        >
          <span class="scope-indicator" aria-hidden="true"></span>
          {{ scopeLabel() }}
        </span>
      </header>

      <!-- Analytics tabs -->
      <div
        class="analytics-tabs"
        role="tablist"
        aria-label="Research analytics categories"
        aria-orientation="horizontal"
      >
        @for (tab of tabs; track tab.id) {
          <button
            #tabButton
            type="button"
            role="tab"
            class="analytics-tab"
            [id]="'tab-' + tab.id"
            [attr.aria-selected]="activeTab() === tab.id"
            [attr.aria-controls]="'tabpanel-analytics'"
            [attr.tabindex]="activeTab() === tab.id ? 0 : -1"
            (click)="activeTab.set(tab.id)"
            (keydown)="onTabKey($event)"
          >
            {{ tab.label }}
          </button>
        }
      </div>

      <!-- Analytics content -->
      <div
        id="tabpanel-analytics"
        class="analytics-content"
        role="tabpanel"
        tabindex="0"
        [attr.aria-labelledby]="'tab-' + activeTab()"
      >
        @if (status() === 'loading' && !current().length) {
          <div
            class="analytics-loading"
            role="status"
            aria-live="polite"
          >
            <span class="sr-only">Loading analytics…</span>

            <div class="chart-loading-header">
              <div class="chart-skeleton-label"></div>
              <div class="chart-skeleton-label short"></div>
            </div>

            @for (bar of skeletonBars; track bar) {
              <div class="chart-skeleton-row">
                <div class="chart-skeleton-name"></div>
                <div class="chart-skeleton-track">
                  <div
                    class="chart-skeleton-bar"
                    [style.width.%]="skeletonWidths[bar]"
                  ></div>
                </div>
              </div>
            }
          </div>
        } @else if (current().length === 0) {
          <div class="analytics-empty" role="status">
            <div class="analytics-empty-icon" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <circle cx="11" cy="11" r="7"></circle>
                <path d="m16 16 4 4"></path>
              </svg>
            </div>

            <h3 class="analytics-empty-title">
              No analytics available
            </h3>

            <p class="analytics-empty-text">
              {{ emptyMessage() }}
            </p>
          </div>
        } @else {
          <div
            class="analytics-chart-container"
            [class.is-stale]="status() === 'loading'"
            [attr.aria-busy]="status() === 'loading'"
          >
            <div class="chart-heading">
              <div>
                <h3 class="chart-title">{{ chartHeading() }}</h3>
                <p class="chart-subtitle">{{ chartSubtitle() }}</p>
              </div>

              <span class="chart-item-count">
                {{ current().length }} categories
              </span>
            </div>

            <app-bar-chart
              [data]="current()"
              [orientation]="activeTab() === 'year' ? 'vertical' : 'horizontal'"
              [height]="chartHeight()"
              [highlight]="activeTab() === 'year' ? highlightYear() : null"
              [ariaLabel]="chartLabel()"
              (datumSelected)="onSelect($event)"
            />
          </div>

          <!-- Publication statistics -->
          @if (activeTab() === 'year' && trend(); as t) {
            <div class="analytics-statistics">
              <div class="stat-card">
                <span class="stat-label">Dated papers</span>
                <strong class="stat-value">
                  {{ t.total | number }}
                </strong>
                <span class="stat-description">
                  Publications with a recorded year
                </span>
              </div>

              <div class="stat-card">
                <span class="stat-label">Peak publication year</span>
                <strong class="stat-value">
                  {{ t.peakYear }}
                </strong>
                <span class="stat-description">
                  {{ t.peakCount | number }} papers published
                </span>
              </div>

              <div class="stat-card">
                <span class="stat-label">Last five years</span>
                <strong class="stat-value">
                  {{ t.recentShare | percent: '1.0-0' }}
                </strong>
                <span class="stat-description">
                  Share of dated publications
                </span>
              </div>
            </div>

            <p class="chart-interaction-hint">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="9"></circle>
                <path d="M12 11v5"></path>
                <path d="M12 8h.01"></path>
              </svg>
              Select a year in the chart to filter the search results.
            </p>
          }

          <!-- Accessible data table -->
          <details class="analytics-table-details">
            <summary>
              <span class="table-summary-label">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.7"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M4 5h16v14H4z"></path>
                  <path d="M4 10h16"></path>
                  <path d="M10 5v14"></path>
                </svg>
                View data table
              </span>

              <svg
                class="table-chevron"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="m6 9 6 6 6-6"></path>
              </svg>
            </summary>

            <div class="analytics-table-wrapper">
              <table class="analytics-table">
                <thead>
                  <tr>
                    <th scope="col">{{ columnLabel() }}</th>
                    <th scope="col" class="numeric-cell">Papers</th>
                  </tr>
                </thead>

                <tbody>
                  @for (row of tableRows(); track row.label) {
                    <tr>
                      <td>{{ row.label }}</td>
                      <td class="numeric-cell">
                        {{ row.value | number }}
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </details>
        }

        <!-- Fallback notice -->
        @if (usingFallback()) {
          <div class="analytics-fallback" role="note">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.7"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9"></circle>
              <path d="M12 11v5"></path>
              <path d="M12 8h.01"></path>
            </svg>

            <p>
              Showing statistics from the current results page.
              Full search analytics are temporarily unavailable{{ analyticsError()?.kind === 'rate-limit' ? ' because the request limit was reached' : '' }}.
            </p>
          </div>
        }
      </div>
    </section>
  `,
})
export class AnalyticsPanel {
  readonly aggregations = input<Aggregations | null>(null);
  readonly status = input<LoadStatus>('idle');
  readonly analyticsError = input<ApiError | null>(null);

  /** Papers on the current page; used for author breakdowns and fallback data. */
  readonly papers = input<Paper[]>([]);

  readonly selectedYear = input<number | null>(null);

  readonly yearSelected = output<number>();

  protected readonly tabs = TABS;

  protected readonly activeTab = signal<AnalyticsTab>('year');

  protected readonly tabButtons =
    viewChildren<ElementRef<HTMLButtonElement>>('tabButton');

  protected readonly skeletonBars = [0, 1, 2, 3, 4, 5];

  protected readonly skeletonWidths = [88, 72, 94, 61, 79, 52];

  private readonly yearData = computed(() => {
    const aggregated = this.aggregations()?.yearPublished;

    if (aggregated && Object.keys(aggregated).length) {
      return yearSeries(aggregated);
    }

    return this.status() === 'error'
      ? yearSeries(yearCountsFromPapers(this.papers()))
      : [];
  });

  private readonly hasFullAggregation = computed(() => {
    const aggregations = this.aggregations();

    switch (this.activeTab()) {
      case 'year':
        return !!aggregations?.yearPublished &&
          Object.keys(aggregations.yearPublished).length > 0;

      case 'publisher':
        return !!aggregations?.publisher;

      case 'type':
        return !!aggregations?.documentType;

      case 'author':
        return false;
    }
  });

  protected readonly usingFallback = computed(() => {
    const tab = this.activeTab();

    if (tab === 'author' || this.hasFullAggregation()) {
      return false;
    }

    if (!this.papers().length) {
      return false;
    }

    // Year fallback is only available when the analytics request has failed.
    if (tab === 'year') {
      return this.status() === 'error';
    }

    // Publisher and document type breakdowns can use the current page.
    return true;
  });

  protected readonly current = computed<ChartDatum[]>(() => {
    const aggregations = this.aggregations();

    switch (this.activeTab()) {
      case 'year':
        return this.yearData();

      case 'publisher':
        return aggregations?.publisher
          ? topEntries(aggregations.publisher)
          : topEntries(Object.fromEntries(this.countBy((paper) => paper.publisher)));

      case 'type':
        return aggregations?.documentType
          ? topEntries(aggregations.documentType)
          : topEntries(Object.fromEntries(this.countBy((paper) => paper.documentType)));

      case 'author':
        return topEntries(authorCounts(this.papers()));
    }
  });

  protected readonly trend = computed(() => {
    const series = this.yearData();

    return series.length ? summarizeTrend(series) : null;
  });

  protected readonly highlightYear = computed(() => {
    const year = this.selectedYear();

    return year === null ? null : String(year);
  });

  protected readonly chartHeight = computed(() => {
  if (this.activeTab() === 'year') {
    return 280;
  }

  return Math.min(
    520,
    Math.max(190, this.current().length * 36)
  );
});

  protected readonly tableRows = computed(() => {
    const data = this.current().filter((datum) => datum.value > 0);

    return this.activeTab() === 'year' ? [...data].reverse() : data;
  });

  protected readonly scopeLabel = computed(() => {
    return this.activeTab() === 'author' || this.usingFallback()
      ? 'Current page'
      : 'All matching papers';
  });

  protected readonly columnLabel = computed(() => {
    const labels: Record<AnalyticsTab, string> = {
      year: 'Year',
      publisher: 'Publisher',
      type: 'Document type',
      author: 'Author',
    };

    return labels[this.activeTab()];
  });

  protected readonly chartHeading = computed(() => {
    const headings: Record<AnalyticsTab, string> = {
      year: 'Publications over time',
      publisher: 'Top publishers',
      type: 'Document types',
      author: 'Top contributing authors',
    };

    return headings[this.activeTab()];
  });

  protected readonly chartSubtitle = computed(() => {
    const descriptions: Record<AnalyticsTab, string> = {
      year: 'Distribution of publications by year',
      publisher: 'Publishers with the highest number of papers',
      type: 'Breakdown by publication format',
      author: 'Authors represented in the current results page',
    };

    return descriptions[this.activeTab()];
  });

  protected readonly chartLabel = computed(() => {
    const top = this.current()
      .filter((datum) => datum.value > 0)
      .slice(0, 5);

    return `Publications ${this.activeTab()}: ${top
      .map((datum) => `${datum.label} ${datum.value}`)
      .join(', ')}`;
  });

  protected readonly emptyMessage = computed(() => {
    if (this.status() === 'error' && !this.papers().length) {
      return 'Analytics could not be loaded for this search. Please try again later.';
    }

    if (this.activeTab() === 'author') {
      return 'No author information is available on this results page.';
    }

    return 'There is currently no data available for this category.';
  });

  protected onSelect(datum: ChartDatum): void {
    if (this.activeTab() !== 'year') {
      return;
    }

    const year = Number(datum.label);

    if (Number.isInteger(year) && datum.value > 0) {
      this.yearSelected.emit(year);
    }
  }

  protected onTabKey(event: KeyboardEvent): void {
    const supportedKeys = ['ArrowRight', 'ArrowLeft', 'Home', 'End'];

    if (!supportedKeys.includes(event.key)) {
      return;
    }

    event.preventDefault();

    const currentIndex = TABS.findIndex(
      (tab) => tab.id === this.activeTab(),
    );

    let nextIndex = currentIndex;

    switch (event.key) {
      case 'ArrowRight':
        nextIndex = (currentIndex + 1) % TABS.length;
        break;

      case 'ArrowLeft':
        nextIndex = (currentIndex - 1 + TABS.length) % TABS.length;
        break;

      case 'Home':
        nextIndex = 0;
        break;

      case 'End':
        nextIndex = TABS.length - 1;
        break;
    }

    const nextTab = TABS[nextIndex];

    this.activeTab.set(nextTab.id);
    this.tabButtons()[nextIndex]?.nativeElement.focus();
  }

  private countBy(
    selector: (paper: Paper) => string | null,
  ): Map<string, number> {
    const counts = new Map<string, number>();

    for (const paper of this.papers()) {
      const key = selector(paper)?.trim();

      if (key) {
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }

    return counts;
  }
}

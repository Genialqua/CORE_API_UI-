import { DecimalPipe, PercentPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { ApiError } from '../../../research/api/api-error';
import { Aggregations, Paper } from '../../../research/models/paper.model';
import { LoadStatus } from '../../search/data/search.store';
import { BarChart } from '../bar-chart/bar-chart';
import { ChartDatum, authorCounts, summarizeTrend, topEntries, yearCountsFromPapers, yearSeries } from '../bar-chart/chart-aggregation';

type AnalyticsTab = 'year' | 'publisher' | 'type' | 'author';

const TABS: { id: AnalyticsTab; label: string }[] = [
  { id: 'year', label: 'By year' },
  { id: 'publisher', label: 'Publishers' },
  { id: 'type', label: 'Types' },
  { id: 'author', label: 'Authors' },
];

@Component({
  selector: 'app-analytics-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BarChart, DecimalPipe, PercentPipe],
  template: `
    <section class="panel analytics" aria-labelledby="analytics-heading">
      <div class="panel-header">
        <h2 id="analytics-heading" class="panel-title">Research analytics</h2>
        <span class="panel-scope">{{ scopeLabel() }}</span>
      </div>

      <div class="tabs" role="tablist" aria-label="Analytics views">
        @for (tab of tabs; track tab.id) {
          <button
            type="button"
            role="tab"
            class="tab"
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

      <div id="tabpanel-analytics" role="tabpanel" [attr.aria-labelledby]="'tab-' + activeTab()" class="tabpanel">
        @if (status() === 'loading' && !current().length) {
          <div class="skeleton chart-skeleton" role="status"><span class="sr-only">Loading analytics…</span></div>
        } @else if (current().length === 0) {
          <p class="state-text muted chart-empty">{{ emptyMessage() }}</p>
        } @else {
          <div [class.is-stale]="status() === 'loading'">
            <app-bar-chart
              [data]="current()"
              [orientation]="activeTab() === 'year' ? 'vertical' : 'horizontal'"
              [height]="activeTab() === 'year' ? 240 : Math.max(180, current().length * 28)"
              [highlight]="activeTab() === 'year' ? highlightYear() : null"
              [ariaLabel]="chartLabel()"
              (datumSelected)="onSelect($event)"
            />
          </div>

          @if (activeTab() === 'year' && trend(); as t) {
            <dl class="stat-grid">
              <div>
                <dt>Dated papers</dt>
                <dd>{{ t.total | number }}</dd>
              </div>
              <div>
                <dt>Peak year</dt>
                <dd>{{ t.peakYear }} <span class="muted">({{ t.peakCount | number }})</span></dd>
              </div>
              <div>
                <dt>Last 5 years</dt>
                <dd>{{ t.recentShare | percent: '1.0-0' }}</dd>
              </div>
            </dl>
            <p class="chart-hint">Click a bar to filter results to that year.</p>
          }

          <details class="data-table">
            <summary>View as table</summary>
            <table>
              <thead>
                <tr><th scope="col">{{ columnLabel() }}</th><th scope="col">Papers</th></tr>
              </thead>
              <tbody>
                @for (row of tableRows(); track row.label) {
                  <tr><td>{{ row.label }}</td><td>{{ row.value | number }}</td></tr>
                }
              </tbody>
            </table>
          </details>
        }

        @if (usingFallback()) {
          <p class="chart-note" role="note">
            Showing data from the current page only — full-corpus analytics are unavailable{{ analyticsError()?.kind === 'rate-limit' ? ' (rate limited)' : '' }}.
          </p>
        }
      </div>
    </section>
  `,
})
export class AnalyticsPanel {
  readonly aggregations = input<Aggregations | null>(null);
  readonly status = input<LoadStatus>('idle');
  readonly analyticsError = input<ApiError | null>(null);
  /** Papers on the current page; used for the author breakdown and as a fallback. */
  readonly papers = input<Paper[]>([]);
  readonly selectedYear = input<number | null>(null);
  readonly yearSelected = output<number>();

  protected readonly Math = Math;
  protected readonly tabs = TABS;
  protected readonly activeTab = signal<AnalyticsTab>('year');

  protected readonly usingFallback = computed(
    () => this.status() === 'error' && this.activeTab() !== 'author' && this.papers().length > 0,
  );

  private readonly yearData = computed(() => {
    const aggregated = this.aggregations()?.yearPublished;
    if (aggregated && Object.keys(aggregated).length) return yearSeries(aggregated);
    return this.status() === 'error' ? yearSeries(yearCountsFromPapers(this.papers())) : [];
  });

  protected readonly current = computed<ChartDatum[]>(() => {
    const aggs = this.aggregations();
    switch (this.activeTab()) {
      case 'year':
        return this.yearData();
      case 'publisher':
        return aggs?.publisher
          ? topEntries(aggs.publisher)
          : topEntries(Object.fromEntries(this.countBy((p) => p.publisher)));
      case 'type':
        return aggs?.documentType
          ? topEntries(aggs.documentType)
          : topEntries(Object.fromEntries(this.countBy((p) => p.documentType)));
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

  protected readonly tableRows = computed(() =>
    this.activeTab() === 'year' ? this.current().filter((d) => d.value > 0).reverse() : this.current(),
  );

  protected readonly scopeLabel = computed(() =>
    this.activeTab() === 'author' || this.usingFallback() ? 'Current page' : 'All matching papers',
  );

  protected readonly columnLabel = computed(
    () => ({ year: 'Year', publisher: 'Publisher', type: 'Document type', author: 'Author' })[this.activeTab()],
  );

  protected readonly chartLabel = computed(() => {
    const top = this.current().filter((d) => d.value > 0);
    const label = TABS.find((t) => t.id === this.activeTab())?.label ?? '';
    return `Publications ${label.toLowerCase()}: ${top
      .slice(0, 5)
      .map((d) => `${d.label} ${d.value}`)
      .join(', ')}`;
  });

  protected readonly emptyMessage = computed(() => {
    if (this.status() === 'error' && !this.papers().length) return 'Analytics are unavailable for this search.';
    if (this.activeTab() === 'author') return 'No author data on this page.';
    return 'No data available for this breakdown.';
  });

  protected onSelect(datum: ChartDatum): void {
    if (this.activeTab() !== 'year') return;
    const year = Number(datum.label);
    if (Number.isInteger(year) && datum.value > 0) this.yearSelected.emit(year);
  }

  protected onTabKey(event: KeyboardEvent): void {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const index = TABS.findIndex((t) => t.id === this.activeTab());
    const next = TABS[(index + (event.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length];
    this.activeTab.set(next.id);
    document.getElementById(`tab-${next.id}`)?.focus();
  }

  private countBy(selector: (paper: Paper) => string | null): Map<string, number> {
    const counts = new Map<string, number>();
    for (const paper of this.papers()) {
      const key = selector(paper);
      if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }
}

import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { HistoryEntry, SavedSearch } from '../../data/search-history.service';

export type HistorySelection = Pick<HistoryEntry, 'query' | 'yearFrom' | 'yearTo'> & Partial<Pick<SavedSearch, 'sort' | 'pageSize'>>;

@Component({
  selector: 'app-search-history-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe],
  template: `
    @if (saved().length) {
      <section class="side-section" aria-labelledby="saved-heading">
        <h2 id="saved-heading" class="side-heading">Saved searches</h2>
        <ul class="history-list">
          @for (item of saved(); track item.id) {
            <li class="history-item">
              <button type="button" class="history-link" (click)="select.emit(item)">
                <span class="mono history-query">{{ item.query }}</span>
                @if (item.yearFrom !== null || item.yearTo !== null) {
                  <span class="history-meta">{{ item.yearFrom ?? '…' }}–{{ item.yearTo ?? '…' }}</span>
                }
              </button>
              <button type="button" class="icon-btn icon-btn-sm" (click)="removeSaved.emit(item.id)" [attr.aria-label]="'Remove saved search ' + item.query">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></svg>
              </button>
            </li>
          }
        </ul>
      </section>
    }

    @if (history().length) {
      <section class="side-section" aria-labelledby="history-heading">
        <div class="side-heading-row">
          <h2 id="history-heading" class="side-heading">Recent</h2>
          <button type="button" class="text-btn" (click)="clearHistory.emit()">Clear</button>
        </div>
        <ul class="history-list">
          @for (item of history(); track item.searchedAt) {
            <li class="history-item">
              <button type="button" class="history-link" (click)="select.emit(item)">
                <span class="mono history-query">{{ item.query }}</span>
                <span class="history-meta">
                  @if (item.totalHits !== null) {
                    {{ item.totalHits | number }} results
                  }
                  @if (item.yearFrom !== null || item.yearTo !== null) {
                    · {{ item.yearFrom ?? '…' }}–{{ item.yearTo ?? '…' }}
                  }
                </span>
              </button>
            </li>
          }
        </ul>
      </section>
    }
  `,
})
export class SearchHistoryPanel {
  readonly history = input<HistoryEntry[]>([]);
  readonly saved = input<SavedSearch[]>([]);
  readonly select = output<HistorySelection>();
  readonly removeSaved = output<string>();
  readonly clearHistory = output<void>();
}

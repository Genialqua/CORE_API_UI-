
import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';

import {
  HistoryEntry,
  SavedSearch,
} from '../../data/search-history.service';

export type HistorySelection =
  Pick<HistoryEntry, 'query' | 'yearFrom' | 'yearTo'> &
  Partial<Pick<SavedSearch, 'sort' | 'pageSize'>>;

@Component({
  selector: 'app-search-history-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe],

  template: `
    <div class="history-panel">

      <!-- Saved searches -->
      @if (saved().length) {
        <section
          class="history-section"
          aria-labelledby="saved-heading"
        >
          <div class="section-header">
            <div class="section-title-group">
              <span class="section-icon saved-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <path
                    d="M6 4.75h12a1.25 1.25 0 0 1 1.25 1.25v14L12 15.5l-7.25 4.5V6A1.25 1.25 0 0 1 6 4.75Z"
                    stroke="currentColor"
                    stroke-width="1.6"
                    stroke-linejoin="round"
                  />
                </svg>
              </span>

              <h2 id="saved-heading" class="section-heading">
                Saved searches
              </h2>
            </div>

            <span class="section-count">
              {{ saved().length }}
            </span>
          </div>

          <ul class="history-list">
            @for (item of saved(); track item.id) {
              <li class="history-item">
                <button
                  type="button"
                  class="history-select"
                  (click)="select.emit(item)"
                  [attr.aria-label]="'Run saved search: ' + item.query"
                >
                  <span class="query-row">
                    <span class="history-query">
                      {{ item.query }}
                    </span>

                    <svg
                      class="open-icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M7 17 17 7M7 7h10v10"
                        stroke="currentColor"
                        stroke-width="1.7"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </span>

                  @if (
                    item.yearFrom !== null ||
                    item.yearTo !== null
                  ) {
                    <span class="history-meta">
                      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <rect
                          x="3.75"
                          y="5.5"
                          width="16.5"
                          height="15"
                          rx="2"
                          stroke="currentColor"
                          stroke-width="1.5"
                        />
                        <path
                          d="M7.5 3.5v4M16.5 3.5v4M4 10h16"
                          stroke="currentColor"
                          stroke-width="1.5"
                          stroke-linecap="round"
                        />
                      </svg>

                      {{ item.yearFrom ?? 'Any year' }}
                      –
                      {{ item.yearTo ?? 'Present' }}
                    </span>
                  }
                </button>

                <button
                  type="button"
                  class="remove-button"
                  (click)="removeSaved.emit(item.id)"
                  [attr.aria-label]="'Remove saved search: ' + item.query"
                  title="Remove saved search"
                >
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="m7 7 10 10M17 7 7 17"
                      stroke="currentColor"
                      stroke-width="1.7"
                      stroke-linecap="round"
                    />
                  </svg>
                </button>
              </li>
            }
          </ul>
        </section>
      }

      <!-- Recent searches -->
      @if (history().length) {
        <section
          class="history-section recent-section"
          aria-labelledby="recent-heading"
        >
          <div class="section-header">
            <div class="section-title-group">
              <span class="section-icon recent-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <circle
                    cx="12"
                    cy="12"
                    r="8.25"
                    stroke="currentColor"
                    stroke-width="1.6"
                  />
                  <path
                    d="M12 7.5V12l3 2"
                    stroke="currentColor"
                    stroke-width="1.6"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </span>

              <h2 id="recent-heading" class="section-heading">
                Recent searches
              </h2>
            </div>

            <button
              type="button"
              class="clear-button"
              (click)="clearHistory.emit()"
              aria-label="Clear recent search history"
            >
              Clear all
            </button>
          </div>

          <ul class="history-list">
            @for (item of history(); track item.searchedAt) {
              <li class="history-item recent-item">
                <button
                  type="button"
                  class="history-select"
                  (click)="select.emit(item)"
                  [attr.aria-label]="'Repeat search: ' + item.query"
                >
                  <span class="history-query">
                    {{ item.query }}
                  </span>

                  <span class="recent-meta">
                    @if (item.totalHits !== null) {
                      <span class="result-count">
                        {{ item.totalHits | number }} results
                      </span>
                    }

                    @if (
                      item.yearFrom !== null ||
                      item.yearTo !== null
                    ) {
                      <span class="year-range">
                        {{ item.yearFrom ?? 'Any year' }}
                        –
                        {{ item.yearTo ?? 'Present' }}
                      </span>
                    }
                  </span>
                </button>

                <span class="recent-indicator" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path
                      d="M5 12h13m-5-5 5 5-5 5"
                      stroke="currentColor"
                      stroke-width="1.6"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </span>
              </li>
            }
          </ul>
        </section>
      }

      <!-- Empty state -->
      @if (!saved().length && !history().length) {
        <section class="history-empty" aria-label="Search history is empty">
          <span class="empty-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <circle
                cx="12"
                cy="12"
                r="8.25"
                stroke="currentColor"
                stroke-width="1.5"
              />
              <path
                d="M12 7.5V12l3 2"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              />
            </svg>
          </span>

          <h3>No searches yet</h3>

          <p>
            Your recent and saved searches will appear here
            as you explore research publications.
          </p>
        </section>
      }

    </div>
  `,
})
export class SearchHistoryPanel {
  readonly history = input<HistoryEntry[]>([]);
  readonly saved = input<SavedSearch[]>([]);

  readonly select = output<HistorySelection>();
  readonly removeSaved = output<string>();
  readonly clearHistory = output<void>();
}


import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';

import { SortOption } from '../../../../research/models/paper.model';

import {
  MIN_YEAR,
  PAGE_SIZE_OPTIONS,
  SORT_OPTIONS,
  maxYear,
  normalizeYear,
} from '../../../../research/search/search_params';

export interface YearRangeChange {
  yearFrom: number | null;
  yearTo: number | null;
}

export type ExportFormat = 'csv' | 'json';

@Component({
  selector: 'app-results-toolbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe],

  template: `
    <section
      class="results-toolbar"
      aria-label="Search result controls"
    >

      <!-- Results summary -->
      <div class="toolbar-summary" aria-live="polite">
        @if (loading()) {
          <span class="results-status">Searching...</span>
        } @else if (total() > 0) {
          <span class="results-count">
            Showing
            <strong>{{ rangeStart() | number }}</strong>
            –
            <strong>{{ rangeEnd() | number }}</strong>
            of
            <strong>{{ total() | number }}</strong>
            results
          </span>
        } @else {
          <span class="results-status">
            No results found
          </span>
        }
      </div>

      <!-- Pagination and sorting controls -->
      <div class="toolbar-controls">

        <div class="toolbar-control">
          <label for="page-size">
            Results per page
          </label>

          <select
            id="page-size"
            [value]="pageSize()"
            (change)="onPageSize($event)"
            [disabled]="loading()"
          >
            @for (size of pageSizes; track size) {
              <option [value]="size">
                {{ size }}
              </option>
            }
          </select>
        </div>

        <div class="toolbar-control">
          <label for="sort-order">
            Sort by
          </label>

          <select
            id="sort-order"
            [value]="sort()"
            (change)="onSort($event)"
            [disabled]="loading()"
          >
            @for (option of sortOptions; track option.value) {
              <option [value]="option.value">
                {{ option.label }}
              </option>
            }
          </select>
        </div>

      </div>

      <!-- Publication year filter -->
      <fieldset class="year-filter">
        <legend>Publication year</legend>

        <div class="year-inputs">

          <div class="toolbar-control">
            <label for="year-from">From</label>

            <input
              id="year-from"
              type="number"
              step="1"
              [min]="minYear"
              [max]="latestYear"
              [value]="yearFrom() ?? ''"
              placeholder="Start year"
              (change)="onYear('from', $event)"
              [disabled]="loading()"
            />
          </div>

          <div class="toolbar-control">
            <label for="year-to">To</label>

            <input
              id="year-to"
              type="number"
              step="1"
              [min]="minYear"
              [max]="latestYear"
              [value]="yearTo() ?? ''"
              placeholder="End year"
              (change)="onYear('to', $event)"
              [disabled]="loading()"
            />
          </div>

          @if (hasYearFilter()) {
            <button
              type="button"
              class="clear-filter"
              (click)="clearYearFilter()"
              [disabled]="loading()"
            >
              Clear
            </button>
          }

        </div>
      </fieldset>

      <!-- Save and export actions -->
      <div class="toolbar-actions">

        <button
          type="button"
          class="save-button"
          [class.is-saved]="saved()"
          [attr.aria-pressed]="saved()"
          (click)="toggleSave.emit()"
        >
          {{ saved() ? 'Saved' : 'Save search' }}
        </button>

        <button
          type="button"
          (click)="onExport('csv')"
          [disabled]="!canExport() || loading()"
        >
          Export CSV
        </button>

        <button
          type="button"
          (click)="onExport('json')"
          [disabled]="!canExport() || loading()"
        >
          Export JSON
        </button>

      </div>

    </section>
  `,
})
export class ResultsToolbar {

  // Component inputs
  readonly total = input(0);
  readonly rangeStart = input(0);
  readonly rangeEnd = input(0);

  readonly pageSize = input.required<number>();
  readonly sort = input.required<SortOption>();

  readonly yearFrom = input<number | null>(null);
  readonly yearTo = input<number | null>(null);

  readonly saved = input(false);
  readonly loading = input(false);
  readonly canExport = input(false);

  // Component outputs
  readonly pageSizeChange = output<number>();
  readonly sortChange = output<SortOption>();
  readonly yearRangeChange = output<YearRangeChange>();

  readonly toggleSave = output<void>();
  readonly exportResults = output<ExportFormat>();

  // Search configuration
  protected readonly pageSizes = PAGE_SIZE_OPTIONS;
  protected readonly sortOptions = SORT_OPTIONS;

  protected readonly minYear = MIN_YEAR;
  protected readonly latestYear = maxYear();

  // Derived state
  protected readonly hasYearFilter = computed(
    () =>
      this.yearFrom() !== null ||
      this.yearTo() !== null,
  );

  // Handle page-size changes
  protected onPageSize(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const value = Number(target.value);

    const isValid = this.pageSizes.some(
      (size) => size === value,
    );

    if (!isValid) {
      return;
    }

    this.pageSizeChange.emit(value);
  }

  // Handle sorting changes
  protected onSort(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const value = target.value;

    const selectedOption = this.sortOptions.find(
      (option) => option.value === value,
    );

    if (!selectedOption) {
      return;
    }

    this.sortChange.emit(selectedOption.value);
  }

  // Handle publication year changes
  protected onYear(
    which: 'from' | 'to',
    event: Event,
  ): void {
    const target = event.target as HTMLInputElement;
    const rawValue = target.value.trim();

    const year =
      rawValue === ''
        ? null
        : normalizeYear(rawValue);

    // Restore the previous value if validation fails.
    if (rawValue !== '' && year === null) {
      const previousValue =
        which === 'from'
          ? this.yearFrom()
          : this.yearTo();

      target.value = String(previousValue ?? '');
      return;
    }

    let yearFrom =
      which === 'from'
        ? year
        : this.yearFrom();

    let yearTo =
      which === 'to'
        ? year
        : this.yearTo();

    // Ensure the starting year does not exceed the ending year.
    if (
      yearFrom !== null &&
      yearTo !== null &&
      yearFrom > yearTo
    ) {
      [yearFrom, yearTo] = [
        yearTo,
        yearFrom,
      ];
    }

    this.yearRangeChange.emit({
      yearFrom,
      yearTo,
    });
  }

  // Clear publication year filters
  protected clearYearFilter(): void {
    this.yearRangeChange.emit({
      yearFrom: null,
      yearTo: null,
    });
  }

  // Handle result exports
  protected onExport(format: ExportFormat): void {
    if (!this.canExport() || this.loading()) {
      return;
    }

    this.exportResults.emit(format);
  }
}

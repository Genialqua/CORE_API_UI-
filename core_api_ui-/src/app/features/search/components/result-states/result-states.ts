
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';

import { ApiError } from '../../../../research/api/api-error';

@Component({
  selector: 'app-results-skeleton',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="skeleton-list"
      role="status"
      aria-live="polite"
      aria-label="Loading research papers"
    >
      <span class="sr-only">Loading results…</span>

      @for (row of rows(); track row) {
        <article class="paper-card skeleton-card" aria-hidden="true">
          <div class="skeleton skeleton-badge"></div>
          <div class="skeleton skeleton-title"></div>
          <div class="skeleton skeleton-line short"></div>
          <div class="skeleton skeleton-line"></div>
          <div class="skeleton skeleton-line"></div>

          <div class="skeleton-footer">
            <div class="skeleton skeleton-meta"></div>
            <div class="skeleton skeleton-meta"></div>
          </div>
        </article>
      }
    </div>
  `,
})
export class ResultsSkeleton {
  readonly count = input(4);

  protected readonly rows = computed(() => {
    const count = Math.max(1, Math.min(this.count(), 6));

    return Array.from({ length: count }, (_, index) => index);
  });
}

@Component({
  selector: 'app-empty-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="state-panel state-empty" aria-labelledby="empty-state-title">
      @if (mode() === 'no-results') {
        <div class="state-icon no-results-icon" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="11" cy="11" r="7"></circle>
            <path d="m16 16 4 4"></path>
            <path d="M8.5 11h5"></path>
          </svg>
        </div>

        <h2 id="empty-state-title" class="state-title">
          No papers found
        </h2>

        <p class="state-text">
          No results matched
          <span class="state-query">“{{ query() }}”</span>.
          Try broadening your search or adjusting the year range.
        </p>

        <div class="suggestion-panel">
          <p class="suggestion-heading">Improve your search</p>

          <ul class="suggestion-list">
            <li>Use broader or fewer search terms.</li>
            <li>Replace AND with OR to include more results.</li>
            <li>Remove restrictive NOT conditions.</li>
            <li>Expand the selected publication year range.</li>
          </ul>
        </div>

        @if (hasFilters()) {
          <button
            type="button"
            class="state-action state-action-secondary"
            (click)="clearFilters.emit()"
          >
            Clear year filters
          </button>
        }
      } @else {
        <div class="state-icon welcome-icon" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"></path>
            <path d="M8 7h8"></path>
            <path d="M8 11h6"></path>
          </svg>
        </div>

        <span class="state-eyebrow">Research discovery</span>

        <h2 id="empty-state-title" class="state-title">
          Discover research that matters
        </h2>

        <p class="state-text">
          Explore open-access academic research across disciplines.
          Use Boolean operators to build precise searches, refine your
          results, and identify emerging research trends.
        </p>
      }

      @if (examples().length > 0) {
        <div class="example-section">
          <p class="example-heading">Try a search example</p>

          <div class="example-list">
            @for (example of examples(); track example) {
              <button
                type="button"
                class="example-chip"
                (click)="exampleSelected.emit(example)"
                [attr.aria-label]="'Search for ' + example"
              >
                {{ example }}
              </button>
            }
          </div>
        </div>
      }
    </section>
  `,
})
export class EmptyState {
  readonly mode = input<'welcome' | 'no-results'>('welcome');
  readonly query = input('');
  readonly hasFilters = input(false);
  readonly examples = input<string[]>([]);

  readonly exampleSelected = output<string>();
  readonly clearFilters = output<void>();
}

@Component({
  selector: 'app-error-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="state-panel state-error" role="alert">
      <div class="state-icon error-icon" aria-hidden="true">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.7"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="9"></circle>
          <path d="M12 8v4"></path>
          <path d="M12 16h.01"></path>
        </svg>
      </div>

      <span class="state-eyebrow error-eyebrow">
        Something needs attention
      </span>

      <h2 class="state-title">
        {{ title() }}
      </h2>

      <p class="state-text">
        {{ error().message }}
      </p>

      @if (error().retryAfterSeconds; as retryAfter) {
        <p class="error-retry-note">
          Please wait approximately {{ retryAfter }} seconds before trying again.
        </p>
      }

      @if (error().kind !== 'bad-request') {
        <button
          type="button"
          class="state-action state-action-primary"
          (click)="retry.emit()"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M20 7v5h-5"></path>
            <path d="M4 17v-5h5"></path>
            <path d="M5.6 9a7 7 0 0 1 11.6-2L20 12"></path>
            <path d="M4 12l2.8 5a7 7 0 0 0 11.6-2"></path>
          </svg>
          Try again
        </button>
      }
    </section>
  `,
})
export class ErrorState {
  readonly error = input.required<ApiError>();
  readonly retry = output<void>();

  protected readonly title = computed(() => {
    switch (this.error().kind) {
      case 'rate-limit':
        return 'Too many requests';

      case 'network':
        return 'Connection problem';

      case 'bad-request':
        return 'Search could not be processed';

      case 'unauthorized':
        return 'Access denied';

      case 'server':
        return 'Research service unavailable';

      default:
        return 'Something went wrong';
    }
  });
}

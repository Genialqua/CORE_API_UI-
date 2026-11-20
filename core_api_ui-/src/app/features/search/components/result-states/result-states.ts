import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { ApiError } from '../../../../research/api/api-error';

@Component({
  selector: 'app-results-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="skeleton-list" role="status" aria-live="polite">
      <span class="sr-only">Loading results…</span>
      @for (row of rows(); track row) {
        <div class="paper-card skeleton-card" aria-hidden="true">
          <div class="skeleton skeleton-badge"></div>
          <div class="skeleton skeleton-title"></div>
          <div class="skeleton skeleton-line short"></div>
          <div class="skeleton skeleton-line"></div>
          <div class="skeleton skeleton-line"></div>
        </div>
      }
    </div>
  `,
})
export class ResultsSkeleton {
  readonly count = input(4);
  protected readonly rows = computed(() => Array.from({ length: Math.min(this.count(), 6) }, (_, i) => i));
}

@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="state-panel" role="status">
      @if (mode() === 'no-results') {
        <h2 class="state-title">No papers match “{{ query() }}”</h2>
        <p class="state-text">Try fewer or broader terms, replace AND with OR, remove NOT clauses, or widen the year range.</p>
        @if (hasFilters()) {
          <button type="button" class="btn btn-secondary" (click)="clearFilters.emit()">Clear year filter</button>
        }
      } @else {
        <h2 class="state-title">Discover open-access research</h2>
        <p class="state-text">
          Search more than 300 million papers aggregated by CORE. Combine terms with Boolean operators to narrow results, then explore
          trends in the analytics panel.
        </p>
      }
      <p class="state-label">Try an example</p>
      <ul class="example-list">
        @for (example of examples(); track example) {
          <li>
            <button type="button" class="chip chip-mono" (click)="exampleSelected.emit(example)">{{ example }}</button>
          </li>
        }
      </ul>
    </div>
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
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="state-panel state-error" role="alert">
      <h2 class="state-title">{{ title() }}</h2>
      <p class="state-text">{{ error().message }}</p>
      @if (error().retryAfterSeconds) {
        <p class="state-text muted">You can retry in about {{ error().retryAfterSeconds }} seconds.</p>
      }
      @if (error().kind !== 'bad-request') {
        <button type="button" class="btn btn-primary" (click)="retry.emit()">Try again</button>
      }
    </div>
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
        return 'API access denied';
      case 'server':
        return 'CORE is unavailable';
      default:
        return 'Something went wrong';
    }
  });
}

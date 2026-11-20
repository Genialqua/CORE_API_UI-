import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { buildPageList } from './pagination.util';

@Component({
  selector: 'app-pagination',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (totalPages() > 1) {
      <nav class="pagination" aria-label="Search results pages">
        <button
          type="button"
          class="btn btn-ghost"
          [disabled]="page() <= 1 || disabled()"
          (click)="go(page() - 1)"
          aria-label="Previous page"
        >
          <span aria-hidden="true">&larr;</span> <span class="hide-sm">Previous</span>
        </button>

        <ol class="pagination-pages">
          @for (item of items(); track item.type === 'page' ? item.page : item.key) {
            <li>
              @if (item.type === 'page') {
                <button
                  type="button"
                  class="page-btn"
                  [class.is-current]="item.page === page()"
                  [attr.aria-current]="item.page === page() ? 'page' : null"
                  [attr.aria-label]="'Page ' + item.page"
                  [disabled]="disabled()"
                  (click)="go(item.page)"
                >
                  {{ item.page }}
                </button>
              } @else {
                <span class="page-gap" aria-hidden="true">&hellip;</span>
              }
            </li>
          }
        </ol>

        <p class="pagination-compact" aria-hidden="true">{{ page() }} / {{ totalPages() }}</p>

        <button
          type="button"
          class="btn btn-ghost"
          [disabled]="page() >= totalPages() || disabled()"
          (click)="go(page() + 1)"
          aria-label="Next page"
        >
          <span class="hide-sm">Next</span> <span aria-hidden="true">&rarr;</span>
        </button>
      </nav>
    }
  `,
})
export class Pagination {
  readonly page = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly disabled = input(false);
  readonly pageChange = output<number>();

  protected readonly items = computed(() => buildPageList(this.page(), this.totalPages()));

  protected go(target: number): void {
    if (target < 1 || target > this.totalPages() || target === this.page()) return;
    this.pageChange.emit(target);
  }
}

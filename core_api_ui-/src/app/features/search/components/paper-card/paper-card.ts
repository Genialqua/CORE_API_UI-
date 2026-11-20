import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Paper } from '../../../../research/models/paper.model';

const MAX_AUTHORS = 4;
const ABSTRACT_PREVIEW = 320;

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:]+$/, '')}…`;
}

@Component({
  selector: 'app-paper-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let p = paper();
    <article class="paper-card" [attr.aria-labelledby]="'paper-title-' + p.id">
      <div class="paper-badges">
        @if (p.year) {
          <span class="badge badge-year">{{ p.year }}</span>
        }
        @if (p.documentType) {
          <span class="badge">{{ p.documentType }}</span>
        }
        @if (p.downloadUrl) {
          <span class="badge badge-accent">Full text</span>
        }
        @if (p.citationCount > 0) {
          <span class="badge">{{ p.citationCount }} {{ p.citationCount === 1 ? 'citation' : 'citations' }}</span>
        }
      </div>

      <h3 class="paper-title" [id]="'paper-title-' + p.id">
        <button type="button" class="link-btn" (click)="open.emit(p)">{{ p.title }}</button>
      </h3>

      <p class="paper-authors">
        @if (p.authors.length) {
          {{ authorLine() }}
        } @else {
          <span class="muted">Authors not listed</span>
        }
      </p>

      @if (venue()) {
        <p class="paper-venue">{{ venue() }}</p>
      }

      <p class="paper-abstract" [class.muted]="!p.abstract">
        {{ p.abstract ? abstractPreview() : 'No abstract available for this record.' }}
      </p>

      <div class="paper-actions">
        <button type="button" class="btn btn-secondary btn-sm" (click)="open.emit(p)">Details</button>
        @if (p.doiUrl) {
          <a class="btn btn-ghost btn-sm" [href]="p.doiUrl" target="_blank" rel="noopener noreferrer">
            DOI <span class="sr-only">(opens in a new tab)</span>
          </a>
        }
        @if (p.downloadUrl) {
          <a class="btn btn-ghost btn-sm" [href]="p.downloadUrl" target="_blank" rel="noopener noreferrer">
            PDF <span class="sr-only">(opens in a new tab)</span>
          </a>
        }
        <a class="btn btn-ghost btn-sm" [href]="p.coreUrl" target="_blank" rel="noopener noreferrer">
          View on CORE <span class="sr-only">(opens in a new tab)</span>
        </a>
      </div>
    </article>
  `,
})
export class PaperCard {
  readonly paper = input.required<Paper>();
  readonly open = output<Paper>();

  protected readonly authorLine = computed(() => {
    const authors = this.paper().authors;
    if (authors.length <= MAX_AUTHORS) return authors.join(', ');
    return `${authors.slice(0, MAX_AUTHORS).join(', ')} +${authors.length - MAX_AUTHORS} more`;
  });

  protected readonly venue = computed(() => {
    const { journal, publisher } = this.paper();
    if (journal && publisher && journal.toLowerCase() !== publisher.toLowerCase()) return `${journal} · ${publisher}`;
    return journal ?? publisher;
  });

  protected readonly abstractPreview = computed(() => truncate(this.paper().abstract ?? '', ABSTRACT_PREVIEW));
}

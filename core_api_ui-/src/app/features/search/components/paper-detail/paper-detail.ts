import { SlicePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, effect, input, output, signal, viewChild } from '@angular/core';
import { Paper } from '../../../../research/models/paper.model';
import { formatCitation } from '../../../../shared/export/export-results';

/** Detailed publication view rendered in a native <dialog> (focus trapping and Esc handled by the browser). */
@Component({
  selector: 'app-paper-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog #dialog class="detail-dialog" aria-labelledby="detail-title" (close)="closed.emit()" (click)="onBackdrop($event)">
      @if (paper(); as p) {
        <div class="detail-inner">
          <header class="detail-header">
            <div class="paper-badges">
              @if (p.year) {
                <span class="badge badge-year">{{ p.year }}</span>
              }
              @if (p.documentType) {
                <span class="badge">{{ p.documentType }}</span>
              }
              @if (p.language) {
                <span class="badge">{{ p.language }}</span>
              }
            </div>
            <button type="button" class="icon-btn" (click)="close()" aria-label="Close details">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              </svg>
            </button>
          </header>

          <h2 id="detail-title" class="detail-title">{{ p.title }}</h2>

          <dl class="detail-grid">
            <div>
              <dt>Authors</dt>
              <dd>{{ p.authors.length ? p.authors.join(', ') : 'Not listed' }}</dd>
            </div>
            <div>
              <dt>Published</dt>
              <dd>{{ p.publishedDate ? (p.publishedDate | slice: 0 : 10) : (p.year ?? 'Unknown') }}</dd>
            </div>
            @if (p.journal) {
              <div>
                <dt>Journal</dt>
                <dd>{{ p.journal }}</dd>
              </div>
            }
            <div>
              <dt>Publisher</dt>
              <dd>{{ p.publisher ?? 'Unknown' }}</dd>
            </div>
            @if (p.doi) {
              <div>
                <dt>DOI</dt>
                <dd class="mono">{{ p.doi }}</dd>
              </div>
            }
            @if (p.fieldOfStudy) {
              <div>
                <dt>Field of study</dt>
                <dd>{{ p.fieldOfStudy }}</dd>
              </div>
            }
            @if (p.dataProviders.length) {
              <div>
                <dt>Source repository</dt>
                <dd>{{ p.dataProviders.join(', ') }}</dd>
              </div>
            }
            <div>
              <dt>Citations</dt>
              <dd>{{ p.citationCount }}</dd>
            </div>
          </dl>

          <section aria-labelledby="detail-abstract">
            <h3 id="detail-abstract" class="detail-subtitle">Abstract</h3>
            <p class="detail-abstract" [class.muted]="!p.abstract">{{ p.abstract ?? 'No abstract available for this record.' }}</p>
          </section>

          <section aria-labelledby="detail-cite">
            <h3 id="detail-cite" class="detail-subtitle">Cite</h3>
            <p class="citation">{{ citation(p) }}</p>
          </section>

          <footer class="detail-actions">
            <button type="button" class="btn btn-secondary btn-sm" (click)="copyCitation(p)">
              {{ copied() ? 'Copied' : 'Copy citation' }}
            </button>
            @if (p.doiUrl) {
              <a class="btn btn-ghost btn-sm" [href]="p.doiUrl" target="_blank" rel="noopener noreferrer">Open DOI</a>
            }
            @if (p.downloadUrl) {
              <a class="btn btn-ghost btn-sm" [href]="p.downloadUrl" target="_blank" rel="noopener noreferrer">Download full text</a>
            }
            <a class="btn btn-primary btn-sm" [href]="p.coreUrl" target="_blank" rel="noopener noreferrer">View on CORE</a>
          </footer>
        </div>
      }
    </dialog>
  `,
  imports: [SlicePipe],
})
export class PaperDetail {
  readonly paper = input<Paper | null>(null);
  readonly closed = output<void>();

  protected readonly copied = signal(false);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    effect(() => {
      const element = this.dialog().nativeElement;
      if (this.paper()) {
        this.copied.set(false);
        if (!element.open) element.showModal?.();
      } else if (element.open) {
        element.close();
      }
    });
  }

  protected citation(paper: Paper): string {
    return formatCitation(paper);
  }

  protected close(): void {
    this.dialog().nativeElement.close();
  }

  protected onBackdrop(event: MouseEvent): void {
    if (event.target === this.dialog().nativeElement) this.close();
  }

  protected async copyCitation(paper: Paper): Promise<void> {
    try {
      await navigator.clipboard.writeText(formatCitation(paper));
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
      this.copied.set(false);
    }
  }
}

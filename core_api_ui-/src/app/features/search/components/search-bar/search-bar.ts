
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';

import {
  MAX_QUERY_LENGTH,
  validateQuery,
} from '../../../../research/search/query-parser';

/**
 * Example Boolean search expressions displayed by the search experience.
 */
export const EXAMPLE_QUERIES = [
  '(drone AND (package OR delivery))',
  '"climate change" AND agriculture NOT livestock',
  'title:transformer AND (vision OR image)',
  '(CRISPR OR "gene editing") AND ethics',
] as const;

const OPERATOR_SNIPPETS = [
  'AND',
  'OR',
  'NOT',
  '( )',
  '" "',
] as const;

type OperatorSnippet = (typeof OPERATOR_SNIPPETS)[number];

/**
 * Presentational search component.
 *
 * Responsibilities:
 * - Capture Boolean search expressions.
 * - Provide query syntax shortcuts.
 * - Validate query syntax reactively.
 * - Display validation errors and warnings.
 * - Emit normalized search expressions.
 *
 * Search execution and API communication are handled
 * by the parent container.
 */
@Component({
  selector: 'app-search-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form
      class="search-form"
      role="search"
      (submit)="submit($event)"
      novalidate
    >

      <label for="search-query" class="search-label">
        Search academic research
      </label>

      <div
        class="search-field"
        [class.has-error]="showErrors()"
        [class.is-loading]="busy()"
      >

        <svg
          class="search-icon"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          focusable="false"
        >
          <circle
            cx="11"
            cy="11"
            r="7"
            stroke="currentColor"
            stroke-width="1.8"
          />

          <path
            d="m20 20-3.5-3.5"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
          />
        </svg>

        <input
          #queryInput
          id="search-query"
          name="q"
          type="search"
          class="search-input"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          [attr.maxlength]="maxLength + 50"
          [value]="draft()"
          [disabled]="busy()"
          [placeholder]="'e.g. (drone AND (package OR delivery))'"
          [attr.aria-invalid]="showErrors() ? 'true' : 'false'"
          aria-describedby="search-hint search-feedback"
          (input)="onInput($event)"
        />

        @if (draft()) {
          <button
            type="button"
            class="clear-button"
            aria-label="Clear search"
            [disabled]="busy()"
            (click)="clear()"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              focusable="false"
            >
              <path
                d="m6 6 12 12M18 6 6 18"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
              />
            </svg>
          </button>
        }

        <button
          type="submit"
          class="search-submit"
          [disabled]="busy() || !draft().trim()"
        >
          @if (busy()) {
            <span class="loading-spinner" aria-hidden="true"></span>
            <span>Searching</span>
          } @else {
            <span>Search</span>

            <svg
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              focusable="false"
            >
              <path
                d="M5 12h14m-6-6 6 6-6 6"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          }
        </button>

      </div>

      <div class="search-meta">

        <div class="operator-section">
          <span class="operator-label">
            Boolean operators
          </span>

          <div
            class="operator-chips"
            role="group"
            aria-label="Insert Boolean operators and syntax"
          >
            @for (snippet of operators; track snippet) {
              <button
                type="button"
                class="operator-chip"
                [disabled]="busy()"
                [attr.aria-label]="'Insert ' + snippet"
                (click)="insert(snippet)"
              >
                {{ snippet }}
              </button>
            }
          </div>
        </div>

        <p id="search-hint" class="search-hint">
          Combine terms with uppercase AND, OR and NOT.
          Use parentheses for grouping and quotation marks for exact phrases.
        </p>

      </div>

      <div
        id="search-feedback"
        class="search-feedback"
        aria-live="polite"
        aria-atomic="true"
      >
        @if (showErrors()) {
          <div class="feedback-panel feedback-error">
            <div class="feedback-heading">
              <span class="feedback-icon" aria-hidden="true">!</span>
              <strong>Check your search expression</strong>
            </div>

            <ul>
              @for (error of validation().errors; track $index) {
                <li>{{ error.message }}</li>
              }
            </ul>
          </div>
        } @else if (showWarnings()) {
          <div class="feedback-panel feedback-warning">
            <div class="feedback-heading">
              <span class="feedback-icon" aria-hidden="true">i</span>
              <strong>Search suggestion</strong>
            </div>

            <ul>
              @for (warning of validation().warnings; track $index) {
                <li>{{ warning.message }}</li>
              }
            </ul>
          </div>
        }
      </div>

      <div class="search-footer">
        <span class="syntax-indicator">
          <span class="status-dot" aria-hidden="true"></span>
          Boolean syntax validation enabled
        </span>

        <span class="character-count">
          {{ draft().length }} / {{ maxLength }} characters
        </span>
      </div>

    </form>
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
      color: #252525;
    }

    .search-form {
      width: 100%;
    }

    /* Search label */

    .search-label {
      display: block;
      margin-bottom: 11px;
      color: #454545;
      font-size: 12px;
      font-weight: 650;
      letter-spacing: 0.1px;
    }

    /* Main search field */

    .search-field {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      min-height: 64px;
      padding: 8px 9px 8px 18px;
      background: #ffffff;
      border: 1px solid #dededb;
      border-radius: 10px;
      box-shadow: 0 3px 12px rgba(0, 0, 0, 0.035);
      transition:
        border-color 0.2s ease,
        box-shadow 0.2s ease;
    }

    .search-field:focus-within {
      border-color: #777773;
      box-shadow: 0 0 0 3px rgba(80, 80, 80, 0.08);
    }

    .search-field.has-error {
      border-color: #bd6868;
    }

    .search-field.is-loading {
      background: #fafafa;
    }

    .search-icon {
      flex: 0 0 21px;
      width: 21px;
      height: 21px;
      color: #858580;
    }

    .search-input {
      flex: 1;
      width: 100%;
      min-width: 0;
      padding: 10px 0;
      color: #292929;
      background: transparent;
      border: 0;
      outline: none;
      font-family: inherit;
      font-size: 14px;
      line-height: 1.5;
    }

    .search-input::placeholder {
      color: #aaa9a4;
      opacity: 1;
    }

    .search-input:disabled {
      cursor: not-allowed;
      opacity: 0.65;
    }

    .search-input::-webkit-search-cancel-button {
      display: none;
    }

    /* Clear button */

    .clear-button {
      display: inline-flex;
      flex: 0 0 32px;
      width: 32px;
      height: 32px;
      align-items: center;
      justify-content: center;
      padding: 0;
      color: #777773;
      background: transparent;
      border: 0;
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.2s ease;
    }

    .clear-button svg {
      width: 17px;
      height: 17px;
    }

    .clear-button:hover:not(:disabled) {
      background: #f0f0ee;
    }

    /* Submit button */

    .search-submit {
      display: inline-flex;
      flex: 0 0 auto;
      min-width: 112px;
      min-height: 46px;
      align-items: center;
      justify-content: center;
      gap: 9px;
      padding: 0 18px;
      color: #ffffff;
      background: #30302f;
      border: 1px solid #30302f;
      border-radius: 7px;
      font-family: inherit;
      font-size: 12px;
      font-weight: 650;
      cursor: pointer;
      transition:
        background 0.2s ease,
        transform 0.2s ease,
        opacity 0.2s ease;
    }

    .search-submit svg {
      width: 16px;
      height: 16px;
    }

    .search-submit:hover:not(:disabled) {
      background: #494947;
      transform: translateY(-1px);
    }

    .search-submit:disabled {
      cursor: not-allowed;
      opacity: 0.55;
    }

    /* Loading indicator */

    .loading-spinner {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255, 255, 255, 0.35);
      border-top-color: #ffffff;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    /* Operator controls */

    .search-meta {
      display: flex;
      flex-direction: column;
      gap: 13px;
      margin-top: 17px;
    }

    .operator-section {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 12px;
    }

    .operator-label {
      color: #777773;
      font-size: 10px;
      font-weight: 650;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }

    .operator-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 7px;
    }

    .operator-chip {
      min-width: 43px;
      min-height: 30px;
      padding: 5px 11px;
      color: #444441;
      background: #f1f1ef;
      border: 1px solid #e7e7e4;
      border-radius: 5px;
      font-family: inherit;
      font-size: 11px;
      font-weight: 650;
      cursor: pointer;
      transition:
        background 0.2s ease,
        border-color 0.2s ease,
        color 0.2s ease;
    }

    .operator-chip:hover:not(:disabled) {
      color: #ffffff;
      background: #444441;
      border-color: #444441;
    }

    .operator-chip:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }

    /* Search guidance */

    .search-hint {
      margin: 0;
      color: #888883;
      font-size: 11px;
      line-height: 1.7;
    }

    /* Validation feedback */

    .search-feedback {
      margin-top: 12px;
    }

    .feedback-panel {
      padding: 13px 15px;
      border: 1px solid;
      border-radius: 7px;
    }

    .feedback-error {
      color: #8f4141;
      background: #fbf5f4;
      border-color: #ead2cf;
    }

    .feedback-warning {
      color: #76633a;
      background: #faf8f1;
      border-color: #e8e0c9;
    }

    .feedback-heading {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
    }

    .feedback-icon {
      display: inline-flex;
      width: 17px;
      height: 17px;
      align-items: center;
      justify-content: center;
      border: 1px solid currentColor;
      border-radius: 50%;
      font-size: 10px;
      font-weight: 700;
    }

    .feedback-panel ul {
      display: flex;
      flex-direction: column;
      gap: 5px;
      margin: 9px 0 0;
      padding-left: 25px;
      font-size: 11px;
      line-height: 1.6;
    }

    /* Footer metadata */

    .search-footer {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-top: 15px;
    }

    .syntax-indicator {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      color: #858580;
      font-size: 10px;
    }

    .status-dot {
      width: 7px;
      height: 7px;
      background: #777773;
      border-radius: 50%;
    }

    .character-count {
      color: #999994;
      font-size: 10px;
      font-variant-numeric: tabular-nums;
    }

    /* Keyboard accessibility */

    .search-form button:focus-visible {
      outline: 3px solid rgba(80, 80, 80, 0.3);
      outline-offset: 3px;
    }

    /* Responsive layout */

    @media (max-width: 600px) {
      .search-field {
        min-height: 56px;
        gap: 8px;
        padding: 6px 7px 6px 12px;
      }

      .search-icon {
        width: 18px;
        height: 18px;
        flex-basis: 18px;
      }

      .search-input {
        font-size: 12px;
      }

      .search-submit {
        min-width: 82px;
        min-height: 42px;
        gap: 5px;
        padding: 0 11px;
        font-size: 11px;
      }

      .search-submit svg {
        display: none;
      }

      .operator-section {
        align-items: flex-start;
        flex-direction: column;
        gap: 8px;
      }

      .search-footer {
        align-items: flex-start;
        flex-direction: column;
      }
    }

    @media (max-width: 380px) {
      .search-field {
        gap: 6px;
        padding-left: 9px;
      }

      .search-submit {
        min-width: 70px;
        padding: 0 8px;
      }

      .search-input {
        font-size: 11px;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      *,
      *::before,
      *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
    }
  `,
})
export class SearchBar {
  /** Current search expression supplied by the parent. */
  readonly query = input('');

  /** Indicates whether a search request is in progress. */
  readonly busy = input(false);

  /** Emits a validated and normalized search expression. */
  readonly search = output<string>();

  protected readonly operators = OPERATOR_SNIPPETS;
  protected readonly maxLength = MAX_QUERY_LENGTH;

  protected readonly draft = signal('');
  private readonly attempted = signal(false);

  private readonly inputRef =
    viewChild.required<ElementRef<HTMLInputElement>>('queryInput');

  /** Reactive validation of the current search expression. */
  protected readonly validation = computed(() =>
    validateQuery(this.draft()),
  );

  /** Determines when validation errors should be visible. */
  protected readonly showErrors = computed(() => {
    const result = this.validation();

    if (result.valid) {
      return false;
    }

    const hasContent = this.draft().trim().length > 0;

    return (
      this.attempted() ||
      (
        hasContent &&
        result.errors.some((error) => error.position !== null)
      )
    );
  });

  /** Displays warnings only for otherwise valid expressions. */
  protected readonly showWarnings = computed(() => {
    const result = this.validation();

    return (
      result.valid &&
      result.warnings.length > 0 &&
      this.draft().trim().length > 0
    );
  });

  /** Tracks the current character count. */
  protected readonly characterCount = computed(() =>
    this.draft().length,
  );

  constructor() {
    /**
     * Keep the local draft synchronized with the parent query.
     * This supports restoring searches from history and URL state.
     */
    effect(() => {
      this.draft.set(this.query());
      this.attempted.set(false);
    });
  }

  /**
   * Updates the local search expression.
   */
  protected onInput(event: Event): void {
    const target = event.target;

    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    this.draft.set(target.value);
    this.attempted.set(false);
  }

  /**
   * Validates and emits the normalized search expression.
   */
  protected submit(event: Event): void {
    event.preventDefault();

    if (this.busy()) {
      return;
    }

    this.attempted.set(true);

    const result = this.validation();

    if (!result.valid) {
      this.inputRef().nativeElement.focus();
      return;
    }

    this.search.emit(result.normalized);
  }

  /**
 * Clears the search expression, notifies the parent,
 * and restores input focus.
 */
protected clear(): void {
  if (this.busy()) {
    return;
  }

  this.draft.set('');
  this.attempted.set(false);

  this.search.emit('');

  this.inputRef().nativeElement.focus();
}

  /**
   * Inserts an operator or wraps selected text with syntax.
   */
  protected insert(snippet: OperatorSnippet): void {
    if (this.busy()) {
      return;
    }

    const element = this.inputRef().nativeElement;
    const currentValue = this.draft();

    const start = element.selectionStart ?? currentValue.length;
    const end = element.selectionEnd ?? currentValue.length;

    const selectedText = currentValue.slice(start, end);

    let insertion: string;
    let caretPosition: number;

    if (snippet === '( )' || snippet === '" "') {
      const [opening, closing] =
        snippet === '( )' ? ['(', ')'] : ['"', '"'];

      insertion = `${opening}${selectedText}${closing}`;

      caretPosition = selectedText
        ? start + insertion.length
        : start + opening.length;
    } else {
      const prefix =
        start > 0 && !/\s$/.test(currentValue.slice(0, start))
          ? ' '
          : '';

      insertion = `${prefix}${snippet} `;

      caretPosition = start + insertion.length;
    }

    const updatedValue =
      currentValue.slice(0, start) +
      insertion +
      currentValue.slice(end);

    this.draft.set(updatedValue);
    this.attempted.set(false);

    /**
     * Restore the cursor after Angular updates the input value.
     */
    queueMicrotask(() => {
      element.focus();

      const safePosition = Math.min(
        caretPosition,
        updatedValue.length,
      );

      element.setSelectionRange(
        safePosition,
        safePosition,
      );
    });
  }
}

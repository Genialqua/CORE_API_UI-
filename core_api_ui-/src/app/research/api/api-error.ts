import { HttpErrorResponse } from '@angular/common/http';

export type ApiErrorKind = 'rate-limit' | 'network' | 'bad-request' | 'unauthorized' | 'server' | 'unknown';

export interface ApiError {
  kind: ApiErrorKind;
  message: string;
  status: number | null;
  /** Seconds until the client may retry (only for rate-limit errors, when known). */
  retryAfterSeconds: number | null;
}

export function isApiError(value: unknown): value is ApiError {
  return typeof value === 'object' && value !== null && 'kind' in value && 'message' in value;
}

/** Retryable errors are transient: the same request may succeed a moment later. */
export function isRetryable(error: ApiError): boolean {
  return error.kind === 'network' || error.kind === 'server';
}

export function toApiError(error: unknown, now: () => number = Date.now): ApiError {
  if (isApiError(error)) return error;

  if (!(error instanceof HttpErrorResponse)) {
    return {
      kind: 'unknown',
      message: 'Something unexpected went wrong. Please try again.',
      status: null,
      retryAfterSeconds: null,
    };
  }

  const status = error.status;
  const serverMessage = extractServerMessage(error.error);

  if (status === 0) {
    return {
      kind: 'network',
      message: 'Could not reach the CORE API. Check your connection and try again.',
      status,
      retryAfterSeconds: null,
    };
  }
  if (status === 429) {
    return {
      kind: 'rate-limit',
      message: 'The CORE API rate limit was reached. Please wait a moment before searching again.',
      status,
      retryAfterSeconds: parseRetryAfter(error, now),
    };
  }
  if (status === 401 || status === 403) {
    return {
      kind: 'unauthorized',
      message: 'The CORE API rejected the request. Check that CORE_API_KEY is valid.',
      status,
      retryAfterSeconds: null,
    };
  }
  if (status >= 400 && status < 500) {
    return {
      kind: 'bad-request',
      message: serverMessage ?? 'CORE could not process this query. Review the search syntax and try again.',
      status,
      retryAfterSeconds: null,
    };
  }
  if (status >= 500) {
    return {
      kind: 'server',
      message: 'The CORE API is temporarily unavailable. Please try again shortly.',
      status,
      retryAfterSeconds: null,
    };
  }
  return {
    kind: 'unknown',
    message: serverMessage ?? 'Something unexpected went wrong. Please try again.',
    status,
    retryAfterSeconds: null,
  };
}

function extractServerMessage(body: unknown): string | null {
  if (typeof body === 'object' && body !== null && 'message' in body) {
    const message = (body as { message: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message.trim();
  }
  return null;
}

/** CORE sends `X-RateLimit-Retry-After` as an ISO timestamp; standard `Retry-After` is seconds. */
function parseRetryAfter(error: HttpErrorResponse, now: () => number): number | null {
  const coreHeader = error.headers?.get('X-RateLimit-Retry-After');
  if (coreHeader) {
    const at = Date.parse(coreHeader);
    if (!Number.isNaN(at)) return Math.max(1, Math.ceil((at - now()) / 1000));
  }
  const standard = error.headers?.get('Retry-After');
  if (standard && /^\d+$/.test(standard)) return Number(standard);
  return null;
}

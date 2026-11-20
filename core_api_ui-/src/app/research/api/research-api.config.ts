import { InjectionToken } from '@angular/core';

export interface CoreApiConfig {
  /** CORE API v3 base URL. */
  baseUrl: string;

  /** CORE API key. Visible in the browser when used by Angular. */
  apiKey: string;

  /** Maximum results CORE returns per request. */
  maxPageSize: number;

  /** Elasticsearch result window. */
  maxResultWindow: number;

  /** Number of automatic retries for transient failures. */
  retryCount: number;

  /** Delay between retries, in milliseconds. */
  retryDelayMs: number;
}

export const DEFAULT_CORE_API_CONFIG: CoreApiConfig = {
  baseUrl: 'https://api.core.ac.uk/v3',
  apiKey: 'TP0ZiU5pwfJgBGtXFQjykRbMHa8querN',
  maxPageSize: 100,
  maxResultWindow: 10_000,
  retryCount: 1,
  retryDelayMs: 800,
};

export const CORE_API_CONFIG =
  new InjectionToken<CoreApiConfig>('CORE_API_CONFIG', {
    providedIn: 'root',
    factory: () => DEFAULT_CORE_API_CONFIG,
  });
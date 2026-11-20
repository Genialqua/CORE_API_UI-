
/**
 * Represents a normalized research publication used across the application.
 *
 * API-specific response structures should be mapped to this interface
 * before reaching application components.
 */
export interface Paper {
  /** Unique publication identifier. */
  id: string;

  /** Publication title. */
  title: string;

  /** Authors associated with the publication. */
  authors: string[];

  /** Publication year, when available. */
  year: number | null;

  /** Original publication date in ISO 8601 format, when available. */
  publishedDate: string | null;

  /** Publication abstract or summary. */
  abstract: string | null;

  /** Publishing organization. */
  publisher: string | null;

  /** Journal or conference in which the work appeared. */
  journal: string | null;

  /** Digital Object Identifier, when available. */
  doi: string | null;

  /** Resolvable DOI URL, when available. */
  doiUrl: string | null;

  /** URL of the publication's record in the data provider. */
  coreUrl: string;

  /** Direct download URL, when available. */
  downloadUrl: string | null;

  /** Number of citations associated with the publication. */
  citationCount: number;

  /** Publication classification, e.g. journal article or conference paper. */
  documentType: string | null;

  /** Primary research discipline, when available. */
  fieldOfStudy: string | null;

  /** Publication language, when available. */
  language: string | null;

  /** Sources that contributed the publication record. */
  dataProviders: string[];
}

/** Supported publication sorting strategies. */
export type SortOption =
  | 'relevance'
  | 'newest'
  | 'oldest';

/** Parameters defining a research publication search. */
export interface SearchParams {
  /** Search expression, including supported Boolean operators. */
  query: string;

  /** Current one-based result page. */
  page: number;

  /** Maximum number of publications requested per page. */
  pageSize: number;

  /** Ordering applied to the search results. */
  sort: SortOption;

  /** Inclusive lower publication-year boundary. */
  yearFrom: number | null;

  /** Inclusive upper publication-year boundary. */
  yearTo: number | null;
}

/**
 * Result returned by the publication search layer.
 */
export interface SearchResult {
  /**
   * Exact query submitted to the search provider,
   * including applied filters.
   */
  coreQuery: string;

  /** Total number of matching publications reported by the provider. */
  totalHits: number;

  /** Current one-based result page. */
  page: number;

  /** Number of publications requested per page. */
  pageSize: number;

  /** Normalized publications returned for the current page. */
  papers: Paper[];
}

/** Fields supported by the publication aggregation layer. */
export type AggregationField =
  | 'yearPublished'
  | 'publisher'
  | 'documentType';

/**
 * Aggregated publication counts grouped by field value.
 *
 * Example:
 * {
 *   yearPublished: { "2023": 15, "2024": 28 },
 *   publisher: { "Example Publisher": 12 }
 * }
 */
export type Aggregations = Partial<
  Record<AggregationField, Record<string, number>>
>;

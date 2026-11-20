/**
 * Raw response shapes returned by the CORE API v3.
 * Only the fields this application consumes are typed; every field is treated as optional/nullable
 * because CORE aggregates metadata from thousands of repositories and coverage is inconsistent.
 * @see https://api.core.ac.uk/docs/v3
 */
export interface CoreAuthorDto {
  name?: string | null;
}

export interface CoreJournalDto {
  title?: string | null;
  identifiers?: string[] | null;
}

export interface CoreLinkDto {
  type?: string | null;
  url?: string | null;
}

export interface CoreDataProviderDto {
  id?: number | null;
  name?: string | null;
  url?: string | null;
}

export interface CoreLanguageDto {
  code?: string | null;
  name?: string | null;
}

export interface CoreWorkDto {
  id: number | string;
  title?: string | null;
  authors?: CoreAuthorDto[] | null;
  yearPublished?: number | null;
  publishedDate?: string | null;
  abstract?: string | null;
  publisher?: string | null;
  journals?: CoreJournalDto[] | null;
  doi?: string | null;
  arxivId?: string | null;
  downloadUrl?: string | null;
  links?: CoreLinkDto[] | null;
  citationCount?: number | null;
  documentType?: string | null;
  fieldOfStudy?: string | null;
  language?: CoreLanguageDto | null;
  dataProviders?: CoreDataProviderDto[] | null;
}

export interface CoreSearchResponseDto {
  totalHits: number;
  limit: number;
  offset: number;
  searchId?: string;
  results: CoreWorkDto[];
}

export interface CoreAggregateResponseDto {
  aggregations: Record<string, Record<string, number>>;
}

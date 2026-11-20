import { CoreWorkDto } from '../models/research-api.types';
import { Paper } from '../models/paper.model';

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

/** Decodes HTML entities, which CORE frequently leaves escaped in abstracts and titles. */
export function decodeEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);?/gi, (match, entity: string) => {
    if (entity[0] === '#') {
      const code = entity[1]?.toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : match;
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });
}

/** Produces plain text: decodes entities (twice, as some sources double-escape), strips markup, collapses whitespace. */
export function cleanText(value: string | null | undefined): string | null {
  if (!value) return null;
  const text = decodeEntities(decodeEntities(value))
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text || null;
}

function normaliseDoi(doi: string | null | undefined): string | null {
  if (!doi) return null;
  const trimmed = doi.trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').replace(/^doi:/i, '');
  return trimmed || null;
}

function safeHttpUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function uniqueNonEmpty(values: (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of values) {
    const value = cleanText(raw);
    if (value && !seen.has(value.toLowerCase())) {
      seen.add(value.toLowerCase());
      result.push(value);
    }
  }
  return result;
}

export function mapCoreWork(dto: CoreWorkDto): Paper {
  const id = String(dto.id);
  const doi = normaliseDoi(dto.doi);
  const displayLink = dto.links?.find((link) => link?.type === 'display')?.url;
  const year =
    typeof dto.yearPublished === 'number' && dto.yearPublished > 0 && dto.yearPublished < 3000 ? dto.yearPublished : null;

  return {
    id,
    title: cleanText(dto.title) ?? 'Untitled publication',
    authors: uniqueNonEmpty((dto.authors ?? []).map((author) => author?.name)),
    year,
    publishedDate: dto.publishedDate || null,
    abstract: cleanText(dto.abstract),
    publisher: cleanText(dto.publisher),
    journal: cleanText(dto.journals?.find((journal) => journal?.title)?.title),
    doi,
    doiUrl: doi ? `https://doi.org/${encodeURI(doi)}` : null,
    coreUrl: safeHttpUrl(displayLink) ?? `https://core.ac.uk/works/${encodeURIComponent(id)}`,
    downloadUrl: safeHttpUrl(dto.downloadUrl),
    citationCount: typeof dto.citationCount === 'number' && dto.citationCount > 0 ? dto.citationCount : 0,
    documentType: cleanText(dto.documentType),
    fieldOfStudy: cleanText(dto.fieldOfStudy),
    language: cleanText(dto.language?.name),
    dataProviders: uniqueNonEmpty((dto.dataProviders ?? []).map((provider) => provider?.name)),
  };
}

import { Paper } from '../../research/models/paper.model';

const CSV_COLUMNS: { header: string; value: (paper: Paper) => string | number | null }[] = [
  { header: 'Title', value: (p) => p.title },
  { header: 'Authors', value: (p) => p.authors.join('; ') },
  { header: 'Year', value: (p) => p.year },
  { header: 'Publisher', value: (p) => p.publisher },
  { header: 'Journal', value: (p) => p.journal },
  { header: 'Document type', value: (p) => p.documentType },
  { header: 'Citations', value: (p) => p.citationCount },
  { header: 'DOI', value: (p) => p.doi },
  { header: 'CORE URL', value: (p) => p.coreUrl },
  { header: 'Full text URL', value: (p) => p.downloadUrl },
  { header: 'Abstract', value: (p) => p.abstract },
];

export function escapeCsvCell(value: string | number | null): string {
  if (value === null || value === undefined) return '';
  let text = String(value);
  // Neutralise spreadsheet formula injection.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function papersToCsv(papers: Paper[]): string {
  const header = CSV_COLUMNS.map((column) => escapeCsvCell(column.header)).join(',');
  const rows = papers.map((paper) => CSV_COLUMNS.map((column) => escapeCsvCell(column.value(paper))).join(','));
  return [header, ...rows].join('\r\n');
}

export function papersToJson(papers: Paper[]): string {
  return JSON.stringify(papers, null, 2);
}

/** Builds an APA-style reference string. */
export function formatCitation(paper: Paper): string {
  const authors =
    paper.authors.length === 0
      ? ''
      : paper.authors.length > 3
        ? `${paper.authors.slice(0, 3).join(', ')}, et al.`
        : paper.authors.join(', ');
  const parts = [
    authors,
    `(${paper.year ?? 'n.d.'}).`,
    `${paper.title.replace(/\.$/, '')}.`,
    paper.journal ?? paper.publisher ? `${paper.journal ?? paper.publisher}.` : '',
    paper.doiUrl ?? paper.coreUrl,
  ];
  return parts.filter(Boolean).join(' ');
}

export function slugifyQuery(query: string): string {
  return (
    query
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'results'
  );
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

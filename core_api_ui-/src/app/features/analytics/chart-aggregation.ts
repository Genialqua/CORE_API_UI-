import { Paper } from '../../research/models/paper.model';
import { MIN_YEAR, maxYear } from '../../research/search/search_params';

export interface ChartDatum {
  label: string;
  value: number;
}

export interface TrendSummary {
  total: number;
  peakYear: string | null;
  peakCount: number;
  firstYear: string | null;
  lastYear: string | null;
  /** Share (0-1) of dated publications from the most recent five complete years. */
  recentShare: number;
}

/**
 * Converts a CORE `yearPublished` aggregation into a continuous, chronologically sorted series.
 * Invalid years (CORE contains placeholders such as 9999) are dropped and gaps are filled with 0
 * so the chart shows real gaps rather than misleadingly connected bars.
 */
export function yearSeries(
  counts: Record<string, number> | undefined,
  options: { minYear?: number; maxYear?: number; fillGaps?: boolean } = {},
): ChartDatum[] {
  const min = options.minYear ?? MIN_YEAR;
  const max = options.maxYear ?? maxYear();
  const valid = new Map<number, number>();

  for (const [key, count] of Object.entries(counts ?? {})) {
    const year = Number(key);
    if (Number.isInteger(year) && year >= min && year <= max && count > 0) {
      valid.set(year, (valid.get(year) ?? 0) + count);
    }
  }
  if (valid.size === 0) return [];

  const years = [...valid.keys()].sort((a, b) => a - b);
  if (options.fillGaps === false) return years.map((year) => ({ label: String(year), value: valid.get(year)! }));

  const series: ChartDatum[] = [];
  for (let year = years[0]; year <= years[years.length - 1]; year++) {
    series.push({ label: String(year), value: valid.get(year) ?? 0 });
  }
  return series;
}

/** Aggregates publication years from already-loaded papers (fallback when server aggregation fails). */
export function yearCountsFromPapers(papers: Paper[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const paper of papers) {
    if (paper.year !== null) counts[paper.year] = (counts[paper.year] ?? 0) + 1;
  }
  return counts;
}

/**
 * Returns the top N entries, merging labels that differ only in case/whitespace
 * (e.g. "Elsevier BV" and "elsevier bv") and labelling the merged entry with its most common spelling.
 */
export function topEntries(counts: Record<string, number> | undefined, limit = 10): ChartDatum[] {
  const groups = new Map<string, { total: number; best: string; bestCount: number }>();
  for (const [rawLabel, count] of Object.entries(counts ?? {})) {
    const label = rawLabel.replace(/\s+/g, ' ').trim();
    if (!label || count <= 0 || /^(unknown|null|n\/a)$/i.test(label)) continue;
    const key = label.toLowerCase();
    const group = groups.get(key);
    if (!group) {
      groups.set(key, { total: count, best: label, bestCount: count });
    } else {
      group.total += count;
      if (count > group.bestCount) {
        group.best = label;
        group.bestCount = count;
      }
    }
  }
  return [...groups.values()]
    .map((group) => ({ label: group.best, value: group.total }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
    .slice(0, limit);
}

/** Counts author appearances across papers (authors listed once per paper). */
export function authorCounts(papers: Paper[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const paper of papers) {
    for (const author of new Set(paper.authors)) counts[author] = (counts[author] ?? 0) + 1;
  }
  return counts;
}

export function summarizeTrend(series: ChartDatum[], currentYear = new Date().getFullYear()): TrendSummary {
  const dated = series.filter((datum) => datum.value > 0);
  const total = series.reduce((sum, datum) => sum + datum.value, 0);
  if (dated.length === 0) {
    return { total: 0, peakYear: null, peakCount: 0, firstYear: null, lastYear: null, recentShare: 0 };
  }
  const peak = dated.reduce((best, datum) => (datum.value > best.value ? datum : best));
  const recent = series
    .filter((datum) => Number(datum.label) >= currentYear - 5 && Number(datum.label) < currentYear)
    .reduce((sum, datum) => sum + datum.value, 0);
  return {
    total,
    peakYear: peak.label,
    peakCount: peak.value,
    firstYear: dated[0].label,
    lastYear: dated[dated.length - 1].label,
    recentShare: total > 0 ? recent / total : 0,
  };
}


import { Paper } from '../../../research/models/paper.model';
import { MIN_YEAR, maxYear } from '../../../research/search/search_params';

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
  /** Share (0–1) of dated publications from the most recent five complete years. */
  recentShare: number;
}

interface NormalizedEntry {
  label: string;
  value: number;
}

function isValidCount(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function normalizeLabel(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

/**
 * Converts publication-year aggregation data into a chronological series.
 *
 * - Excludes invalid years and placeholder values.
 * - Combines duplicate year entries.
 * - Optionally fills missing years with zero values.
 */
export function yearSeries(
  counts: Record<string, number> | undefined,
  options: {
    minYear?: number;
    maxYear?: number;
    fillGaps?: boolean;
  } = {},
): ChartDatum[] {
  const min = options.minYear ?? MIN_YEAR;
  const max = options.maxYear ?? maxYear();

  if (
    !Number.isInteger(min) ||
    !Number.isInteger(max) ||
    min > max
  ) {
    return [];
  }

  const valid = new Map<number, number>();

  for (const [key, count] of Object.entries(counts ?? {})) {
    const year = Number(key);

    if (
      !Number.isInteger(year) ||
      year < min ||
      year > max ||
      !isValidCount(count)
    ) {
      continue;
    }

    valid.set(year, (valid.get(year) ?? 0) + count);
  }

  if (valid.size === 0) return [];

  const years = [...valid.keys()].sort((a, b) => a - b);

  if (options.fillGaps === false) {
    return years.map((year) => ({
      label: String(year),
      value: valid.get(year)!,
    }));
  }

  const firstYear = years[0];
  const lastYear = years[years.length - 1];

  const series: ChartDatum[] = [];

  for (let year = firstYear; year <= lastYear; year++) {
    series.push({
      label: String(year),
      value: valid.get(year) ?? 0,
    });
  }

  return series;
}

/**
 * Aggregates publication years from loaded papers.
 * Used as a fallback when server-side aggregation is unavailable.
 */
export function yearCountsFromPapers(
  papers: Paper[],
): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const paper of papers) {
    const year = paper.year;

    if (
      year === null ||
      !Number.isInteger(year) ||
      year < MIN_YEAR ||
      year > maxYear()
    ) {
      continue;
    }

    const key = String(year);
    counts[key] = (counts[key] ?? 0) + 1;
  }

  return counts;
}

/**
 * Returns the top N entries.
 *
 * Labels differing only by case or whitespace are merged.
 * The most frequently occurring spelling is retained.
 */
export function topEntries(
  counts: Record<string, number> | undefined,
  limit = 10,
): ChartDatum[] {
  if (!Number.isInteger(limit) || limit <= 0) {
    return [];
  }

  const groups = new Map<
    string,
    {
      total: number;
      best: string;
      bestCount: number;
    }
  >();

  for (const [rawLabel, count] of Object.entries(counts ?? {})) {
    const label = normalizeLabel(rawLabel);

    if (
      !label ||
      !isValidCount(count) ||
      /^(unknown|null|n\/a)$/i.test(label)
    ) {
      continue;
    }

    const key = label.toLocaleLowerCase();
    const group = groups.get(key);

    if (!group) {
      groups.set(key, {
        total: count,
        best: label,
        bestCount: count,
      });

      continue;
    }

    group.total += count;

    if (count > group.bestCount) {
      group.best = label;
      group.bestCount = count;
    }
  }

  return [...groups.values()]
    .map((group) => ({
      label: group.best,
      value: group.total,
    }))
    .sort(
      (a, b) =>
        b.value - a.value ||
        a.label.localeCompare(b.label),
    )
    .slice(0, limit);
}

/**
 * Counts author appearances across loaded papers.
 * Each normalized author name is counted once per paper.
 */
export function authorCounts(
  papers: Paper[],
): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const paper of papers) {
    const authors = new Set(
      paper.authors
        .map(normalizeLabel)
        .filter(Boolean),
    );

    for (const author of authors) {
      counts[author] = (counts[author] ?? 0) + 1;
    }
  }

  return counts;
}

/**
 * Summarizes publication trends.
 *
 * Recent share represents the proportion of publications
 * from the five most recent complete calendar years.
 */
export function summarizeTrend(
  series: ChartDatum[],
  currentYear = new Date().getFullYear(),
): TrendSummary {
  const dated = series
    .filter(
      (datum) =>
        Number.isInteger(Number(datum.label)) &&
        isValidCount(datum.value),
    )
    .sort(
      (a, b) => Number(a.label) - Number(b.label),
    );

  const total = dated.reduce(
    (sum, datum) => sum + datum.value,
    0,
  );

  if (total === 0) {
    return {
      total: 0,
      peakYear: null,
      peakCount: 0,
      firstYear: null,
      lastYear: null,
      recentShare: 0,
    };
  }

  const peak = dated.reduce((best, datum) =>
    datum.value > best.value ? datum : best,
  );

  const recentTotal = dated
    .filter((datum) => {
      const year = Number(datum.label);

      return (
        year >= currentYear - 5 &&
        year < currentYear
      );
    })
    .reduce((sum, datum) => sum + datum.value, 0);

  return {
    total,
    peakYear: peak.label,
    peakCount: peak.value,
    firstYear: dated[0].label,
    lastYear: dated[dated.length - 1].label,
    recentShare: recentTotal / total,
  };
}

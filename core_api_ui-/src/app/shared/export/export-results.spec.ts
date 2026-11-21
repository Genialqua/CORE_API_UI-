import { cleanText, decodeEntities } from '../../research/api/research-work.mapper';
import { topEntries, yearCountsFromPapers, yearSeries } from '../../features/analytics/chart-aggregation';
import { escapeCsvCell, slugifyQuery } from './export-results';
import { Paper } from '../../research/models/paper.model';

describe('export helpers', () => {
  it('escapes CSV cells with commas, quotes and newlines', () => {
    expect(escapeCsvCell('plain')).toBe('plain');
    expect(escapeCsvCell('a, b')).toBe('"a, b"');
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvCell(null)).toBe('');
  });

  it('neutralises spreadsheet formula injection', () => {
    expect(escapeCsvCell('=SUM(A1)')).not.toMatch(/^=/);
  });

  it('slugifies queries for filenames', () => {
    expect(slugifyQuery('drone AND (package OR delivery)')).toMatch(/^[a-z0-9-]+$/);
  });
});

describe('mapper text cleaning', () => {
  it('decodes HTML entities and trims', () => {
    expect(decodeEntities('A &amp; B')).toBe('A & B');
    expect(cleanText('  ')).toBeNull();
  });
});

describe('chart aggregation', () => {
  it('fills gaps in year series', () => {
    const series = yearSeries({ '2018': 2, '2020': 5 }, { fillGaps: true });
    expect(series.map((d) => d.label)).toEqual(['2018', '2019', '2020']);
    expect(series[1].value).toBe(0);
  });

  it('counts years from papers', () => {
    const papers = [{ year: 2020 }, { year: 2020 }, { year: null }] as Paper[];
    expect(yearCountsFromPapers(papers)).toEqual({ '2020': 2 });
  });

  it('returns top entries sorted by count', () => {
    const top = topEntries({ a: 1, b: 5, c: 3 }, 2);
    expect(top.map((d) => d.label)).toEqual(['b', 'c']);
  });
});

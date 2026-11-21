/// <reference types="jasmine" />

import {
  authorCounts,
  summarizeTrend,
  topEntries,
  yearCountsFromPapers,
  yearSeries,
} from './chart-aggregation';

import type { Paper } from '../../research/models/paper.model';

describe('Chart aggregation utilities', () => {
  describe('yearSeries', () => {
    it('should convert yearly counts into chart data', () => {
      const result = yearSeries({
        2022: 10,
        2023: 15,
        2024: 20,
      });

      expect(result).toEqual([
        { label: '2022', value: 10 },
        { label: '2023', value: 15 },
        { label: '2024', value: 20 },
      ]);
    });

    it('should return an empty array for empty input', () => {
      expect(yearSeries({})).toEqual([]);
    });
  });

  describe('topEntries', () => {
    it('should return entries ordered by descending count', () => {
      const result = topEntries({
        Journal: 10,
        Conference: 25,
        Book: 5,
      });

      expect(result[0]).toEqual({
        label: 'Conference',
        value: 25,
      });

      expect(result[1].label).toBe('Journal');
    });

    it('should ignore invalid and empty labels', () => {
      const result = topEntries({
        Journal: 10,
        '': 5,
        'N/A': 8,
      });

      expect(result).toEqual([
        { label: 'Journal', value: 10 },
      ]);
    });
  });

  describe('yearCountsFromPapers', () => {
    it('should count papers by publication year', () => {
      const papers = [
        { year: 2022 },
        { year: 2022 },
        { year: 2023 },
      ] as Paper[];

      expect(yearCountsFromPapers(papers)).toEqual({
        2022: 2,
        2023: 1,
      });
    });

    it('should return empty counts when no papers are supplied', () => {
      expect(yearCountsFromPapers([])).toEqual({});
    });
  });

  describe('authorCounts', () => {
    it('should count authors across papers', () => {
      const papers = [
        { authors: ['Alice', 'Bob'] },
        { authors: ['Alice', 'Charlie'] },
      ] as Paper[];

      const result = authorCounts(papers);

      expect(result['Alice']).toBe(2);
      expect(result['Bob']).toBe(1);
      expect(result['Charlie']).toBe(1);
    });
  });

  describe('summarizeTrend', () => {
    it('should calculate total publications and peak year', () => {
      const result = summarizeTrend(
        [
          { label: '2022', value: 10 },
          { label: '2023', value: 20 },
          { label: '2024', value: 15 },
        ],
        2025,
      );

      expect(result.total).toBe(45);
      expect(result.peakYear).toBe('2023');
      expect(result.peakCount).toBe(20);
      expect(result.firstYear).toBe('2022');
      expect(result.lastYear).toBe('2024');
    });

    it('should return zero totals for empty data', () => {
      const result = summarizeTrend([], 2025);

      expect(result.total).toBe(0);
      expect(result.peakYear).toBeNull();
      expect(result.peakCount).toBe(0);
    });
  });
});

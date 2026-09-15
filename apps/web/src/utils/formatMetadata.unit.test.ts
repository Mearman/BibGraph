/**
 * Unit tests for formatMetadata utility
 */

import { describe, expect, it } from 'vitest';

import type {
  AffiliationMetadata,
  AuthorshipMetadata,
  CitationMetadata,
  FundingMetadata,
  LineageMetadata,
} from '@/types/relationship';

import { formatMetadata } from './formatMetadata';

describe('formatMetadata', () => {
  describe('authorship metadata', () => {
    it('formats position with ordinal suffix', () => {
      const metadata: AuthorshipMetadata = { type: 'authorship', position: 1 };
      expect(formatMetadata(metadata)).toBe('1st author');
    });

    it('formats various ordinal positions correctly', () => {
      expect(formatMetadata({ type: 'authorship', position: 2 })).toBe('2nd author');
      expect(formatMetadata({ type: 'authorship', position: 3 })).toBe('3rd author');
      expect(formatMetadata({ type: 'authorship', position: 4 })).toBe('4th author');
      expect(formatMetadata({ type: 'authorship', position: 11 })).toBe('11th author');
      expect(formatMetadata({ type: 'authorship', position: 21 })).toBe('21st author');
    });

    it('indicates corresponding author', () => {
      const metadata: AuthorshipMetadata = { type: 'authorship', isCorresponding: true };
      expect(formatMetadata(metadata)).toBe('corresponding');
    });

    it('combines position and corresponding status', () => {
      const metadata: AuthorshipMetadata = {
        type: 'authorship',
        position: 1,
        isCorresponding: true,
      };
      expect(formatMetadata(metadata)).toBe('1st author · corresponding');
    });

    it('shows single affiliation', () => {
      const metadata: AuthorshipMetadata = {
        type: 'authorship',
        affiliations: ['MIT'],
      };
      expect(formatMetadata(metadata)).toBe('MIT');
    });

    it('shows affiliation count for multiple affiliations', () => {
      const metadata: AuthorshipMetadata = {
        type: 'authorship',
        affiliations: ['MIT', 'Stanford', 'Harvard'],
      };
      expect(formatMetadata(metadata)).toBe('3 affiliations');
    });

    it('combines all authorship fields', () => {
      const metadata: AuthorshipMetadata = {
        type: 'authorship',
        position: 2,
        isCorresponding: true,
        affiliations: ['MIT'],
      };
      expect(formatMetadata(metadata)).toBe('2nd author · corresponding · MIT');
    });

    it('returns empty string for empty authorship metadata', () => {
      const metadata: AuthorshipMetadata = { type: 'authorship' };
      expect(formatMetadata(metadata)).toBe('');
    });
  });

  describe('citation metadata', () => {
    it('formats year', () => {
      const metadata: CitationMetadata = { type: 'citation', year: 2023 };
      expect(formatMetadata(metadata)).toBe('2023');
    });

    it('formats short context', () => {
      const metadata: CitationMetadata = {
        type: 'citation',
        context: 'This study extends prior work',
      };
      expect(formatMetadata(metadata)).toBe('"This study extends prior work"');
    });

    it('truncates long context', () => {
      const QUOTES_AND_ELLIPSIS_ALLOWANCE = 5;
      const longContext =
        'This is a very long citation context that exceeds the maximum length allowed for display and should be truncated with an ellipsis character at the end';
      const metadata: CitationMetadata = { type: 'citation', context: longContext };
      const result = formatMetadata(metadata);
      expect(result.length).toBeLessThan(longContext.length + QUOTES_AND_ELLIPSIS_ALLOWANCE); // accounts for quotes and ellipsis
      expect(result).toContain('…');
    });

    it('combines year and context', () => {
      const metadata: CitationMetadata = {
        type: 'citation',
        year: 2023,
        context: 'Referenced for methodology',
      };
      expect(formatMetadata(metadata)).toBe('2023 · "Referenced for methodology"');
    });

    it('returns empty string for empty citation metadata', () => {
      const metadata: CitationMetadata = { type: 'citation' };
      expect(formatMetadata(metadata)).toBe('');
    });
  });

  describe('affiliation metadata', () => {
    it('indicates primary affiliation', () => {
      const metadata: AffiliationMetadata = { type: 'affiliation', isPrimary: true };
      expect(formatMetadata(metadata)).toBe('Primary');
    });

    it('formats date range with start and end', () => {
      const metadata: AffiliationMetadata = {
        type: 'affiliation',
        startDate: '2020-01-01',
        endDate: '2023-12-31',
      };
      expect(formatMetadata(metadata)).toBe('2020–2023');
    });

    it('formats ongoing affiliation', () => {
      const metadata: AffiliationMetadata = {
        type: 'affiliation',
        startDate: '2020-01-01',
      };
      expect(formatMetadata(metadata)).toBe('2020–present');
    });

    it('formats end date only', () => {
      const metadata: AffiliationMetadata = {
        type: 'affiliation',
        endDate: '2023-12-31',
      };
      expect(formatMetadata(metadata)).toBe('Until 2023');
    });

    it('combines primary with date range', () => {
      const metadata: AffiliationMetadata = {
        type: 'affiliation',
        isPrimary: true,
        startDate: '2020-01-01',
        endDate: '2023-12-31',
      };
      expect(formatMetadata(metadata)).toBe('Primary · 2020–2023');
    });

    it('returns empty string for empty affiliation metadata', () => {
      const metadata: AffiliationMetadata = { type: 'affiliation' };
      expect(formatMetadata(metadata)).toBe('');
    });
  });

  describe('funding metadata', () => {
    it('formats award ID', () => {
      const metadata: FundingMetadata = { type: 'funding', awardId: 'NSF-1234567' };
      expect(formatMetadata(metadata)).toBe('Award: NSF-1234567');
    });

    it('formats amount with default currency', () => {
      const metadata: FundingMetadata = { type: 'funding', amount: 500000 };
      expect(formatMetadata(metadata)).toBe('$500,000');
    });

    it('formats amount with specified currency', () => {
      const metadata: FundingMetadata = {
        type: 'funding',
        amount: 100000,
        currency: 'EUR',
      };
      expect(formatMetadata(metadata)).toMatch(/€|EUR/); // Locale-dependent
    });

    it('combines award ID and amount', () => {
      const metadata: FundingMetadata = {
        type: 'funding',
        awardId: 'NIH-R01',
        amount: 250000,
        currency: 'USD',
      };
      expect(formatMetadata(metadata)).toBe('Award: NIH-R01 · $250,000');
    });

    it('returns empty string for empty funding metadata', () => {
      const metadata: FundingMetadata = { type: 'funding' };
      expect(formatMetadata(metadata)).toBe('');
    });
  });

  describe('lineage metadata', () => {
    it('formats direct parent', () => {
      const metadata: LineageMetadata = { type: 'lineage', level: 1 };
      expect(formatMetadata(metadata)).toBe('Direct parent');
    });

    it('formats grandparent', () => {
      const metadata: LineageMetadata = { type: 'lineage', level: 2 };
      expect(formatMetadata(metadata)).toBe('Grandparent');
    });

    it('formats higher levels with number', () => {
      const metadata: LineageMetadata = { type: 'lineage', level: 3 };
      expect(formatMetadata(metadata)).toBe('Level 3');
    });

    it('returns empty string for undefined level', () => {
      const metadata: LineageMetadata = { type: 'lineage' };
      expect(formatMetadata(metadata)).toBe('');
    });
  });
});

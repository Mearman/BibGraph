import { beforeEach, describe, expect, it, vi } from 'vitest';

import { formatAbsoluteTime, formatRelativeTime, formatTimestamp } from './date-formatter.js';

const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const DAYS_PER_WEEK = 7;
const DAYS_PER_MONTH_APPROX = 30;
const DAYS_PER_YEAR_APPROX = 365;

const MS_PER_MINUTE = SECONDS_PER_MINUTE * MS_PER_SECOND;
const MS_PER_HOUR = MINUTES_PER_HOUR * MS_PER_MINUTE;
const MS_PER_DAY = HOURS_PER_DAY * MS_PER_HOUR;
const MS_PER_WEEK = DAYS_PER_WEEK * MS_PER_DAY;
const MS_PER_MONTH_APPROX = DAYS_PER_MONTH_APPROX * MS_PER_DAY;
const MS_PER_YEAR_APPROX = DAYS_PER_YEAR_APPROX * MS_PER_DAY;

const FIVE_SECONDS_COUNT = 5;
const THIRTY_SECONDS_COUNT = 30;
const FIVE_MINUTES_COUNT = 5;
const THREE_DAYS_COUNT = 3;
const TEN_DAYS_COUNT = 10;
const FOURTEEN_DAYS_COUNT = 14;
const FIVE_DAYS_COUNT = 5;

describe('date-formatter', () => {
	const FIXED_NOW = new Date('2024-03-15T12:00:00Z').getTime();

	beforeEach(() => {
		// Mock Date.now() to return a fixed timestamp
		vi.spyOn(Date, 'now').mockReturnValue(FIXED_NOW);
	});

	describe('formatRelativeTime', () => {
		it('should format "just now" for very recent dates', () => {
			const date = new Date(FIXED_NOW - FIVE_SECONDS_COUNT * MS_PER_SECOND); // 5 seconds ago
			expect(formatRelativeTime(date)).toBe('just now');
		});

		it('should format seconds correctly', () => {
			const date = new Date(FIXED_NOW - THIRTY_SECONDS_COUNT * MS_PER_SECOND); // 30 seconds ago
			expect(formatRelativeTime(date)).toBe('30 seconds ago');
		});

		it('should format minutes correctly', () => {
			const date = new Date(FIXED_NOW - FIVE_MINUTES_COUNT * MS_PER_MINUTE); // 5 minutes ago
			expect(formatRelativeTime(date)).toBe('5 minutes ago');
		});

		it('should format hours correctly', () => {
			const date = new Date(FIXED_NOW - 2 * MS_PER_HOUR); // 2 hours ago
			expect(formatRelativeTime(date)).toBe('2 hours ago');
		});

		it('should format days correctly', () => {
			const date = new Date(FIXED_NOW - THREE_DAYS_COUNT * MS_PER_DAY); // 3 days ago
			expect(formatRelativeTime(date)).toBe('3 days ago');
		});

		it('should format weeks correctly', () => {
			const date = new Date(FIXED_NOW - 2 * MS_PER_WEEK); // 2 weeks ago
			expect(formatRelativeTime(date)).toBe('2 weeks ago');
		});

		it('should format months correctly', () => {
			const date = new Date(FIXED_NOW - 2 * MS_PER_MONTH_APPROX); // ~2 months ago
			expect(formatRelativeTime(date)).toBe('2 months ago');
		});

		it('should format years correctly', () => {
			const date = new Date(FIXED_NOW - 2 * MS_PER_YEAR_APPROX); // ~2 years ago
			expect(formatRelativeTime(date)).toBe('2 years ago');
		});

		it('should handle singular units correctly', () => {
			expect(formatRelativeTime(new Date(FIXED_NOW - MS_PER_SECOND))).toBe('just now');
			expect(formatRelativeTime(new Date(FIXED_NOW - THIRTY_SECONDS_COUNT * MS_PER_SECOND))).toBe('30 seconds ago');
			expect(formatRelativeTime(new Date(FIXED_NOW - MS_PER_MINUTE))).toBe('1 minute ago');
			expect(formatRelativeTime(new Date(FIXED_NOW - MS_PER_HOUR))).toBe('1 hour ago');
			expect(formatRelativeTime(new Date(FIXED_NOW - MS_PER_DAY))).toBe('1 day ago');
		});

		it('should handle future dates', () => {
			const date = new Date(FIXED_NOW + FIVE_MINUTES_COUNT * MS_PER_MINUTE); // 5 minutes in future
			expect(formatRelativeTime(date)).toBe('in the future');
		});

		it('should handle invalid dates', () => {
			expect(formatRelativeTime(new Date('invalid'))).toBe('Invalid date');
			expect(formatRelativeTime(null as unknown as Date)).toBe('Invalid date');
			expect(formatRelativeTime(undefined as unknown as Date)).toBe('Invalid date');
		});
	});

	describe('formatAbsoluteTime', () => {
		it('should format dates with month, day, year, and time', () => {
			const date = new Date('2024-03-15T14:30:00Z');
			const result = formatAbsoluteTime(date);

			// Check format contains expected parts (exact format may vary by locale)
			expect(result).toMatch(/Mar/);
			expect(result).toMatch(/15/);
			expect(result).toMatch(/2024/);
			expect(result).toMatch(/at/);
		});

		it('should handle invalid dates', () => {
			expect(formatAbsoluteTime(new Date('invalid'))).toBe('Invalid date');
			expect(formatAbsoluteTime(null as unknown as Date)).toBe('Invalid date');
			expect(formatAbsoluteTime(undefined as unknown as Date)).toBe('Invalid date');
		});
	});

	describe('formatTimestamp', () => {
		it('should use relative time for recent dates (within default 7-day threshold)', () => {
			const date = new Date(FIXED_NOW - 2 * MS_PER_DAY); // 2 days ago
			expect(formatTimestamp(date)).toBe('2 days ago');
		});

		it('should use absolute time for old dates (beyond default 7-day threshold)', () => {
			const date = new Date(FIXED_NOW - TEN_DAYS_COUNT * MS_PER_DAY); // 10 days ago
			const result = formatTimestamp(date);

			// Should use absolute format
			expect(result).toMatch(/Mar/);
			expect(result).toMatch(/at/);
		});

		it('should respect custom threshold', () => {
			const date = new Date(FIXED_NOW - TEN_DAYS_COUNT * MS_PER_DAY); // 10 days ago
			const threshold = FOURTEEN_DAYS_COUNT * MS_PER_DAY; // 14 days threshold

			// Should use relative time with custom threshold
			expect(formatTimestamp(date, threshold)).toBe('1 week ago');
		});

		it('should use absolute time for future dates', () => {
			const date = new Date(FIXED_NOW + FIVE_DAYS_COUNT * MS_PER_DAY); // 5 days in future
			const result = formatTimestamp(date);

			// Should use absolute format
			expect(result).toMatch(/Mar/);
			expect(result).toMatch(/at/);
		});

		it('should handle invalid dates', () => {
			expect(formatTimestamp(new Date('invalid'))).toBe('Invalid date');
			expect(formatTimestamp(null as unknown as Date)).toBe('Invalid date');
		});
	});
});

/**
 * Date formatting utilities for bookmark timestamps
 * Provides both relative ("2 hours ago") and absolute ("Mar 15, 2024 at 2:30 PM") formats
 */

const MILLISECONDS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const DAYS_PER_WEEK = 7;
const DAYS_PER_MONTH_APPROX = 30;
const DAYS_PER_YEAR_APPROX = 365;

/**
 * Time units in milliseconds
 */
const TIME_UNITS = {
	SECOND: MILLISECONDS_PER_SECOND,
	MINUTE: SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND,
	HOUR: MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND,
	DAY: HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND,
	WEEK: DAYS_PER_WEEK * HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND,
	MONTH: DAYS_PER_MONTH_APPROX * HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND,
	YEAR: DAYS_PER_YEAR_APPROX * HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND,
} as const;

/**
 * Default threshold for switching from relative to absolute time (7 days)
 */
const DEFAULT_THRESHOLD_MS = DAYS_PER_WEEK * TIME_UNITS.DAY;

/**
 * Below this many seconds, a date is rendered as "just now" instead of a count
 */
const JUST_NOW_THRESHOLD_SECONDS = 10;

/**
 * Format a date as relative time (e.g., "2 hours ago", "3 days ago")
 * @param date - The date to format
 * @returns Formatted relative time string
 * @example
 * formatRelativeTime(new Date(Date.now() - 2 * 60 * 60 * 1000)) // "2 hours ago"
 * formatRelativeTime(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)) // "3 days ago"
 */
export const formatRelativeTime = (date: Readonly<Date>): string => {
	// Handle invalid dates
	if (Number.isNaN(date.getTime())) {
		return 'Invalid date';
	}

	const now = Date.now();
	const timestamp = date.getTime();
	const diffMs = now - timestamp;

	// Handle future dates
	if (diffMs < 0) {
		return 'in the future';
	}

	// Just now (< 10 seconds)
	if (diffMs < JUST_NOW_THRESHOLD_SECONDS * TIME_UNITS.SECOND) {
		return 'just now';
	}

	// Seconds (< 1 minute)
	if (diffMs < TIME_UNITS.MINUTE) {
		const seconds = Math.floor(diffMs / TIME_UNITS.SECOND);
		return `${String(seconds)} ${seconds === 1 ? 'second' : 'seconds'} ago`;
	}

	// Minutes (< 1 hour)
	if (diffMs < TIME_UNITS.HOUR) {
		const minutes = Math.floor(diffMs / TIME_UNITS.MINUTE);
		return `${String(minutes)} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
	}

	// Hours (< 1 day)
	if (diffMs < TIME_UNITS.DAY) {
		const hours = Math.floor(diffMs / TIME_UNITS.HOUR);
		return `${String(hours)} ${hours === 1 ? 'hour' : 'hours'} ago`;
	}

	// Days (< 1 week)
	if (diffMs < TIME_UNITS.WEEK) {
		const days = Math.floor(diffMs / TIME_UNITS.DAY);
		return `${String(days)} ${days === 1 ? 'day' : 'days'} ago`;
	}

	// Weeks (< 1 month)
	if (diffMs < TIME_UNITS.MONTH) {
		const weeks = Math.floor(diffMs / TIME_UNITS.WEEK);
		return `${String(weeks)} ${weeks === 1 ? 'week' : 'weeks'} ago`;
	}

	// Months (< 1 year)
	if (diffMs < TIME_UNITS.YEAR) {
		const months = Math.floor(diffMs / TIME_UNITS.MONTH);
		return `${String(months)} ${months === 1 ? 'month' : 'months'} ago`;
	}

	// Years
	const years = Math.floor(diffMs / TIME_UNITS.YEAR);
	return `${String(years)} ${years === 1 ? 'year' : 'years'} ago`;
};

/**
 * Format a date as absolute time (e.g., "Mar 15, 2024 at 2:30 PM")
 * @param date - The date to format
 * @returns Formatted absolute time string
 * @example
 * formatAbsoluteTime(new Date('2024-03-15T14:30:00')) // "Mar 15, 2024 at 2:30 PM"
 */
export const formatAbsoluteTime = (date: Readonly<Date>): string => {
	// Handle invalid dates
	if (Number.isNaN(date.getTime())) {
		return 'Invalid date';
	}

	try {
		// Format date part (e.g., "Mar 15, 2024")
		const dateFormatter = new Intl.DateTimeFormat('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
		});

		// Format time part (e.g., "2:30 PM")
		const timeFormatter = new Intl.DateTimeFormat('en-US', {
			hour: 'numeric',
			minute: '2-digit',
			hour12: true,
		});

		return `${dateFormatter.format(date)} at ${timeFormatter.format(date)}`;
	} catch {
		// Fallback to ISO string if Intl fails
		return date.toISOString();
	}
};

/**
 * Format a date with smart choice between relative and absolute formats
 * Recent dates (within threshold) use relative time, older dates use absolute time
 * @param date - The date to format
 * @param threshold - Threshold in milliseconds for switching from relative to absolute (default: 7 days)
 * @returns Formatted timestamp string
 * @example
 * formatTimestamp(new Date(Date.now() - 2 * 60 * 60 * 1000)) // "2 hours ago"
 * formatTimestamp(new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)) // "Mar 5, 2024 at 2:30 PM"
 * formatTimestamp(new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), 14 * 24 * 60 * 60 * 1000) // "10 days ago"
 */
export const formatTimestamp = (date: Readonly<Date>, threshold = DEFAULT_THRESHOLD_MS): string => {
	// Handle invalid dates
	if (Number.isNaN(date.getTime())) {
		return 'Invalid date';
	}

	const now = Date.now();
	const timestamp = date.getTime();
	const diffMs = now - timestamp;

	// Use relative time for recent dates
	if (diffMs >= 0 && diffMs < threshold) {
		return formatRelativeTime(date);
	}

	// Use absolute time for older dates or future dates
	return formatAbsoluteTime(date);
};

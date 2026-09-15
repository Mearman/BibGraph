/**
 * Generic date utility functions providing common date operations without domain-specific logic
 */

const MS_PER_SECOND = 1000
const SECONDS_PER_MINUTE = 60
const MINUTES_PER_HOUR = 60
const HOURS_PER_DAY = 24
const DAYS_PER_WEEK = 7
const DAYS_PER_MONTH_APPROX = 30
const DAYS_PER_YEAR_APPROX = 365
const MS_PER_MINUTE = MS_PER_SECOND * SECONDS_PER_MINUTE
const MS_PER_HOUR = MS_PER_MINUTE * MINUTES_PER_HOUR
export const MS_PER_DAY = MS_PER_HOUR * HOURS_PER_DAY
const MS_PER_WEEK = MS_PER_DAY * DAYS_PER_WEEK
const MS_PER_MONTH_APPROX = MS_PER_DAY * DAYS_PER_MONTH_APPROX
const MS_PER_YEAR_APPROX = MS_PER_DAY * DAYS_PER_YEAR_APPROX

const LAST_HOUR_OF_DAY = 23
const LAST_MINUTE_OF_HOUR = 59
const LAST_SECOND_OF_MINUTE = 59
const LAST_MILLISECOND_OF_SECOND = 999
const LAST_MONTH_INDEX = 11
const LAST_DAY_OF_DECEMBER = 31

/**
 * Format a date to ISO string (YYYY-MM-DD)
 */
export const formatDateToISO = (date: Readonly<Date>): string => {
	const parts = date.toISOString().split("T")
	return parts[0] ?? ""
};

/**
 * Format a date to a human-readable string
 */
export const formatDateToHuman = (date: Readonly<Date>): string => date.toLocaleDateString("en-US", {
			year: "numeric",
			month: "long",
			day: "numeric",
		}) || "";

/**
 * Format a date to a short string (MM/DD/YYYY)
 */
export const formatDateToShort = (date: Readonly<Date>): string => date.toLocaleDateString("en-US", {
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
		}) || "";

/**
 * Parse an ISO date string to Date object
 */
export const parseISODate = (dateString: string): Date | null => {
	if (!dateString) return null

	const date = new Date(dateString)
	return Number.isNaN(date.getTime()) ? null : date
};

/**
 * Get the current date as ISO string
 */
export const getCurrentDateISO = (): string => formatDateToISO(new Date());

/**
 * Get the current timestamp in milliseconds
 */
export const getCurrentTimestamp = (): number => Date.now();

/**
 * Calculate the difference between two dates in days
 */
export const daysBetween = ({ date1, date2 }: { date1: Date; date2: Date }): number =>
	Math.floor((date2.getTime() - date1.getTime()) / MS_PER_DAY);

/**
 * Calculate the difference between two dates in milliseconds
 */
export const msBetween = ({ date1, date2 }: { date1: Date; date2: Date }): number => Math.abs(date2.getTime() - date1.getTime());

/**
 * Check if a date is within a certain range
 */
export const isDateInRange = ({
	date,
	startDate,
	endDate,
}: {
	date: Date
	startDate: Date
	endDate: Date
}): boolean => date >= startDate && date <= endDate;

/**
 * Add days to a date
 */
export const addDays = ({ date, days }: { date: Date; days: number }): Date => {
	const result = new Date(date)
	result.setDate(result.getDate() + days)
	return result
};

/**
 * Add months to a date
 */
export const addMonths = ({ date, months }: { date: Date; months: number }): Date => {
	const result = new Date(date)
	result.setMonth(result.getMonth() + months)
	return result
};

/**
 * Add years to a date
 */
export const addYears = ({ date, years }: { date: Date; years: number }): Date => {
	const result = new Date(date)
	result.setFullYear(result.getFullYear() + years)
	return result
};

/**
 * Get the start of the day (00:00:00)
 */
export const startOfDay = (date: Readonly<Date>): Date => {
	const result = new Date(date)
	result.setHours(0, 0, 0, 0)
	return result
};

/**
 * Get the end of the day (23:59:59.999)
 */
export const endOfDay = (date: Readonly<Date>): Date => {
	const result = new Date(date)
	result.setHours(LAST_HOUR_OF_DAY, LAST_MINUTE_OF_HOUR, LAST_SECOND_OF_MINUTE, LAST_MILLISECOND_OF_SECOND)
	return result
};

/**
 * Get the start of the month
 */
export const startOfMonth = (date: Readonly<Date>): Date => {
	const result = new Date(date)
	result.setDate(1)
	result.setHours(0, 0, 0, 0)
	return result
};

/**
 * Get the end of the month
 */
export const endOfMonth = (date: Readonly<Date>): Date => {
	const result = new Date(date)
	result.setMonth(result.getMonth() + 1, 0)
	result.setHours(LAST_HOUR_OF_DAY, LAST_MINUTE_OF_HOUR, LAST_SECOND_OF_MINUTE, LAST_MILLISECOND_OF_SECOND)
	return result
};

/**
 * Get the start of the year
 */
export const startOfYear = (date: Readonly<Date>): Date => {
	const result = new Date(date)
	result.setMonth(0, 1)
	result.setHours(0, 0, 0, 0)
	return result
};

/**
 * Get the end of the year
 */
export const endOfYear = (date: Readonly<Date>): Date => {
	const result = new Date(date)
	result.setMonth(LAST_MONTH_INDEX, LAST_DAY_OF_DECEMBER)
	result.setHours(LAST_HOUR_OF_DAY, LAST_MINUTE_OF_HOUR, LAST_SECOND_OF_MINUTE, LAST_MILLISECOND_OF_SECOND)
	return result
};

/**
 * Check if two dates are the same day
 */
export const isSameDay = ({ date1, date2 }: { date1: Date; date2: Date }): boolean => date1.getFullYear() === date2.getFullYear() &&
		date1.getMonth() === date2.getMonth() &&
		date1.getDate() === date2.getDate();

/**
 * Check if a date is today
 */
export const isToday = (date: Readonly<Date>): boolean => isSameDay({ date1: date, date2: new Date() });

/**
 * Check if a date is in the past
 */
export const isPast = (date: Readonly<Date>): boolean => date < new Date();

/**
 * Check if a date is in the future
 */
export const isFuture = (date: Readonly<Date>): boolean => date > new Date();

/**
 * Get relative time string (e.g., "2 hours ago", "in 3 days")
 *
 * Note: If the date appears to be significantly in the future (\>1 week),
 * it likely indicates a system clock mismatch and returns "just now" to avoid
 * confusing displays like "in 1 year" for recent builds.
 */
export const getRelativeTime = (date: Readonly<Date>, baseDate: Readonly<Date> = new Date()): string => {
	const diffMs = date.getTime() - baseDate.getTime()
	const isPastDate = diffMs < 0
	const absDiffMs = Math.abs(diffMs)

	// If date is significantly in the future (>1 week), likely a clock mismatch Return "just now" instead of confusing future dates
	if (!isPastDate && absDiffMs >= MS_PER_WEEK) {
		return "just now"
	}

	// Define time units in descending order
	const timeUnits = [
		{ name: "year", divisor: MS_PER_YEAR_APPROX },
		{ name: "month", divisor: MS_PER_MONTH_APPROX },
		{ name: "week", divisor: MS_PER_WEEK },
		{ name: "day", divisor: MS_PER_DAY },
		{ name: "hour", divisor: MS_PER_HOUR },
		{ name: "minute", divisor: MS_PER_MINUTE },
	]

	for (const unit of timeUnits) {
		const value = Math.floor(absDiffMs / unit.divisor)
		if (value >= 1) {
			const suffix = value > 1 ? "s" : ""
			return isPastDate ? `${String(value)} ${unit.name}${suffix} ago` : `in ${String(value)} ${unit.name}${suffix}`
		}
	}

	return "just now"
};

/**
 * Format duration in milliseconds to human readable string
 */
export const formatDuration = (durationMs: number): string => {
	const seconds = Math.floor(durationMs / MS_PER_SECOND)
	const minutes = Math.floor(seconds / SECONDS_PER_MINUTE)
	const hours = Math.floor(minutes / MINUTES_PER_HOUR)
	const days = Math.floor(hours / HOURS_PER_DAY)

	if (days > 0) {
		return `${String(days)}d ${String(hours % HOURS_PER_DAY)}h ${String(minutes % MINUTES_PER_HOUR)}m`
	}

	if (hours > 0) {
		return `${String(hours)}h ${String(minutes % MINUTES_PER_HOUR)}m ${String(seconds % SECONDS_PER_MINUTE)}s`
	}

	if (minutes > 0) {
		return `${String(minutes)}m ${String(seconds % SECONDS_PER_MINUTE)}s`
	}

	return `${String(seconds)}s`
};

/**
 * Format elapsed time from a start time
 */
export const formatElapsed = (startTime: number): string => formatDuration(Date.now() - startTime);

/**
 * Create a date range array between two dates
 */
export const createDateRange = (startDate: Readonly<Date>, endDate: Readonly<Date>, stepDays = 1): Date[] => {
	const dates: Date[] = []
	const current = new Date(startDate)

	while (current <= endDate) {
		dates.push(new Date(current))
		current.setDate(current.getDate() + stepDays)
	}

	return dates
};

/**
 * Get the number of days in a month
 */
export const getDaysInMonth = ({ year, month }: { year: number; month: number }): number => new Date(year, month + 1, 0).getDate();

const LEAP_YEAR_QUADRENNIAL = 4
const LEAP_YEAR_CENTENNIAL = 100
const LEAP_YEAR_QUATERCENTENNIAL = 400

/**
 * Check if a year is a leap year
 */
export const isLeapYear = (year: number): boolean =>
	(year % LEAP_YEAR_QUADRENNIAL === 0 && year % LEAP_YEAR_CENTENNIAL !== 0) || year % LEAP_YEAR_QUATERCENTENNIAL === 0;

const ISO_WEEK_LAST_DAY = 7
const ISO_WEEK_THURSDAY_OFFSET = 4

/**
 * Get the week number of the year for a date
 */
export const getWeekNumber = (date: Readonly<Date>): number => {
	const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
	const dayNumber = d.getUTCDay() || ISO_WEEK_LAST_DAY
	d.setUTCDate(d.getUTCDate() + ISO_WEEK_THURSDAY_OFFSET - dayNumber)
	const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
	return Math.ceil(((d.getTime() - yearStart.getTime()) / MS_PER_DAY + 1) / DAYS_PER_WEEK)
};

const MINIMUM_VALID_PUBLICATION_YEAR = 1000
const FUTURE_PUBLICATION_YEAR_TOLERANCE = 10

/**
 * Format publication year for display Handles cases where year might be null, undefined, or invalid
 */
export const formatPublicationYear = (year: number | null | undefined): string => {
	if (
		year === null ||
		year === undefined ||
		Number.isNaN(year) ||
		year < MINIMUM_VALID_PUBLICATION_YEAR ||
		year > new Date().getFullYear() + FUTURE_PUBLICATION_YEAR_TOLERANCE
	) {
		return "Unknown"
	}
	return year.toString()
};

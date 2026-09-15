/**
 * Shared numeric unit constants for byte-size and duration calculations used across cache and environment configuration.
 */

export const BYTES_PER_KB = 1024;
export const BYTES_PER_MB = BYTES_PER_KB * BYTES_PER_KB;
export const BYTES_PER_GB = BYTES_PER_MB * BYTES_PER_KB;

export const MS_PER_SECOND = 1000;
export const SECONDS_PER_MINUTE = 60;
export const MINUTES_PER_HOUR = 60;
export const HOURS_PER_DAY = 24;
export const DAYS_PER_WEEK = 7;

export const MS_PER_MINUTE = SECONDS_PER_MINUTE * MS_PER_SECOND;
export const MS_PER_HOUR = MINUTES_PER_HOUR * MS_PER_MINUTE;
export const MS_PER_DAY = HOURS_PER_DAY * MS_PER_HOUR;
export const MS_PER_WEEK = DAYS_PER_WEEK * MS_PER_DAY;

/**
 * Cache configuration for BibGraph Defines caching strategies optimized for different OpenAlex entity types
 */

const MILLISECONDS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const DAYS_PER_WEEK = 7;
const DAYS_PER_MONTH = 30;
const DAYS_PER_QUARTER = 90;
const DAYS_FOR_AUTHOR_RETENTION = 3;
const HOURS_FOR_AUTHOR_STALE = 12;
const HOURS_FOR_RELATED_STALE = 6;
const DEFAULT_STALE_MINUTES = 5;
const BYTES_PER_KILOBYTE = 1024;
const MAX_CACHE_SIZE_MEGABYTES = 100;
const DEFAULT_RETRY_ATTEMPTS = 3;

const ONE_MINUTE_MS = MILLISECONDS_PER_SECOND * SECONDS_PER_MINUTE;
const ONE_HOUR_MS = ONE_MINUTE_MS * MINUTES_PER_HOUR;
const ONE_DAY_MS = ONE_HOUR_MS * HOURS_PER_DAY;
const ONE_WEEK_MS = ONE_DAY_MS * DAYS_PER_WEEK;
const ONE_MONTH_MS = ONE_DAY_MS * DAYS_PER_MONTH;
const ONE_QUARTER_MS = ONE_DAY_MS * DAYS_PER_QUARTER;

export const CACHE_CONFIG = {
  // Maximum cache age for persistence (1 week)
  maxAge: ONE_WEEK_MS,

  // Maximum cache size in bytes (100MB)
  maxSize: MAX_CACHE_SIZE_MEGABYTES * BYTES_PER_KILOBYTE * BYTES_PER_KILOBYTE,

  // Compress responses larger than this threshold (1KB)
  compressionThreshold: BYTES_PER_KILOBYTE,

  // Default retry configuration
  defaultRetries: DEFAULT_RETRY_ATTEMPTS,

  // Default stale time
  defaultStaleTime: DEFAULT_STALE_MINUTES * ONE_MINUTE_MS,
} as const;

/**
 * Entity-specific cache times optimized for data stability Stale time: When data is considered stale and should be refetched GC time: How long to keep data in cache after last access
 */
export const ENTITY_CACHE_TIMES = {
  works: {
    stale: ONE_DAY_MS, // works rarely change after publication
    gc: ONE_WEEK_MS, // keep for a week
  },
  authors: {
    stale: HOURS_FOR_AUTHOR_STALE * ONE_HOUR_MS, // author info updates moderately
    gc: DAYS_FOR_AUTHOR_RETENTION * ONE_DAY_MS, // keep for a few days
  },
  sources: {
    stale: ONE_WEEK_MS, // journals/sources very stable
    gc: ONE_MONTH_MS, // keep for a month
  },
  institutions: {
    stale: ONE_MONTH_MS, // institutions very stable
    gc: ONE_QUARTER_MS, // keep for a quarter
  },
  topics: {
    stale: ONE_WEEK_MS, // topics fairly stable
    gc: ONE_MONTH_MS, // keep for a month
  },
  publishers: {
    stale: ONE_MONTH_MS, // publishers very stable
    gc: ONE_QUARTER_MS, // keep for a quarter
  },
  funders: {
    stale: ONE_MONTH_MS, // funders very stable
    gc: ONE_QUARTER_MS, // keep for a quarter
  },
  keywords: {
    stale: ONE_WEEK_MS, // keywords fairly stable
    gc: ONE_MONTH_MS, // keep for a month
  },
  concepts: {
    stale: ONE_WEEK_MS, // concepts fairly stable
    gc: ONE_MONTH_MS, // keep for a month
  },
  search: {
    stale: DEFAULT_STALE_MINUTES * ONE_MINUTE_MS, // search results need freshness
    gc: ONE_HOUR_MS, // don't keep search results long
  },
  related: {
    stale: HOURS_FOR_RELATED_STALE * ONE_HOUR_MS, // related entities update occasionally
    gc: ONE_DAY_MS, // related data doesn't need long storage
  },
  domains: {
    stale: ONE_WEEK_MS, // domains fairly stable
    gc: ONE_MONTH_MS, // keep for a month
  },
  fields: {
    stale: ONE_WEEK_MS, // fields fairly stable
    gc: ONE_MONTH_MS, // keep for a month
  },
  subfields: {
    stale: ONE_WEEK_MS, // subfields fairly stable
    gc: ONE_MONTH_MS, // keep for a month
  },
} as const;

/**
 * Cache key type includes OpenAlex entities plus special cache types (search, related)
 */
export type CacheKeyType = keyof typeof ENTITY_CACHE_TIMES;

/**
 * Get cache configuration for a specific cache key
 */
export const getCacheConfig = (cacheKey: CacheKeyType) => ENTITY_CACHE_TIMES[cacheKey];

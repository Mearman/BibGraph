/**
 * Cache timing configurations for different entity types
 */

const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;

const MS_PER_MINUTE = MS_PER_SECOND * SECONDS_PER_MINUTE;
const MS_PER_HOUR = MS_PER_MINUTE * MINUTES_PER_HOUR;
const MS_PER_DAY = MS_PER_HOUR * HOURS_PER_DAY;

const WORKS_GC_DAYS = 7;
const AUTHORS_STALE_HOURS = 12;
const AUTHORS_GC_DAYS = 3;
const SOURCES_STALE_DAYS = 7;
const SOURCES_GC_DAYS = 30;
const INSTITUTIONS_STALE_DAYS = 30;
const INSTITUTIONS_GC_DAYS = 90;
const TOPICS_STALE_DAYS = 7;
const TOPICS_GC_DAYS = 30;
const PUBLISHERS_STALE_DAYS = 30;
const PUBLISHERS_GC_DAYS = 90;
const FUNDERS_STALE_DAYS = 30;
const FUNDERS_GC_DAYS = 90;
const KEYWORDS_STALE_DAYS = 7;
const KEYWORDS_GC_DAYS = 30;
const CONCEPTS_STALE_DAYS = 7;
const CONCEPTS_GC_DAYS = 30;
const SEARCH_STALE_MINUTES = 5;
const RELATED_STALE_HOURS = 6;

export const ENTITY_CACHE_TIMES = {
	works: {
		stale: MS_PER_DAY, // 1 day
		gc: MS_PER_DAY * WORKS_GC_DAYS, // 7 days
	},
	authors: {
		stale: MS_PER_HOUR * AUTHORS_STALE_HOURS, // 12 hours
		gc: MS_PER_DAY * AUTHORS_GC_DAYS, // 3 days
	},
	sources: {
		stale: MS_PER_DAY * SOURCES_STALE_DAYS, // 7 days
		gc: MS_PER_DAY * SOURCES_GC_DAYS, // 30 days
	},
	institutions: {
		stale: MS_PER_DAY * INSTITUTIONS_STALE_DAYS, // 30 days
		gc: MS_PER_DAY * INSTITUTIONS_GC_DAYS, // 90 days
	},
	topics: {
		stale: MS_PER_DAY * TOPICS_STALE_DAYS, // 7 days
		gc: MS_PER_DAY * TOPICS_GC_DAYS, // 30 days
	},
	publishers: {
		stale: MS_PER_DAY * PUBLISHERS_STALE_DAYS, // 30 days
		gc: MS_PER_DAY * PUBLISHERS_GC_DAYS, // 90 days
	},
	funders: {
		stale: MS_PER_DAY * FUNDERS_STALE_DAYS, // 30 days
		gc: MS_PER_DAY * FUNDERS_GC_DAYS, // 90 days
	},
	keywords: {
		stale: MS_PER_DAY * KEYWORDS_STALE_DAYS, // 7 days
		gc: MS_PER_DAY * KEYWORDS_GC_DAYS, // 30 days
	},
	concepts: {
		stale: MS_PER_DAY * CONCEPTS_STALE_DAYS, // 7 days
		gc: MS_PER_DAY * CONCEPTS_GC_DAYS, // 30 days
	},
	search: {
		stale: MS_PER_MINUTE * SEARCH_STALE_MINUTES, // 5 minutes
		gc: MS_PER_HOUR, // 1 hour
	},
	related: {
		stale: MS_PER_HOUR * RELATED_STALE_HOURS, // 6 hours
		gc: MS_PER_DAY, // 1 day
	},
} as const;

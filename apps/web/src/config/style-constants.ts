/**
 * Style Constants
 * Centralized configuration for commonly used style values
 *
 * This file eliminates duplicated inline styles across components,
 * ensuring consistent visual appearance and making styling values
 * discoverable and maintainable.
 */

import type { CSSProperties } from "react";

// =============================================================================
// BORDER STYLES
// =============================================================================

/**
 * Standard border style using Mantine's gray-3 color
 * Used for card, paper, and container borders throughout the app
 */
export const BORDER_STYLE_GRAY_3 = "1px solid var(--mantine-color-gray-3)";

/**
 * Lighter border style using Mantine's gray-2 color
 * Used for subtle dividers and secondary borders
 */
export const BORDER_STYLE_GRAY_2 = "1px solid var(--mantine-color-gray-2)";

/**
 * Border style using Mantine's default border color
 * Used for theme-aware borders that adapt to color scheme
 */
export const BORDER_STYLE_DEFAULT = "1px solid var(--mantine-color-default-border)";

// =============================================================================
// STYLE OBJECTS
// =============================================================================

/**
 * Standard card border style object
 * Use with Mantine's `style` prop: `style={CARD_BORDER_STYLE}`
 */
export const CARD_BORDER_STYLE: CSSProperties = {
	border: BORDER_STYLE_GRAY_3,
};

/**
 * Standard paper border style object
 * Use with Mantine's `style` prop: `style={PAPER_BORDER_STYLE}`
 */
export const PAPER_BORDER_STYLE: CSSProperties = {
	border: BORDER_STYLE_GRAY_3,
};

// =============================================================================
// SPACING VALUES
// =============================================================================

/**
 * Standard border radius for cards and containers
 */
export const BORDER_RADIUS_SM = 4;
export const BORDER_RADIUS_MD = 8;
export const BORDER_RADIUS_LG = 12;
export const BORDER_RADIUS_XL = 16;

// =============================================================================
// MANTINE THEME RADIUS MAP
// =============================================================================

/**
 * Maps Mantine theme border radius sizes to CSS pixel values
 * Used for components that need theme-aware border radius styling
 */
export const MANTINE_THEME_BORDER_RADIUS = {
	xs: "4px",
	sm: "8px",
	md: "16px",
	lg: "24px",
	xl: "32px",
} as const;

/**
 * Default border radius fallback value
 */
export const DEFAULT_THEME_BORDER_RADIUS = "16px";

// =============================================================================
// BUTTON SIZE CONSTANTS
// =============================================================================

/**
 * Default height for split buttons and compound button groups
 */
export const SPLIT_BUTTON_HEIGHT = 34;

/**
 * Default minimum width for split buttons
 */
export const SPLIT_BUTTON_MIN_WIDTH = 120;

// =============================================================================
// ICON SIZE CONSTANTS
// =============================================================================

/**
 * Standardized icon sizes used throughout the application
 * These follow a consistent scale for visual hierarchy
 */
export const ICON_SIZE = {
	/**
	2x Extra small - micro indicators, decorative icons (10px)
	 */
	XXS: 10,
	/**
	Extra small - badges, chips, inline indicators (12px)
	 */
	XS: 12,
	/**
	Small - compact buttons, input adornments (14px)
	 */
	SM: 14,
	/**
	Default - standard buttons, menu items, alerts (16px)
	 */
	MD: 16,
	/**
	Large - accordion controls, section headers (18px)
	 */
	LG: 18,
	/**
	Extra large - navigation icons, card headers (20px)
	 */
	XL: 20,
	/**
	2x large - prominent section icons, quick actions (24px)
	 */
	XXL: 24,
	/**
	Page header icons (28px)
	 */
	HEADER: 28,
	/**
	Empty state secondary icons (32px)
	 */
	EMPTY_STATE_SM: 32,
	/**
	Hero icons, feature highlights (40px)
	 */
	HERO: 40,
	/**
	Empty state primary icons (48px)
	 */
	EMPTY_STATE: 48,
	/**
	Large decorative hero icons (60px)
	 */
	HERO_LG: 60,
} as const;

/**
Type for ICON_SIZE values
 */
export type IconSize = (typeof ICON_SIZE)[keyof typeof ICON_SIZE];

// =============================================================================
// TIME CONSTANTS
// =============================================================================

const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const HALF_HOUR_MINUTES = 30;
const TWO_HOURS_COUNT = 2;
const SEARCH_STALE_MINUTES = 5;
const BOOKMARK_FEEDBACK_SECONDS = 2;

/**
 * Time duration constants in milliseconds Used for timestamps, intervals, and duration calculations
 */
export const TIME_MS = {
	/**
	1 second in milliseconds
	 */
	SECOND: MS_PER_SECOND,
	/**
	1 minute in milliseconds
	 */
	MINUTE: SECONDS_PER_MINUTE * MS_PER_SECOND,
	/**
	30 minutes in milliseconds
	 */
	MINUTES_30: HALF_HOUR_MINUTES * SECONDS_PER_MINUTE * MS_PER_SECOND,
	/**
	1 hour in milliseconds
	 */
	HOUR: MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SECOND,
	/**
	2 hours in milliseconds
	 */
	HOURS_2: TWO_HOURS_COUNT * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SECOND,
	/**
	24 hours (1 day) in milliseconds
	 */
	DAY: HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SECOND,
	/**
	Search cache stale time (5 minutes)
	 */
	SEARCH_STALE_TIME: SEARCH_STALE_MINUTES * SECONDS_PER_MINUTE * MS_PER_SECOND,
	/**
	Bookmark feedback toast duration (2 seconds)
	 */
	BOOKMARK_FEEDBACK_DURATION: BOOKMARK_FEEDBACK_SECONDS * MS_PER_SECOND,
} as const;

// =============================================================================
// LAYOUT CONSTANTS
// =============================================================================

/**
 * Layout measurement constants for consistent sizing and spacing
 */
export const LAYOUT = {
	/**
	Header height in pixels (used for calc(100vh - 60px))
	 */
	HEADER_HEIGHT: 60,
	/**
	Graph viewport height as viewport percentage
	 */
	GRAPH_VIEWPORT_HEIGHT: '55vh',
	/**
	Default card height for algorithm controls
	 */
	ALGORITHM_CARD_HEIGHT: 400,
} as const;

// =============================================================================
// ALGORITHM CONSTANTS
// =============================================================================

const DEFAULT_NODE_RANGE_MIN = 50;
const DEFAULT_NODE_RANGE_MAX = 100;

/**
 * Algorithm configuration constants for UI controls and limits
 */
export const ALGORITHM = {
	/**
	Minimum number of nodes allowed in graph generation
	 */
	MIN_NODES: 5,
	/**
	Maximum number of nodes allowed in graph generation
	 */
	MAX_NODES: 10000,
	/**
	Maximum slider position for node count
	 */
	SLIDER_MAX: 100,
	/**
	Default random seed for reproducible layouts
	 */
	DEFAULT_SEED: 42,
	/**
	Default node range for random graph generation
	 */
	DEFAULT_NODE_RANGE: [DEFAULT_NODE_RANGE_MIN, DEFAULT_NODE_RANGE_MAX],
} as const;

// =============================================================================
// API CONSTANTS
// =============================================================================

/**
 * API and data fetching constants
 */
export const API = {
	/**
	OpenAlex maximum results per page
	 */
	OPENALEX_MAX_PER_PAGE: 200,
	/**
	Maximum query limit for performance
	 */
	MAX_QUERY_LIMIT: 10000,
	/**
	Default page size for tables and paginated lists
	 */
	DEFAULT_PAGE_SIZE: 25,
} as const;

// =============================================================================
// TEXT CONSTANTS
// =============================================================================

/**
 * Text display and formatting constants
 */
export const TEXT = {
	/**
	Default line clamp for multi-line text truncation
	 */
	DEFAULT_LINE_CLAMP: 1,
	/**
	Minimum width for label columns in forms and data displays
	 */
	LABEL_MIN_WIDTH: "120px",
} as const;

// =============================================================================
// PROGRESS/LOADING CONSTANTS
// =============================================================================

/**
 * Constants for loading state and progress indicators
 */
export const LOADING_CONSTANTS = {
	/**
	Maximum progress percentage before completion (reserve for final animation)
	 */
	MAX_PROGRESS_PERCENT: 95,
	/**
	Progress update interval in milliseconds (10 updates per second)
	 */
	PROGRESS_UPDATE_INTERVAL_MS: 100,
} as const;

// =============================================================================
// SEARCH CONSTANTS
// =============================================================================

/**
 * Search functionality constants
 */
export const SEARCH = {
	/**
	Maximum number of search retry attempts
	 */
	MAX_RETRY_ATTEMPTS: 1,
} as const;

import { hostnameMatches } from '@bibgraph/utils';
import type { PostHogConfig } from 'posthog-js'

/**
 * BibGraph PostHog Analytics Configuration
 *
 * Privacy-compliant configuration for EU/GDPR compliance without consent banners.
 *
 * Key privacy features:
 * - Cookieless mode: No cookies or local storage usage
 * - EU residency: Data processed in EU (PostHog Cloud EU)
 * - Anonymous tracking: No personal data collection
 * - IP obfuscation: Automatic privacy protection
 * - Manual event capture: No automatic data collection
 */

// Minimum API key length treated as plausibly valid (guards against placeholder/truncated values)
const MIN_POSTHOG_API_KEY_LENGTH = 10;
const POSTHOG_API_KEY_PREVIEW_LENGTH = 10;

/**
 * Read a Vite env var as a string, falling back when it is unset. `import.meta.env` values are untyped for keys Vite doesn't know about ahead of time, so this is the single point where that boundary is narrowed to a real `string`.
 */
const readEnvString = (value: unknown, fallback: string): string =>
  typeof value === 'string' && value !== '' ? value : fallback;

// Environment variables for PostHog configuration
export const POSTHOG_API_KEY = readEnvString(import.meta.env.VITE_PUBLIC_POSTHOG_API_KEY, '')
export const POSTHOG_HOST = readEnvString(import.meta.env.VITE_PUBLIC_POSTHOG_HOST, 'https://eu.i.posthog.com')

// Enable PostHog only if API key is provided (development check)
export const POSTHOG_ENABLED = Boolean(POSTHOG_API_KEY && POSTHOG_API_KEY !== 'your-posthog-api-key')

// Debug logging for PostHog initialization (only in development)
if (import.meta.env.DEV) {
  console.debug('📊 PostHog Configuration:', {
    POSTHOG_ENABLED,
    POSTHOG_API_KEY: POSTHOG_API_KEY ? `${POSTHOG_API_KEY.slice(0, POSTHOG_API_KEY_PREVIEW_LENGTH)}...` : 'NOT SET',
    POSTHOG_HOST,
    shouldInitialize: POSTHOG_ENABLED && typeof window !== 'undefined' && POSTHOG_API_KEY.length > MIN_POSTHOG_API_KEY_LENGTH && hostnameMatches(POSTHOG_HOST, 'posthog.com')
  });
}

/**
 * PostHog configuration optimized for academic research tool with EU privacy compliance
 * Uses cookieless mode to avoid consent requirements while maintaining valuable analytics
 */
export const POSTHOG_CONFIG: Partial<PostHogConfig> = {
  api_host: POSTHOG_HOST,

  // Privacy-first settings (no consent required)
  cookieless_mode: 'always',          // No cookies/local storage = GDPR consent not required
  autocapture: true,                  // Automatic event capture enabled
  disable_session_recording: false,   // Session recording enabled (no masking)
  capture_pageview: true,             // Automatic page view capture

  // Performance settings
  api_transport: 'fetch',
  request_batching: true,

  // Privacy filters - exclude potentially sensitive data
  property_blacklist: [
    '$current_url',           // Full URLs can contain sensitive search queries
    '$pathname',             // Path patterns might reveal user interests
    '$search',               // Search queries are sensitive academic data
    '$browser',              // Browser fingerprinting data
    '$browser_version',      // Detailed browser version
    '$device_type',          // Device type fingerprinting
    '$device',               // Device fingerprinting
    '$os',                   // Operating system fingerprinting
    '$os_version',           // OS version fingerprinting
    '$screen_height',        // Screen size fingerprinting
    '$screen_width',         // Screen size fingerprinting
    '$viewport_height',      // Viewport fingerprinting
    '$viewport_width',       // Viewport fingerprinting
    '$lib',                  // JavaScript library fingerprinting
    '$lib_version',          // Library version fingerprinting
    '$referring_domain',     // Referrer information
    '$referring_host',       // Referrer host information
  ],

  // IP and location privacy (automatic in cookieless mode)
  // Note: ip_opt_out is handled automatically by cookieless mode

  // Persistence settings (disabled for privacy)
  persistence: 'memory',      // No local storage persistence
  disable_persistence: true,  // Additional safety measure

  // Error tracking configuration
  capture_exceptions: true,   // Enable error tracking for debugging
  capture_performance: true,  // PostHog performance monitoring enabled

  // Console logging
  enable_recording_console_log: true,  // Enable console log recording in sessions

  // Session recording configuration
  session_recording: {
    maskAllInputs: false,             // Don't mask all inputs by default (only mask .ph-no-capture)
    recordCrossOriginIframes: false,  // Don't record cross-origin iframes
    recordHeaders: true,              // Capture network request headers
    recordBody: true,                 // Capture network request bodies
  },

  // Development settings
  debug: import.meta.env.DEV && POSTHOG_ENABLED,
}

/**
 * Academic-specific event types for PostHog analytics
 * Designed to provide insights while maintaining user privacy
 */
export const ACADEMIC_EVENTS = {
  // Navigation and discovery events
  PAGE_VIEW: 'page_view',
  SEARCH_PERFORMED: 'search_performed',
  ENTITY_VIEW: 'entity_view',

  // Graph and visualization events
  GRAPH_LOADED: 'graph_loaded',
  NODE_SELECTED: 'node_selected',
  FILTER_APPLIED: 'filter_applied',
  RELATIONSHIP_EXPLORED: 'relationship_explored',

  // Feature usage events
  CATALOGUE_CREATED: 'catalogue_created',
  BOOKMARK_ADDED: 'bookmark_added',
  SHARE_INITIATED: 'share_initiated',
  EXPORT_PERFORMED: 'export_performed',

  // Error and performance events
  ERROR_OCCURRED: 'error_occurred',
  PERFORMANCE_ISSUE: 'performance_issue',
  LOAD_TIME_EXCEEDED: 'load_time_exceeded',

  // Academic workflow events
  CITATION_NETWORK_EXPLORED: 'citation_network_explored',
  AUTHOR_DISCOVERED: 'author_discovered',
  INVESTIGATION_DEEPENED: 'investigation_deepened',
  RESEARCH_PATH_FOLLOWED: 'research_path_followed',
} as const

export type AcademicEventType = typeof ACADEMIC_EVENTS[keyof typeof ACADEMIC_EVENTS]

/**
 * Entity types for academic analytics
 * Used for anonymized tracking of research patterns
 */
export const ENTITY_TYPES = {
  WORK: 'work',
  AUTHOR: 'author',
  SOURCE: 'source',
  INSTITUTION: 'institution',
  TOPIC: 'topic',
  FUNDER: 'funder',
  PUBLISHER: 'publisher',
  CONCEPT: 'concept',
  DOMAIN: 'domain',
  FIELD: 'field',
  SUBFIELD: 'subfield',
  KEYWORD: 'keyword',
} as const

export type EntityTypeType = typeof ENTITY_TYPES[keyof typeof ENTITY_TYPES]

/**
 * Feature names for usage analytics
 * Helps prioritize development efforts for academic research needs
 */
export const FEATURE_NAMES = {
  SEARCH: 'search',
  GRAPH_VISUALIZATION: 'graph_visualization',
  ENTITY_CATALOGUE: 'entity_catalogue',
  RELATIONSHIP_FILTERING: 'relationship_filtering',
  BOOKMARKING: 'bookmarking',
  DATA_EXPORT: 'data_export',
  SHARING: 'sharing',
  CITATION_NETWORK: 'citation_network',
  WORK_FUNDING_RELATIONSHIPS: 'work_funding_relationships',
  ENTITY_DETAIL_LAYOUT: 'entity_detail_layout',
  EDGE_DIRECTION_FILTERING: 'edge_direction_filtering',
} as const

export type FeatureNameType = typeof FEATURE_NAMES[keyof typeof FEATURE_NAMES]

/**
 * Event properties interface for type-safe analytics events
 * Ensures consistent event structure and prevents accidental data leakage
 */
export interface AcademicEventProperties {
  // Common properties (all events)
  entity_type?: EntityTypeType
  feature_name?: FeatureNameType

  // Search events (anonymized - no actual queries)
  search_category?: 'literature_search' | 'entity_lookup' | 'citation_network'
  result_count?: number
  has_filters?: boolean

  // Entity events (type-based, not content-based)
  entity_category?: 'academic_work' | 'researcher' | 'publication_venue' | 'research_institution'

  // Graph events (interaction patterns, not user behavior)
  node_type?: EntityTypeType
  interaction_type?: 'select' | 'filter' | 'expand' | 'navigate'
  graph_size?: number  // Number of nodes/edges, not user-specific

  // Performance events
  load_time_ms?: number
  cache_hit?: boolean
  error_type?: 'javascript_error' | 'network_error' | 'rendering_error'

  // Academic workflow events (research patterns, not personal data)
  research_phase?: 'discovery' | 'investigation' | 'analysis' | 'synthesis'
  workflow_step?: number

  // Error events (anonymized, no stack traces in production)
  error_category?: 'ui_error' | 'api_error' | 'network_error' | 'performance_error'
  user_agent_group?: 'chrome' | 'firefox' | 'safari' | 'edge' | 'other'  // Generic grouping only
}

/**
 * Validate event properties to prevent accidental personal data capture. Rebuilds the object from only the fields {@link AcademicEventProperties} declares, so any extra field a caller accidentally attaches (e.g. `email`, `query`) is dropped rather than merely deny-listed.
 */
export const validateEventProperties = (properties: Readonly<AcademicEventProperties>): AcademicEventProperties => ({
  entity_type: properties.entity_type,
  feature_name: properties.feature_name,
  search_category: properties.search_category,
  result_count: properties.result_count,
  has_filters: properties.has_filters,
  entity_category: properties.entity_category,
  node_type: properties.node_type,
  interaction_type: properties.interaction_type,
  graph_size: properties.graph_size,
  load_time_ms: properties.load_time_ms,
  cache_hit: properties.cache_hit,
  error_type: properties.error_type,
  research_phase: properties.research_phase,
  workflow_step: properties.workflow_step,
  error_category: properties.error_category,
  user_agent_group: properties.user_agent_group,
});

/**
 * PostHog initialization check Returns true if PostHog should be initialized with valid configuration
 */
export const shouldInitializePostHog = (): boolean => POSTHOG_ENABLED &&
         typeof window !== 'undefined' &&
         POSTHOG_API_KEY.length > MIN_POSTHOG_API_KEY_LENGTH && // Basic validation
         hostnameMatches(POSTHOG_HOST, 'posthog.com');
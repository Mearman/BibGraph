/**
 * Academic Analytics Utilities
 *
 * Privacy-compliant analytics functions for academic research workflow tracking. Designed to provide insights while maintaining user privacy and GDPR compliance.
 */

import type { AcademicEventProperties, AcademicEventType, EntityTypeType } from '@/lib/posthog';

/**
 * PostHog instance type definition
 */
interface PostHogInstance {
  capture: (eventName: string, properties?: Record<string, unknown>) => void;
  identify: (userId: string, properties?: Record<string, unknown>) => void;
  reset: () => void;
}

/**
 * Window with PostHog instance
 */
interface WindowWithPostHog {
  posthog?: PostHogInstance;
}

// Analytics events cap numeric values before sending them, so no single event can leak precise counts back to a privacy-sensitive research workflow.
const MAX_RESULT_COUNT_FOR_PRIVACY = 1000;
const MAX_GRAPH_SIZE_FOR_PRIVACY = 1000;
const MAX_WORKFLOW_STEP_FOR_PRIVACY = 10;

const SESSION_STORAGE_KEY = 'bibgraph_analytics_session';
const SESSION_ID_RANDOM_SUFFIX_LENGTH = 11;
const USER_AGENT_SLICE_LENGTH = 100;

// djb2-style shift used by the anonymous ID hash below.
const HASH_SHIFT_BITS = 5;
const HASH_STRING_RADIX = 36;

const posthogAvailable = (): boolean => typeof window !== 'undefined' && 'posthog' in window;

const hasPostHog = (win: Window): win is Window & WindowWithPostHog => 'posthog' in win;

/**
 * Resolve the global PostHog instance, if analytics are available in this environment.
 */
const getPostHog = (): PostHogInstance | undefined => {
  if (!posthogAvailable() || !hasPostHog(window)) return undefined;
  return window.posthog;
};

const getUserAgentGroup = (): string => {
  if (typeof navigator === 'undefined') return 'unknown';
  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes('chrome')) return 'chrome';
  if (userAgent.includes('firefox')) return 'firefox';
  if (userAgent.includes('safari')) return 'safari';
  if (userAgent.includes('edge')) return 'edge';
  return 'other';
};

/**
 * Get or create session ID for analytics
 */
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (sessionId === null) {
    sessionId = `session_${String(Date.now())}_${crypto.randomUUID().slice(0, SESSION_ID_RANDOM_SUFFIX_LENGTH)}`;
    sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  }

  return sessionId;
};

/**
 * Generate privacy-safe anonymous user ID
 */
const generateAnonymousId = (): string => {
  // Create a hash from browser features (not fingerprinting for tracking, but for session consistency)
  const features = [
    navigator.userAgent.slice(0, USER_AGENT_SLICE_LENGTH), // Limited UA slice
    navigator.language || '',
    new Date().getTimezoneOffset().toString(),
  ].join('|');

  // Simple hash function
  let hash = 0;
  for (let index = 0; index < features.length; index++) {
    const char = features.charCodeAt(index);
    hash = ((hash << HASH_SHIFT_BITS) - hash) + char;
    hash &= hash; // Convert to 32-bit integer
  }

  return `anon_${Math.abs(hash).toString(HASH_STRING_RADIX)}`;
};

/**
 * Capture academic-specific analytics event
 */
const capture = (eventName: AcademicEventType, properties?: AcademicEventProperties): void => {
  try {
    const posthog = getPostHog();
    if (!posthog) return;

    // Enhanced properties with privacy-safe data
    const enhancedProperties = {
      ...properties,
      user_agent_group: getUserAgentGroup(),
      timestamp: new Date().toISOString(),
      session_id: getSessionId(),
    };

    posthog.capture(eventName, enhancedProperties);

    if (import.meta.env.DEV) {
      console.debug(`📊 Academic Analytics: ${eventName}`, enhancedProperties);
    }
  } catch (error) {
    console.warn('Failed to capture academic analytics event:', error);
  }
};

/**
 * Track search events with privacy protection
 */
const trackSearchPerformed = (entityType: EntityTypeType, resultCount: number, hasFilters: boolean): void => {
  capture('search_performed', {
    entity_type: entityType,
    search_category: 'literature_search',
    result_count: Math.min(resultCount, MAX_RESULT_COUNT_FOR_PRIVACY), // Cap for privacy
    has_filters: hasFilters,
    feature_name: 'search',
  });
};

/**
 * Track entity detail page views
 */
const trackEntityView = (entityType: EntityTypeType): void => {
  capture('entity_view', {
    entity_type: entityType,
    feature_name: 'entity_detail_layout',
  });
};

/**
 * Track graph interaction events
 */
const trackGraphLoaded = (nodeCount: number, edgeCount: number): void => {
  capture('graph_loaded', {
    graph_size: Math.min(nodeCount + edgeCount, MAX_GRAPH_SIZE_FOR_PRIVACY), // Cap for privacy
    interaction_type: 'navigate',
    feature_name: 'graph_visualization',
  });
};

/**
 * Track node selection in graphs
 */
const trackNodeSelected = (nodeType: EntityTypeType): void => {
  capture('node_selected', {
    node_type: nodeType,
    interaction_type: 'select',
    feature_name: 'graph_visualization',
  });
};

/**
 * Track filter application
 */
const trackFilterApplied = (): void => {
  capture('filter_applied', {
    feature_name: 'relationship_filtering',
    interaction_type: 'filter',
  });
};

/**
 * Track relationship exploration
 */
const trackRelationshipExplored = (entityType: EntityTypeType): void => {
  capture('relationship_explored', {
    entity_type: entityType,
    interaction_type: 'navigate',
    feature_name: 'relationship_filtering',
  });
};

/**
 * Track catalogue creation
 */
const trackCatalogueCreated = (): void => {
  capture('catalogue_created', {
    feature_name: 'entity_catalogue',
  });
};

/**
 * Track bookmark addition
 */
const trackBookmarkAdded = (entityType: EntityTypeType): void => {
  capture('bookmark_added', {
    entity_type: entityType,
    feature_name: 'bookmarking',
  });
};

/**
 * Track sharing functionality usage
 */
const trackShareInitiated = (): void => {
  capture('share_initiated', {
    feature_name: 'sharing',
  });
};

/**
 * Track data export operations
 */
const trackExportPerformed = (): void => {
  capture('export_performed', {
    feature_name: 'data_export',
  });
};

/**
 * Track citation network exploration
 */
const trackCitationNetworkExplored = (): void => {
  capture('citation_network_explored', {
    feature_name: 'citation_network',
    research_phase: 'investigation',
  });
};

/**
 * Track author discovery events
 */
const trackAuthorDiscovered = (): void => {
  capture('author_discovered', {
    feature_name: 'search',
    research_phase: 'discovery',
  });
};

/**
 * Track research workflow deepening
 */
const trackInvestigationDeepened = (stepNumber: number): void => {
  capture('investigation_deepened', {
    workflow_step: Math.min(stepNumber, MAX_WORKFLOW_STEP_FOR_PRIVACY), // Cap for privacy
    research_phase: 'investigation',
  });
};

/**
 * Track research path following
 */
const trackResearchPathFollowed = (): void => {
  capture('research_path_followed', {
    feature_name: 'search',
    research_phase: 'synthesis',
  });
};

/**
 * Track work funding relationships exploration
 */
const trackWorkFundingRelationshipsExplored = (): void => {
  capture('relationship_explored', {
    entity_type: 'work',
    interaction_type: 'navigate',
    feature_name: 'relationship_filtering',
    research_phase: 'analysis',
  });
};

/**
 * Identify user with anonymous ID for session tracking
 */
const identifyAnonymousUser = (): void => {
  try {
    const posthog = getPostHog();
    if (!posthog) return;

    // Generate anonymous user ID based on browser fingerprint (privacy-safe)
    const anonymousId = generateAnonymousId();
    posthog.identify(anonymousId, {
      user_type: 'anonymous_researcher',
      identified_at: new Date().toISOString(),
      user_agent_group: getUserAgentGroup(),
    });
  } catch (error) {
    console.warn('Failed to identify anonymous user:', error);
  }
};

/**
 * Reset user identification
 */
const resetUser = (): void => {
  try {
    const posthog = getPostHog();
    if (!posthog) return;

    posthog.reset();
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to reset user identification:', error);
  }
};

/**
 * Academic Analytics Service Provides privacy-compliant analytics tracking for academic research workflows.
 *
 * Exported as a plain object of functions (rather than a class) since every member is stateless - there is no instance state to justify a class here.
 */
export const AcademicAnalytics = {
  capture,
  trackSearchPerformed,
  trackEntityView,
  trackGraphLoaded,
  trackNodeSelected,
  trackFilterApplied,
  trackRelationshipExplored,
  trackCatalogueCreated,
  trackBookmarkAdded,
  trackShareInitiated,
  trackExportPerformed,
  trackCitationNetworkExplored,
  trackAuthorDiscovered,
  trackInvestigationDeepened,
  trackResearchPathFollowed,
  trackWorkFundingRelationshipsExplored,
  identifyAnonymousUser,
  resetUser,
};

/**
 * Hook for easy access to academic analytics in React components
 */
export const useAcademicAnalytics = () => AcademicAnalytics;

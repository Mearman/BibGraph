/**
 * Web Vitals Performance Monitoring Tracks Core Web Vitals and reports to app activity store
 */

import { logger } from "@bibgraph/utils";
import type { Metric } from "web-vitals";

// PostHog type for window object
interface PostHogInstance {
  capture: (event: string, properties?: Record<string, unknown>) => void;
}

declare global {
  interface Window {
    posthog?: PostHogInstance;
  }
}

// Core Web Vitals thresholds (from web.dev)
const THRESHOLDS = {
  // Largest Contentful Paint (LCP) - should be < 2.5s
  LCP: { good: 2500, needsImprovement: 4000 },
  // First Input Delay (FID) - should be < 100ms
  FID: { good: 100, needsImprovement: 300 },
  // Cumulative Layout Shift (CLS) - should be < 0.1
  CLS: { good: 0.1, needsImprovement: 0.25 },
  // First Contentful Paint (FCP) - should be < 1.8s
  FCP: { good: 1800, needsImprovement: 3000 },
  // Time to First Byte (TTFB) - should be < 800ms
  TTFB: { good: 800, needsImprovement: 1800 },
  // Interaction to Next Paint (INP) - should be < 200ms
  INP: { good: 200, needsImprovement: 500 },
};

type Rating = "good" | "needs-improvement" | "poor";

const getRating = (metric: Readonly<Metric>): Rating => {
  const threshold = THRESHOLDS[metric.name];

  if (metric.value <= threshold.good) return "good";
  if (metric.value <= threshold.needsImprovement) return "needs-improvement";
  return "poor";
};

/**
 * Get user agent group for analytics (privacy-friendly grouping)
 */
const getUserAgentGroup = (): string => {
  if (typeof navigator === 'undefined') return 'unknown';
  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes('chrome')) return 'chrome';
  if (userAgent.includes('firefox')) return 'firefox';
  if (userAgent.includes('safari')) return 'safari';
  if (userAgent.includes('edge')) return 'edge';
  return 'other';
};

const reportMetric = (metric: Readonly<Metric>) => {
  const rating = getRating(metric);

  logger.debug("performance", `Web Vital: ${metric.name}`, {
    value: metric.value,
    rating,
    id: metric.id,
    navigationType: metric.navigationType,
  });

  // Store in app activity (if available)
  if (typeof window !== "undefined" && "performance" in window) {
    // Mark the performance entry for later analysis
    performance.mark(`web-vital:${metric.name}`, {
      detail: {
        name: metric.name,
        value: metric.value,
        rating,
        id: metric.id,
      },
    });
  }

  // Send to PostHog for performance analytics
  try {
    if (typeof window !== 'undefined' && 'posthog' in window) {
      const posthog = window.posthog;
      if (posthog) {
        posthog.capture('performance_metric', {
          metric_name: metric.name.toLowerCase(),
          metric_value: Math.round(metric.value),
          metric_rating: rating,
          metric_id: metric.id,
          navigation_type: metric.navigationType,
          user_agent_group: getUserAgentGroup(),
          timestamp: new Date().toISOString(),
          feature_name: 'core_web_vitals',
        });

        // Send performance issue alerts for poor metrics
        if (rating === 'poor') {
          posthog.capture('performance_issue', {
            metric_name: metric.name.toLowerCase(),
            metric_value: Math.round(metric.value),
            threshold_exceeded: 'poor',
            user_agent_group: getUserAgentGroup(),
            timestamp: new Date().toISOString(),
          });
        }
      }
    }
  } catch (analyticsError) {
    console.warn('Failed to send performance metric to PostHog:', analyticsError);
  }
};

/**
 * Initialize Web Vitals monitoring Call this once when the app starts
 */
export const initWebVitals = async () => {
  if (typeof window === "undefined") return;

  try {
    const { onCLS, onLCP, onFCP, onTTFB, onINP } = await import("web-vitals");

    // Report all Web Vitals Note: FID has been replaced by INP in web-vitals v4+
    onCLS(reportMetric);
    onLCP(reportMetric);
    onFCP(reportMetric);
    onTTFB(reportMetric);
    onINP(reportMetric);

    logger.debug("performance", "Web Vitals monitoring initialized");
  } catch (error) {
    logger.error("performance", "Failed to initialize Web Vitals", { error });
  }
};

/**
 * Shape of the `detail` object attached to a web-vital performance mark by reportMetric()
 */
interface WebVitalMarkDetail {
  name: string;
  value: number;
  rating: Rating;
  id: string;
}

const isPerformanceMark = (entry: Readonly<PerformanceEntry>): entry is PerformanceMark => entry.entryType === 'mark';

const isWebVitalMarkDetail = (value: unknown): value is WebVitalMarkDetail =>
  typeof value === 'object' && value !== null &&
  'name' in value && typeof value.name === 'string' &&
  'value' in value && typeof value.value === 'number' &&
  'rating' in value && typeof value.rating === 'string' &&
  'id' in value && typeof value.id === 'string';

/**
 * Get all recorded Web Vitals metrics
 */
export const getWebVitalsMetrics = (): (WebVitalMarkDetail & { timestamp: number })[] => {
  if (typeof window === "undefined" || !("performance" in window)) {
    return [];
  }

  const results: (WebVitalMarkDetail & { timestamp: number })[] = [];
  for (const entry of performance.getEntriesByType("mark")) {
    if (!entry.name.startsWith("web-vital:")) continue;
    if (!isPerformanceMark(entry)) continue;
    if (!isWebVitalMarkDetail(entry.detail)) continue;
    results.push({ ...entry.detail, timestamp: entry.startTime });
  }
  return results;
};

/**
 * Get Web Vitals summary statistics
 */
export const getWebVitalsSummary = () => {
  const metrics = getWebVitalsMetrics();

  if (metrics.length === 0) {
    return null;
  }

  const summary: Record<
    string,
    { value: number; rating: Rating; timestamp: number }
  > = {};

  for (const metric of metrics) {
    if (!(metric.name in summary)) {
      summary[metric.name] = {
        value: metric.value,
        rating: metric.rating,
        timestamp: metric.timestamp,
      };
    }
  }

  return summary;
};

import { logger } from "@bibgraph/utils/logger";
import { type Metric,onCLS, onFCP, onINP, onLCP, onTTFB } from "web-vitals";

// Chrome-specific/experimental globals this monitor reads or patches. Declared as ambient augmentations (matching the pattern already used in web-vitals.ts) rather than local "as SomeInterface" casts, so `performance.memory`/`window.import`/`window.performanceMonitor` are just normal, safely-optional properties everywhere in this file.
declare global {
  interface Performance {
    memory?: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
  }

  interface Window {
    import?: (...arguments_: readonly unknown[]) => Promise<unknown>;
    performanceMonitor?: PerformanceMonitor;
  }
}

/**
 * Performance monitoring configuration
 */
interface PerformanceConfig {
  enabled: boolean;
  sampleRate: number; // 0-1, fraction of users to monitor
  endpoint?: string; // Optional analytics endpoint
  thresholds: {
    // Web Vitals thresholds (in milliseconds)
    LCP: number; // Largest Contentful Paint
    FID: number; // First Input Delay
    INP: number; // Interaction to Next Paint
    CLS: number; // Cumulative Layout Shift
    FCP: number; // First Contentful Paint
    TTFB: number; // Time to First Byte
  };
}

// The specific Web Vitals metrics this monitor observes and reports on
type WebVitalMetricName = 'CLS' | 'FCP' | 'INP' | 'LCP' | 'TTFB';

// The full set of threshold keys configured on PerformanceConfig, used to iterate them without relying on Object.entries()' loosely-typed return value.
const THRESHOLD_METRIC_KEYS: readonly (keyof PerformanceConfig['thresholds'])[] = [
  'LCP', 'FID', 'INP', 'CLS', 'FCP', 'TTFB',
];

const BYTES_PER_KILOBYTE = 1024;
const BYTES_PER_MEGABYTE = BYTES_PER_KILOBYTE * BYTES_PER_KILOBYTE;
const MEMORY_INCREASE_ALERT_MB = 10;
const MEMORY_INCREASE_ALERT_BYTES = MEMORY_INCREASE_ALERT_MB * BYTES_PER_MEGABYTE;
const MEMORY_CHECK_INTERVAL_MS = 30_000;
const SLOW_DYNAMIC_IMPORT_THRESHOLD_MS = 100;
const SLOW_RESOURCE_THRESHOLD_MS = 2000;
const NEEDS_IMPROVEMENT_MULTIPLIER = 1.5;
const CLS_DECIMAL_PRECISION = 3;
const GOOD_METRIC_SCORE = 100;
const NEEDS_IMPROVEMENT_SCORE = 50;

const isResourceTiming = (entry: Readonly<PerformanceEntry>): entry is PerformanceResourceTiming => entry.entryType === 'resource';

/**
 * Performance metrics interface
 */
interface PerformanceMetrics {
  LCP?: number;
  FID?: number;
  INP?: number;
  CLS?: number;
  FCP?: number;
  TTFB?: number;
  navigationStart?: number;
  loadComplete?: number;
  domContentLoaded?: number;
  memoryUsage?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
  bundleSize?: {
    total: number;
    compressed: number;
    chunks: { name: string; size: number }[];
  };
}

/**
 * Enhanced performance monitoring system
 */
class PerformanceMonitor {
  private readonly config: PerformanceConfig;
  private readonly metrics: PerformanceMetrics = {};
  private readonly observers = new Map<string, PerformanceObserver>();
  private readonly loadStartTime: number = Date.now();

  constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = {
      enabled: true,
      sampleRate: 1, // Monitor all users in development
      thresholds: {
        LCP: 2500, // Good: <2.5s
        FID: 100,  // Good: <100ms
        INP: 200,  // Good: <200ms
        CLS: 0.1,  // Good: <0.1
        FCP: 1800, // Good: <1.8s
        TTFB: 800, // Good: <800ms
      },
      ...config,
    };

    if (this.config.enabled && this.shouldSample()) {
      this.init();
    }
  }

  /**
   * Determine if current session should be sampled
   */
  private shouldSample(): boolean {
    return Math.random() < this.config.sampleRate;
  }

  /**
   * Initialize performance monitoring
   */
  private init(): void {
    this.observeWebVitals();
    this.observeNavigationTiming();
    this.observeResourceTiming();
    this.observeMemoryUsage();
    this.observeLongTasks();

    // Monitor bundle loading
    this.monitorBundleLoading();

    logger.debug("performance", "Performance monitoring initialized");
  }

  /**
   * Monitor Web Vitals
   */
  private observeWebVitals(): void {
    // Set up individual handlers to avoid type issues with dynamic property access
    onCLS((value: Metric) => {
      this.metrics.CLS = value.value;
      this.analyzeMetric("CLS", value);
    }, { reportAllChanges: true });

    onFCP((value: Metric) => {
      this.metrics.FCP = value.value;
      this.analyzeMetric("FCP", value);
    }, { reportAllChanges: true });

    onINP((value: Metric) => {
      this.metrics.INP = value.value;
      this.analyzeMetric("INP", value);
    }, { reportAllChanges: true });

    onLCP((value: Metric) => {
      this.metrics.LCP = value.value;
      this.analyzeMetric("LCP", value);
    }, { reportAllChanges: true });

    onTTFB((value: Metric) => {
      this.metrics.TTFB = value.value;
      this.analyzeMetric("TTFB", value);
    }, { reportAllChanges: true });
  }

  /**
   * Monitor navigation timing
   */
  private observeNavigationTiming(): void {
    if (!("performance" in window) || !("getEntriesByType" in performance)) {
      return;
    }

    const navEntries = performance.getEntriesByType("navigation");
    if (navEntries.length > 0) {
      const nav = navEntries[0];
      // Use fetchStart instead of deprecated navigationStart
      this.metrics.navigationStart = nav.fetchStart;
      this.metrics.domContentLoaded = nav.domContentLoadedEventEnd - nav.fetchStart;
      this.metrics.loadComplete = nav.loadEventEnd - nav.fetchStart;
      this.metrics.TTFB = nav.responseStart - nav.requestStart;
    }
  }

  /**
   * Monitor resource loading performance
   */
  private observeResourceTiming(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        for (const entry of entries) {
          if (!isResourceTiming(entry)) {
          	continue;
          }

          this.analyzeResourceTiming(entry);
        }
      });
      observer.observe({ entryTypes: ["resource"] });
      this.observers.set("resource", observer);
    } catch (error) {
      logger.debug("performance", "Resource timing observation not supported", { error });
    }
  }

  /**
   * Monitor memory usage (Chrome-specific)
   */
  private observeMemoryUsage(): void {
    const memory = performance.memory;
    if (!memory) return;

    this.metrics.memoryUsage = {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
    };

    // Monitor memory periodically
    setInterval(() => {
      const currentMemory = performance.memory;
      if (!currentMemory) return;
      const previousMemoryUsage = this.metrics.memoryUsage?.usedJSHeapSize ?? 0;
      const memoryDiff = currentMemory.usedJSHeapSize - previousMemoryUsage;

      if (memoryDiff > MEMORY_INCREASE_ALERT_BYTES) {
        logger.warn("performance", "Memory usage increased significantly", {
          before: this.formatBytes(previousMemoryUsage),
          after: this.formatBytes(currentMemory.usedJSHeapSize),
          increase: this.formatBytes(memoryDiff),
        });
      }
    }, MEMORY_CHECK_INTERVAL_MS);
  }

  /**
   * Monitor long tasks that block the main thread
   */
  private observeLongTasks(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        for (const entry of entries) {
          if (entry.entryType === "longtask") {
            logger.warn("performance", "Long task detected", {
              duration: entry.duration,
              startTime: entry.startTime,
            });
          }
        }
      });
      observer.observe({ entryTypes: ["longtask"] });
      this.observers.set("longtask", observer);
    } catch (error) {
      logger.debug("performance", "Long task observation not supported", { error });
    }
  }

  /**
   * Monitor bundle loading performance
   */
  private monitorBundleLoading(): void {
    // Track when bundles finish loading
    window.addEventListener("load", () => {
      const loadTime = Date.now() - this.loadStartTime;
      logger.info("performance", "Application loaded", {
        loadTime: `${String(loadTime)}ms`,
        bundles: this.identifyLoadedBundles(),
      });
    });

    // Monitor dynamic imports - note: window.import may not exist in all browsers
    if (typeof window.import === 'function') {
      const originalImport = window.import;
      window.import = async (...arguments_: readonly unknown[]) => {
        const startTime = performance.now();
        return originalImport(...arguments_).then(
          (module: unknown) => {
            const loadTime = performance.now() - startTime;
            if (loadTime > SLOW_DYNAMIC_IMPORT_THRESHOLD_MS) { // Log slow dynamic imports
              logger.debug("performance", "Dynamic import loaded", {
                duration: `${loadTime.toFixed(2)}ms`,
                module: arguments_[0],
              });
            }
            return module;
          },
          (error: unknown) => {
            const loadTime = performance.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error("performance", "Dynamic import failed", {
              duration: `${loadTime.toFixed(2)}ms`,
              module: arguments_[0],
              error: errorMessage,
            });
            throw error;
          }
        );
      };
    }
  }

  /**
   * Identify loaded bundles from resource timing
   */
  private identifyLoadedBundles(): string[] {
    const resources = performance.getEntriesByType("resource");
    return resources
      .filter(resource => resource.name.includes('.js') && resource.name.includes('/assets/'))
      .map(resource => {
        const fileName = resource.name.split('/').pop();
        return fileName !== undefined && fileName !== '' ? fileName : 'unknown';
      });
  }

  /**
   * Analyze individual metric against thresholds
   */
  private analyzeMetric(metric: WebVitalMetricName, value: Metric): void {
    const threshold = this.config.thresholds[metric];
    if (!threshold) return;

    const numericValue = value.value;
    const status = this.getMetricStatus(numericValue, threshold);

    if (status === 'poor') {
      logger.warn("performance", `Poor ${metric} performance`, {
        value: this.formatMetricValue(metric, numericValue),
        threshold: this.formatMetricValue(metric, threshold),
      });
    } else if (status === 'needs-improvement') {
      logger.debug("performance", `${metric} needs improvement`, {
        value: this.formatMetricValue(metric, numericValue),
        threshold: this.formatMetricValue(metric, threshold),
      });
    }
  }

  /**
   * Analyze resource timing performance
   */
  private analyzeResourceTiming(resource: PerformanceResourceTiming): void {
    const loadTime = resource.responseEnd - resource.requestStart;
    const size = resource.transferSize || 0;

    // Log slow resources
    if (loadTime > SLOW_RESOURCE_THRESHOLD_MS) {
      logger.debug("performance", "Slow resource loading", {
        name: resource.name.split('/').pop(),
        loadTime: `${loadTime.toFixed(2)}ms`,
        size: this.formatBytes(size),
      });
    }

    // Log large resources
    if (size > BYTES_PER_MEGABYTE) {
      logger.debug("performance", "Large resource loaded", {
        name: resource.name.split('/').pop(),
        size: this.formatBytes(size),
        loadTime: `${loadTime.toFixed(2)}ms`,
      });
    }
  }

  /**
   * Get metric status based on threshold
   */
  private getMetricStatus(value: number, threshold: number): 'good' | 'needs-improvement' | 'poor' {
    if (value <= threshold) return 'good';
    if (value <= threshold * NEEDS_IMPROVEMENT_MULTIPLIER) return 'needs-improvement';
    return 'poor';
  }

  /**
   * Format metric value for display
   */
  private formatMetricValue(metric: string, value: number): string {
    switch (metric) {
      case 'CLS':
        return value.toFixed(CLS_DECIMAL_PRECISION);
      case 'LCP':
      case 'FID':
      case 'INP':
      case 'FCP':
      case 'TTFB':
        return `${value.toFixed(0)}ms`;
      default:
        return value.toString();
    }
  }

  /**
   * Format bytes for display
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const index = Math.floor(Math.log(bytes) / Math.log(BYTES_PER_KILOBYTE));
    return `${String(Number.parseFloat((bytes / Math.pow(BYTES_PER_KILOBYTE, index)).toFixed(2)))} ${sizes[index]}`;
  }

  /**
   * Get current performance metrics
   */
  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get performance score (0-100)
   */
  public getPerformanceScore(): number {
    let totalScore = 0;
    let metricsCount = 0;

    for (const metric of THRESHOLD_METRIC_KEYS) {
      const value = this.metrics[metric];
      if (value === undefined) continue;

      const threshold = this.config.thresholds[metric];
      const status = this.getMetricStatus(value, threshold);

      switch (status) {
        case 'good':
          totalScore += GOOD_METRIC_SCORE;
          break;
        case 'needs-improvement':
          totalScore += NEEDS_IMPROVEMENT_SCORE;
          break;
        case 'poor':
          totalScore += 0;
          break;
      }
      metricsCount++;
    }

    return metricsCount > 0 ? Math.round(totalScore / metricsCount) : 0;
  }

  /**
   * Cleanup observers
   */
  public destroy(): void {
    this.observers.forEach((observer) => { observer.disconnect(); });
    this.observers.clear();
    logger.debug("performance", "Performance monitoring cleaned up");
  }
}

/**
 * Initialize performance monitoring
 */
export const initPerformanceMonitoring = (config?: Partial<PerformanceConfig>): PerformanceMonitor | null => {
  if (typeof window === 'undefined') return null;

  try {
    return new PerformanceMonitor(config);
  } catch (error) {
    logger.error("performance", "Failed to initialize performance monitoring", { error });
    return null;
  }
};

/**
 * Get performance metrics for debugging
 */
export const getPerformanceMetrics = (): PerformanceMetrics | null => {
  if (typeof window === 'undefined') return null;

  const monitor = window.performanceMonitor;
  if (!monitor) return null;

  return monitor.getMetrics();
};

/**
 * Performance monitoring singleton
 */
let performanceMonitor: PerformanceMonitor | null = null;

export const usePerformanceMonitoring = (): PerformanceMonitor | null => {
  if (!performanceMonitor && typeof window !== 'undefined') {
    performanceMonitor = initPerformanceMonitoring();
  }
  return performanceMonitor;
};
/**
 * useGraph3DPerformance - Performance monitoring hook for 3D graph visualization
 *
 * Tracks FPS, frame times, memory usage, and provides performance insights
 * to help diagnose rendering issues and optimize the visualization.
 */

import { useCallback, useEffect, useRef,useState } from 'react';

import { MS_PER_SECOND } from './time-constants';

export interface PerformanceStats {
  /**
  Current frames per second
   */
  fps: number;
  /**
  Average frame time in milliseconds
   */
  avgFrameTime: number;
  /**
  Minimum frame time in last sample window
   */
  minFrameTime: number;
  /**
  Maximum frame time in last sample window
   */
  maxFrameTime: number;
  /**
  Estimated memory usage in MB (if available)
   */
  memoryMB: number | null;
  /**
  Number of visible nodes
   */
  visibleNodes: number;
  /**
  Number of visible edges
   */
  visibleEdges: number;
  /**
  Performance level: 'good' (60+ fps), 'ok' (30-60), 'poor' (below 30)
   */
  performanceLevel: 'good' | 'ok' | 'poor';
  /**
  Jank score (0-100, higher = more jank/stuttering)
   */
  jankScore: number;
  /**
  Whether performance monitoring is active
   */
  isMonitoring: boolean;
}

export interface UseGraph3DPerformanceOptions {
  /**
  Enable/disable monitoring (default: true)
   */
  enabled?: boolean;
  /**
  Sample window size for averaging (default: 60 frames)
   */
  sampleSize?: number;
  /**
  Update interval in milliseconds (default: 500)
   */
  updateIntervalMs?: number;
  /**
  Callback when performance drops below threshold
   */
  onPerformanceDrop?: (stats: Readonly<PerformanceStats>) => void;
  /**
  FPS threshold for performance drop callback (default: 30)
   */
  fpsThreshold?: number;
}

const DEFAULT_STATS: PerformanceStats = {
  fps: 0,
  avgFrameTime: 0,
  minFrameTime: 0,
  maxFrameTime: 0,
  memoryMB: null,
  visibleNodes: 0,
  visibleEdges: 0,
  performanceLevel: 'good',
  jankScore: 0,
  isMonitoring: false,
};

/**
 * Calculate jank score based on frame time variance
 * Higher variance = more stuttering/jank
 */
const JANK_FRAME_THRESHOLD_MULTIPLIER = 1.5;
const JANK_RATIO_WEIGHT = 50;
const JANK_VARIANCE_WEIGHT_CAP = 50;
const JANK_VARIANCE_SCALE = 25;
const BYTES_PER_KB = 1024;
const ROUNDING_PRECISION = 100;
const GOOD_FPS_THRESHOLD = 55;
const OK_FPS_THRESHOLD = 30;

const calculateJankScore = (frameTimes: readonly number[]): number => {
  if (frameTimes.length < 2) return 0;

  const avg = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
  const targetFrameTime = 16.67; // 60fps target

  // Calculate how many frames exceeded the target by a significant margin
  const jankFrames = frameTimes.filter(t => t > targetFrameTime * JANK_FRAME_THRESHOLD_MULTIPLIER).length;
  const jankRatio = jankFrames / frameTimes.length;

  // Calculate variance
  const variance = frameTimes.reduce((sum, t) => sum + (t - avg) ** 2, 0) / frameTimes.length;
  const standardDeviation = Math.sqrt(variance);

  // Combine jank ratio and standard deviation into a 0-100 score
  const jankFromRatio = jankRatio * JANK_RATIO_WEIGHT;
  const jankFromVariance = Math.min(JANK_VARIANCE_WEIGHT_CAP, standardDeviation / targetFrameTime * JANK_VARIANCE_SCALE);

  return Math.round(jankFromRatio + jankFromVariance);
};

/**
 * Reads the non-standard `performance.memory.usedJSHeapSize` some browsers expose, or null when the API is unavailable
 */
const readUsedJSHeapSize = (perf: unknown): number | null => {
  if (typeof perf !== 'object' || perf === null || !('memory' in perf)) {
    return null;
  }

  const memory = perf.memory;
  if (typeof memory !== 'object' || memory === null || !('usedJSHeapSize' in memory)) {
    return null;
  }

  const usedJSHeapSize = memory.usedJSHeapSize;
  return typeof usedJSHeapSize === 'number' ? usedJSHeapSize : null;
};

/**
 * Get memory usage if the non-standard `performance.memory` API is available
 */
const getMemoryUsage = (): number | null => {
  const usedJSHeapSize = readUsedJSHeapSize(performance);
  if (usedJSHeapSize === null) {
    return null;
  }

  return Math.round(usedJSHeapSize / BYTES_PER_KB / BYTES_PER_KB * ROUNDING_PRECISION) / ROUNDING_PRECISION;
};

/**
 * Determine performance level from FPS
 */
const getPerformanceLevel = (fps: number): 'good' | 'ok' | 'poor' => {
  if (fps >= GOOD_FPS_THRESHOLD) return 'good';
  if (fps >= OK_FPS_THRESHOLD) return 'ok';
  return 'poor';
};

export interface UseGraph3DPerformanceReturn {
  /**
  Current performance statistics
   */
  stats: PerformanceStats;
  /**
  Call at the start of each render frame
   */
  frameStart: () => void;
  /**
  Call at the end of each render frame
   */
  frameEnd: () => void;
  /**
  Update visible node/edge counts
   */
  updateVisibleCounts: (nodes: number, edges: number) => void;
  /**
  Reset statistics
   */
  reset: () => void;
  /**
  Start monitoring
   */
  startMonitoring: () => void;
  /**
  Stop monitoring
   */
  stopMonitoring: () => void;
}

/**
 * Hook for monitoring 3D graph visualization performance
 * @param options - Configuration options
 * @returns Performance monitoring functions and stats
 * @example
 * ```tsx
 * function Graph3DViewer() {
 *   const { stats, frameStart, frameEnd, updateVisibleCounts } = useGraph3DPerformance({
 *     onPerformanceDrop: (stats) => console.warn('Performance drop:', stats.fps),
 *   });
 *
 *   useEffect(() => {
 *     // In render loop:
 *     frameStart();
 *     // ... render ...
 *     frameEnd();
 *     updateVisibleCounts(nodes.length, edges.length);
 *   });
 *
 *   return (
 *     <div>
 *       <span>FPS: {stats.fps}</span>
 *       <span>Performance: {stats.performanceLevel}</span>
 *     </div>
 *   );
 * }
 * ```
 */
const PERFORMANCE_DROP_CALLBACK_COOLDOWN_MS = 5000;

export const useGraph3DPerformance = (options: Readonly<UseGraph3DPerformanceOptions> = {}): UseGraph3DPerformanceReturn => {
  const {
    enabled = true,
    sampleSize = 60,
    updateIntervalMs = 500,
    onPerformanceDrop,
    fpsThreshold = 30,
  } = options;

  const [stats, setStats] = useState<PerformanceStats>(DEFAULT_STATS);
  const frameTimesReference = useRef<number[]>([]);
  const frameStartTimeReference = useRef<number>(0);
  const visibleCountsReference = useRef({ nodes: 0, edges: 0 });
  const isMonitoringReference = useRef(enabled);
  const lastDropCallbackReference = useRef<number>(0);
  const updateIntervalReference = useRef<NodeJS.Timeout | null>(null);

  // Frame timing functions
  const frameStart = useCallback(() => {
    if (!isMonitoringReference.current) return;
    frameStartTimeReference.current = performance.now();
  }, []);

  const frameEnd = useCallback(() => {
    if (!isMonitoringReference.current || frameStartTimeReference.current === 0) return;

    const frameTime = performance.now() - frameStartTimeReference.current;
    frameTimesReference.current.push(frameTime);

    // Keep only the last N samples
    if (frameTimesReference.current.length > sampleSize) {
      frameTimesReference.current.shift();
    }
  }, [sampleSize]);

  // Update visible counts
  const updateVisibleCounts = useCallback((nodes: number, edges: number) => {
    visibleCountsReference.current = { nodes, edges };
  }, []);

  // Reset statistics
  const reset = useCallback(() => {
    frameTimesReference.current = [];
    setStats(previous => ({ ...previous, ...DEFAULT_STATS, isMonitoring: isMonitoringReference.current }));
  }, []);

  // Start/stop monitoring
  const startMonitoring = useCallback(() => {
    isMonitoringReference.current = true;
    setStats(previous => ({ ...previous, isMonitoring: true }));
  }, []);

  const stopMonitoring = useCallback(() => {
    isMonitoringReference.current = false;
    setStats(previous => ({ ...previous, isMonitoring: false }));
  }, []);

  // Update stats periodically
  useEffect(() => {
    if (!enabled) return undefined;

    const updateStats = () => {
      const frameTimes = frameTimesReference.current;

      if (frameTimes.length === 0) {
        return;
      }

      const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
      const fps = Math.round(MS_PER_SECOND / avgFrameTime);
      const minFrameTime = Math.min(...frameTimes);
      const maxFrameTime = Math.max(...frameTimes);
      const jankScore = calculateJankScore(frameTimes);
      const performanceLevel = getPerformanceLevel(fps);
      const memoryMB = getMemoryUsage();

      const newStats: PerformanceStats = {
        fps,
        avgFrameTime: Math.round(avgFrameTime * ROUNDING_PRECISION) / ROUNDING_PRECISION,
        minFrameTime: Math.round(minFrameTime * ROUNDING_PRECISION) / ROUNDING_PRECISION,
        maxFrameTime: Math.round(maxFrameTime * ROUNDING_PRECISION) / ROUNDING_PRECISION,
        memoryMB,
        visibleNodes: visibleCountsReference.current.nodes,
        visibleEdges: visibleCountsReference.current.edges,
        performanceLevel,
        jankScore,
        isMonitoring: isMonitoringReference.current,
      };

      setStats(newStats);

      // Trigger performance drop callback if needed
      if (
        onPerformanceDrop &&
        fps < fpsThreshold &&
        Date.now() - lastDropCallbackReference.current > PERFORMANCE_DROP_CALLBACK_COOLDOWN_MS // Don't spam callback
      ) {
        lastDropCallbackReference.current = Date.now();
        onPerformanceDrop(newStats);
      }
    };

    updateIntervalReference.current = setInterval(updateStats, updateIntervalMs);

    return () => {
      if (updateIntervalReference.current) {
        clearInterval(updateIntervalReference.current);
      }
    };
  }, [enabled, updateIntervalMs, onPerformanceDrop, fpsThreshold]);

  // Initialize monitoring state
  useEffect(() => {
    isMonitoringReference.current = enabled;
    setStats(previous => ({ ...previous, isMonitoring: enabled }));
  }, [enabled]);

  return {
    stats,
    frameStart,
    frameEnd,
    updateVisibleCounts,
    reset,
    startMonitoring,
    stopMonitoring,
  };
};

/**
 * Performance overlay component props
 */
export interface PerformanceOverlayProps {
  stats: PerformanceStats;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  compact?: boolean;
}

/**
 * Get CSS styles for performance level indicator
 */
export const getPerformanceLevelColor = (level: 'good' | 'ok' | 'poor'): string => {
  switch (level) {
    case 'good':
      return '#4caf50'; // Green
    case 'ok':
      return '#ff9800'; // Orange
    case 'poor':
      return '#f44336'; // Red
    default:
      return '#888888';
  }
};

/**
 * Format performance stats for display
 */
export const formatPerformanceStats = (stats: Readonly<PerformanceStats>): string[] => {
  const lines: string[] = [
    `FPS: ${String(stats.fps)}`,
    `Frame Time: ${stats.avgFrameTime.toFixed(2)}ms`,
    `Nodes: ${String(stats.visibleNodes)}`,
    `Edges: ${String(stats.visibleEdges)}`,
    `Jank: ${String(stats.jankScore)}%`,
  ];

  if (stats.memoryMB !== null) {
    lines.push(`Memory: ${String(stats.memoryMB)}MB`);
  }

  return lines;
};

/**
 * Performance Dashboard - Real-time graph visualization performance monitoring
 *
 * Provides comprehensive performance metrics for graph rendering including
 * frame rates, memory usage, node counts, and optimization recommendations.
 */

import {
  ActionIcon,
  Alert,
  Badge,
  Card,
  Grid,
  Group,
  Indicator,
  Paper,
  Stack,
  Text,
  Title,
  Tooltip
} from "@mantine/core";
import {
  IconActivity,
  IconAlertTriangle,
  IconBolt,
  IconClock,
  IconDeviceFloppy,
  IconRefresh,
  IconTrendingDown
} from "@tabler/icons-react";
import { useCallback, useEffect, useRef, useState } from "react";

// Performance memory API types
interface PerformanceMemory {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

const isPerformanceMemory = (value: unknown): value is PerformanceMemory =>
  typeof value === 'object' &&
  value !== null &&
  'usedJSHeapSize' in value &&
  'totalJSHeapSize' in value &&
  'jsHeapSizeLimit' in value;

/**
Reads the non-standard Chrome `performance.memory` extension via a runtime type guard, since it isn't declared on the standard `Performance` interface.
 */
const getPerformanceMemory = (): PerformanceMemory | undefined => {
  const memory: unknown = Reflect.get(performance, 'memory');
  return isPerformanceMemory(memory) ? memory : undefined;
};

// Performance metrics interface
interface PerformanceMetrics {
  currentFPS: number;
  averageFPS: number;
  frameTimeMs: number;
  droppedFrames: number;
  memoryUsedMB: number;
  memoryLimitMB: number;
  memoryPressure: number;
  nodeCount: number;
  edgeCount: number;
  visibleNodes: number;
  culledNodes: number;
  cullingEfficiency: number;
  renderTimeMs: number;
  updateTimeMs: number;
  cpuUsage: number;
  networkRequests: number;
  timestamp: number;
}

// Performance level types
type PerformanceLevel = 'excellent' | 'good' | 'fair' | 'poor' | 'critical';

// Alert level types
type AlertLevel = 'info' | 'warning' | 'error' | 'success';

// Dashboard props
interface PerformanceDashboardProperties {
  expanded?: boolean;
  refreshInterval?: number;
  maxHistoryPoints?: number;
  onOptimize?: (suggestions: readonly string[]) => void;
}

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  fps: {
    excellent: 60,
    good: 45,
    fair: 30,
    poor: 15,
    critical: 10
  },
  frameTime: {
    excellent: 16,
    good: 22,
    fair: 33,
    poor: 66,
    critical: 100
  },
  memory: {
    excellent: 0.3,
    good: 0.5,
    fair: 0.7,
    poor: 0.85,
    critical: 0.95
  }
} as const;

const BYTES_PER_KILOBYTE = 1024;
const PERCENTAGE_SCALE = 100;
const MS_PER_SECOND = 1000;
const DEFAULT_MEMORY_LIMIT_MB = 4096;
const LOW_MEMORY_HEADROOM_RATIO = 0.3;
const MODERATE_MEMORY_HEADROOM_RATIO = 0.5;
const CULLING_EFFICIENCY_THRESHOLD = 0.5;
const NODE_COUNT_CULLING_THRESHOLD = 100;
const DROPPED_FRAMES_TEAL_THRESHOLD = 5;
const DROPPED_FRAMES_YELLOW_THRESHOLD = 20;

/**
 * Performance Dashboard Component
 *
 * Real-time monitoring dashboard for graph visualization performance
 */
export const PerformanceDashboard = ({
  expanded = false,
  maxHistoryPoints = 60,
  onOptimize
}: PerformanceDashboardProperties) => {
  // State management
  const [metrics, setMetrics] = useState<PerformanceMetrics>(() => ({
    currentFPS: 60,
    averageFPS: 60,
    frameTimeMs: 16,
    droppedFrames: 0,
    memoryUsedMB: 0,
    memoryLimitMB: DEFAULT_MEMORY_LIMIT_MB,
    memoryPressure: 0,
    nodeCount: 0,
    edgeCount: 0,
    visibleNodes: 0,
    culledNodes: 0,
    cullingEfficiency: 0,
    renderTimeMs: 0,
    updateTimeMs: 0,
    cpuUsage: 0,
    networkRequests: 0,
    timestamp: Date.now()
  }));

  const [isMonitoring, setIsMonitoring] = useState(false);
  const [alerts, setAlerts] = useState<{ level: AlertLevel; message: string }[]>([]);

  // Refs for performance tracking. lastFrameTimeRef's initial value is never read - toggleMonitoring always overwrites it with a fresh performance.now() before the measurement loop starts.
  const frameCountRef = useRef(0);
  const lastFrameTimeRef = useRef(0);
  const fpsHistoryRef = useRef<number[]>([]);
  const animationFrameIdRef = useRef<number | undefined>(undefined);

  // Get performance level
  const getPerformanceLevel = useCallback((metric: number, thresholds: typeof PERFORMANCE_THRESHOLDS.fps | typeof PERFORMANCE_THRESHOLDS.frameTime): PerformanceLevel => {
    if (metric >= thresholds.excellent) return 'excellent';
    if (metric >= thresholds.good) return 'good';
    if (metric >= thresholds.fair) return 'fair';
    if (metric >= thresholds.poor) return 'poor';
    return 'critical';
  }, []);

  // Get level color
  const getLevelColor = useCallback((level: PerformanceLevel): string => {
    switch (level) {
      case 'excellent': return 'green';
      case 'good': return 'teal';
      case 'fair': return 'yellow';
      case 'poor': return 'orange';
      case 'critical': return 'red';
      default: return 'gray';
    }
  }, []);

  // Calculate memory usage
  const calculateMemoryUsage = useCallback(() => {
    const memory = getPerformanceMemory();
    if (memory) {
      const used = memory.usedJSHeapSize / BYTES_PER_KILOBYTE / BYTES_PER_KILOBYTE;
      const limit = memory.jsHeapSizeLimit / BYTES_PER_KILOBYTE / BYTES_PER_KILOBYTE;
      const pressure = used / limit;

      return {
        used: Math.round(used),
        limit: Math.round(limit),
        pressure: Math.round(pressure * PERCENTAGE_SCALE)
      };
    }
    return { used: 0, limit: DEFAULT_MEMORY_LIMIT_MB, pressure: 0 };
  }, []);

  // Calculate memory usage ratio for display
  const memoryUsageRatio = 1 - (metrics.memoryPressure / PERCENTAGE_SCALE);

  // Performance monitoring loop
  const measurePerformance = useCallback(() => {
    const currentTime = performance.now();
    const deltaTime = currentTime - lastFrameTimeRef.current;

    frameCountRef.current++;
    fpsHistoryRef.current.push(MS_PER_SECOND / deltaTime);

    if (fpsHistoryRef.current.length > maxHistoryPoints) {
      fpsHistoryRef.current = fpsHistoryRef.current.slice(-maxHistoryPoints);
    }

    // Calculate FPS
    const currentFPS = Math.round(MS_PER_SECOND / deltaTime);
    const averageFPS = Math.round(
      fpsHistoryRef.current.reduce((sum, fps) => sum + fps, 0) / fpsHistoryRef.current.length
    );

    // Get memory usage
    const memUsage = calculateMemoryUsage();

    // Create new metrics
    const newMetrics: PerformanceMetrics = {
      currentFPS,
      averageFPS,
      frameTimeMs: Math.round(deltaTime),
      droppedFrames: Math.max(0, frameCountRef.current - averageFPS),
      memoryUsedMB: memUsage.used,
      memoryLimitMB: memUsage.limit,
      memoryPressure: memUsage.pressure,
      nodeCount: 0, // These would be populated by graph component
      edgeCount: 0,
      visibleNodes: 0,
      culledNodes: 0,
      cullingEfficiency: 0,
      renderTimeMs: 0,
      updateTimeMs: 0,
      cpuUsage: 0,
      networkRequests: 0,
      timestamp: currentTime
    };

    setMetrics(newMetrics);
    lastFrameTimeRef.current = currentTime;
    animationFrameIdRef.current = requestAnimationFrame(measurePerformance);
  }, [calculateMemoryUsage, maxHistoryPoints]);

  // Start/stop monitoring
  const toggleMonitoring = useCallback(() => {
    if (isMonitoring) {
      if (animationFrameIdRef.current !== undefined) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      setIsMonitoring(false);
    } else {
      frameCountRef.current = 0;
      fpsHistoryRef.current = [];
      lastFrameTimeRef.current = performance.now();
      animationFrameIdRef.current = requestAnimationFrame(measurePerformance);
      setIsMonitoring(true);
    }
  }, [isMonitoring, measurePerformance]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameIdRef.current !== undefined) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, []);

  // Generate optimization suggestions
  useEffect(() => {
    const suggestions: string[] = [];
    const newAlerts: { level: AlertLevel; message: string }[] = [];

    // FPS-based suggestions
    const fpsLevel = getPerformanceLevel(metrics.currentFPS, PERFORMANCE_THRESHOLDS.fps);
    if (fpsLevel === 'poor' || fpsLevel === 'critical') {
      suggestions.push('Consider reducing node count or enabling viewport culling');
      newAlerts.push({
        level: 'warning',
        message: `Low FPS detected: ${String(metrics.currentFPS)}`
      });
    }

    // Memory-based suggestions
    if (memoryUsageRatio < LOW_MEMORY_HEADROOM_RATIO) {
      suggestions.push('Memory pressure high - consider reducing graph complexity');
      newAlerts.push({
        level: 'error',
        message: `High memory usage: ${String(metrics.memoryUsedMB)}MB`
      });
    }

    // Culling efficiency suggestions
    if (metrics.cullingEfficiency < CULLING_EFFICIENCY_THRESHOLD && metrics.nodeCount > NODE_COUNT_CULLING_THRESHOLD) {
      suggestions.push('Enable or optimize viewport culling for better performance');
    }

    // Deferred so the update doesn't run synchronously within the effect commit.
    queueMicrotask(() => { setAlerts(newAlerts); });

    if (suggestions.length > 0 && onOptimize) {
      onOptimize(suggestions);
    }
  }, [metrics, getPerformanceLevel, memoryUsageRatio, onOptimize]);

  return (
    <Paper p="lg" withBorder>
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between" align="center">
          <Group gap="sm">
            <IconActivity size={20} />
            <Title order={3}>Performance Dashboard</Title>
            {isMonitoring && (
              <Badge color="green" variant="light">
                Monitoring
              </Badge>
            )}
          </Group>
          <Group gap="xs">
            <Tooltip label={isMonitoring ? "Stop monitoring" : "Start monitoring"}>
              <ActionIcon
                variant={isMonitoring ? "filled" : "outline"}
                color={isMonitoring ? "green" : "blue"}
                onClick={toggleMonitoring}
              >
                <IconRefresh size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>

        {/* Alerts */}
        {alerts.length > 0 && (
          <Stack gap="xs">
            {alerts.map((alert, index) => (
              <Alert
                key={index}
                variant="light"
                color={alert.level === 'error' ? 'red' : alert.level === 'warning' ? 'orange' : 'blue'}
                icon={<IconAlertTriangle size={16} />}
              >
                <Text size="sm">{alert.message}</Text>
              </Alert>
            ))}
          </Stack>
        )}

        {/* Performance Metrics Grid */}
        <Grid>
          <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
            <Card p="md" withBorder>
              <Group justify="space-between" align="flex-start">
                <Stack gap="xs">
                  <Group gap="xs">
                    <IconBolt size={16} />
                    <Text size="sm" c="dimmed">Frame Rate</Text>
                  </Group>
                  <Text size="lg" fw={500}>
                    {metrics.currentFPS} FPS
                  </Text>
                </Stack>
                <Indicator
                  size={12}
                  color={getLevelColor(getPerformanceLevel(metrics.currentFPS, PERFORMANCE_THRESHOLDS.fps))}
                  processing={false}
                />
              </Group>
            </Card>
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
            <Card p="md" withBorder>
              <Group justify="space-between" align="flex-start">
                <Stack gap="xs">
                  <Group gap="xs">
                    <IconClock size={16} />
                    <Text size="sm" c="dimmed">Frame Time</Text>
                  </Group>
                  <Text size="lg" fw={500}>
                    {metrics.frameTimeMs}ms
                  </Text>
                </Stack>
                <Indicator
                  size={12}
                  color={getLevelColor(getPerformanceLevel(metrics.frameTimeMs, PERFORMANCE_THRESHOLDS.frameTime))}
                  processing={false}
                />
              </Group>
            </Card>
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
            <Card p="md" withBorder>
              <Group justify="space-between" align="flex-start">
                <Stack gap="xs">
                  <Group gap="xs">
                    <IconDeviceFloppy size={16} />
                    <Text size="sm" c="dimmed">Memory Usage</Text>
                  </Group>
                  <Text size="lg" fw={500}>
                    {metrics.memoryUsedMB}MB
                  </Text>
                  <Text size="xs" c="dimmed">
                    {metrics.memoryPressure}% of limit
                  </Text>
                </Stack>
                <Indicator
                  size={12}
                  color={memoryUsageRatio < LOW_MEMORY_HEADROOM_RATIO ? 'red' : memoryUsageRatio < MODERATE_MEMORY_HEADROOM_RATIO ? 'yellow' : 'green'}
                  processing={false}
                />
              </Group>
            </Card>
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
            <Card p="md" withBorder>
              <Group justify="space-between" align="flex-start">
                <Stack gap="xs">
                  <Group gap="xs">
                    <IconTrendingDown size={16} />
                    <Text size="sm" c="dimmed">Dropped Frames</Text>
                  </Group>
                  <Text size="lg" fw={500}>{metrics.droppedFrames}</Text>
                </Stack>
                <Indicator
                  size={12}
                  color={metrics.droppedFrames === 0 ? 'green' :
                         metrics.droppedFrames < DROPPED_FRAMES_TEAL_THRESHOLD ? 'teal' :
                         metrics.droppedFrames < DROPPED_FRAMES_YELLOW_THRESHOLD ? 'yellow' : 'red'}
                  processing={false}
                />
              </Group>
            </Card>
          </Grid.Col>
        </Grid>

        {/* Status Summary */}
        {!expanded && (
          <Card p="md" withBorder bg="blue.0">
            <Group justify="space-between" align="center">
              <Stack gap={0}>
                <Text size="sm" fw={500}>Overall Performance</Text>
                <Text size="xs" c="dimmed">
                  Based on FPS, memory usage, and rendering metrics
                </Text>
              </Stack>
              <Badge
                size="lg"
                color={getLevelColor(
                  getPerformanceLevel(metrics.currentFPS, PERFORMANCE_THRESHOLDS.fps)
                )}
              >
                {getPerformanceLevel(metrics.currentFPS, PERFORMANCE_THRESHOLDS.fps).toUpperCase()}
              </Badge>
            </Group>
          </Card>
        )}
      </Stack>
    </Paper>
  );
};

// Hook for performance monitoring
export const usePerformanceMonitor = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState<PerformanceMetrics[]>([]);

  const startRecording = useCallback(() => {
    setIsRecording(true);
    setRecordings([]);
  }, []);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
  }, []);

  const addRecording = useCallback((metrics: Readonly<PerformanceMetrics>) => {
    if (isRecording) {
      setRecordings(previous => [...previous, metrics]);
    }
  }, [isRecording]);

  return {
    isRecording,
    recordings,
    startRecording,
    stopRecording,
    addRecording
  };
};
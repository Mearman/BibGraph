/**
 * Utility functions for AdaptiveGraphRenderer
 */

import type {
  DeviceCapabilities,
  PerformanceLevel,
  PerformanceProfile,
  RenderSettings,
} from './adaptive-graph-types';

// Below this many CPU cores or GB of device memory, treat the device as low-end.
const LOW_END_CORE_THRESHOLD = 4;
const LOW_END_MEMORY_GB_THRESHOLD = 4;
// Fallback device memory (GB) reported when the non-standard `navigator.deviceMemory` API is unavailable.
const DEFAULT_DEVICE_MEMORY_GB = 8;
// Fallback WebGL max texture size when the context can't report one.
const DEFAULT_MAX_TEXTURE_SIZE = 2048;
// At or above this many cores and this much device memory (GB), treat the device as high-end.
const HIGH_PERF_CORE_THRESHOLD = 8;
const HIGH_PERF_MEMORY_GB_THRESHOLD = 8;

// Node-count thresholds below which animation/labels stay enabled at each performance profile.
const LOW_PROFILE_ANIMATION_MAX_NODES = 50;
const MEDIUM_PROFILE_ANIMATION_MAX_NODES = 200;
const MEDIUM_PROFILE_LABEL_MAX_NODES = 100;

/**
 * Type guard for a WebGL rendering context, since `HTMLCanvasElement.getContext('experimental-webgl')` isn't a standard overload and so returns the generic `RenderingContext` type.
 */
const isWebGLRenderingContext = (context: unknown): context is WebGLRenderingContext =>
  typeof WebGLRenderingContext !== 'undefined' && context instanceof WebGLRenderingContext;

/**
 * Type guard for the non-standard `navigator.deviceMemory` API
 */
const hasDeviceMemory = (
  nav: Navigator
): nav is Navigator & { deviceMemory: number } =>
  'deviceMemory' in nav && typeof nav.deviceMemory === 'number';

/**
 * Detects device hardware capabilities for performance optimization
 */
export const detectDeviceCapabilities = (): DeviceCapabilities => {
  const canvas = document.createElement('canvas');
  const experimentalContext = canvas.getContext('experimental-webgl');
  const gl =
    canvas.getContext('webgl') ??
    (isWebGLRenderingContext(experimentalContext) ? experimentalContext : null);

  const isLowEnd =
    !gl ||
    navigator.hardwareConcurrency < LOW_END_CORE_THRESHOLD ||
    (hasDeviceMemory(navigator) && navigator.deviceMemory < LOW_END_MEMORY_GB_THRESHOLD);

  const maxTextureSize: unknown = gl?.getParameter(gl.MAX_TEXTURE_SIZE);

  return {
    isLowEnd,
    cores: navigator.hardwareConcurrency,
    memory: hasDeviceMemory(navigator) ? navigator.deviceMemory : DEFAULT_DEVICE_MEMORY_GB,
    supportsWebGL: !!gl,
    maxTextureSize: typeof maxTextureSize === 'number' ? maxTextureSize : DEFAULT_MAX_TEXTURE_SIZE,
    isMobile:
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ),
  };
};

/**
 * Returns render settings based on performance profile and node count
 */
export const getPerformanceSettings = (profile: PerformanceProfile, nodeCount: number): RenderSettings => {
  const settings: Record<PerformanceProfile, RenderSettings> = {
    low: {
      nodeDetail: 'low',
      linkDetail: 'low',
      animationEnabled: nodeCount < LOW_PROFILE_ANIMATION_MAX_NODES,
      labelEnabled: false,
      simulationCooldown: 5000,
      maxNodes: 100,
      renderMode: 'canvas',
    },
    medium: {
      nodeDetail: 'medium',
      linkDetail: 'medium',
      animationEnabled: nodeCount < MEDIUM_PROFILE_ANIMATION_MAX_NODES,
      labelEnabled: nodeCount < MEDIUM_PROFILE_LABEL_MAX_NODES,
      simulationCooldown: 2000,
      maxNodes: 500,
      renderMode: 'canvas',
    },
    high: {
      nodeDetail: 'high',
      linkDetail: 'high',
      animationEnabled: true,
      labelEnabled: true,
      simulationCooldown: 1000,
      maxNodes: 1000,
      renderMode: 'canvas',
    },
  };

  return settings[profile];
};

/**
 * Returns CSS color for performance level indicator
 */
export const getPerformanceLevelColor = (level: PerformanceLevel): string => {
  switch (level) {
    case 'good':
      return 'var(--mantine-color-green-6)';
    case 'ok':
      return 'var(--mantine-color-yellow-6)';
    case 'poor':
      return 'var(--mantine-color-red-6)';
    default:
      return 'var(--mantine-color-gray-6)';
  }
};

/**
 * Determines performance profile based on device capabilities
 */
export const determinePerformanceProfile = (capabilities: Readonly<DeviceCapabilities>): PerformanceProfile => {
  if (capabilities.isLowEnd || capabilities.isMobile) {
    return 'low';
  }
  if (capabilities.cores >= HIGH_PERF_CORE_THRESHOLD && capabilities.memory >= HIGH_PERF_MEMORY_GB_THRESHOLD) {
    return 'high';
  }
  return 'medium';
};

/**
 * Utility functions for AdaptiveGraphRenderer
 */

import type {
  DeviceCapabilities,
  PerformanceLevel,
  PerformanceProfile,
  RenderSettings,
} from './adaptive-graph-types';

/**
 * Detects device hardware capabilities for performance optimization
 */
export const detectDeviceCapabilities = (): DeviceCapabilities => {
  const canvas = document.createElement('canvas');
  const gl =
    canvas.getContext('webgl') ||
    (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);

  // Type guard for device memory
  const hasDeviceMemory = (
    nav: Navigator
  ): nav is Navigator & { deviceMemory: number } => {
    return (
      'deviceMemory' in nav &&
      typeof (nav as Record<string, unknown>).deviceMemory === 'number'
    );
  };

  const isLowEnd =
    !gl ||
    (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) ||
    (hasDeviceMemory(navigator) && navigator.deviceMemory < 4);

  return {
    isLowEnd,
    cores: navigator.hardwareConcurrency || 4,
    memory: hasDeviceMemory(navigator) ? navigator.deviceMemory : 8,
    supportsWebGL: !!gl,
    maxTextureSize: gl?.getParameter(gl.MAX_TEXTURE_SIZE) || 2048,
    isMobile:
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ),
  };
};

/**
 * Returns render settings based on performance profile and node count
 * @param profile
 * @param nodeCount
 */
export const getPerformanceSettings = (profile: PerformanceProfile, nodeCount: number): RenderSettings => {
  const settings: Record<PerformanceProfile, RenderSettings> = {
    low: {
      nodeDetail: 'low',
      linkDetail: 'low',
      animationEnabled: nodeCount < 50,
      labelEnabled: false,
      simulationCooldown: 5000,
      maxNodes: 100,
      renderMode: 'canvas',
    },
    medium: {
      nodeDetail: 'medium',
      linkDetail: 'medium',
      animationEnabled: nodeCount < 200,
      labelEnabled: nodeCount < 100,
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
 * @param level
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
 * @param capabilities
 */
export const determinePerformanceProfile = (capabilities: DeviceCapabilities): PerformanceProfile => {
  if (capabilities.isLowEnd || capabilities.isMobile) {
    return 'low';
  }
  if (capabilities.cores >= 8 && capabilities.memory >= 8) {
    return 'high';
  }
  return 'medium';
};

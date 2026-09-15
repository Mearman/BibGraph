/**
 * Animated Layout Context
 * Provides context for accessing animated layout functions from child components
 */

import React from "react";

export const AnimatedLayoutContext = React.createContext<{
  // State
  isAnimating: boolean;
  isRunning: boolean;
  isWorkerReady: boolean;
  isPaused: boolean;
  progress: number;
  alpha: number;
  iteration: number;
  fps: number;
  performanceStats: {
    averageFPS: number;
    minFPS: number;
    maxFPS: number;
    frameCount: number;
  };
  useAnimation: boolean;

  // Actions
  applyLayout: () => void;
  restartLayout: () => void;
  stopLayout: () => void;
  pauseLayout: () => void;
  resumeLayout: () => void;
  reheatLayout: (alpha?: number) => void;
  updateParameters: (
    newParameters: Readonly<Partial<{
      linkDistance: number;
      linkStrength: number;
      chargeStrength: number;
      centerStrength: number;
      collisionRadius: number;
      collisionStrength: number;
      velocityDecay: number;
      alphaDecay: number;
    }>>,
  ) => void;

  // Computed properties
  canPause: boolean;
  canResume: boolean;
  canStop: boolean;
  canRestart: boolean;
} | null>(null);

export const useAnimatedLayoutContext = () => {
  const context = React.useContext(AnimatedLayoutContext);
  if (!context) {
    throw new Error(
      "useAnimatedLayoutContext must be used within AnimatedLayoutProvider",
    );
  }
  return context;
};

// Safe version that returns null when context is not available
export const useAnimatedLayoutContextSafe = () => {
  return React.useContext(AnimatedLayoutContext);
};

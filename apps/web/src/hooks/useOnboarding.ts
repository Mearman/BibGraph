/**
 * useOnboarding Hook
 *
 * Manages onboarding state and first-time user detection
 */

import { useEffect, useState } from 'react';

import {
  hasCompletedOnboarding,
  markOnboardingCompleted,
  resetOnboarding,
} from '@/components/onboarding';

const ONBOARDING_DISPLAY_DELAY_MS = 1000;

export interface UseOnboardingReturn {
  /**
  Whether to show the onboarding tutorial
   */
  showOnboarding: boolean;
  /**
  Close the onboarding
   */
  closeOnboarding: () => void;
  /**
  Reset onboarding (show again)
   */
  resetOnboarding: () => void;
  /**
  Whether user has completed onboarding
   */
  hasCompleted: boolean;
}

/**
 * Hook for managing onboarding state
 */
export const useOnboarding = (): UseOnboardingReturn => {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(false);

  useEffect(() => {
    // Check if user has completed onboarding
    const isCompleted = hasCompletedOnboarding();
    setHasCompleted(isCompleted);

    // Show onboarding for first-time users
    if (!isCompleted) {
      // Small delay to allow app to load
      const timer = setTimeout(() => {
        setShowOnboarding(true);
      }, ONBOARDING_DISPLAY_DELAY_MS);

      return () => {
        clearTimeout(timer);
      };
    }
    return undefined;
  }, []);

  const closeOnboarding = () => {
    setShowOnboarding(false);
    markOnboardingCompleted();
  };

  const handleReset = () => {
    resetOnboarding();
    setShowOnboarding(true);
    setHasCompleted(false);
  };

  return {
    showOnboarding,
    closeOnboarding,
    resetOnboarding: handleReset,
    hasCompleted,
  };
};

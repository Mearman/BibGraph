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

export interface UseOnboardingReturn {
  /** Whether to show the onboarding tutorial */
  showOnboarding: boolean;
  /** Close the onboarding */
  closeOnboarding: () => void;
  /** Reset onboarding (show again) */
  resetOnboarding: () => void;
  /** Whether user has completed onboarding */
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
    const completed = hasCompletedOnboarding();
    setHasCompleted(completed);

    // Show onboarding for first-time users
    if (!completed) {
      // Small delay to allow app to load
      const timer = setTimeout(() => {
        setShowOnboarding(true);
      }, 1000);

      return () => clearTimeout(timer);
    }
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

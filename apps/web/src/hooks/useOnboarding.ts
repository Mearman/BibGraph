/**
 * useOnboarding Hook
 *
 * Holds the tour's open state and its completion mark. The tour never opens on its own, not even on a first visit: the corner launchpad offers it, and this hook opens it on demand.
 */

import { useCallback, useState } from 'react';

import { markOnboardingCompleted } from '@/components/onboarding';

export interface UseOnboardingReturn {
  /**
   * Whether the tour modal is open
   */
  tourOpen: boolean;
  /**
   * Open the tour from the launchpad
   */
  openTour: () => void;
  /**
   * Close the tour and mark it completed
   */
  closeTour: () => void;
}

/**
 * Hook for managing the tour's open state
 */
export const useOnboarding = (): UseOnboardingReturn => {
  const [tourOpen, setTourOpen] = useState(false);

  const openTour = useCallback(() => {
    setTourOpen(true);
  }, []);

  const closeTour = useCallback(() => {
    setTourOpen(false);
    markOnboardingCompleted();
  }, []);

  return {
    tourOpen,
    openTour,
    closeTour,
  };
};

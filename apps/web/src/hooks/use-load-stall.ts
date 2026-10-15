/**
 * Shared stall clock for loading surfaces: an unresolved load that outlives the entity loader's stall timeout is treated as stalled, so every surface (page loader and sub-panels alike) flips at the same named bound instead of spinning indefinitely.
 */

import { useEffect, useState } from 'react';

import { LOADING_CONSTANTS } from '@/config/style-constants';

/**
 * Track whether a pending load has outlived the shared stall timeout.
 * @param isPending - True while the load is unresolved; the clock resets whenever this returns false, so a fresh load re-arms the bound.
 * @returns True only while the load is pending AND past the stall timeout.
 */
export const useLoadStall = (isPending: boolean): boolean => {
  // Elapsed time is tracked only to drive the stall flip; it is never shown, because the caller cannot know the request's real progress.
  const [timeElapsed, setTimeElapsed] = useState(0);

  // Derived rather than stored so the flip cannot desynchronise from elapsed time
  const isStalled = timeElapsed >= LOADING_CONSTANTS.STALL_TIMEOUT_MS;

  // Count elapsed time, bounded by the stall timeout: once stalled (or resolved) the effect schedules no further ticks, and a resolved load resets the clock for the next one.
  useEffect(() => {
    if (!isPending) {
      setTimeElapsed(0);
      return undefined;
    }
    if (isStalled) {
      return undefined;
    }
    const interval = setInterval(() => {
      setTimeElapsed(previous => previous + LOADING_CONSTANTS.PROGRESS_UPDATE_INTERVAL_MS);
    }, LOADING_CONSTANTS.PROGRESS_UPDATE_INTERVAL_MS);

    return () => { clearInterval(interval); };
  }, [isPending, isStalled]);

  return isPending && isStalled;
};

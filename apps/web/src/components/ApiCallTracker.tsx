/**
 * API Call Tracker component that logs OpenAlex API calls to activity store
 */

import { useAppActivityStore } from "@/stores/app-activity";

export interface ApiCallTrackerProps {
  entityType: string;
  entityId?: string;
  queryParams?: Record<string, unknown>;
}

/**
 * Component that logs API calls when rendered
 * Use this to track when API calls are made
 * @param root0
 * @param root0.entityType
 * @param root0.entityId
 * @param root0.queryParams
 */
export const ApiCallTracker = ({
  entityType,
  entityId,
  queryParams,
}: ApiCallTrackerProps) => {
  // Log the API call when component mounts
  const store = useAppActivityStore();
  store.logApiCall(entityType, entityId, queryParams);

  return null; // This component doesn't render anything
};

/**
 * Hook to track API calls
 */
export const useApiCallTracker = () => {
  const store = useAppActivityStore();

  return {
    trackApiCall: ({
      entityType,
      entityId,
      queryParams,
    }: {
      entityType: string;
      entityId?: string;
      queryParams?: Record<string, unknown>;
    }) => {
      store.logApiCall(entityType, entityId, queryParams);
    },
  };
};

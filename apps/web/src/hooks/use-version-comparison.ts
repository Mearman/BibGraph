/**
 * Hook for comparing OpenAlex data versions
 * Temporarily available during November 2025 transition period
 */

import { cachedOpenAlex } from "@bibgraph/client";
import { useQuery } from "@tanstack/react-query";

import { settingsStoreInstance } from "@/stores/settings-store";

import { MS_PER_MINUTE } from "./time-constants";

const STALE_TIME_MINUTES = 5;
const GC_TIME_MINUTES = 10;

interface VersionComparisonData {
  currentVersion: '1' | '2' | undefined;
  referencesCount: { v1?: number; v2?: number; difference: number };
  locationsCount: { v1?: number; v2?: number; difference: number };
  hasComparison: boolean;
}

/**
 * Compare metadata between v1 and v2 for a specific work
 * Only active during the November 2025 transition period
 */
export const useVersionComparison = (workId: string | undefined, enabled = true): {
  comparison: VersionComparisonData | null;
  isLoading: boolean;
  error: Error | null;
} => {
  const queryResult = useQuery({
    queryKey: ['version-comparison', workId],
    queryFn: async (): Promise<VersionComparisonData | null> => {
      if (workId === undefined || workId === '') return null;

      // Get current version setting
      const settings = await settingsStoreInstance.getSettings();
      const currentVersion = settings.dataVersion;

      // Fetch work with both versions for comparison
      const fetchWorkWithVersion = async (version: '1' | '2' | undefined) => {
        try {
          return await cachedOpenAlex.client.works.getWork(workId, {
            select: ['id', 'referenced_works_count', 'locations_count'],
            dataVersion: version,
          });
        } catch (error) {
          console.warn(`Failed to fetch work with version ${String(version)}:`, error);
          return null;
        }
      };

      const [workV1, workV2] = await Promise.all([
        fetchWorkWithVersion('1'),
        fetchWorkWithVersion('2'),
      ]);

      if (!workV1 && !workV2) {
        return null;
      }

      const referencesV1 = workV1?.referenced_works_count ?? 0;
      const referencesV2 = workV2?.referenced_works_count ?? 0;
      const locationsV1 = workV1?.locations_count ?? 0;
      const locationsV2 = workV2?.locations_count ?? 0;

      return {
        currentVersion,
        referencesCount: {
          v1: referencesV1,
          v2: referencesV2,
          difference: referencesV2 - referencesV1,
        },
        locationsCount: {
          v1: locationsV1,
          v2: locationsV2,
          difference: locationsV2 - locationsV1,
        },
        hasComparison: Boolean(workV1 && workV2),
      };
    },
    enabled: enabled && Boolean(workId),
    staleTime: STALE_TIME_MINUTES * MS_PER_MINUTE,
    gcTime: GC_TIME_MINUTES * MS_PER_MINUTE,
  });

  return {
    comparison: queryResult.data ?? null,
    isLoading: queryResult.isLoading,
    error: queryResult.error,
  };
};
